-- ─────────────────────────────────────────────────────────────
--  CRM connection (ERPNext) + short report links
--  Run ONCE, after 001_health_check_v2.sql:
--  phpMyAdmin → biz_diagnostic → SQL → paste → Go
--
--  • report_key  — the secret part of the short report link
--                  (/results/?id=123&k=…), which is what goes to the CRM.
--  • crm_*       — which CRM record this submission became, and whether
--                  the last sync worked (so failed ones can be retried).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE submissions
  ADD COLUMN report_key     CHAR(24)     NULL COMMENT 'secret for the short report link',
  ADD COLUMN crm_ref        VARCHAR(140) NULL COMMENT 'name of the record in the CRM, e.g. BHC-00012',
  ADD COLUMN crm_synced_at  DATETIME     NULL,
  ADD COLUMN crm_error      VARCHAR(255) NULL COMMENT 'last sync error, NULL when OK',
  ADD INDEX idx_submissions_crm_pending (crm_ref, created_at);
