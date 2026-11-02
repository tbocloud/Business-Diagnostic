<?php
// ─────────────────────────────────────────────────────────────
//  POST /api/save-contact.php
//  The client leaves a phone number / email on their results page.
//
//  Body: { submissionId, token, name?, phone?, email? }  → { ok: true }
//  The token returned by submit.php proves the row is theirs.
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/lib/bootstrap.php';

run(function () {
    require_method('POST');
    rate_limit('contact', 20, 3600);
    $body = json_body(MAX_PUBLIC_BODY_BYTES);

    $id    = id_from($body['submissionId'] ?? null);
    $token = is_string($body['token'] ?? null) ? $body['token'] : '';
    $name  = str_or_null($body['name'] ?? null, 120);
    $phone = str_or_null($body['phone'] ?? null, 30);
    $email = str_or_null($body['email'] ?? null, 190);

    if ($id <= 0 || $token === '') fail('Missing submission');
    if ($phone === null && $email === null) fail('Add a phone number or an email');
    if ($phone !== null && !preg_match('/^\+?[0-9 ()\-]{6,30}$/', $phone)) fail('That phone number doesn’t look right');
    if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('That email doesn’t look right');

    $stmt = db()->prepare('SELECT edit_token FROM submissions WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row || !$row['edit_token'] || !hash_equals($row['edit_token'], substr(hash('sha256', $token), 0, 32))) {
        fail('Submission not found', 404);
    }

    db()->prepare(
        'UPDATE submissions
            SET contact_name = COALESCE(?, contact_name), phone_number = COALESCE(?, phone_number), email = COALESCE(?, email)
          WHERE id = ?'
    )->execute([$name, $phone, $email, $id]);

    $parts = array_filter([$phone ? "phone $phone" : null, $email ? "email $email" : null]);
    add_activity($id, null, 'system', 'Client asked to be contacted (' . implode(', ', $parts) . ').');

    json_out(['ok' => true]);
});
