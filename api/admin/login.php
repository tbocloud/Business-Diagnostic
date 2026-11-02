<?php
// ─────────────────────────────────────────────────────────────
//  POST /api/admin/login.php  { email, password } → { user }
//  5 wrong passwords lock the account for 15 minutes.
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../lib/bootstrap.php';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

run(function () {
    require_method('POST');
    $body  = json_body();
    $email = strtolower((string) str_or_null($body['email'] ?? null, 190));
    $pass  = is_string($body['password'] ?? null) ? $body['password'] : '';
    if ($email === '' || $pass === '') fail('Enter your email and password');

    $stmt = db()->prepare('SELECT * FROM bde_users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && $user['locked_until'] && strtotime($user['locked_until']) > time()) {
        $mins = (int) ceil((strtotime($user['locked_until']) - time()) / 60);
        fail("Too many attempts. Try again in $mins minute" . ($mins === 1 ? '' : 's') . '.', 429);
    }

    if (!$user || !(int) $user['active'] || !password_verify($pass, $user['password_hash'])) {
        if ($user) {
            $failed = (int) $user['failed_logins'] + 1;
            if ($failed >= MAX_FAILED) {
                db()->prepare('UPDATE bde_users SET failed_logins = 0, locked_until = DATE_ADD(NOW(), INTERVAL ' . LOCK_MINUTES . ' MINUTE) WHERE id = ?')
                    ->execute([$user['id']]);
            } else {
                db()->prepare('UPDATE bde_users SET failed_logins = ? WHERE id = ?')->execute([$failed, $user['id']]);
            }
        }
        usleep(400000); // slow down guessing
        fail('Email or password is incorrect', 401);
    }

    $update = 'UPDATE bde_users SET failed_logins = 0, locked_until = NULL, last_login_at = NOW()';
    $params = [];
    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        $update .= ', password_hash = ?';
        $params[] = password_hash($pass, PASSWORD_DEFAULT);
    }
    $params[] = $user['id'];
    db()->prepare("$update WHERE id = ?")->execute($params);

    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $user['id'];

    json_out(['user' => ['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role']]]);
});
