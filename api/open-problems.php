<?php
// ─────────────────────────────────────────────────────────────
//  POST /api/open-problems.php — the typed note in the last, optional step of the
//  check: "Anything else on your mind?" (the voice note goes to voice-note.php).
//
//  Body: { submissionId, token, text }  → { ok, signals: { areas, services } }
//
//  The note stays on their submission and goes to the CRM for the team: their own words,
//  plus a short summary of everything they told us (lib/open.php). The report only
//  receives `signals` — which areas and services it touches — never words.
//  Needs db/003_open_problems.sql.
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/open.php';
require_once __DIR__ . '/lib/crm.php';

const OPEN_NOTE_MAX = 3000;

run(function () {
    require_method('POST');
    rate_limit('open', 30, 3600);
    $body = json_body(MAX_PUBLIC_BODY_BYTES);

    $id    = id_from($body['submissionId'] ?? null);
    $token = is_string($body['token'] ?? null) ? $body['token'] : '';
    $text  = str_or_null($body['text'] ?? null, OPEN_NOTE_MAX);
    if ($id <= 0 || $token === '') fail('Missing submission');
    if ($text === null) fail('Write your note first');

    // The token proves the submission is the caller's (same check as save-contact.php).
    $stmt = db()->prepare('SELECT edit_token FROM submissions WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row || !$row['edit_token'] || !hash_equals($row['edit_token'], substr(hash('sha256', $token), 0, 32))) {
        fail('Submission not found', 404);
    }

    // Keep their words first, so an AI hiccup can never lose them.
    db()->prepare('UPDATE submissions SET open_text = ?, open_updated_at = NOW() WHERE id = ?')->execute([$text, $id]);
    add_activity($id, null, 'system', 'Client added a note about other problems.');
    $summary = open_refresh_summary($id);

    // Reply first, then put the summary and the note on the CRM record.
    respond_then(['ok' => true, 'signals' => open_signals($summary)], 200, fn() => crm_sync_submission($id));
});
