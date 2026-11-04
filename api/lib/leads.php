<?php
// Shared shaping of `submissions` rows for the admin panel.

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) { http_response_code(404); exit; }

/** Columns needed for the leads list (no big JSON blobs). */
const LEAD_LIST_COLUMNS = 'id, created_at, updated_at, source, company_name, contact_name, phone_number, email, industry,
    business_age, team_size, score_average, overall_rating, real_gap, biggest_headache, status, assigned_to, follow_up_on';

/** id → name for every account (small table). */
function user_names(): array {
    $out = [];
    foreach (db()->query('SELECT id, name FROM bde_users')->fetchAll() as $u) $out[(int) $u['id']] = $u['name'];
    return $out;
}

function lead_out(array $r, array $names): array {
    $assigned = $r['assigned_to'] !== null ? (int) $r['assigned_to'] : null;
    return [
        'id'           => (int) $r['id'],
        'createdAt'    => iso($r['created_at']),
        'updatedAt'    => iso($r['updated_at'] ?? null),
        'source'       => $r['source'],
        'company'      => $r['company_name'],
        'contactName'  => $r['contact_name'],
        'phone'        => $r['phone_number'],
        'email'        => $r['email'],
        'industry'     => $r['industry'],
        'stage'        => $r['business_age'],
        'team'         => $r['team_size'],
        'score'        => $r['score_average'] !== null ? (int) $r['score_average'] : null,
        'band'         => $r['overall_rating'],
        'realGap'      => $r['real_gap'],
        'headache'     => $r['biggest_headache'],
        'status'       => $r['status'],
        'assignedTo'   => $assigned,
        'assignedName' => $assigned !== null ? ($names[$assigned] ?? 'Removed user') : null,
        'followUpOn'   => $r['follow_up_on'],
    ];
}

/** WHERE clause limiting what this user may see. */
function visibility_sql(array $user, array &$params): string {
    // The panel works Stage 1 check-ups; Stage 2 and the ERP check reach the team on the CRM record.
    $only = "check_type = 'health'";
    if ($user['role'] === 'admin') return $only;
    $params[] = $user['id'];
    return "$only AND (assigned_to IS NULL OR assigned_to = ?)";
}

function notes_for(int $submissionId, array $names): array {
    $stmt = db()->prepare('SELECT id, user_id, kind, body, created_at FROM lead_notes WHERE submission_id = ? ORDER BY created_at DESC, id DESC');
    $stmt->execute([$submissionId]);
    return array_map(fn($n) => [
        'id'        => (int) $n['id'],
        'kind'      => $n['kind'],
        'body'      => $n['body'],
        'createdAt' => iso($n['created_at']),
        'author'    => $n['user_id'] !== null ? ($names[(int) $n['user_id']] ?? 'Removed user') : null,
    ], $stmt->fetchAll());
}

function fetch_lead_row(int $id): ?array {
    $stmt = db()->prepare('SELECT * FROM submissions WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}
