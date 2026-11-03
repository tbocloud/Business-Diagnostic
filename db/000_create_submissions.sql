-- ─────────────────────────────────────────────────────────────
--  FRESH INSTALL ONLY — the original table, exactly as before.
--  (The live database already has it: skip this file there and
--   run 001_health_check_v2.sql only.)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  company_name       VARCHAR(255),
  industry           VARCHAR(100),
  business_age       VARCHAR(50),
  business_type      VARCHAR(100),
  team_size          VARCHAR(50),
  score_operations   TINYINT,
  score_finance      TINYINT,
  score_marketing    TINYINT,
  score_digital      TINYINT,
  score_ai_readiness TINYINT,
  score_average      TINYINT,
  overall_rating     VARCHAR(50),
  phone_number       VARCHAR(30),
  gpt_output         JSON,
  raw_answers        JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
