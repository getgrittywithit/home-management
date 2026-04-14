-- ============================================================================
-- Dispatch 69 — Homeschool Weekly Templates
-- Per-kid Mon-Fri templates that auto-generate daily tasks each morning.
-- Single-family app — no family_id.
-- ============================================================================

CREATE TABLE IF NOT EXISTS homeschool_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name        TEXT NOT NULL,
  day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat. We use 1-5 for weekday templates.
  subject_id      UUID REFERENCES homeschool_subjects(id) ON DELETE SET NULL,
  subject_name    TEXT NOT NULL,
  subject_icon    TEXT DEFAULT '📚',
  title           TEXT NOT NULL,
  description     TEXT,
  duration_min    INTEGER,
  resource_url    TEXT,
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hs_templates_kid ON homeschool_templates(kid_name, day_of_week);
CREATE INDEX IF NOT EXISTS idx_hs_templates_active ON homeschool_templates(kid_name, day_of_week) WHERE is_active = TRUE;
