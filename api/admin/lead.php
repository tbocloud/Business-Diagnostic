<?php
// ─────────────────────────────────────────────────────────────
//  /api/admin/lead.php
//  GET  ?id=12 → { lead, report, legacy, notes, users }
//  POST { id, status?, assignedTo?, followUpOn?, contact? { name, phone, email } } → same as GET
//
//  BDEs can work any lead they can see; they can take an unassigned lead or
//  hand back their own, but only an admin can assign leads to someone else.
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/leads.php';

const STATUS_LABELS = [
    'new' => 'New', 'contacted' => 'Contacted', 'meeting' => 'Meeting booked',
    'proposal' => 'Proposal sent', 'won' => 'Won', 'lost' => 'Lost',
];

run(function () {
    $method = require_method('GET', 'POST');
    $user = require_user();

    $body = $method === 'POST' ? json_body() : [];
    $id = id_from($method === 'POST' ? ($body['id'] ?? null) : ($_GET['id'] ?? null));
    if ($id <= 0) fail('Missing lead id');

    $row = fetch_lead_row($id);
    if (!$row || !can_access_lead($user, $row)) fail('Lead not found', 404);
    $names = user_names();

    if ($method === 'POST') {
        $sets = [];
        $params = [];
        // History entries are collected first and written with the update in one transaction,
        // so a request that fails validation half-way never leaves a "changed" note behind.
        $activity = [];

        if (array_key_exists('status', $body)) {
            $status = $body['status'];
            if (!in_array($status, LEAD_STATUSES, true)) fail('Unknown status');
            if ($status !== $row['status']) {
                $sets[] = 'status = ?';
                $params[] = $status;
                $activity[] = ['status', 'Status: ' . STATUS_LABELS[$row['status']] . ' → ' . STATUS_LABELS[$status]];
            }
        }

        if (array_key_exists('assignedTo', $body)) {
            $to = $body['assignedTo'] === null ? null : id_from($body['assignedTo']);
            if ($to === 0) fail('Unknown team member');
            $current = $row['assigned_to'] !== null ? (int) $row['assigned_to'] : null;
            if ($to !== $current) {
                if ($user['role'] !== 'admin') {
                    $taking = $to === $user['id'] && $current === null;
                    $handingBack = $to === null && $current === $user['id'];
                    if (!$taking && !$handingBack) fail('Only an admin can assign leads to someone else', 403);
                }
                if ($to !== null) {
                    $stmt = db()->prepare('SELECT active FROM bde_users WHERE id = ?');
                    $stmt->execute([$to]);
                    if (!(int) $stmt->fetchColumn()) fail('That team member is not active');
                }
                $sets[] = 'assigned_to = ?';
                $params[] = $to;
                $activity[] = ['assign', $to === null ? 'Lead unassigned' : 'Assigned to ' . ($names[$to] ?? 'someone')];
            }
        }

        if (array_key_exists('followUpOn', $body)) {
            $date = $body['followUpOn'];
            if ($date !== null && !(is_string($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) && strtotime($date))) fail('Invalid date');
            if ($date !== $row['follow_up_on']) {
                $sets[] = 'follow_up_on = ?';
                $params[] = $date;
                $activity[] = ['followup', $date ? 'Follow-up set for ' . date('j M Y', strtotime($date)) : 'Follow-up cleared'];
            }
        }

        if (is_array($body['contact'] ?? null)) {
            $c = $body['contact'];
            $phone = str_or_null($c['phone'] ?? null, 30);
            $email = str_or_null($c['email'] ?? null, 190);
            if ($phone !== null && !preg_match('/^\+?[0-9 ()\-]{6,30}$/', $phone)) fail('That phone number doesn’t look right');
            if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('That email doesn’t look right');
            $name = str_or_null($c['name'] ?? null, 120);
            $changes = [];
            foreach ([['name', $name, 'contact_name'], ['phone', $phone, 'phone_number'], ['email', $email, 'email']] as [$label, $new, $col]) {
                if ($new === $row[$col]) continue;
                $changes[] = $label . ': ' . ($row[$col] ?? '—') . ' → ' . ($new ?? '—');
            }
            if ($changes) {
                array_push($sets, 'contact_name = ?', 'phone_number = ?', 'email = ?');
                array_push($params, $name, $phone, $email);
                $activity[] = ['contact', 'Contact details changed (' . implode('; ', $changes) . ')'];
            }
        }

        if ($sets) {
            // The access check above used the row as it was when we read it. Another BDE may have
            // taken the lead since, so a BDE's write only applies if the lead is STILL unassigned
            // or theirs — checked by the UPDATE itself, atomically.
            $where = 'id = ?';
            $params[] = $id;
            if ($user['role'] !== 'admin') {
                $where .= ' AND (assigned_to IS NULL OR assigned_to = ?)';
                $params[] = $user['id'];
            }
            $pdo = db();
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare('UPDATE submissions SET ' . implode(', ', $sets) . " WHERE $where");
                $stmt->execute($params);
                if ($stmt->rowCount() !== 1) { // matched rows (MYSQL_ATTR_FOUND_ROWS)
                    $pdo->rollBack();
                    fail('Someone else just took this lead — reload to see the latest.', 409);
                }
                foreach ($activity as [$kind, $text]) add_activity($id, $user['id'], $kind, $text);
                $pdo->commit();
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            $row = fetch_lead_row($id);
        }
    }

    // ── Shape the response ──
    $raw = decode_json_col($row['raw_answers']);
    $isV2 = is_array($raw) && ($raw['version'] ?? null) === 2;

    $users = [];
    foreach (db()->query('SELECT id, name, role, active FROM bde_users ORDER BY name')->fetchAll() as $u) {
        $users[] = ['id' => (int) $u['id'], 'name' => $u['name'], 'role' => $u['role'], 'active' => (bool) $u['active']];
    }

    json_out([
        'lead'   => lead_out($row, $names) + ['summary' => decode_json_col($row['results_summary'])],
        // v2 check-ups: the exact answers, so the panel rebuilds the client's report.
        'report' => $isV2 ? ['profile' => $raw['profile'], 'answers' => $raw['answers']] : null,
        // Older (GPT) submissions: whatever was stored.
        'legacy' => $isV2 ? null : [
            'scores' => [
                'Operations'      => $row['score_operations'] !== null ? (int) $row['score_operations'] : null,
                'Finance'         => $row['score_finance'] !== null ? (int) $row['score_finance'] : null,
                'Marketing'       => $row['score_marketing'] !== null ? (int) $row['score_marketing'] : null,
                'Digital presence' => $row['score_digital'] !== null ? (int) $row['score_digital'] : null,
                'AI readiness'    => $row['score_ai_readiness'] !== null ? (int) $row['score_ai_readiness'] : null,
            ],
            'analysis' => decode_json_col($row['gpt_output']),
            'answers'  => $raw,
        ],
        'notes' => notes_for($id, $names),
        'users' => $users,
    ]);
});
