<?php
// ─────────────────────────────────────────────
//  GET /api/get-result.php?id=123
//  Returns stored submission by ID
// ─────────────────────────────────────────────

header('Content-Type: application/json');

require_once __DIR__ . '/config.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing id']);
    exit;
}

try {
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $stmt = $pdo->prepare('SELECT * FROM submissions WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Result not found']);
        exit;
    }

    $gptOutput  = json_decode($row['gpt_output'],  true) ?? [];
    $rawAnswers = json_decode($row['raw_answers'],  true) ?? [];

    echo json_encode(array_merge($gptOutput, [
        'submissionId' => (int)$row['id'],
        'scores' => [
            'operations'      => (int)$row['score_operations'],
            'finance'         => (int)$row['score_finance'],
            'marketing'       => (int)$row['score_marketing'],
            'digitalPresence' => (int)$row['score_digital'],
            'aiReadiness'     => (int)$row['score_ai_readiness'],
        ],
        'answers' => $rawAnswers,
    ]));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
