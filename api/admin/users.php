<?php
// ─────────────────────────────────────────────────────────────
//  /api/admin/users.php — team accounts (admin only)
//  GET → { users }
//  POST { action: 'create', name, email, password, role }
//       { action: 'update', id, name?, role?, active? }
//       { action: 'reset_password', id, password }
//  → { users }
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../lib/bootstrap.php';

run(function () {
    $method = require_method('GET', 'POST');
    $me = require_admin();

    if ($method === 'POST') {
        $body = json_body();
        $action = $body['action'] ?? '';

        if ($action === 'create') {
            $name  = str_or_null($body['name'] ?? null, 120);
            $email = strtolower((string) str_or_null($body['email'] ?? null, 190));
            $pass  = is_string($body['password'] ?? null) ? $body['password'] : '';
            $role  = ($body['role'] ?? 'bde') === 'admin' ? 'admin' : 'bde';
            if (!$name) fail('Add a name');
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Add a valid email');
            if (strlen($pass) < 8) fail('Use a password of at least 8 characters');
            $stmt = db()->prepare('SELECT COUNT(*) FROM bde_users WHERE email = ?');
            $stmt->execute([$email]);
            if ((int) $stmt->fetchColumn() > 0) fail('Someone already uses that email');
            db()->prepare('INSERT INTO bde_users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
                ->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT), $role]);

        } elseif ($action === 'update') {
            $id = (int) ($body['id'] ?? 0);
            $target = find_user($id);
            $sets = [];
            $params = [];
            if (array_key_exists('name', $body)) {
                $name = str_or_null($body['name'], 120);
                if (!$name) fail('Add a name');
                $sets[] = 'name = ?';
                $params[] = $name;
            }
            if (array_key_exists('role', $body)) {
                $role = $body['role'] === 'admin' ? 'admin' : 'bde';
                if ($id === $me['id'] && $role !== 'admin') fail('You can’t remove your own admin rights');
                $sets[] = 'role = ?';
                $params[] = $role;
            }
            if (array_key_exists('active', $body)) {
                $active = (bool) $body['active'];
                if ($id === $me['id'] && !$active) fail('You can’t deactivate your own account');
                $sets[] = 'active = ?';
                $params[] = $active ? 1 : 0;
                if (!$active) {
                    // Their open leads go back to the shared pool so nothing is stranded.
                    db()->prepare("UPDATE submissions SET assigned_to = NULL WHERE assigned_to = ? AND status NOT IN ('won','lost')")
                        ->execute([$id]);
                }
            }
            if ($sets) {
                $params[] = $target['id'];
                db()->prepare('UPDATE bde_users SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
            }

        } elseif ($action === 'reset_password') {
            $target = find_user((int) ($body['id'] ?? 0));
            $pass = is_string($body['password'] ?? null) ? $body['password'] : '';
            if (strlen($pass) < 8) fail('Use a password of at least 8 characters');
            db()->prepare('UPDATE bde_users SET password_hash = ?, failed_logins = 0, locked_until = NULL WHERE id = ?')
                ->execute([password_hash($pass, PASSWORD_DEFAULT), $target['id']]);

        } else {
            fail('Unknown action');
        }
    }

    $rows = db()->query(
        "SELECT u.id, u.name, u.email, u.role, u.active, u.last_login_at, u.created_at,
                (SELECT COUNT(*) FROM submissions s WHERE s.assigned_to = u.id AND s.status NOT IN ('won','lost')) AS open_leads,
                (SELECT COUNT(*) FROM submissions s WHERE s.assigned_to = u.id AND s.status = 'won') AS won_leads
           FROM bde_users u ORDER BY u.active DESC, u.name"
    )->fetchAll();

    json_out(['users' => array_map(fn($u) => [
        'id'          => (int) $u['id'],
        'name'        => $u['name'],
        'email'       => $u['email'],
        'role'        => $u['role'],
        'active'      => (bool) $u['active'],
        'lastLoginAt' => iso($u['last_login_at']),
        'createdAt'   => iso($u['created_at']),
        'openLeads'   => (int) $u['open_leads'],
        'wonLeads'    => (int) $u['won_leads'],
    ], $rows)]);
});

function find_user(int $id): array {
    $stmt = db()->prepare('SELECT id, role FROM bde_users WHERE id = ?');
    $stmt->execute([$id]);
    $u = $stmt->fetch();
    if (!$u) fail('Team member not found', 404);
    $u['id'] = (int) $u['id'];
    return $u;
}
