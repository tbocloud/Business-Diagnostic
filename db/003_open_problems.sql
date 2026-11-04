-- ─────────────────────────────────────────────────────────────
--  Last step of the check: "Anything else on your mind?"
--  Run ONCE, after 002_crm_link.sql:
--  phpMyAdmin → (the website's database) → SQL → paste → Go
--
--  The client can write a note about other problems, in their own words,
--  and/or record a voice note. Both go to the CRM for the team (their words,
--  a short AI summary, the recording as an attachment); the report itself
--  never quotes them. Recordings wait in api/uploads/voice/ (never served)
--  until they are attached to the CRM record, then are deleted there.
--  Adds columns only: existing rows and data are not changed.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE submissions
  ADD COLUMN open_text       TEXT     NULL COMMENT 'their note, in their own words',
  ADD COLUMN open_summary    JSON     NULL COMMENT '{points, areas, services} — the AI summary for the team',
  ADD COLUMN open_voice         VARCHAR(80)  NULL COMMENT 'their voice note: file name in api/uploads/voice/',
  ADD COLUMN open_voice_seconds INT          NULL,
  ADD COLUMN open_voice_url     VARCHAR(255) NULL COMMENT 'the recording, once attached to the CRM record',
  ADD COLUMN open_transcript    TEXT         NULL COMMENT 'what the voice note says (AI speech to text)',
  ADD COLUMN open_updated_at DATETIME NULL;
