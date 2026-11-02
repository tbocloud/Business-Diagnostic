<?php
// ─────────────────────────────────────────────────────────────
//  /api/admin/setup.php — create the FIRST admin account.
//  GET  → { needsSetup, setupReady }
//  POST { setupToken, name, email, password } → { user }   (only while no accounts exist)
//
//  The repo is public, so "first visitor becomes admin" would let anyone who finds
//  /admin/ before you take over the panel. Setup therefore needs the one-time
//  SETUP_TOKEN from api/config.php — something only people with server access know.
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../lib/bootstrap.php';

const MIN_TOKEN_LENGTH = 12;

run(function () {
    $method = require_method('GET', 'POST');
    $token  = defined('SETUP_TOKEN') ? (string) SETUP_TOKEN : (string) (getenv('SETUP_TOKEN') ?: '');
    $ready  = strlen($token) >= MIN_TOKEN_LENGTH;

    if ($method === 'GET') {
        $count = (int) db()->query('SELECT COUNT(*) FROM bde_users')->fetchColumn();
        json_out(['needsSetup' => $count === 0, 'setupReady' => $ready]);
    }

    $body = json_body();
    // Once an admin exists, setup is closed — say so before even looking at the code,
    // so the code can't be confirmed by guessing afterwards.
    if ((int) db()->query('SELECT COUNT(*) FROM bde_users')->fetchColumn() > 0) fail('Setup is already done — log in instead', 403);
    // Parallel guessing is capped per IP (usleep alone only slows one request at a time).
    rate_limit('setup', 10, 3600);
    if (!$ready) fail("Setup is locked. Add define('SETUP_TOKEN', '…'); (12+ characters) to api/config.php first.", 403);
    if (!hash_equals($token, (string) ($body['setupToken'] ?? ''))) {
        usleep(400000);
        fail('That setup code is not correct', 403);
    }

    $name  = str_or_null($body['name'] ?? null, 120);
    $email = strtolower((string) str_or_null($body['email'] ?? null, 190));
    $pass  = is_string($body['password'] ?? null) ? $body['password'] : '';
    if (!$name) fail('Add your name');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Add a valid email');
    if (strlen($pass) < 8) fail('Use a password of at least 8 characters');

    // Check-then-insert under a named lock, so two setup requests can't both create an admin.
    // (The lock is released when this request's DB connection closes, even on an early exit.)
    if ((int) db()->query("SELECT GET_LOCK('bhc_first_admin', 5)")->fetchColumn() !== 1) fail('Please try again', 503);
    if ((int) db()->query('SELECT COUNT(*) FROM bde_users')->fetchColumn() > 0) fail('Setup is already done — log in instead', 403);

    db()->prepare("INSERT INTO bde_users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
        ->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT)]);
    $id = (int) db()->lastInsertId();
    db()->query("SELECT RELEASE_LOCK('bhc_first_admin')");

    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = $id;
    json_out(['user' => ['id' => $id, 'name' => $name, 'email' => $email, 'role' => 'admin']], 201);
});
