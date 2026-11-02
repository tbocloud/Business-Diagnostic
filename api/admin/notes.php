<?php
// POST /api/admin/notes.php  { submissionId, body } → { notes }

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/leads.php';

run(function () {
    require_method('POST');
    $user = require_user();
    $body = json_body();

    $id = (int) ($body['submissionId'] ?? 0);
    $text = str_or_null($body['body'] ?? null, 4000);
    if ($id <= 0) fail('Missing lead id');
    if ($text === null) fail('Write a note first');

    $row = fetch_lead_row($id);
    if (!$row || !can_access_lead($user, $row)) fail('Lead not found', 404);

    add_activity($id, $user['id'], 'note', $text);
    json_out(['notes' => notes_for($id, user_names())], 201);
});
