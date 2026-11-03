<?php
// ─────────────────────────────────────────────────────────────
//  GET /api/admin/leads.php
//    ?q=        search company, contact, phone, email
//    ?status=   all | new | contacted | meeting | proposal | won | lost
//    ?owner=    all | mine | unassigned | <userId>   (BDEs only ever see theirs + unassigned)
//    ?sort=     newest | oldest | score_low | score_high | followup
//    ?page=1
//  → { leads, total, page, perPage, counts, stats, users }
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/leads.php';

const PER_PAGE = 25;

run(function () {
    require_method('GET');
    $user = require_user();

    // Base filter (visibility + owner + search) — shared by the list and the status counts.
    $params = [];
    $where = [visibility_sql($user, $params)];

    $owner = $_GET['owner'] ?? 'all';
    if ($owner === 'mine') {
        $where[] = 'assigned_to = ?';
        $params[] = $user['id'];
    } elseif ($owner === 'unassigned') {
        $where[] = 'assigned_to IS NULL';
    } elseif (ctype_digit((string) $owner) && $user['role'] === 'admin') {
        $where[] = 'assigned_to = ?';
        $params[] = (int) $owner;
    }

    $q = str_or_null($_GET['q'] ?? null, 100);
    if ($q !== null) {
        $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
        $where[] = '(company_name LIKE ? OR contact_name LIKE ? OR phone_number LIKE ? OR email LIKE ?)';
        array_push($params, $like, $like, $like, $like);
    }
    $base = implode(' AND ', $where);

    // Counts per status (for the filter chips)
    $counts = array_fill_keys(array_merge(['all'], LEAD_STATUSES), 0);
    $stmt = db()->prepare("SELECT status, COUNT(*) AS n FROM submissions WHERE $base GROUP BY status");
    $stmt->execute($params);
    foreach ($stmt->fetchAll() as $c) {
        if (isset($counts[$c['status']])) $counts[$c['status']] = (int) $c['n'];
        $counts['all'] += (int) $c['n'];
    }

    // Headline stats (visibility only — not affected by filters)
    $vParams = [];
    $vis = visibility_sql($user, $vParams);
    $stmt = db()->prepare(
        "SELECT
            SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))                                   AS this_week,
            ROUND(AVG(score_average))                                                             AS avg_score,
            SUM(status = 'won')                                                                   AS won,
            SUM(follow_up_on IS NOT NULL AND follow_up_on <= CURDATE() AND status NOT IN ('won','lost')) AS due,
            SUM(status = 'new')                                                                   AS fresh,
            COUNT(*)                                                                              AS total
         FROM submissions WHERE $vis"
    );
    $stmt->execute($vParams);
    $s = $stmt->fetch();
    $stats = [
        'thisWeek'     => (int) $s['this_week'],
        'avgScore'     => $s['avg_score'] !== null ? (int) $s['avg_score'] : null,
        'won'          => (int) $s['won'],
        'followUpsDue' => (int) $s['due'],
        'new'          => (int) $s['fresh'],
        'total'        => (int) $s['total'],
    ];

    // The page of leads
    $listWhere = $base;
    $listParams = $params;
    $status = $_GET['status'] ?? 'all';
    if (in_array($status, LEAD_STATUSES, true)) {
        $listWhere .= ' AND status = ?';
        $listParams[] = $status;
    }
    $order = [
        'oldest'     => 'created_at ASC, id ASC',
        'score_low'  => 'score_average IS NULL, score_average ASC, created_at DESC',
        'score_high' => 'score_average IS NULL, score_average DESC, created_at DESC',
        'followup'   => 'follow_up_on IS NULL, follow_up_on ASC, created_at DESC',
    ][$_GET['sort'] ?? ''] ?? 'created_at DESC, id DESC';

    $stmt = db()->prepare("SELECT COUNT(*) FROM submissions WHERE $listWhere");
    $stmt->execute($listParams);
    $total = (int) $stmt->fetchColumn();

    $page = max(1, id_from($_GET['page'] ?? 1));
    $offset = ($page - 1) * PER_PAGE;
    $stmt = db()->prepare('SELECT ' . LEAD_LIST_COLUMNS . " FROM submissions WHERE $listWhere ORDER BY $order LIMIT " . PER_PAGE . " OFFSET $offset");
    $stmt->execute($listParams);
    $names = user_names();
    $leads = array_map(fn($r) => lead_out($r, $names), $stmt->fetchAll());

    $users = [];
    foreach (db()->query('SELECT id, name, role, active FROM bde_users ORDER BY name')->fetchAll() as $u) {
        $users[] = ['id' => (int) $u['id'], 'name' => $u['name'], 'role' => $u['role'], 'active' => (bool) $u['active']];
    }

    json_out([
        'leads'   => $leads,
        'total'   => $total,
        'page'    => $page,
        'perPage' => PER_PAGE,
        'counts'  => $counts,
        'stats'   => $stats,
        'users'   => $users,
    ]);
});
