<?php
// ─────────────────────────────────────────────────────────────
//  /api/admin/me.php
//  GET  → { user }                       (401 when logged out)
//  POST { currentPassword, newPassword } → { ok }   change your own password
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../lib/bootstrap.php';

run(function () {
    $method = require_method('GET', 'POST');
    $user = require_user();
    if ($method === 'GET') json_out(['user' => $user]);

    $body = json_body();
    $current = is_string($body['currentPassword'] ?? null) ? $body['currentPassword'] : '';
    $next    = is_string($body['newPassword'] ?? null) ? $body['newPassword'] : '';
    if (strlen($next) < 8) fail('Use a new password of at least 8 characters');

    $stmt = db()->prepare('SELECT password_hash FROM bde_users WHERE id = ?');
    $stmt->execute([$user['id']]);
    if (!password_verify($current, (string) $stmt->fetchColumn())) fail('Your current password is incorrect', 403);

    db()->prepare('UPDATE bde_users SET password_hash = ? WHERE id = ?')->execute([password_hash($next, PASSWORD_DEFAULT), $user['id']]);
    json_out(['ok' => true]);
});
