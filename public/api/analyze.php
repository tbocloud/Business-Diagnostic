<?php
// ─────────────────────────────────────────────
//  POST /api/analyze.php
//  Calls OpenAI and saves result to MySQL
// ─────────────────────────────────────────────

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

require_once __DIR__ . '/config.php';

// ── Parse request body ────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
$prompt  = $body['prompt']  ?? null;
$scores  = $body['scores']  ?? null;
$answers = $body['answers'] ?? null;

if (!$prompt) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing prompt']);
    exit;
}

if (!defined('OPENAI_API_KEY') || str_starts_with(OPENAI_API_KEY, 'sk-your')) {
    http_response_code(500);
    echo json_encode(['error' => 'Add your OPENAI_API_KEY in config.php']);
    exit;
}

// ── Call OpenAI ───────────────────────────────
$payload = json_encode([
    'model'           => 'gpt-4o-mini',
    'temperature'     => 0.35,
    'max_tokens'      => 1200,
    'response_format' => ['type' => 'json_object'],
    'messages'        => [
        [
            'role'    => 'system',
            'content' => 'You are a precise senior business consultant. Return valid JSON only. No markdown, no code blocks, no extra text.'
        ],
        ['role' => 'user', 'content' => $prompt]
    ]
]);

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . OPENAI_API_KEY
    ]
]);

$response   = curl_exec($ch);
$httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpStatus !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'OpenAI error ' . $httpStatus]);
    exit;
}

$data      = json_decode($response, true);
$raw       = $data['choices'][0]['message']['content'] ?? null;
if (!$raw) {
    http_response_code(502);
    echo json_encode(['error' => 'Empty OpenAI response']);
    exit;
}

$gptOutput = json_decode($raw, true);
if (!$gptOutput) {
    http_response_code(502);
    echo json_encode(['error' => 'Invalid JSON from OpenAI']);
    exit;
}

// ── Save to MySQL ─────────────────────────────
$submissionId = null;

if ($scores && $answers) {
    $scoreValues = array_values($scores);
    $avg = (int) round(array_sum($scoreValues) / count($scoreValues));

    try {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

        $stmt = $pdo->prepare(
            'INSERT INTO submissions
              (company_name, industry, business_age, business_type, team_size,
               score_operations, score_finance, score_marketing, score_digital,
               score_ai_readiness, score_average, overall_rating,
               gpt_output, raw_answers)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $stmt->execute([
            $answers['companyName']    ?? null,
            $answers['industry']       ?? null,
            $answers['age']            ?? null,
            $answers['btype']          ?? null,
            $answers['teamSize']       ?? null,
            $scores['operations']      ?? null,
            $scores['finance']         ?? null,
            $scores['marketing']       ?? null,
            $scores['digitalPresence'] ?? null,
            $scores['aiReadiness']     ?? null,
            $avg,
            $gptOutput['overallRating'] ?? null,
            json_encode($gptOutput),
            json_encode($answers)
        ]);

        $submissionId = (int) $pdo->lastInsertId();

    } catch (Exception $e) {
        error_log('MySQL save failed (non-fatal): ' . $e->getMessage());
    }
}

echo json_encode(array_merge($gptOutput, ['submissionId' => $submissionId]));
