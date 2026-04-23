-- ============================================================================
-- Dispatch 135 — Curriculum Planner Phase 4: Philosophy Presets
-- ============================================================================

CREATE TABLE IF NOT EXISTS curriculum_pedagogy_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name             TEXT NOT NULL DEFAULT 'lola',
  montessori_weight       INTEGER DEFAULT 25 CHECK (montessori_weight BETWEEN 0 AND 100),
  waldorf_weight          INTEGER DEFAULT 20 CHECK (waldorf_weight BETWEEN 0 AND 100),
  charlotte_mason_weight  INTEGER DEFAULT 30 CHECK (charlotte_mason_weight BETWEEN 0 AND 100),
  unschool_weight         INTEGER DEFAULT 10 CHECK (unschool_weight BETWEEN 0 AND 100),
  classical_weight        INTEGER DEFAULT 5 CHECK (classical_weight BETWEEN 0 AND 100),
  hands_on_weight         INTEGER DEFAULT 70 CHECK (hands_on_weight BETWEEN 0 AND 100),
  literature_based_weight INTEGER DEFAULT 60 CHECK (literature_based_weight BETWEEN 0 AND 100),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_name)
);

-- Seed Lola's defaults
INSERT INTO curriculum_pedagogy_preferences (parent_name)
VALUES ('lola')
ON CONFLICT (parent_name) DO NOTHING;
