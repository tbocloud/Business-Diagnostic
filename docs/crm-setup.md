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

Only `report_link` is mandatory, because clients can leave the other details blank.

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

## Part B: what we set up on the website

1. **Database:** run `db/002_crm_link.sql` once in phpMyAdmin, after `001`.
2. **Settings:** add to `api/config.php`:
   ```php
   define('CRM_URL',        'https://crm.yourcompany.com');
   define('CRM_API_KEY',    '…');
   define('CRM_API_SECRET', '…');
   define('SITE_URL',       'https://<this website>');   // used to build the report links
   // define('CRM_DOCTYPE', 'Business Health Check');   // only if the DocType has another name
   ```
   With `CRM_URL` empty, the connection is switched off and nothing is sent.
3. **Retry job:** add a cron job in cPanel → Cron Jobs, every 15 minutes. It re-sends anything that failed, for example while the CRM was down:
   ```
   */15 * * * *  php /home/<user>/public_html/api/cron/sync-crm.php
   ```
   - The first run also sends the check-ups from the **last 30 days** that aren't in the CRM yet.
   - Old-form (GPT) submissions are never sent.

### How it behaves
- **The client never waits for the CRM:** they get their report first, and the CRM is updated just after.
- **CRM unreachable or a wrong key:** the error is saved on the submission (`crm_error`), and the retry job sends it later.
- **Report links look like** `https://<site>/results/?id=123&k=<24 random characters>`. The key is the secret: a link with a wrong or missing key opens nothing.

### Testing locally without the real CRM
```bash
php -S 127.0.0.1:8099 dev/mock-crm.php     # a pretend ERPNext (key "testkey", secret "testsecret")
CRM_URL=http://127.0.0.1:8099 CRM_API_KEY=testkey CRM_API_SECRET=testsecret \
SITE_URL=http://localhost:8080 ./dev/run-local.sh
```
