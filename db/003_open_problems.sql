-- ─────────────────────────────────────────────────────────────
--  Last step of the check: "Anything else on your mind?"
--  Run ONCE, after 002_crm_link.sql:
--  phpMyAdmin → (the website's database) → SQL → paste → Go
--
--  The client can describe other problems in their own words — a typed
--  note, or a short chat that asks one question at a time. Their words
--  are kept here and sent to the CRM for the team (a short summary and
--  their own words); the report itself never quotes them.
--  Adds columns only: existing rows and data are not changed.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE submissions
  ADD COLUMN open_mode       VARCHAR(10) NULL COMMENT 'typed | chat — how the client told us',
  ADD COLUMN open_text       TEXT        NULL COMMENT 'their typed note, in their own words',
  ADD COLUMN open_chat       JSON        NULL COMMENT '[{role: client|assistant, text, at}] — the chat',
  ADD COLUMN open_summary    JSON        NULL COMMENT '{points, areas, services} — the AI summary for the team',
  ADD COLUMN open_updated_at DATETIME    NULL;
