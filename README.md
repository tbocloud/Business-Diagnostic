# BizDiagnostic

AI-powered business health check tool. Businesses fill a 5-section form, get instant visual scores across Operations, Finance, Marketing, Digital Presence and AI Readiness — plus a GPT-generated gap analysis and matched service recommendations.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | HTML + Vanilla JS + Chart.js |
| Backend | Node.js + Express |
| AI | OpenAI GPT-4o-mini |
| Database | MySQL |

---

## Project Structure

```
biz-diagnostic/
├── public/
│   └── index.html        # Full frontend (form + results)
├── server.js             # Express server + API routes
├── package.json          # Dependencies
├── .env.example          # Environment variable template
├── .gitignore
└── README.md
```

---

## Local Setup

### 1. Install MySQL (XAMPP — easiest)
Download from https://www.apachefriends.org → install → start MySQL

### 2. Create the database
Open phpMyAdmin → SQL tab → run:

```sql
CREATE DATABASE IF NOT EXISTS biz_diagnostic;
USE biz_diagnostic;

CREATE TABLE submissions (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  company_name        VARCHAR(255),
  industry            VARCHAR(100),
  business_age        VARCHAR(50),
  business_type       VARCHAR(50),
  team_size           VARCHAR(50),
  score_operations    INT,
  score_finance       INT,
  score_marketing     INT,
  score_digital       INT,
  score_ai_readiness  INT,
  score_average       INT,
  overall_rating      VARCHAR(50),
  phone_number        VARCHAR(20),
  gpt_output          JSON,
  raw_answers         JSON
);
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and add your OpenAI API key.

### 4. Run
```bash
npm install
node server.js
```

Open http://localhost:3000

---

## Production Deployment (Railway)

1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add a MySQL database service in Railway
4. Set environment variables in Railway → Variables:
   - `OPENAI_API_KEY`
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
     (copy these from Railway MySQL service → Variables tab)
5. Run the CREATE TABLE SQL in Railway → MySQL → Query tab

Railway auto-deploys on every `git push`.

---

## Contact Details to Update

Before going live, update these in `public/index.html`:

| Placeholder | Replace with |
|---|---|
| `YOUR_WHATSAPP_NUMBER` | Your number with country code e.g. `919876543210` |
| `YOUR_WEBSITE_URL` | e.g. `https://yourcompany.com` |
| `YOUR_EMAIL` | e.g. `hello@yourcompany.com` |
