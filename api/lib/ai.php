<?php
// ─────────────────────────────────────────────────────────────
//  AI for the last step of the check ("Anything else on your mind?").
//
//  OpenAI Chat Completions with Structured Outputs (a JSON schema the reply must match),
//  over plain curl — no SDK, so it runs on normal PHP hosting.
//  Switched off while OPENAI_API_KEY is empty: the chat hides, typing a note still works.
// ─────────────────────────────────────────────────────────────

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) { http_response_code(404); exit; }

function ai_enabled(): bool {
    // 'sk-your…' is the placeholder the old config example shipped with.
    return OPENAI_API_KEY !== '' && strpos(OPENAI_API_KEY, 'sk-your') !== 0;
}

/**
 * One chat completion whose answer must match $schema. Returns the decoded object, or throws
 * with a short reason (never the key, never the full response).
 *
 * @param array $messages [['role' => 'system'|'user'|'assistant', 'content' => string], …]
 */
function ai_json(array $messages, string $schemaName, array $schema, int $maxTokens = 700): array {
    $ch = curl_init(rtrim(AI_BASE_URL, '/') . '/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . OPENAI_API_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS     => json_encode([
            'model'           => AI_MODEL,
            'messages'        => $messages,
            'temperature'     => 0.4,
            'max_tokens'      => $maxTokens,
            'response_format' => [
                'type'        => 'json_schema',
                'json_schema' => ['name' => $schemaName, 'strict' => true, 'schema' => $schema],
            ],
        ], JSON_UNESCAPED_UNICODE),
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    unset($ch); // curl_close() is a no-op since PHP 8 and deprecated in 8.5

    if ($raw === false) throw new RuntimeException('AI not reachable: ' . $error);
    $data = json_decode((string) $raw, true);
    if ($status < 200 || $status >= 300) {
        $reason = is_array($data) ? (string) ($data['error']['message'] ?? '') : '';
        throw new RuntimeException("AI said $status" . ($reason !== '' ? ': ' . substr($reason, 0, 160) : ''));
    }
    $message = $data['choices'][0]['message'] ?? null;
    if (!is_array($message)) throw new RuntimeException('AI gave no answer');
    if (!empty($message['refusal'])) throw new RuntimeException('AI declined to answer');
    if (($data['choices'][0]['finish_reason'] ?? '') === 'length') throw new RuntimeException('AI answer was cut off');
    $out = json_decode((string) ($message['content'] ?? ''), true);
    if (!is_array($out)) throw new RuntimeException('AI answer was not valid JSON');
    return $out;
}
