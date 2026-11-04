<?php
// ─────────────────────────────────────────────────────────────
//  POST /api/submit-check.php — saves Stage 2 ("your real numbers") or the ERP check,
//  and re-saves it when the client changes their answers.
//
//  Body: { kind: 'deep'|'erp', submissionId?, token?, parentId?, parentToken?,
//          details: { businessName, ownerName, phone, email }, answers, summary: { points } }
//  → { submissionId, token }
//
//  parentId/parentToken: the client's Stage 1 check on this device, so the new check joins
//  the same client (and the same CRM record). The answers are kept as sent, for the report
//  link; the summary points are what the team sees in the CRM.
//  Needs db/004_more_checks.sql.
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/crm.php';

const CHECK_KINDS = ['deep' => 'Stage 2 (your numbers)', 'erp' => 'ERP check'];

run(function () {
    require_method('POST');
    rate_limit('check', 30, 3600);
    $body = json_body(MAX_PUBLIC_BODY_BYTES);

    $kind = $body['kind'] ?? '';
    if (!is_string($kind) || !isset(CHECK_KINDS[$kind])) fail('Unknown check');
    $answers = is_array($body['answers'] ?? null) ? $body['answers'] : null;
    if ($answers === null) fail('Missing answers');
    $details = is_array($body['details'] ?? null) ? $body['details'] : [];
    $company = str_or_null($details['businessName'] ?? null, 255);
    $owner   = str_or_null($details['ownerName'] ?? null, 120);
    $phone   = str_or_null($details['phone'] ?? null, 30);
    $email   = str_or_null($details['email'] ?? null, 190);
    if ($phone !== null && !preg_match('/^\+?[0-9 ()\-]{6,30}$/', $phone)) fail('That phone number doesn’t look right');
    if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('That email doesn’t look right');

    $points = [];
    $summary = is_array($body['summary'] ?? null) ? $body['summary'] : [];
    foreach (array_slice(is_array($summary['points'] ?? null) ? $summary['points'] : [], 0, 8) as $p) {
        if ($p = str_or_null($p, 240)) $points[] = $p;
    }

    $pdo = db();

    // The client's Stage 1 check, proven by its token: joins this check to the same client.
    $parentId = null;
    $pid = id_from($body['parentId'] ?? null);
    $ptoken = is_string($body['parentToken'] ?? null) ? $body['parentToken'] : '';
    if ($pid > 0 && $ptoken !== '') {
        $stmt = $pdo->prepare("SELECT id, edit_token, company_name, contact_name FROM submissions WHERE id = ? AND check_type = 'health' LIMIT 1");
        $stmt->execute([$pid]);
        $parent = $stmt->fetch();
        if ($parent && $parent['edit_token'] && hash_equals($parent['edit_token'], token_hash($ptoken))) {
            $parentId = (int) $parent['id'];
            $company ??= $parent['company_name'];
            $owner ??= $parent['contact_name'];
        }
    }

    $values = [
        'company_name'    => $company,
        'contact_name'    => $owner,
        'raw_answers'     => json_encode(['version' => "$kind-1", 'details' => compact('company', 'owner'), 'answers' => $answers], JSON_UNESCAPED_UNICODE),
        'results_summary' => json_encode(['kind' => $kind, 'points' => $points], JSON_UNESCAPED_UNICODE),
        'parent_id'       => $parentId,
    ];
    // Contact details only when given, so a re-save never wipes what "call me back" added.
    if ($phone !== null) $values['phone_number'] = $phone;
    if ($email !== null) $values['email'] = $email;

    // ── Re-save: the client changed their answers ──
    $id    = id_from($body['submissionId'] ?? null);
    $token = is_string($body['token'] ?? null) ? $body['token'] : '';
    if ($id > 0 && $token !== '') {
        $stmt = $pdo->prepare('SELECT edit_token FROM submissions WHERE id = ? AND check_type = ? LIMIT 1');
        $stmt->execute([$id, $kind]);
        $row = $stmt->fetch();
        if ($row && $row['edit_token'] && hash_equals($row['edit_token'], token_hash($token))) {
            $sets = implode(', ', array_map(fn($c) => "$c = ?", array_keys($values)));
            $pdo->prepare("UPDATE submissions SET $sets WHERE id = ?")->execute([...array_values($values), $id]);
            add_activity($id, null, 'system', CHECK_KINDS[$kind] . ' updated by the client.');
            respond_then(['submissionId' => $id, 'token' => $token], 200, fn() => crm_sync_submission($id));
        }
        // Unknown id or wrong token → fall through and save as a new check.
    }

    $token = bin2hex(random_bytes(16));
    $values += [
        'source'     => 'health_check_v2',
        'check_type' => $kind,
        'edit_token' => token_hash($token),
        'report_key' => new_report_key(),
    ];
    $cols = implode(', ', array_keys($values));
    $marks = implode(', ', array_fill(0, count($values), '?'));
    $pdo->prepare("INSERT INTO submissions ($cols) VALUES ($marks)")->execute(array_values($values));
    $newId = (int) $pdo->lastInsertId();
    add_activity($newId, null, 'system', CHECK_KINDS[$kind] . ' submitted.');

    respond_then(['submissionId' => $newId, 'token' => $token], 201, fn() => crm_sync_submission($newId));
});

/** Only a hash of the client's token is stored (same as submit.php). */
function token_hash(string $token): string {
    return substr(hash('sha256', $token), 0, 32);
}
