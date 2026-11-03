<?php
// ─────────────────────────────────────────────────────────────
//  CRM (ERPNext / Frappe) connection.
//
//  Every finished health check becomes ONE record in the CRM DocType
//  (default "Business Health Check") with basic client info and the
//  link to their report. The same record is updated when the client
//  later leaves a phone number / email, or describes other problems in
//  the last step (problem summary + their own words).
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
            'problem_summary'     => crm_problem_summary($row),
            'client_conversation' => crm_client_conversation($row),
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

/** The team's short summary of what the client described in the last step: "• point" lines, or null. */
function crm_problem_summary(array $row): ?string {
    $summary = decode_json_col($row['open_summary'] ?? null);
    $points = is_array($summary['points'] ?? null) ? $summary['points'] : [];
    $lines = [];
    foreach ($points as $p) {
        if (is_string($p) && ($p = trim(strip_tags($p))) !== '') $lines[] = '• ' . $p;
    }
    return $lines ? implode("\n", $lines) : null;
}

/** The client's own words from the last step: their typed note, or the whole chat. Plain text, or null. */
function crm_client_conversation(array $row): ?string {
    $mode = $row['open_mode'] ?? null;
    if ($mode === 'chat') {
        $lines = decode_json_col($row['open_chat'] ?? null);
        $out = [];
        foreach (is_array($lines) ? $lines : [] as $l) {
            if (!is_array($l) || !is_string($l['text'] ?? null)) continue;
            $who = ($l['role'] ?? '') === 'client' ? 'Client' : 'Assistant';
            $out[] = $who . ': ' . trim(strip_tags($l['text']));
        }
        $text = implode("\n\n", $out);
    } else {
        $text = trim(strip_tags((string) ($row['open_text'] ?? '')));
    }
    if ($text === '') return null;
    return function_exists('mb_substr') ? mb_substr($text, 0, 20000) : substr($text, 0, 20000);
}
