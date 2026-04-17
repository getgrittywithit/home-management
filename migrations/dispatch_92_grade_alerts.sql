-- ============================================================================
-- Dispatch 92 — Grade Alert Pipeline
-- Logs BISD grade alerts parsed from email, routes to kid + parent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS grade_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name              TEXT NOT NULL,
  subject               TEXT NOT NULL,
  score                 NUMERIC(5,2),
  score_type            TEXT DEFAULT 'grade',
  assignment_name       TEXT,
  teacher_name          TEXT,
  is_high               BOOLEAN,
  is_low                BOOLEAN,
  source_email_id       TEXT,
  parent_notified       BOOLEAN DEFAULT TRUE,
  kid_notified          BOOLEAN DEFAULT FALSE,
  parent_action_needed  BOOLEAN DEFAULT FALSE,
  parent_action_note    TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grade_alerts_kid ON grade_alerts(kid_name, created_at DESC);
