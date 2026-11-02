<?php
// ─────────────────────────────────────────────────────────────
//  GET /api/report.php?id=123&k=<report_key>
//  The data behind a short report link (the link stored in the CRM).
//  → { profile, answers, completedAt }
//
//  The 24-character key is the secret: without it, a report can't be
//  opened (ids alone are guessable, keys are not).
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/lib/bootstrap.php';

run(function () {
    require_method('GET');
    header('X-Robots-Tag: noindex');
    rate_limit('report', 300, 3600);

    $id  = id_from($_GET['id'] ?? null);
    $key = is_string($_GET['k'] ?? null) ? $_GET['k'] : '';
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
