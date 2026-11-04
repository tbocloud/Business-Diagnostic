-- ─────────────────────────────────────────────────────────────
--  Last step of the check: "Anything else on your mind?"
--  Run ONCE, after 002_crm_link.sql:
--  phpMyAdmin → (the website's database) → SQL → paste → Go
--
--  The client can write a note about other problems, in their own words.
--  It is kept here and sent to the CRM for the team (their words, plus a
--  short AI summary); the report itself never quotes it.
--  Adds columns only: existing rows and data are not changed.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE submissions
  ADD COLUMN open_text       TEXT     NULL COMMENT 'their note, in their own words',
  ADD COLUMN open_summary    JSON     NULL COMMENT '{points, areas, services} — the AI summary for the team',
  ADD COLUMN open_updated_at DATETIME NULL;
