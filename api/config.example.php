<?php
// ─────────────────────────────────────────────────────────────
//  TEMPLATE — copy to api/config.php on the server and fill in.
//  api/config.php is git-ignored: real passwords and keys never go to GitHub.
// ─────────────────────────────────────────────────────────────

// ── Database (MySQL / MariaDB) ───────────────────────────────
define('DB_HOST',     'localhost');
define('DB_PORT',     3306);
define('DB_USER',     '');
define('DB_PASSWORD', '');
define('DB_NAME',     'biz_diagnostic');

// ── First admin for the panel at /admin/ ─────────────────────
// Only needed once. Use a long RANDOM code, then delete this line after the admin exists.
// define('SETUP_TOKEN', '');

// ── CRM (ERPNext) — see docs/crm-setup.md ────────────────────
// Leave CRM_URL empty to keep the CRM connection switched off.
define('CRM_URL',        '');   // e.g. 'https://crm.ourcompany.com'  (no trailing slash needed)
define('CRM_API_KEY',    '');   // from the CRM admin
define('CRM_API_SECRET', '');   // from the CRM admin
// define('CRM_DOCTYPE', 'Business Health Check');   // only if the DocType has a different name

// Public address of THIS website — used to build the report links stored in the CRM.
define('SITE_URL', '');         // include the sub-folder, e.g. 'https://hrn.pxv.mybluehost.me/Business_Diagnostic_TBO'

// ── AI summary of the client's note (last step: "Anything else on your mind?") ──
// Leave empty to switch the summary off (the note itself still reaches the CRM).
define('OPENAI_API_KEY', '');   // an OpenAI API key — keep it ONLY in this file on the server
// define('AI_MODEL', 'gpt-4o-mini');   // optional: another OpenAI chat model

// Then check the connection from the server's terminal:
//   php api/cron/check-crm.php
