<?php
// ─────────────────────────────────────────────────────────────
//  /api/admin/setup.php — create the FIRST admin account.
//  GET  → { needsSetup }
//  POST { name, email, password } → { user }   (only while no accounts exist)
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../lib/bootstrap.php';

run(function () {
    $method = require_method('GET', 'POST');
    $count = (int) db()->query('SELECT COUNT(*) FROM bde_users')->fetchColumn();

    if ($method === 'GET') json_out(['needsSetup' => $count === 0]);
    if ($count > 0) fail('Setup is already done — log in instead', 403);

    $body = json_body();
    $name  = str_or_null($body['name'] ?? null, 120);
    $email = strtolower((string) str_or_null($body['email'] ?? null, 190));
    $pass  = is_string($body['password'] ?? null) ? $body['password'] : '';
    if (!$name) fail('Add your name');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Add a valid email');
    if (strlen($pass) < 8) fail('Use a password of at least 8 characters');

    db()->prepare("INSERT INTO bde_users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
        ->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT)]);
    $id = (int) db()->lastInsertId();

    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = $id;
    json_out(['user' => ['id' => $id, 'name' => $name, 'email' => $email, 'role' => 'admin']], 201);
});
