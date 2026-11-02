<?php
// ─────────────────────────────────────────────────────────────
//  POST /api/submit.php
//  Saves a finished health check (and re-saves it if the client edits answers).
//
//  Body: { submissionId?, token?, profile, answers, summary }
//  → { submissionId, token }
//
//  Scores are calculated in the browser by the same engine the client sees;
//  the full answers are stored so the admin panel can rebuild the exact report.
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/lib/bootstrap.php';

const SECTION_IDS = ['sales', 'marketing', 'customers', 'operations', 'finance', 'team', 'technology', 'strategy'];

run(function () {
    require_method('POST');
    $body = json_body();

    $profile = is_array($body['profile'] ?? null) ? $body['profile'] : null;
    $answers = is_array($body['answers'] ?? null) ? $body['answers'] : null;
    $summary = is_array($body['summary'] ?? null) ? $body['summary'] : null;
    if ($profile === null || $answers === null || $summary === null) fail('Missing profile, answers or summary');

    // ── Clean the summary: only known keys, sane types ──
    $sections = [];
    foreach (SECTION_IDS as $id) $sections[$id] = int_or_null($summary['sections'][$id] ?? null);
    $topGaps = [];
    foreach (array_slice(is_array($summary['topGaps'] ?? null) ? $summary['topGaps'] : [], 0, 5) as $g) {
        if ($s = str_or_null($g, 160)) $topGaps[] = $s;
    }
    $clean = [
        'overall'       => int_or_null($summary['overall'] ?? null),
        'band'          => str_or_null($summary['band'] ?? null, 50),
        'target'        => int_or_null($summary['target'] ?? null),
        'potential'     => int_or_null($summary['potential'] ?? null),
        'industryLabel' => str_or_null($summary['industryLabel'] ?? null, 100),
        'levelLabel'    => str_or_null($summary['levelLabel'] ?? null, 50),
        'teamLabel'     => str_or_null($summary['teamLabel'] ?? null, 50),
        'headache'      => str_or_null($summary['headache'] ?? null, 255),
        'realGap'       => str_or_null($summary['realGap'] ?? null, 100),
        'realGapId'     => in_array($summary['realGapId'] ?? null, SECTION_IDS, true) ? $summary['realGapId'] : null,
        'strengths'     => int_or_null($summary['strengths'] ?? null, 0, 1000),
        'gaps'          => int_or_null($summary['gaps'] ?? null, 0, 1000),
        'quickWins'     => int_or_null($summary['quickWins'] ?? null, 0, 1000),
        'answered'      => int_or_null($summary['answered'] ?? null, 0, 1000),
        'asked'         => int_or_null($summary['asked'] ?? null, 0, 1000),
        'topGaps'       => $topGaps,
    ];

    $company = str_or_null($profile['businessName'] ?? null, 255);
    $owner   = str_or_null($profile['ownerName'] ?? null, 120);
    $raw     = json_encode(['version' => 2, 'profile' => $profile, 'answers' => $answers], JSON_UNESCAPED_UNICODE);

    $values = [
        'company_name'       => $company,
        'industry'           => $clean['industryLabel'],
        'business_age'       => $clean['levelLabel'],
        'team_size'          => $clean['teamLabel'],
        // The old five columns are filled where an area maps, so older reports keep working.
        'score_operations'   => $sections['operations'],
        'score_finance'      => $sections['finance'],
        'score_marketing'    => $sections['marketing'],
        'score_digital'      => $sections['technology'],
        'score_average'      => $clean['overall'],
        'overall_rating'     => $clean['band'],
        'biggest_headache'   => $clean['headache'],
        'real_gap'           => $clean['realGap'],
        'section_scores'     => json_encode($sections),
        'results_summary'    => json_encode($clean, JSON_UNESCAPED_UNICODE),
        'raw_answers'        => $raw,
    ];

    $pdo = db();

    // ── Re-save: the client edited their answers and finished again ──
    $id    = isset($body['submissionId']) ? (int) $body['submissionId'] : 0;
    $token = is_string($body['token'] ?? null) ? $body['token'] : '';
    if ($id > 0 && $token !== '') {
        $stmt = $pdo->prepare('SELECT edit_token FROM submissions WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row && $row['edit_token'] && hash_equals($row['edit_token'], token_hash($token))) {
            $sets = implode(', ', array_map(fn($c) => "$c = ?", array_keys($values)));
            $pdo->prepare("UPDATE submissions SET $sets WHERE id = ?")->execute([...array_values($values), $id]);
            add_activity($id, null, 'system', 'Client updated their answers. New score: ' . ($clean['overall'] ?? '–') . '/100.');
            json_out(['submissionId' => $id, 'token' => $token]);
        }
        // Unknown id or wrong token → fall through and save as a new submission.
    }

    $token = bin2hex(random_bytes(16));
    $values['source']       = 'health_check_v2';
    $values['edit_token']   = token_hash($token);
    $values['contact_name'] = $owner;
    $cols = implode(', ', array_keys($values));
    $marks = implode(', ', array_fill(0, count($values), '?'));
    $pdo->prepare("INSERT INTO submissions ($cols) VALUES ($marks)")->execute(array_values($values));
    $newId = (int) $pdo->lastInsertId();
    add_activity($newId, null, 'system', 'Health check submitted. Score: ' . ($clean['overall'] ?? '–') . '/100.');

    json_out(['submissionId' => $newId, 'token' => $token], 201);
});

/** Only a hash of the client's token is stored. */
function token_hash(string $token): string {
    return substr(hash('sha256', $token), 0, 32);
}
