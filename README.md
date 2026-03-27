# BizDiagnostic

AI-powered business health check tool. Businesses fill a 5-section form, get instant visual scores across Operations, Finance, Marketing, Digital Presence and AI Readiness — plus a GPT-generated gap analysis and matched service recommendations.

---

## Requirements

- PHP 8.0+
- MySQL 5.7+ or MariaDB
- phpMyAdmin (recommended)

---

## Step 1 — Create the Database

1. Open phpMyAdmin (usually `http://localhost/phpmyadmin`)
2. In the left sidebar click **New**
3. Enter database name: `biz_diagnostic` → click **Create**

---

## Step 2 — Create the Table

1. Select `biz_diagnostic` in the left sidebar
2. Click the **SQL** tab
3. Paste the following and click **Go**:

```sql
CREATE TABLE submissions (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  company_name       VARCHAR(255),
  industry           VARCHAR(100),
  business_age       VARCHAR(50),
  business_type      VARCHAR(100),
  team_size          VARCHAR(50),
  score_operations   TINYINT,
  score_finance      TINYINT,
  score_marketing    TINYINT,
  score_digital      TINYINT,
  score_ai_readiness TINYINT,
  score_average      TINYINT,
  overall_rating     VARCHAR(50),
  phone_number       VARCHAR(30),
  gpt_output         JSON,
  raw_answers        JSON
);
```

---

## Step 3 — Fill in config.php

Open `public/api/config.php` and fill in your values:

```php
define('OPENAI_API_KEY', 'sk-...');      // Your OpenAI API key

define('DB_HOST',     'localhost');       // Usually localhost
define('DB_PORT',     3306);              // Default MySQL port
define('DB_USER',     'root');            // Your phpMyAdmin username
define('DB_PASSWORD', '');               // Your phpMyAdmin password
define('DB_NAME',     'biz_diagnostic'); // Database name from Step 1
```

| Field       | Where to find it in phpMyAdmin                           |
|-------------|----------------------------------------------------------|
| DB_HOST     | Always `localhost` for local setup                      |
| DB_PORT     | Always `3306` unless changed during MySQL install       |
| DB_USER     | Shown in the top-right corner of phpMyAdmin             |
| DB_PASSWORD | Password set when installing MySQL / MAMP / XAMPP       |
| DB_NAME     | The database created in Step 1                          |

> `config.php` is in `.gitignore` and will never be pushed to GitHub.

---

## Step 4 — Run Locally

```bash
php -S localhost:3000 -t /path/to/public
```

Open: **http://localhost:3000**

Keep the terminal open — closing it stops the server.

---

## Step 5 — Verify

After submitting the form, open phpMyAdmin → `biz_diagnostic` → `submissions` → **Browse** to confirm the row was saved.

