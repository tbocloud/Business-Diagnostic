<?php
// ─────────────────────────────────────────────────────────────
//  Check the CRM connection — run this once the CRM details are in api/config.php.
//    php api/cron/check-crm.php                 read-only checks
//    php api/cron/check-crm.php --create-test   also creates one record named
//                                               "Connection test — please delete"
//  Command line only. Prints what's wrong in plain words.
// ─────────────────────────────────────────────────────────────

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/crm.php';
require_once __DIR__ . '/../lib/ai.php';

const FIELDS = ['business_name', 'contact_name', 'phone', 'email', 'report_link'];
// Filled by the last step ("Anything else on your mind?"). Optional: without them the rest still syncs.
const OPEN_FIELDS = ['problem_summary', 'client_note'];
$failed = false;
$ok   = function (string $m) { echo "  ✓ $m\n"; };
$bad  = function (string $m, string $hint) use (&$failed) { $failed = true; echo "  ✗ $m\n    → $hint\n"; };
$warn = function (string $m, string $hint) { echo "  ! $m\n    → $hint\n"; };

echo "CRM connection check\n";

// 1. Settings
if (!crm_enabled()) {
    $bad('CRM settings are missing', 'Set CRM_URL, CRM_API_KEY and CRM_API_SECRET in api/config.php (see api/config.example.php).');
    exit(1);
}
$ok('Settings found — CRM_URL = ' . CRM_URL . ', DocType = "' . CRM_DOCTYPE . '"');
if (SITE_URL === '') $bad('SITE_URL is empty', "Set SITE_URL to this website's address, e.g. https://check.ourcompany.com — it's used in the report links.");
else $ok('Report links will look like ' . report_link(123, str_repeat('a', 24)));

// 2. Reachable + key accepted + DocType exists + fields exist + read permission — all in one list call
$query = '?fields=' . rawurlencode(json_encode(array_merge(['name'], FIELDS))) . '&limit_page_length=1';
try {
    crm_request('GET', '/api/resource/' . rawurlencode(CRM_DOCTYPE) . $query);
    $ok('CRM reachable, API key accepted');
    $ok('DocType "' . CRM_DOCTYPE . '" exists with fields: ' . implode(', ', FIELDS));
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if (str_contains($msg, 'not reachable')) $bad($msg, 'Check CRM_URL (https://…), and that this server can reach the CRM (firewall / IP allow-list).');
    elseif (preg_match('/said 401/', $msg)) $bad($msg, 'The API key or secret is wrong — ask the CRM admin to re-check or regenerate them.');
    elseif (preg_match('/said 403/', $msg)) $bad($msg, 'The API user is missing Read permission on "' . CRM_DOCTYPE . '".');
    elseif (preg_match('/said 404/', $msg)) $bad($msg, 'The DocType "' . CRM_DOCTYPE . '" does not exist (check the exact name, or set CRM_DOCTYPE).');
    else $bad($msg, 'Usually a missing or misspelt field. The DocType needs exactly: ' . implode(', ', FIELDS) . '.');
}

// 2b. The two fields for the last step (optional — the website works without them)
if (!$failed) {
    try {
        crm_request('GET', '/api/resource/' . rawurlencode(CRM_DOCTYPE) . '?fields=' . rawurlencode(json_encode(OPEN_FIELDS)) . '&limit_page_length=1');
        $ok('DocType also has ' . implode(' and ', OPEN_FIELDS) . ' (the client\'s note about other problems)');
    } catch (Throwable $e) {
        $warn('DocType has no ' . implode(' / ', OPEN_FIELDS) . ' fields yet', 'Everything else still syncs. Ask the CRM admin to add them (Text / Long Text) to see the client\'s note.');
    }
}

// 3. Optional: prove Create works
if (!$failed && in_array('--create-test', $argv, true)) {
    try {
        $res = crm_request('POST', '/api/resource/' . rawurlencode(CRM_DOCTYPE), [
            'business_name' => 'Connection test — please delete',
            'contact_name'  => 'Website check',
            'phone'         => null,
            'email'         => null,
            'report_link'   => report_link(0, str_repeat('0', 24)),
        ]);
        $ok('Created test record ' . ($res['data']['name'] ?? '?') . ' — ask the CRM admin to delete it');
    } catch (Throwable $e) {
        $bad($e->getMessage(), preg_match('/said 403/', $e->getMessage())
            ? 'The API user is missing Create permission on "' . CRM_DOCTYPE . '".'
            : 'Check that report_link is a Data field with option URL, and the other fields match the setup.');
    }
}

// 4. Database ready for it?
try {
    db()->query('SELECT report_key, crm_ref, crm_synced_at, crm_error FROM submissions LIMIT 1');
    $ok('Database has the CRM columns (db/002_crm_link.sql)');
    $pending = (int) db()->query("SELECT COUNT(*) FROM submissions WHERE source = 'health_check_v2' AND (crm_ref IS NULL OR crm_error IS NOT NULL) AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    echo "  · $pending check-up(s) from the last 30 days will be sent on the next retry run (php api/cron/sync-crm.php)\n";
} catch (Throwable $e) {
    $bad('Database is missing the CRM columns', 'Run db/002_crm_link.sql once in phpMyAdmin.');
}
try {
    db()->query('SELECT open_text, open_summary, open_updated_at FROM submissions LIMIT 1');
    $ok('Database has the last-step columns (db/003_open_problems.sql)');
} catch (Throwable $e) {
    $bad('Database is missing the last-step columns', 'Run db/003_open_problems.sql once in phpMyAdmin.');
}

// 5. The AI summary of the client's note
if (ai_enabled()) $ok('Note summaries are on (OPENAI_API_KEY set, model ' . AI_MODEL . ')');
else $warn('Note summaries are off — no OPENAI_API_KEY', 'The note still reaches the CRM, without the short summary. Add OPENAI_API_KEY to api/config.php to switch it on.');

echo $failed ? "\nNot ready yet — fix the ✗ items above and run this again.\n" : "\nAll good — the CRM connection is ready.\n";
exit($failed ? 1 : 0);
