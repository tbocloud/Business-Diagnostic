<?php
// ─────────────────────────────────────────────
//  POST /api/save-phone.php
//  Saves phone number to an existing submission
// ─────────────────────────────────────────────

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

require_once __DIR__ . '/config.php';

// ── Parse request body ────────────────────────
$body         = json_decode(file_get_contents('php://input'), true);
$submissionId = $body['submissionId'] ?? null;
$phone        = $body['phone']        ?? null;

if (!$submissionId || !$phone) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing submissionId or phone']);
    exit;
}

// ── Update MySQL ──────────────────────────────
try {
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $stmt = $pdo->prepare('UPDATE submissions SET phone_number = ? WHERE id = ?');
    $stmt->execute([$phone, (int) $submissionId]);

    echo json_encode(['ok' => true]);

} catch (Exception $e) {
    error_log('Phone save failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
