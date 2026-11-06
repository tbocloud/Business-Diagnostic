# Connecting the Business Health Check to the CRM (ERPNext)

When a client finishes the health check, the website creates one record in the CRM with their basic details and **a link to their report**. If they later press "Call me back", the same record is updated with their phone number and email. Clicking the link opens their full report, and **Start review** presents it to the client with presenter notes.

---

## Part A: what the CRM admin sets up (once)

### 1. A new DocType: `Business Health Check`

| Setting | Value |
|---|---|
| Name | **Business Health Check** |
| Module | CRM (or any custom module) |
| Naming | `BHC-.#####` (records become BHC-00001, BHC-00002, …) |
| Title field | `business_name` |
| Search fields | `business_name`, `phone`, `email` |
| Track changes | On |

**Fields.** Our website sends exactly these field names, so they must match:

| Fieldname | Label | Type | Options | Mandatory | In list view |
|---|---|---|---|---|---|
| `business_name` | Business Name | Data | | | ✓ |
| `contact_name` | Contact Name | Data | | | ✓ |
| `phone` | Phone | Data | `Phone` | | ✓ |
| `email` | Email | Data | `Email` | | |
| `report_link` | Report Link | Data | `URL` | ✓ | |
| `problem_summary` | Problem Summary | Text | | | |
| `client_note` | Client's Own Words | Long Text | | | |
| `voice_note` | Voice Note | Attach | | | |
| `stage2_report_link` / `stage2_summary` | Stage 2 Report Link / Summary | Data (URL) / Text | | | |
| `erp_report_link` / `erp_summary` | ERP Check Report Link / Summary | Data (URL) / Text | | | |

Only `report_link` is mandatory, because clients can leave the other details blank. The last three are filled when the client writes a note or records a voice note about other problems at the end of the check (a short AI summary, the note in their own words, the recording). They're optional for the CRM: without them, everything else still syncs. The recording is attached through the DocType's `attach_voice_note` method (Frappe's `upload_file` refuses audio from an API user without desk access), so it needs the Business Health Check DocType from tbocloud/helpdesk, not a hand-made copy.

**Permissions:**
- Sales User: Read
- Sales Manager: Read, Write
- The API role below: Create, Read, Write

### 2. An API user for the website
1. Create a user, e.g. `health-check-api@<your domain>`.
2. Give it a role that can **only Create / Read / Write `Business Health Check`**, nothing else.
3. Open that user → **Settings → API Access → Generate Keys** to get an **API Key** and **API Secret**.

### 3. Send to the website team (privately, not in a group chat)
- The CRM address, e.g. `https://crm.yourcompany.com`
- The API Key
- The API Secret

---

## Part B: what we set up on the website (go-live checklist)

When the CRM admin has sent the URL, API key and secret:

1. **Database:** run `db/002_crm_link.sql` once in phpMyAdmin, after `001`.
2. **Settings** (`SITE_URL` is **required**: without it nothing is sent, and the error is recorded): on the server, copy the CRM lines from `api/config.example.php` into `api/config.php` and fill them in:
   ```php
   define('CRM_URL',        'https://crm.yourcompany.com');
   define('CRM_API_KEY',    '…');
   define('CRM_API_SECRET', '…');
   define('SITE_URL',       'https://hrn.pxv.mybluehost.me/Business_Diagnostic_TBO');   // the site's address INCLUDING its sub-folder
   // define('CRM_DOCTYPE', 'Business Health Check');   // only if the DocType has another name
   ```
   - `api/config.php` is git-ignored, so the keys never go to GitHub.
   - With `CRM_URL` empty, the connection is switched off and nothing is sent.
3. **Check the connection** from the server terminal (cPanel → Terminal):
   ```bash
   php api/cron/check-crm.php                  # read-only: URL, key, permission, DocType, the 5 fields, database
   php api/cron/check-crm.php --create-test    # also creates one "Connection test — please delete" record
   ```
   - Every problem comes with a plain-language fix, e.g. "The API key or secret is wrong", "The API user is missing Create permission", or "The DocType needs exactly: business_name, contact_name, phone, email, report_link".
   - It ends with **"All good — the CRM connection is ready."**
4. **Retry job:** add a cron job in cPanel → Cron Jobs, every 15 minutes. It re-sends anything that failed, for example while the CRM was down:
   ```
   */15 * * * *  php /home/<user>/public_html/api/cron/sync-crm.php
   ```
   - The first run also sends the check-ups from the **last 30 days** that aren't in the CRM yet.
   - Old-form (GPT) submissions are never sent.
5. **Try it once for real:**
   - Complete a check on the live site and press "Call me back".
   - In the CRM, a new **Business Health Check** record should appear with the phone number.
   - Its **Report Link** should open the report.

### How it behaves
- **The client never waits for the CRM:** they get their report first, and the CRM is updated just after.
- **CRM unreachable or a wrong key:** the error is saved on the submission (`crm_error`), and the retry job sends it later.
- **Report links look like** `https://<site>/results/#id=123&k=<24 random characters>`.
  - The key is the secret: a link with a wrong or missing key opens nothing.
  - Everything after `#` stays in the browser and is never sent to the server, so the key doesn't appear in server logs.
  - Links are built only from `SITE_URL`, never from the visitor's request, so nobody can plant a link to another site in the CRM.

### Testing locally without the real CRM
```bash
php -S 127.0.0.1:8099 dev/mock-crm.php     # a pretend ERPNext (key "testkey", secret "testsecret")
CRM_URL=http://127.0.0.1:8099 CRM_API_KEY=testkey CRM_API_SECRET=testsecret \
SITE_URL=http://localhost:8080 ./dev/run-local.sh
```
