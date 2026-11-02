-- ─────────────────────────────────────────────────────────────
--  Business Health Check v2 + BDE admin panel
--  Run ONCE: phpMyAdmin → biz_diagnostic → SQL → paste → Go
--
--  • Keeps the existing `submissions` table and every existing row.
--    Old rows are marked source = 'legacy' and still show in the admin panel.
--  • New check-ups fill the old columns where they map
--    (company_name, industry, team_size, score_*, score_average,
--     overall_rating, phone_number, raw_answers) plus the new ones below.
--  • Works on MySQL 5.7+ and MariaDB 10.2+.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE submissions
  ADD COLUMN source           VARCHAR(30)  NOT NULL DEFAULT 'legacy' AFTER created_at,
  ADD COLUMN updated_at       TIMESTAMP    NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER source,
  ADD COLUMN edit_token       CHAR(32)     NULL COMMENT 'lets the client update their own row; never shown in the panel',
  ADD COLUMN contact_name     VARCHAR(120) NULL,
  ADD COLUMN email            VARCHAR(190) NULL,
  ADD COLUMN biggest_headache VARCHAR(255) NULL,
  ADD COLUMN real_gap         VARCHAR(100) NULL COMMENT 'area furthest below its stage target',
  ADD COLUMN section_scores   JSON         NULL COMMENT '{"sales":60,"marketing":null,...}',
  ADD COLUMN results_summary  JSON         NULL COMMENT 'snapshot of what the client saw',
  ADD COLUMN status           VARCHAR(20)  NOT NULL DEFAULT 'new' COMMENT 'new|contacted|meeting|proposal|won|lost',
  ADD COLUMN assigned_to      INT          NULL COMMENT 'bde_users.id',
  ADD COLUMN follow_up_on     DATE         NULL,
  ADD INDEX idx_submissions_status (status),
  ADD INDEX idx_submissions_assigned (assigned_to),
  ADD INDEX idx_submissions_created (created_at);

-- BDE / admin logins for the panel at /admin/
CREATE TABLE IF NOT EXISTS bde_users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(10)  NOT NULL DEFAULT 'bde' COMMENT 'admin|bde',
  active         TINYINT(1)   NOT NULL DEFAULT 1,
  failed_logins  INT          NOT NULL DEFAULT 0,
  locked_until   DATETIME     NULL,
  last_login_at  DATETIME     NULL,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bde_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notes and activity history for each lead
CREATE TABLE IF NOT EXISTS lead_notes (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  submission_id  INT          NOT NULL,
  user_id        INT          NULL COMMENT 'NULL = system / client',
  kind           VARCHAR(20)  NOT NULL DEFAULT 'note' COMMENT 'note|status|assign|followup|system',
  body           TEXT         NOT NULL,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead_notes_submission (submission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
