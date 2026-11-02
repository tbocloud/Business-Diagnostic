<?php
// ─────────────────────────────────────────────────────────────
//  POST /api/report.php   { id, k }  → { profile, answers, completedAt }
//  The data behind a short report link (the link stored in the CRM:
//  /results/#id=123&k=…). POST keeps the key out of URLs and server logs.
//
//  The 24-character key is the secret: without it, a report can't be
//  opened (ids alone are guessable, keys are not).
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/lib/bootstrap.php';

run(function () {
    require_method('POST');
    header('X-Robots-Tag: noindex');
    rate_limit('report', 300, 3600);
    $body = json_body(MAX_PUBLIC_BODY_BYTES);

    $id  = id_from($body['id'] ?? null);
    $key = is_string($body['k'] ?? null) ? $body['k'] : '';
    if ($id <= 0 || !preg_match('/^[a-f0-9]{24}$/', $key)) fail('Report not found', 404);

    $stmt = db()->prepare('SELECT report_key, raw_answers, created_at, updated_at FROM submissions WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row || !$row['report_key'] || !hash_equals($row['report_key'], $key)) fail('Report not found', 404);

    $raw = decode_json_col($row['raw_answers']);
    if (!is_array($raw) || ($raw['version'] ?? null) !== 2) fail('Report not found', 404);

    json_out([
        'profile'     => $raw['profile'] ?? null,
        'answers'     => $raw['answers'] ?? null,
        'completedAt' => iso($row['updated_at'] ?? $row['created_at']),
    ]);
});
