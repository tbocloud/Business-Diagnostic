<?php
// ─────────────────────────────────────────────────────────────
//  POST /api/voice-note.php  (multipart/form-data) — a voice note in the last step
//  of the check ("Anything else on your mind?").
//
//    submissionId, token, audio (file), seconds  → { ok, signals }
//    submissionId, token, remove=1               → { ok, signals }
//
//  The client records instead of typing (or as well) — whatever is easier. The recording
//  is kept privately in api/uploads/voice/ (never served) until it is attached to the CRM
//  record (field voice_note), then deleted here. With OPENAI_API_KEY we also write it down
//  (never shown to the client) and summarise it with their note for the team (lib/open.php).
//  The token (from submit.php) proves the check-up is the caller's — which is also why a
//  form post from another site gets nowhere, even though this endpoint takes multipart.
//  Needs db/003_open_problems.sql.
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/open.php';
require_once __DIR__ . '/lib/crm.php';

const VOICE_MAX_BYTES   = 8 * 1024 * 1024;
const VOICE_MAX_SECONDS = 180;
/** Audio formats browsers record in (Chrome/Firefox: webm or ogg, Safari: mp4) → file extension. */
const VOICE_TYPES = [
    'audio/webm' => 'webm', 'video/webm' => 'webm', 'audio/ogg' => 'ogg', 'application/ogg' => 'ogg',
    'audio/mp4' => 'm4a', 'video/mp4' => 'm4a', 'audio/x-m4a' => 'm4a', 'audio/aac' => 'm4a',
    'audio/mpeg' => 'mp3', 'audio/wav' => 'wav', 'audio/x-wav' => 'wav', 'audio/vnd.wave' => 'wav',
];

run(function () {
    require_method('POST');
    rate_limit('voice', 12, 3600);

    $id    = id_from($_POST['submissionId'] ?? null);
    $token = is_string($_POST['token'] ?? null) ? $_POST['token'] : '';
    if ($id <= 0 || $token === '') fail('Missing submission');
    $stmt = db()->prepare('SELECT id, edit_token, open_voice FROM submissions WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row || !$row['edit_token'] || !hash_equals($row['edit_token'], substr(hash('sha256', $token), 0, 32))) {
        fail('Submission not found', 404);
    }

    if (($_POST['remove'] ?? '') === '1') {
        voice_delete_file($row['open_voice'] ?? null);
        db()->prepare(
            'UPDATE submissions SET open_voice = NULL, open_voice_seconds = NULL, open_voice_url = NULL, open_transcript = NULL,
                    open_updated_at = NOW() WHERE id = ?'
        )->execute([$id]);
        add_activity($id, null, 'system', 'Client removed their voice note.');
        $summary = open_refresh_summary($id); // now from their typed note alone, if any
        respond_then(['ok' => true, 'signals' => open_signals($summary)], 200, fn() => crm_sync_submission($id));
    }

    $file = $_FILES['audio'] ?? null;
    if (!is_array($file) || !is_string($file['tmp_name'] ?? null)) fail('No recording received');
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_INI_SIZE || ($file['size'] ?? 0) > VOICE_MAX_BYTES) {
        fail('That recording is too long — please keep it under 3 minutes.', 413);
    }
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) fail('The recording didn’t arrive — please try again.');

    // The file's real type, not what the browser claims; audio only, stored under a name we choose.
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: '';
    $ext = VOICE_TYPES[$mime] ?? null;
    if ($ext === null) fail('That recording format isn’t supported — please type it instead.', 415);
    $seconds = ctype_digit((string) ($_POST['seconds'] ?? '')) ? min(VOICE_MAX_SECONDS, (int) $_POST['seconds']) : null;

    $dir = voice_dir();
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) throw new RuntimeException('Cannot create the voice-note folder');
    $name = $id . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) throw new RuntimeException('Cannot store the voice note');
    voice_delete_file($row['open_voice'] ?? null); // a new recording replaces the old one

    $transcript = null;
    if (ai_enabled()) {
        try {
            $transcript = str_or_null(ai_transcribe($dir . '/' . $name, $mime), 4000);
        } catch (Throwable $e) {
            error_log("Voice note transcript failed for submission $id: " . $e->getMessage());
        }
    }

    db()->prepare(
        'UPDATE submissions SET open_voice = ?, open_voice_seconds = ?, open_voice_url = NULL, open_transcript = ?,
                open_updated_at = NOW() WHERE id = ?'
    )->execute([$name, $seconds, $transcript, $id]);
    add_activity($id, null, 'system', 'Client recorded a voice note' . ($seconds ? sprintf(' (%d:%02d)', intdiv($seconds, 60), $seconds % 60) : '') . '.');
    $summary = open_refresh_summary($id);

    // Reply first (tags only — the words stay with the team), then attach the recording to the CRM record.
    respond_then(['ok' => true, 'signals' => open_signals($summary)], 200, fn() => crm_sync_submission($id));
});
