-- ─────────────────────────────────────────────────────────────
--  More checks: Stage 2 ("your real numbers") and the ERP check.
--  Run ONCE, after 003_open_problems.sql:
--  phpMyAdmin → (the website's database) → SQL → paste → Go
--
--  Each check is a row in `submissions`; check_type says which.
--  Existing rows become 'health' (Stage 1). Adds columns only.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE submissions
  ADD COLUMN check_type VARCHAR(10) NOT NULL DEFAULT 'health' COMMENT 'health = Stage 1 | deep = Stage 2 | erp = ERP check',
  ADD COLUMN parent_id  INT         NULL COMMENT 'Stage 2 / ERP check: the Stage 1 check it follows, if any',
  ADD INDEX idx_submissions_check_type (check_type);
