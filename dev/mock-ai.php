<?php
// ─────────────────────────────────────────────────────────────
//  A tiny stand-in for OpenAI's Chat Completions API, for local testing only —
//  so the last step's note summary can be tried without a real key or any cost.
//    MOCK_AI=1 ./dev/run-local.sh            (starts it for you), or by hand:
//    php -S 127.0.0.1:8098 dev/mock-ai.php
//    OPENAI_API_KEY=mock-key AI_BASE_URL=http://127.0.0.1:8098 ./dev/run-local.sh
//
//  It answers in the same JSON shape the real API returns, with a keyword-based summary.
//  It does not understand anything.
// ─────────────────────────────────────────────────────────────

header('Content-Type: application/json');
$send = function (int $status, array $data) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
};

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || !str_ends_with(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/chat/completions')) {
    $send(404, ['error' => ['message' => 'Only POST /chat/completions is mocked']]);
}
if (($_SERVER['HTTP_AUTHORIZATION'] ?? '') !== 'Bearer mock-key') $send(401, ['error' => ['message' => 'Incorrect API key']]);

$req = json_decode((string) file_get_contents('php://input'), true) ?: [];
$messages = is_array($req['messages'] ?? null) ? $req['messages'] : [];
$note = (string) (end($messages)['content'] ?? '');
$all = strtolower($note);

// Keyword tags, roughly what the real model would pick.
$areas = [];
$services = [];
$tag = function (string $pattern, string $area, array $svc) use ($all, &$areas, &$services) {
    if (preg_match($pattern, $all)) { $areas[] = $area; array_push($services, ...$svc); }
};
$tag('/pay|payment|cash|invoice|late|due|credit/', 'finance', ['erp']);
$tag('/stock|inventory|order|purchase|supplier/', 'operations', ['erp']);
$tag('/staff|team|hire|employee|salary|leave/', 'team', ['erp']);
$tag('/lead|enquir|sales|follow/', 'sales', ['erp', 'ai']);
$tag('/website|google|instagram|facebook|ads|review|marketing/', 'marketing', ['marketing']);
if (!$areas) { $areas = ['operations']; $services = ['erp']; }

// One point per sentence, cut to 18 words.
$points = [];
foreach (array_slice(preg_split('/(?<=[.!?])\s+/', trim($note)) ?: [], 0, 4) as $sentence) {
    $words = preg_split('/\s+/', trim($sentence));
    if ($words && $words[0] !== '') $points[] = implode(' ', array_slice($words, 0, 18)) . (count($words) > 18 ? '…' : '');
}
$out = ['summary_points' => $points, 'areas' => array_values(array_unique($areas)), 'services' => array_values(array_unique($services))];

$send(200, [
    'id'      => 'mock-' . bin2hex(random_bytes(4)),
    'object'  => 'chat.completion',
    'model'   => $req['model'] ?? 'mock',
    'choices' => [[
        'index'         => 0,
        'message'       => ['role' => 'assistant', 'content' => json_encode($out, JSON_UNESCAPED_UNICODE), 'refusal' => null],
        'finish_reason' => 'stop',
    ]],
]);
