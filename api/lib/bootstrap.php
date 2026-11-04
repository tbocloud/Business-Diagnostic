<?php
// ─────────────────────────────────────────────────────────────
//  Shared helpers for every endpoint: config, MySQL, JSON, sessions, auth.
//  Not an endpoint itself (api/lib/.htaccess blocks direct access).
// ─────────────────────────────────────────────────────────────

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) { http_response_code(404); exit; }

// Every endpoint answers in JSON. A PHP notice or deprecation printed into the response would
// corrupt it (and reveal server paths), so errors go to the log, never to the browser.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ── Config: api/config.php (same as before) or environment variables ──
// If DB_HOST is set in the environment (local development, Docker, Railway), the environment
// wins and config.php is not loaded at all — so running locally can never touch the live
// database by accident. On the normal server no DB_* variables are set, so config.php is used.
$configFile = __DIR__ . '/../config.php';
if (getenv('DB_HOST') === false && is_file($configFile)) require_once $configFile;
foreach ([
    'DB_HOST' => 'localhost', 'DB_PORT' => 3306, 'DB_USER' => 'root', 'DB_PASSWORD' => '', 'DB_NAME' => 'biz_diagnostic',
    // CRM (ERPNext) connection — leave CRM_URL empty to switch it off. See docs/crm-setup.md.
    'CRM_URL' => '', 'CRM_API_KEY' => '', 'CRM_API_SECRET' => '', 'CRM_DOCTYPE' => 'Business Health Check',
    // Public address of this site, used to build the report links sent to the CRM.
    'SITE_URL' => '',
    // AI summary of the client's note in the last step. Empty key = no summary (the note itself is still kept).
    // OPENAI_API_KEY is the same setting the old GPT version of the site used.
    'OPENAI_API_KEY' => '', 'AI_MODEL' => 'gpt-4o-mini', 'AI_BASE_URL' => 'https://api.openai.com/v1',
] as $key => $fallback) {
    if (!defined($key)) {
        $env = getenv($key);
        define($key, $env !== false ? $env : $fallback);
    }
}

const LEAD_STATUSES = ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
const MAX_BODY_BYTES = 200000;
/** Public (anonymous) endpoints: a real check-up is well under 20 KB. */
const MAX_PUBLIC_BODY_BYTES = 64000;

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        // rowCount() must report rows MATCHED, not rows changed (lead.php relies on this).
        // PHP 8.4 renamed the constant (the old name warns on 8.5+); use whichever exists.
        $foundRows = defined('Pdo\Mysql::ATTR_FOUND_ROWS') ? constant('Pdo\Mysql::ATTR_FOUND_ROWS') : constant('PDO::MYSQL_ATTR_FOUND_ROWS');
        $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            $foundRows                   => true,
        ]);
        // MySQL and PHP agree on the time zone, so iso() turns DB times into correct ISO 8601.
        $pdo->exec("SET time_zone = '" . date('P') . "'");
    }
    return $pdo;
}

/** 'YYYY-MM-DD HH:MM:SS' from MySQL → ISO 8601 with offset (Safari can't parse the MySQL form). */
function iso(?string $dt): ?string {
    if ($dt === null || $dt === '') return null;
    $t = strtotime($dt);
    return $t === false ? null : date(DATE_ATOM, $t);
}

// ── JSON in / out ────────────────────────────────────────────

function json_out($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Send the JSON response to the browser NOW, then keep working (e.g. talk to the CRM),
 * so a slow or unreachable CRM never makes the client wait. Where the server can't
 * detach (rare), $after simply runs before the response is sent.
 */
function respond_then($data, int $status, callable $after): void {
    $body = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $canDetach = function_exists('fastcgi_finish_request') || function_exists('litespeed_finish_request');
    if (!$canDetach) {
        try { $after(); } catch (Throwable $e) { error_log('After-response task failed: ' . $e->getMessage()); }
        json_out($data, $status);
    }
    ignore_user_abort(true);
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Content-Length: ' . strlen($body));
    echo $body;
    if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
    else litespeed_finish_request();
    try { $after(); } catch (Throwable $e) { error_log('After-response task failed: ' . $e->getMessage()); }
    exit;
}

function fail(string $message, int $status = 400): void {
    json_out(['error' => $message], $status);
}

function require_method(string ...$methods): string {
    $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($m, $methods, true)) fail('Method not allowed', 405);
    return $m;
}

/**
 * Parse a JSON body. Requiring Content-Type: application/json means a browser on another
 * site can't send it without a CORS preflight — part of the CSRF protection for the panel.
 */
function json_body(int $maxBytes = MAX_BODY_BYTES): array {
    $type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($type, 'application/json') !== 0) fail('Expected application/json', 415);
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false || strlen($raw) > $maxBytes) fail('Request too large', 413);
    $data = json_decode($raw, true);
    if (!is_array($data)) fail('Invalid JSON');
    return $data;
}

/** Trimmed string or null, cut to $max characters. */
function str_or_null($v, int $max): ?string {
    if (!is_string($v)) return null;
    $v = trim($v);
    if ($v === '') return null;
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

/**
 * A record id from the request: a positive integer, or a string of digits. Anything else
 * (arrays, floats, "5abc"…) gives 0. A plain (int) cast would turn [5] into 1.
 */
function id_from($v): int {
    if (is_int($v)) return $v > 0 ? $v : 0;
    if (is_string($v) && $v !== '' && ctype_digit($v) && strlen($v) <= 10) return (int) $v;
    return 0;
}

function int_or_null($v, int $min = 0, int $max = 100): ?int {
    if (!is_int($v) && !(is_float($v) && floor($v) === $v)) return null;
    $v = (int) $v;
    return $v < $min || $v > $max ? null : $v;
}

function decode_json_col(?string $v) {
    if ($v === null || $v === '') return null;
    return json_decode($v, true);
}

// ── Sessions & auth (admin panel) ────────────────────────────

function start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('bhc_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

/** The logged-in, active user — or null. */
function current_user(): ?array {
    start_session();
    $uid = $_SESSION['uid'] ?? null;
    if (!$uid) return null;
    $stmt = db()->prepare('SELECT id, name, email, role, active FROM bde_users WHERE id = ? LIMIT 1');
    $stmt->execute([(int) $uid]);
    $user = $stmt->fetch();
    if (!$user || !(int) $user['active']) {
        $_SESSION = [];
        return null;
    }
    $user['id'] = (int) $user['id'];
    unset($user['active']);
    return $user;
}

function require_user(): array {
    $user = current_user();
    if (!$user) fail('Please log in', 401);
    return $user;
}

function require_admin(): array {
    $user = require_user();
    if ($user['role'] !== 'admin') fail('Only an admin can do this', 403);
    return $user;
}

/** Admins see every lead; a BDE sees leads assigned to them plus unassigned ones. */
function can_access_lead(array $user, array $row): bool {
    if ($user['role'] === 'admin') return true;
    return $row['assigned_to'] === null || (int) $row['assigned_to'] === $user['id'];
}

/**
 * Allow at most $max requests per $windowSeconds from this IP for $bucket, else 429.
 * One atomic upsert per request: parallel requests each count.
 * Uses REMOTE_ADDR on purpose — forwarded headers can be faked by the client.
 */
function rate_limit(string $bucket, int $max, int $windowSeconds): void {
    $ip = substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
    db()->prepare(
        'INSERT INTO rate_limits (ip, bucket, hits, window_start) VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           hits = IF(window_start <= DATE_SUB(NOW(), INTERVAL ? SECOND), 1, hits + 1),
           window_start = IF(window_start <= DATE_SUB(NOW(), INTERVAL ? SECOND), NOW(), window_start)'
    )->execute([$ip, $bucket, $windowSeconds, $windowSeconds]);
    $stmt = db()->prepare('SELECT hits FROM rate_limits WHERE ip = ? AND bucket = ?');
    $stmt->execute([$ip, $bucket]);
    if ((int) $stmt->fetchColumn() > $max) {
        header('Retry-After: ' . $windowSeconds);
        fail('Too many requests from your network. Please try again a little later.', 429);
    }
}

function add_activity(int $submissionId, ?int $userId, string $kind, string $body): void {
    $stmt = db()->prepare('INSERT INTO lead_notes (submission_id, user_id, kind, body) VALUES (?, ?, ?, ?)');
    $stmt->execute([$submissionId, $userId, $kind, $body]);
}

/** Run an endpoint, turning unexpected errors into a JSON 500 without leaking details. */
function run(callable $handler): void {
    try {
        $handler();
    } catch (PDOException $e) {
        error_log('DB error: ' . $e->getMessage());
        fail('Database error — please try again', 500);
    } catch (Throwable $e) {
        error_log('Server error: ' . $e->getMessage());
        fail('Server error — please try again', 500);
    }
}
