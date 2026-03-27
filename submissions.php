<?php
require_once __DIR__ . '/api/config.php';

$error = null;
$submissions = [];

try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Fetch all submissions ordered by newest first
    $stmt = $pdo->query("SELECT * FROM submissions ORDER BY created_at DESC");
    $submissions = $stmt->fetchAll();
} catch (Exception $e) {
    $error = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Records - Business Diagnostic</title>
    <style>
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            background: #f4f6f8; 
            padding: 30px; 
            color: #333; 
            margin: 0; 
        }
        h1 { 
            border-bottom: 2px solid #ddd; 
            padding-bottom: 10px; 
            color: #111;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
        }
        th, td { 
            border: 1px solid #e1e4e8; 
            padding: 12px; 
            text-align: left; 
            font-size: 14px; 
        }
        th { 
            background: #f6f8fa; 
            font-weight: 600; 
            text-transform: uppercase; 
            font-size: 12px; 
            color: #555; 
        }
        tr:nth-child(even) { background-color: #fafbfc; }
        tr:hover { background-color: #f0f4f8; }
        .error { 
            color: #721c24; 
            font-weight: bold; 
            background: #f8d7da; 
            padding: 15px; 
            border: 1px solid #f5c6cb;
            border-radius: 4px; 
            margin-bottom: 20px; 
        }
        .score { font-weight: bold; }
        .score-high { color: #28a745; }
        .score-med { color: #f39c12; }
        .score-low { color: #dc3545; }
        pre { 
            background: #f6f8fa; 
            padding: 10px; 
            border-radius: 4px; 
            overflow-x: auto; 
            font-size: 12px; 
            max-width: 300px; 
            max-height: 200px;
            overflow-y: scroll;
            white-space: pre-wrap; 
            word-wrap: break-word;
        }
        .btn {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 8px 16px;
            text-decoration: none;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .btn:hover { background: #0056b3; }
    </style>
</head>
<body>

<div class="container">
    <h1>Submissions Database Viewer</h1>
    <a href="index.html" class="btn">&larr; Back to Form</a>

    <?php if ($error): ?>
        <div class="error">
            Database Connection Error: <?php echo htmlspecialchars($error); ?><br><br>
            Please check your <strong>api/config.php</strong> file and confirm your MySQL server is running.
        </div>
    <?php elseif (empty($submissions)): ?>
        <p>No submissions found in the database yet. Try filling out the form first!</p>
    <?php else: ?>
        <p>Found <strong><?php echo count($submissions); ?></strong> record(s) in the `submissions` table.</p>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Industry / Size</th>
                    <th>Rating</th>
                    <th>Avg Score</th>
                    <th>Category Scores</th>
                    <th>AI Extracted Output</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($submissions as $sub): ?>
                    <?php 
                        $avg = (int)$sub['score_average'];
                        $colorClass = $avg >= 70 ? 'score-high' : ($avg >= 40 ? 'score-med' : 'score-low');
                    ?>
                    <tr>
                        <td>#<?php echo htmlspecialchars($sub['id'] ?? ''); ?></td>
                        <td><?php echo htmlspecialchars($sub['created_at'] ?? ''); ?></td>
                        <td><strong><?php echo htmlspecialchars($sub['company_name'] ?? ''); ?></strong></td>
                        <td><?php echo htmlspecialchars($sub['phone_number'] ?? '-'); ?></td>
                        <td>
                            <?php echo htmlspecialchars($sub['industry'] ?? ''); ?><br>
                            <small style="color:#777;">Size: <?php echo htmlspecialchars($sub['team_size'] ?? ''); ?></small>
                        </td>
                        <td><?php echo htmlspecialchars($sub['overall_rating'] ?? ''); ?></td>
                        <td class="score <?php echo $colorClass; ?>"><?php echo $avg; ?>/100</td>
                        <td style="font-size: 12px; line-height: 1.5;">
                            Op: <?php echo (int)$sub['score_operations']; ?> | 
                            Fn: <?php echo (int)$sub['score_finance']; ?><br>
                            Mk: <?php echo (int)$sub['score_marketing']; ?> | 
                            Dg: <?php echo (int)$sub['score_digital']; ?><br>
                            AI: <?php echo (int)$sub['score_ai_readiness']; ?>
                        </td>
                        <td>
                            <details>
                                <summary style="cursor: pointer; color: #007bff; font-weight: 500;">View JSON</summary>
                                <pre><?php 
                                    $json = json_decode($sub['gpt_output'] ?? '{}', true); 
                                    echo htmlspecialchars(json_encode($json, JSON_PRETTY_PRINT)); 
                                ?></pre>
                            </details>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

</body>
</html>
