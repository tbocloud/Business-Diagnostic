<?php
// ─────────────────────────────────────────────────────────────
//  Shared helpers for every endpoint: config, MySQL, JSON, sessions, auth.
//  Not an endpoint itself (api/lib/.htaccess blocks direct access).
// ─────────────────────────────────────────────────────────────

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) { http_response_code(404); exit; }

// ── Config: api/config.php (same as before) or environment variables ──
// If DB_HOST is set in the environment (local development, Docker, Railway), the environment
// wins and config.php is not loaded at all — so running locally can never touch the live
// database by accident. On the normal server no DB_* variables are set, so config.php is used.
$configFile = __DIR__ . '/../config.php';
if (getenv('DB_HOST') === false && is_file($configFile)) require_once $configFile;
foreach (['DB_HOST' => 'localhost', 'DB_PORT' => 3306, 'DB_USER' => 'root', 'DB_PASSWORD' => '', 'DB_NAME' => 'biz_diagnostic'] as $key => $fallback) {
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
        $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
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
