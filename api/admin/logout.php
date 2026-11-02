<?php
// POST /api/admin/logout.php → { ok }

require_once __DIR__ . '/../lib/bootstrap.php';

run(function () {
    require_method('POST');
    start_session();
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Strict',
    ]);
    session_destroy();
    json_out(['ok' => true]);
});
