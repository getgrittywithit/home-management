-- ============================================================================
-- Dispatch 132 — Curriculum Planner Hierarchy: Quarter Goals, Unit Children
-- ============================================================================

-- ─── Phase B: Quarter goals + unit enhancements ─────────────────────────────

CREATE TABLE IF NOT EXISTS curriculum_quarter_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name    TEXT NOT NULL,
  school_year TEXT NOT NULL DEFAULT '2026-27',
  quarter     INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  goal_text   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (kid_name, school_year, quarter)
);

-- Unit enhancement fields
ALTER TABLE curriculum_year_outline ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 4;
ALTER TABLE curriculum_year_outline ADD COLUMN IF NOT EXISTS objectives TEXT[] DEFAULT '{}';
ALTER TABLE curriculum_year_outline ADD COLUMN IF NOT EXISTS ended_early BOOLEAN DEFAULT FALSE;
ALTER TABLE curriculum_year_outline ADD COLUMN IF NOT EXISTS actual_end_month TEXT;

-- ─── Phase C: Unit children tables ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS curriculum_unit_extras (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         UUID NOT NULL REFERENCES curriculum_year_outline(id) ON DELETE CASCADE,
  extra_type      TEXT NOT NULL DEFAULT 'experiment'
    CHECK (extra_type IN ('steam', 'experiment', 'art', 'field_trip', 'recipe', 'other')),
  title           TEXT NOT NULL,
  description     TEXT,
  scheduled_date  DATE,
  status          TEXT DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_extras_unit ON curriculum_unit_extras(unit_id);

CREATE TABLE IF NOT EXISTS curriculum_unit_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id           UUID NOT NULL REFERENCES curriculum_year_outline(id) ON DELETE CASCADE,
  assessment_type   TEXT NOT NULL DEFAULT 'quiz'
    CHECK (assessment_type IN ('quiz', 'project', 'narration', 'portfolio', 'test', 'presentation', 'other')),
  title             TEXT NOT NULL,
  description       TEXT,
  scheduled_date    DATE,
  completed         BOOLEAN DEFAULT FALSE,
  score             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_assessments_unit ON curriculum_unit_assessments(unit_id);

CREATE TABLE IF NOT EXISTS curriculum_unit_objectives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         UUID NOT NULL REFERENCES curriculum_year_outline(id) ON DELETE CASCADE,
  objective_text  TEXT NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  completed       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_objectives_unit ON curriculum_unit_objectives(unit_id);

-- Gap items that become purchase plans
CREATE TABLE IF NOT EXISTS curriculum_unit_gaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         UUID NOT NULL REFERENCES curriculum_year_outline(id) ON DELETE CASCADE,
  item_name       TEXT NOT NULL,
  description     TEXT,
  purchase_id     UUID REFERENCES tefa_purchases(id) ON DELETE SET NULL,
  resolved        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_gaps_unit ON curriculum_unit_gaps(unit_id);
