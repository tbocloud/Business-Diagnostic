<?php
// ─────────────────────────────────────────────────────────────
//  CRM (ERPNext / Frappe) connection.
//
//  Every finished health check becomes ONE record in the CRM DocType
//  (default "Business Health Check") with basic client info and the
//  link to their report. The same record is updated when the client
//  later leaves a phone number / email, or writes a note or records a
//  voice note about other problems in the last step (problem summary,
//  their own words, and the recording as an attachment).
//
//  Switched off while CRM_URL / CRM_API_KEY / CRM_API_SECRET are empty.
//  Setup steps for the CRM side: docs/crm-setup.md
// ─────────────────────────────────────────────────────────────

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) { http_response_code(404); exit; }

function crm_enabled(): bool {
    return CRM_URL !== '' && CRM_API_KEY !== '' && CRM_API_SECRET !== '';
}

/** The secret part of a short report link (96 random bits, hex). */
function new_report_key(): string {
    return bin2hex(random_bytes(12));
}

/**
 * Public link to a client's report: https://<SITE_URL>/results/#id=123&k=…
 * - Built ONLY from SITE_URL, never from request headers (a faked Host header must not be
 *   able to plant a link to another site in the CRM, where staff click it).
 * - The id and key sit after "#", which browsers never send to the server — so the key
 *   doesn't end up in access logs or Referer headers.
 */
function report_link(int $id, string $key): string {
    if (SITE_URL === '') throw new RuntimeException('SITE_URL is not set, so the report link cannot be built');
    return rtrim(SITE_URL, '/') . "/results/#id=$id&k=$key";
}

/** One call to the Frappe REST API. Returns the decoded JSON, or throws with a short, readable reason. */
function crm_request(string $method, string $path, ?array $body = null): array {
    $ch = curl_init(rtrim(CRM_URL, '/') . $path);
    $opts = [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => [
            'Authorization: token ' . CRM_API_KEY . ':' . CRM_API_SECRET,
            'Accept: application/json',
            'Content-Type: application/json',
        ],
    ];
    if ($body !== null) $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    unset($ch); // curl_close() is a no-op since PHP 8 and deprecated in 8.5

    if ($raw === false) throw new RuntimeException('CRM not reachable: ' . $error);
    $data = json_decode((string) $raw, true);
    if ($status < 200 || $status >= 300) {
        // Frappe puts the reason in "exception" / "message" / "_server_messages".
        $reason = is_array($data) ? ($data['exception'] ?? $data['message'] ?? $data['exc_type'] ?? '') : '';
        if ($reason === '' && is_array($data) && isset($data['_server_messages'])) $reason = strip_tags((string) $data['_server_messages']);
        throw new RuntimeException("CRM said $status" . ($reason !== '' ? ': ' . substr((string) $reason, 0, 180) : ''));
    }
    return is_array($data) ? $data : [];
}

/**
 * Create (first time) or update this submission's CRM record. Never throws: the result is
 * written to the row (crm_ref / crm_synced_at / crm_error), so failures can be retried
 * by api/cron/sync-crm.php.
 */
function crm_sync_submission(int $id): void {
    if (!crm_enabled()) return;

    // One sync per submission at a time — otherwise "finish" and "call me back" arriving
    // together could both see no CRM record yet and create two.
    $lock = 'bhc_crm_' . $id;
    if ((int) db()->query("SELECT GET_LOCK(" . db()->quote($lock) . ", 20)")->fetchColumn() !== 1) return;

    try {
        // SELECT * so the sync keeps working on a database that hasn't run db/003 yet (no open_* columns).
        $stmt = db()->prepare('SELECT * FROM submissions WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return;

        if (!$row['report_key']) {
            $row['report_key'] = new_report_key();
            db()->prepare('UPDATE submissions SET report_key = ? WHERE id = ?')->execute([$row['report_key'], $id]);
        }

        // Field names must match the DocType in docs/crm-setup.md.
        $fields = [
            'business_name' => $row['company_name'] ?: 'Unnamed business',
            'contact_name'  => $row['contact_name'],
            'phone'         => $row['phone_number'],
            'email'         => $row['email'],
            'report_link'   => report_link($id, $row['report_key']),
            // The last step ("Anything else on your mind?"). A CRM without these fields simply ignores them.
            'problem_summary' => crm_problem_summary($row),
            'client_note'     => crm_client_note($row),
            // Set once the recording is attached (below); empty again when the client removed it.
            'voice_note'      => ($row['open_voice'] ?? null) ? ($row['open_voice_url'] ?? null) : null,
        ];

        $doctype = rawurlencode(CRM_DOCTYPE);
        if ($row['crm_ref']) {
            crm_request('PUT', "/api/resource/$doctype/" . rawurlencode($row['crm_ref']), $fields);
            $ref = $row['crm_ref'];
        } else {
            $res = crm_request('POST', "/api/resource/$doctype", $fields);
            $ref = $res['data']['name'] ?? null;
            if (!is_string($ref) || $ref === '') throw new RuntimeException('CRM did not return the new record name');
        }
        // A voice note not attached yet: attach it to the record (which fills voice_note), then drop our copy.
        if (!empty($row['open_voice']) && empty($row['open_voice_url']) && is_file(voice_dir() . '/' . basename($row['open_voice']))) {
            $url = crm_upload_voice($ref, voice_dir() . '/' . basename($row['open_voice']));
            db()->prepare('UPDATE submissions SET open_voice_url = ? WHERE id = ?')->execute([$url, $id]);
            voice_delete_file($row['open_voice']);
        }
        db()->prepare('UPDATE submissions SET crm_ref = ?, crm_synced_at = NOW(), crm_error = NULL WHERE id = ?')->execute([$ref, $id]);
    } catch (Throwable $e) {
        error_log("CRM sync failed for submission $id: " . $e->getMessage());
        try {
            db()->prepare('UPDATE submissions SET crm_error = ? WHERE id = ?')->execute([substr($e->getMessage(), 0, 255), $id]);
        } catch (Throwable $ignored) {
        }
    } finally {
        try {
            db()->query("SELECT RELEASE_LOCK(" . db()->quote($lock) . ")");
        } catch (Throwable $ignored) {
        }
    }
}

/** The team's short summary of the client's note from the last step: "• point" lines, or null. */
function crm_problem_summary(array $row): ?string {
    $summary = decode_json_col($row['open_summary'] ?? null);
    $points = is_array($summary['points'] ?? null) ? $summary['points'] : [];
    $lines = [];
    foreach ($points as $p) {
        if (is_string($p) && ($p = trim(strip_tags($p))) !== '') $lines[] = '• ' . $p;
    }
    return $lines ? implode("\n", $lines) : null;
}

/**
 * What the client told us in the last step, as plain text: their typed note, and what their
 * voice note says (written down by the AI — the recording itself is the voice_note attachment).
 */
function crm_client_note(array $row): ?string {
    $parts = [];
    $typed = trim(strip_tags((string) ($row['open_text'] ?? '')));
    if ($typed !== '') $parts[] = $typed;
    $heard = trim(strip_tags((string) ($row['open_transcript'] ?? '')));
    if ($heard !== '') $parts[] = "Voice note (written down by AI — listen to the recording to be sure):\n" . $heard;
    $text = implode("\n\n", $parts);
    if ($text === '') return null;
    return function_exists('mb_substr') ? mb_substr($text, 0, 20000) : substr($text, 0, 20000);
}

// ── Voice notes ──────────────────────────────────────────────

/** Where voice notes wait until they are attached to the CRM record (blocked from the web by .htaccess). */
function voice_dir(): string {
    return dirname(__DIR__) . '/uploads/voice';
}

function voice_delete_file(?string $name): void {
    if ($name === null || $name === '') return;
    $path = voice_dir() . '/' . basename($name);
    if (is_file($path)) @unlink($path);
}

/**
 * Attach a recording to the CRM record as a private file, through the DocType's own
 * attach_voice_note method (Frappe's upload_file refuses audio from an API user without desk
 * access). Returns the file's URL in the CRM.
 */
function crm_upload_voice(string $ref, string $path): string {
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $mime = ['webm' => 'audio/webm', 'ogg' => 'audio/ogg', 'm4a' => 'audio/mp4', 'mp3' => 'audio/mpeg', 'wav' => 'audio/wav'][$ext] ?? 'application/octet-stream';
    $ch = curl_init(rtrim(CRM_URL, '/') . '/api/method/run_doc_method');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_HTTPHEADER     => ['Authorization: token ' . CRM_API_KEY . ':' . CRM_API_SECRET, 'Accept: application/json'],
        CURLOPT_POSTFIELDS     => [
            'dt'     => CRM_DOCTYPE,
            'dn'     => $ref,
            'method' => 'attach_voice_note',
            'file'   => new CURLFile($path, $mime, "voice-note-$ref.$ext"),
        ],
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    unset($ch);
    if ($raw === false) throw new RuntimeException('CRM not reachable for the voice note: ' . $error);
    $data = json_decode((string) $raw, true);
    $url = is_array($data) ? ($data['message']['file_url'] ?? null) : null;
    if ($status < 200 || $status >= 300 || !is_string($url) || $url === '') {
        $reason = is_array($data) ? ($data['exception'] ?? $data['exc_type'] ?? '') : '';
        throw new RuntimeException("CRM refused the voice note ($status)" . ($reason !== '' ? ': ' . substr((string) $reason, 0, 160) : ''));
    }
    return $url;
}
