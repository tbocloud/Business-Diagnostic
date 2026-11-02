<?php
// ─────────────────────────────────────────────────────────────
//  A tiny stand-in for ERPNext's REST API, for local testing only.
//    php -S 127.0.0.1:8099 dev/mock-crm.php
//  Then run the site with:
//    CRM_URL=http://127.0.0.1:8099 CRM_API_KEY=testkey CRM_API_SECRET=testsecret \
//    SITE_URL=http://localhost:8080 ./dev/run-local.sh
//
//  Supports what the site uses: POST /api/resource/<DocType>,
//  PUT /api/resource/<DocType>/<name>, and GET (list / one) to look at the data.
//  Records are kept in a JSON file in the system temp folder.
// ─────────────────────────────────────────────────────────────

const KEY = 'testkey';
const SECRET = 'testsecret';
$store = sys_get_temp_dir() . '/bhc-mock-crm.json';
$db = is_file($store) ? (json_decode((string) file_get_contents($store), true) ?: []) : [];

header('Content-Type: application/json');
$send = function (int $status, array $data) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
};

if (($_SERVER['HTTP_AUTHORIZATION'] ?? '') !== 'token ' . KEY . ':' . SECRET) {
    $send(401, ['exc_type' => 'AuthenticationError', 'message' => 'Invalid API key or secret']);
}

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '');
if (!preg_match('#^/api/resource/([^/]+)(?:/([^/]+))?$#', $path, $m)) $send(404, ['exc_type' => 'DoesNotExistError']);
[$doctype, $name] = [$m[1], $m[2] ?? null];
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode((string) file_get_contents('php://input'), true) ?: [];
$allowed = ['business_name', 'contact_name', 'phone', 'email', 'report_link'];

if ($doctype !== 'Business Health Check') $send(404, ['exc_type' => 'DoesNotExistError', 'message' => "DocType $doctype not found"]);
$unknown = array_diff(array_keys($body), $allowed);
if ($unknown) $send(417, ['exc_type' => 'ValidationError', 'message' => 'Unknown field(s): ' . implode(', ', $unknown)]);

if ($method === 'POST' && $name === null) {
    if (empty($body['report_link'])) $send(417, ['exc_type' => 'MandatoryError', 'message' => 'report_link is mandatory']);
    $name = sprintf('BHC-%05d', count($db) + 1);
    $db[$name] = ['name' => $name, 'creation' => date('c')] + array_intersect_key($body, array_flip($allowed));
    file_put_contents($store, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    $send(200, ['data' => $db[$name]]);
}
if ($method === 'PUT' && $name !== null) {
    if (!isset($db[$name])) $send(404, ['exc_type' => 'DoesNotExistError', 'message' => "$name not found"]);
    $db[$name] = array_merge($db[$name], array_intersect_key($body, array_flip($allowed)), ['modified' => date('c')]);
    file_put_contents($store, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    $send(200, ['data' => $db[$name]]);
}
if ($method === 'GET') $send(200, ['data' => $name === null ? array_values($db) : ($db[$name] ?? null)]);
$send(405, ['exc_type' => 'MethodNotAllowed']);
