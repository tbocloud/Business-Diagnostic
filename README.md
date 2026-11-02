# Business Health Check

A guided business diagnostic for small and growing businesses, with a **BDE panel** for the sales team.

- **Clients** answer short multiple-choice questions, one page per section. Every question has "Other — type your own" and a Skip, and whole sections can be skipped too.
- **Their report** shows a health score, each area against a fair target for their business stage, *the real gap* (what they think the problem is vs. what the answers show), strengths, gaps, a 7/30/90-day plan and notes.
- **BDEs** log into `/admin/` to work the leads. They can set a status, take ownership, set follow-up dates, keep notes, and present the report to the owner in **review mode**, with presenter notes on the BDE's own screen.

There is no AI and no per-report cost: scoring is rule-based, so the same answers always give the same report.

---

## How it fits together

```
/                      ← the website: static files built from web/ (index.html, check/, results/, admin/, _next/ …)
/api/                  ← PHP JSON API (MySQL)
   submit.php          ← saves a finished check-up
   save-contact.php    ← "Call me back" phone/email from the results page
   admin/*.php         ← BDE panel: login, leads, lead, notes, team
   lib/                ← shared helpers (not reachable from the web)
   config.php          ← your DB credentials (git-ignored, never committed)
/db/                   ← SQL to run in phpMyAdmin
/web/                  ← source code of the website (Next.js + TypeScript + Tailwind)
```

The host only needs **PHP 8 + MySQL** — the same as before. No Node.js is needed on the server: the website is pre-built into plain HTML/JS/CSS files that sit at the repository root.

---

## Install / upgrade

### 1. Database

In phpMyAdmin, select the `biz_diagnostic` database and open the **SQL** tab.

| Situation | Run |
|---|---|
| **Upgrading the live site** (the `submissions` table already exists) | `db/001_health_check_v2.sql` **once** |
| **Fresh install** | `db/000_create_submissions.sql`, then `db/001_health_check_v2.sql` |

The upgrade keeps every existing row. Old submissions are marked **legacy** and still show in the panel with their old scores and AI analysis.

What it adds:

- **On `submissions`:** `source`, `contact_name`, `email`, `biggest_headache`, `real_gap`, `section_scores`, `results_summary`, the pipeline fields `status`, `assigned_to` and `follow_up_on`, plus `edit_token` and `updated_at`.
- **New tables:** `bde_users` (team logins), `lead_notes` (notes and activity history) and `rate_limits` (anti-spam limits on the public form).

New check-ups still fill the original columns where they map, so anything that reads them keeps working:

| Original column | Filled from |
|---|---|
| `company_name`, `industry`, `team_size` | the "About your business" answers |
| `business_age` | business stage |
| `score_operations`, `score_finance`, `score_marketing` | the matching areas |
| `score_digital` | Tools & Technology |
| `score_average` | overall score |
| `overall_rating` | band, e.g. "Needs attention" |
| `phone_number` | from "Call me back" |
| `raw_answers` | `{ version: 2, profile, answers }` |

`score_ai_readiness` and `gpt_output` stay empty for new rows.

### 2. Credentials

`api/config.php` works exactly as before (it is git-ignored):

```php
<?php
define('DB_HOST',     'localhost');
define('DB_PORT',     3306);
define('DB_USER',     '...');
define('DB_PASSWORD', '...');
define('DB_NAME',     'biz_diagnostic');

// Only needed once, to create the first admin (12+ characters, anything you like).
// You can delete this line after the admin account exists.
define('SETUP_TOKEN', 'choose-a-long-secret');
```

The OpenAI key is no longer used and can be removed. Anything missing falls back to environment variables with the same names (see `.env.example`).

### 3. Upload / pull

Deploy the repository root as you do today. Run the SQL **before** the new files go live.

### 4. Create the first admin

Open **`/admin/`**. When no accounts exist yet, it asks for the **setup code** (the `SETUP_TOKEN` above), your name, email and a password, and that account becomes the admin. After that, the page is a normal login. Add BDEs under **Team**.

The setup code matters because the repository is public: without it, anyone who found `/admin/` before you could make themselves admin.

---

## The BDE panel (`/admin/`)

| | Admin | BDE |
|---|---|---|
| Sees | every lead | their own leads + unassigned ones |
| Assign leads | to anyone | can **take** an unassigned lead or **hand back** their own |
| Status, follow-up date, contact details, notes | ✓ | ✓ (on leads they can see) |
| Team: add members, roles, deactivate, reset passwords | ✓ | — |

- **Pipeline:** New → Contacted → Meeting booked → Proposal sent → Won / Lost.
- **History:** every change is logged automatically in the lead's history (who and when), next to the notes.
- **Review mode:** "Start review" opens the client's report as full-screen slides. Press **N** for presenter notes ("Say…" / "Ask them…"). "Open presenter view" puts the notes and next slide in a second window, so the owner only sees the slides.
- **Deactivating a BDE:** they are logged out and their open leads go back to the unassigned pool.
- **Login:** 5 wrong passwords lock that account for 15 minutes.
- **Old link:** the old `submissions.php` (which was public) now redirects to the panel.

---

## Changing the website

The source lives in `web/`. Typical edits:

| What | Where |
|---|---|
| Brand name, tagline, contact buttons (email / WhatsApp / booking link) | `web/lib/brand.ts` |
| Questions, options, scores, advice text | `web/lib/questions.ts` |
| Sections and BDE discovery questions | `web/lib/sections.ts` |
| Industries, stages, headaches, goals, stage targets | `web/lib/profile.ts` |
| Scoring rules, real-gap logic, key points | `web/lib/engine.ts` |

After a change, rebuild and copy the site to the root, then commit:

```bash
cd web
npm install          # first time only
npm run deploy       # builds web/ and copies the site to the repo root
```

### Run everything locally

```bash
cd web && npm run deploy && cd ..
php -S localhost:8080            # from the repo root; uses api/config.php
```

Open http://localhost:8080. For quick UI-only work, `cd web && npm run dev` (http://localhost:3100) is faster. Saving to the database needs the PHP server, though.

---

## Security notes

- `api/config.php` is git-ignored. The repository is public, so never commit credentials.
- **Panel logins:** passwords are hashed with `password_hash`.
- **Sessions:** cookies are `HttpOnly` + `SameSite=Strict` (+ `Secure` on HTTPS).
- **API requests:** every write needs a JSON body, which also protects against cross-site requests.
- **Client edits:** a client can only update their own submission, using a random token kept in their browser. Only a hash of it is stored.
- **First admin:** creating it needs the `SETUP_TOKEN` from `api/config.php`, and a database lock stops two admins being created at once.
- **Login lockout:** each attempt is reserved atomically *before* the password check, so even a burst of parallel requests gets at most 5 tries before the 15-minute lock.
- **Public form limits:** at most 30 submissions and 20 "call me back" requests per hour from one IP address, and a 64 KB request size limit.
- **History:** every change to a lead, including contact edits, is written in the same transaction as the change itself.
- **Untrusted report data:** share links and stored answers are cleaned before scoring, so a tampered link shows "link looks incomplete" instead of crashing.
- **Blocked paths:** `.htaccess` blocks `web/`, `db/`, `.git/` and `api/lib/` from the web and turns off directory listings.
