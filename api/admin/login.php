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

    if ($user) {
        // Reserve this attempt BEFORE checking the password. The single UPDATE is atomic, so
        // parallel requests can't all read the same counter: at most MAX_FAILED attempts are
        // ever let through between successful logins, however many arrive at once.
        $claim = db()->prepare(
            'UPDATE bde_users SET failed_logins = failed_logins + 1
              WHERE id = ? AND failed_logins < ? AND (locked_until IS NULL OR locked_until <= NOW())'
        );
        $claim->execute([$user['id'], MAX_FAILED]);
        if ($claim->rowCount() === 0) {
            // Locked, or out of attempts → start (or keep) the lock and refuse without checking the password.
            db()->prepare(
                'UPDATE bde_users SET failed_logins = 0, locked_until = DATE_ADD(NOW(), INTERVAL ' . LOCK_MINUTES . ' MINUTE)
                  WHERE id = ? AND (locked_until IS NULL OR locked_until <= NOW())'
            )->execute([$user['id']]);
            fail_locked((int) $user['id']);
        }
    }

    if (!$user || !(int) $user['active'] || !password_verify($pass, $user['password_hash'])) {
        if ($user) {
            // That was the last allowed attempt → lock now.
            db()->prepare(
                'UPDATE bde_users SET failed_logins = 0, locked_until = DATE_ADD(NOW(), INTERVAL ' . LOCK_MINUTES . ' MINUTE)
                  WHERE id = ? AND failed_logins >= ?'
            )->execute([$user['id'], MAX_FAILED]);
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

function fail_locked(int $userId): void {
    $stmt = db()->prepare('SELECT locked_until FROM bde_users WHERE id = ?');
    $stmt->execute([$userId]);
    $until = strtotime((string) $stmt->fetchColumn());
    $mins = max(1, (int) ceil((($until ?: time()) - time()) / 60));
    fail("Too many attempts. Try again in $mins minute" . ($mins === 1 ? '' : 's') . '.', 429);
}
