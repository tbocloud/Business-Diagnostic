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
function report_link(int $id, string $key, string $kind = 'health'): string {
    if (SITE_URL === '') throw new RuntimeException('SITE_URL is not set, so the report link cannot be built');
    $page = ['health' => 'results', 'deep' => 'deep/results', 'erp' => 'erp/results'][$kind] ?? 'results';
    return rtrim(SITE_URL, '/') . "/$page/#id=$id&k=$key";
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

        // Field names must match the DocType in docs/crm-setup.md. Who the client is: only what we
        // know, so syncing one check (e.g. Stage 2) never wipes details another one added.
        $kind = $row['check_type'] ?? 'health';
        $fields = array_filter([
            'business_name' => $row['company_name'],
            'contact_name'  => $row['contact_name'],
            'phone'         => crm_phone($row['phone_number']),
            'email'         => $row['email'] ? trim($row['email']) : null,
        ], fn($v) => $v !== null && $v !== '') + crm_check_fields($kind, $id, $row) + crm_open_fields($row);

        $doctype = rawurlencode(CRM_DOCTYPE);
        // The client's existing record: this check's own, else the Stage 1 check it follows (same
        // device), else one with the same email, phone, or business name and contact name.
        $ref = $row['crm_ref'] ?: (crm_parent_ref($row) ?? (crm_find_client($row)[0] ?? null));
        if ($ref) {
            crm_request('PUT', "/api/resource/$doctype/" . rawurlencode($ref), $fields);
        } else {
            $fields['business_name'] ??= 'Unnamed business';
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
        // Contact details given later can show the client already had a record: keep the oldest.
        $ref = crm_merge_duplicates($row, $ref);
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

// ── Per check ────────────────────────────────────────────────

/** What each kind of check puts on the CRM record. A CRM without some of these fields ignores them. */
function crm_check_fields(string $kind, int $id, array $row): array {
    if ($kind === 'deep' || $kind === 'erp') {
        $summary = decode_json_col($row['results_summary'] ?? null);
        $points = [];
        foreach (is_array($summary['points'] ?? null) ? $summary['points'] : [] as $p) {
            if (is_string($p) && ($p = trim(strip_tags($p))) !== '') $points[] = '• ' . $p;
        }
        $prefix = $kind === 'deep' ? 'stage2' : 'erp';
        return [
            "{$prefix}_report_link" => report_link($id, $row['report_key'], $kind),
            "{$prefix}_summary"     => $points ? implode("\n", $points) : null,
        ];
    }
    return ['report_link' => report_link($id, $row['report_key'])];
}

/**
 * The last step of every check this client took ("Anything else on your mind?"), together:
 * the summary points and their own words, labelled by check when there is more than one, and
 * the latest voice note (attached below; empty again when the client removed it).
 */
function crm_open_fields(array $row): array {
    $rows = [$row];
    if (!empty($row['crm_ref'])) {
        $stmt = db()->prepare('SELECT * FROM submissions WHERE crm_ref = ? AND id <> ? ORDER BY id');
        $stmt->execute([$row['crm_ref'], $row['id']]);
        $rows = array_merge($stmt->fetchAll(), [$row]);
    }
    $names = ['health' => 'Stage 1', 'deep' => 'Stage 2', 'erp' => 'ERP check'];
    $said = array_values(array_filter($rows, fn($r) => crm_problem_summary($r) !== null || crm_client_note($r) !== null));
    $label = count($said) > 1;
    $points = [];
    $notes = [];
    foreach ($said as $r) {
        $name = $names[$r['check_type'] ?? 'health'] ?? 'Check';
        if ($summary = crm_problem_summary($r)) {
            foreach (explode("\n", $summary) as $line) $points[] = $label ? preg_replace('/^• /', "• $name: ", $line) : $line;
        }
        if ($note = crm_client_note($r)) $notes[] = $label ? "$name —\n$note" : $note;
    }
    $voice = null;
    foreach ($rows as $r) if (!empty($r['open_voice']) && !empty($r['open_voice_url'])) $voice = $r['open_voice_url'];
    return [
        'problem_summary' => $points ? implode("\n", $points) : null,
        'client_note'     => $notes ? implode("\n\n", $notes) : null,
        'voice_note'      => $voice,
    ];
}

/** The CRM record of the Stage 1 check this one follows (syncing that check first if it has none yet). */
function crm_parent_ref(array $row): ?string {
    $parent = (int) ($row['parent_id'] ?? 0);
    if ($parent <= 0) return null;
    $get = function () use ($parent): ?string {
        $stmt = db()->prepare('SELECT crm_ref FROM submissions WHERE id = ?');
        $stmt->execute([$parent]);
        return ($ref = $stmt->fetchColumn()) ? (string) $ref : null;
    };
    $ref = $get();
    if ($ref === null) {
        crm_sync_submission($parent);
        $ref = $get();
    }
    return $ref;
}

// ── The same client, once ────────────────────────────────────

/** One form for a phone number, so it matches however it was typed: "+91 98950 22334" → "+919895022334". */
function crm_phone(?string $phone): ?string {
    if ($phone === null || trim($phone) === '') return null;
    $digits = preg_replace('/\D/', '', $phone);
    if (strlen($digits) === 10) return '+91' . $digits;
    if (strlen($digits) === 11 && $digits[0] === '0') return '+91' . substr($digits, 1);
    if (strlen($digits) === 12 && strpos($digits, '91') === 0) return '+' . $digits;
    return (strpos(trim($phone), '+') === 0 ? '+' : '') . $digits;
}

/**
 * CRM records of the same client, oldest first: the same email or phone — or (unless $strong)
 * the same business name AND contact name.
 */
function crm_find_client(array $row, bool $strong = false): array {
    $found = [];
    $or = [];
    if (!empty($row['email'])) $or[] = ['email', '=', trim($row['email'])];
    $phone = crm_phone($row['phone_number'] ?? null);
    // The last 10 digits in order with anything between, so "+91 94470 12345", "094470-12345" and
    // "+919447012345" (as BDEs may have typed them in the CRM) all match.
    if ($phone !== null) $or[] = ['phone', 'like', '%' . implode('%', str_split(substr(preg_replace('/\D/', '', $phone), -10)))];
    if ($or) $found = array_merge($found, crm_list(['or_filters' => $or]));
    if (!$strong && !empty($row['company_name']) && !empty($row['contact_name'])) {
        $found = array_merge($found, crm_list(['filters' => [
            ['business_name', '=', trim($row['company_name'])],
            ['contact_name', '=', trim($row['contact_name'])],
        ]]));
    }
    usort($found, fn($a, $b) => strcmp((string) $a['creation'], (string) $b['creation']));
    return array_values(array_unique(array_map(fn($r) => (string) $r['name'], $found)));
}

/** A few CRM records (name + creation) matching Frappe filters. */
function crm_list(array $filters): array {
    $query = ['fields' => json_encode(['name', 'creation']), 'order_by' => 'creation asc', 'limit_page_length' => 10];
    foreach ($filters as $key => $value) $query[$key] = json_encode($value);
    $res = crm_request('GET', '/api/resource/' . rawurlencode(CRM_DOCTYPE) . '?' . http_build_query($query));
    return array_values(array_filter(is_array($res['data'] ?? null) ? $res['data'] : [], fn($r) => is_array($r) && isset($r['name'])));
}

/**
 * When this check's phone or email shows the client is also on other records, merge them
 * all into the oldest (the DocType's merge_into, run in the CRM) and point our checks at it.
 * Returns the record this check now belongs to.
 */
function crm_merge_duplicates(array $row, string $ref): string {
    if (empty($row['email']) && empty($row['phone_number'])) return $ref;
    $same = crm_find_client($row, true);
    if (!in_array($ref, $same, true)) $same[] = $ref;
    if (count($same) < 2) return $ref;
    $target = $same[0];
    foreach (array_slice($same, 1) as $other) {
        crm_request('POST', '/api/method/run_doc_method', [
            'dt' => CRM_DOCTYPE, 'dn' => $other, 'method' => 'merge_into', 'args' => json_encode(['target' => $target]),
        ]);
        db()->prepare('UPDATE submissions SET crm_ref = ? WHERE crm_ref = ?')->execute([$target, $other]);
        error_log("CRM: merged $other into $target (same client)");
    }
    return $target;
}
