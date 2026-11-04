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

**Fresh install only:** create the database first. In phpMyAdmin, click **New**, enter the name `biz_diagnostic`, choose collation `utf8mb4_unicode_ci`, then click **Create**. On cPanel you can also use **MySQL Databases**, which adds a prefix such as `user_biz_diagnostic`; then put that name in `DB_NAME`.

Then, in phpMyAdmin, select the database and open the **SQL** tab.

| Situation | Run |
|---|---|
| **Upgrading the live site** (the `submissions` table already exists) | `db/001_health_check_v2.sql`, `db/002_crm_link.sql`, then `db/003_open_problems.sql`, **once each, in that order** |
| **Fresh install** | `db/000_create_submissions.sql`, `db/001_health_check_v2.sql`, `db/002_crm_link.sql`, then `db/003_open_problems.sql` |

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

`api/config.php` works exactly as before (it is git-ignored). `api/config.example.php` is a template with every setting:

```php
<?php
define('DB_HOST',     'localhost');
define('DB_PORT',     3306);
define('DB_USER',     '...');
define('DB_PASSWORD', '...');
define('DB_NAME',     'biz_diagnostic');

// Only needed once, to create the first admin. Use a long RANDOM code (e.g. 20+ random
// characters from a password manager) — not a word or a name. Delete the line afterwards.
define('SETUP_TOKEN', 'choose-a-long-secret');
```

The OpenAI key is no longer used and can be removed. Anything missing falls back to environment variables with the same names (see `.env.example`).

> **Which wins, `config.php` or environment variables?** If the server has a **`DB_HOST` environment variable**, `api/config.php` is **not loaded at all**, and every setting must then come from environment variables (`DB_*`, `SETUP_TOKEN`, `CRM_*`, `SITE_URL`). This is how local runs (`dev/run-local.sh`) avoid touching the live database. Normal cPanel hosting sets no `DB_HOST` variable, so `config.php` is used as before.

### Hosting in a sub-folder

The live site runs in a sub-folder: `https://hrn.pxv.mybluehost.me/Business_Diagnostic_TBO/`. Three settings must agree with the folder name:

| Where | Setting |
|---|---|
| `web/.env.production` | `NEXT_PUBLIC_BASE_PATH=/Business_Diagnostic_TBO`. Rebuild with `npm run deploy` after changing it |
| `.htaccess` | `ErrorDocument 404 /Business_Diagnostic_TBO/404.html` |
| `api/config.php` | `SITE_URL`, including the folder: `https://hrn.pxv.mybluehost.me/Business_Diagnostic_TBO` |

To move the site to the root of its own domain later, empty `NEXT_PUBLIC_BASE_PATH`, set the 404 line to `/404.html`, update `SITE_URL`, then rebuild. `./dev/run-local.sh` serves the site under the same folder locally (http://localhost:8080/Business_Diagnostic_TBO/).

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

- **What to pitch:** each lead page lists our services ranked by how many of that client's gaps they fix. Review mode ends with a "How we help" slide.
- **Pipeline:** New → Contacted → Meeting booked → Proposal sent → Won / Lost.
- **History:** every change is logged automatically in the lead's history (who and when), next to the notes.
- **Review mode:** "Start review" opens the client's report as full-screen slides. Press **N** for presenter notes ("Say…" / "Ask them…"). "Open presenter view" puts the notes and next slide in a second window, so the owner only sees the slides.
- **Deactivating a BDE:** they are logged out and their open leads go back to the unassigned pool.
- **Login:** 5 wrong passwords lock that account for 15 minutes.
- **Old link:** the old `submissions.php` (which was public) now redirects to the panel.

---

## Connecting to the CRM (ERPNext)

Every finished check creates a **Business Health Check** record in the CRM with the business name, contact, phone, email and **a link to the client's report**. "Call me back" updates the same record. Setup for both sides is in **[docs/crm-setup.md](docs/crm-setup.md)**:
- the DocType and API user to create in ERPNext
- the settings for `api/config.php`
- `db/002_crm_link.sql`
- the retry cron job

## The last step: "Anything else on your mind?"

After the eight areas, the client can write a note about other problems, in their own words, or **record a voice note** instead (up to 3 minutes, any language) — whichever is easier. It all goes to the team only — the CRM record's **Client's Own Words** (the note, and what the voice note says, written down by the AI on the server — the client never sees that), a **Problem Summary** of short points covering both, and the recording as a private **Voice Note** attachment. The report never quotes any of it; it only uses which areas and services it touches, to rank the gaps and the services shown.

Recordings wait in `api/uploads/voice/` (blocked from the web by `.htaccess`, ignored by git) until they are attached to the CRM record, then are deleted there.

- Needs `db/003_open_problems.sql`.
- The summary and the voice transcript need `OPENAI_API_KEY` in `api/config.php` (the same setting the old GPT site used; models `gpt-4o-mini` and `gpt-4o-mini-transcribe`, change with `AI_MODEL` / `AI_TRANSCRIBE_MODEL`). Without a key, notes and recordings are still saved and sent, without a summary or transcript.
- Voice notes need PHP uploads of at least 4 MB (`php api/cron/check-crm.php` warns), and the CRM's DocType must have the `attach_voice_note` method (tbocloud/helpdesk).
- Locally: `MOCK_AI=1 ./dev/run-local.sh` starts a fake AI (`dev/mock-ai.php`), so the summary works with no key and no cost.

## Changing the website

The source lives in `web/`. Typical edits:

| What | Where |
|---|---|
| Brand name, tagline, contact buttons (email / WhatsApp / booking link) | `web/lib/brand.ts` |
| Our services (ERP / Digital Marketing / AI): names, icons, one-line pitch | `web/lib/brand.ts` → `services` |
| Questions, options, scores, advice text, next steps (`fix` + `steps`) | `web/lib/questions.ts` |
| How our services solve each gap (`solution: { services, text }`) | `web/lib/questions.ts` |
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

Needs Docker and PHP 8 (`brew install php`):

```bash
./dev/run-local.sh
```

- **Website:** http://localhost:8080
- **BDE panel:** http://localhost:8080/admin/ — setup code for the first admin: `local-setup-code`

The script starts a local MariaDB in Docker. It creates the tables from `db/*.sql` on the first run and keeps the data between runs. Because it sets `DB_HOST`, `api/config.php` (the live database) is **never** loaded. To reset the local data: `docker rm -f bhc-local-db && docker volume rm bhc-local-data`.

For quick UI-only work, `cd web && npm run dev` (http://localhost:3100) is faster. Saving to the database needs the PHP server, though.

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
- **Blocked paths:** `.htaccess` blocks `web/`, `db/`, `dev/`, `.git/` and `api/lib/` from the web and turns off directory listings.
