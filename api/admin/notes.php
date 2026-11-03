<?php
// POST /api/admin/notes.php  { submissionId, body } → { notes }

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/leads.php';

run(function () {
    require_method('POST');
    $user = require_user();
    $body = json_body();

    $id = id_from($body['submissionId'] ?? null);
    $text = str_or_null($body['body'] ?? null, 4000);
    if ($id <= 0) fail('Missing lead id');
    if ($text === null) fail('Write a note first');

    // Lock the lead row while checking access and writing, so a BDE can't add a note to a
    // lead that another BDE takes in the same instant.
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT * FROM submissions WHERE id = ? LIMIT 1 FOR UPDATE');
        $stmt->execute([$id]);
        $row = $stmt->fetch() ?: null;
        if (!$row || !can_access_lead($user, $row)) {
            $pdo->rollBack();
            fail('Lead not found', 404);
        }
        add_activity($id, $user['id'], 'note', $text);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    json_out(['notes' => notes_for($id, user_names())], 201);
});
