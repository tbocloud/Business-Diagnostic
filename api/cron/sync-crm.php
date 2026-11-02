<?php
// ─────────────────────────────────────────────────────────────
//  Retry CRM syncs that failed (e.g. the CRM was down for a while).
//  Command line only:   php api/cron/sync-crm.php
//  cPanel cron, every 15 minutes:
//    */15 * * * *  php /home/<user>/public_html/api/cron/sync-crm.php
// ─────────────────────────────────────────────────────────────

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/crm.php';

if (!crm_enabled()) {
    echo "CRM is not configured (CRM_URL / CRM_API_KEY / CRM_API_SECRET) — nothing to do.\n";
    exit(0);
}
if (SITE_URL === '') {
    echo "Set SITE_URL (e.g. https://check.yourcompany.com) so report links can be built from the command line.\n";
    exit(1);
}

// Never synced, or the last sync failed — last 30 days, oldest first.
$ids = db()->query(
    "SELECT id FROM submissions
      WHERE source = 'health_check_v2'
        AND (crm_ref IS NULL OR crm_error IS NOT NULL)
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY id LIMIT 200"
)->fetchAll(PDO::FETCH_COLUMN);

$ok = 0;
foreach ($ids as $id) {
    crm_sync_submission((int) $id);
    $stmt = db()->prepare('SELECT crm_ref, crm_error FROM submissions WHERE id = ?');
    $stmt->execute([(int) $id]);
    $row = $stmt->fetch();
    // Only a record name and no error mean it really synced (a busy lock skips without writing either).
    if ($row && $row['crm_ref'] !== null && $row['crm_error'] === null) $ok++;
    else echo "  #$id not synced: " . ($row['crm_error'] ?? 'skipped — another sync was running, will retry') . "\n";
}
echo 'Synced ' . $ok . ' of ' . count($ids) . " pending submission(s).\n";
