-- ============================================================================
-- Dispatch 67 — Homeschool Daily Engine
-- Per-kid subject config + per-date daily task instances with rich metadata,
-- help requests, and parent feedback. Runs alongside the legacy
-- homeschool_tasks / homeschool_task_completions tables without touching them.
-- Single-family app — no family_id.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. homeschool_subjects — per-kid editable subject list
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homeschool_subjects (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name              TEXT NOT NULL,
  subject_name          TEXT NOT NULL,
  subject_icon          TEXT DEFAULT '📚',
  color                 TEXT DEFAULT '#4A90D9',
  sort_order            INTEGER DEFAULT 0,
  default_duration_min  INTEGER DEFAULT 30,
  curriculum            TEXT,
  notes                 TEXT,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, subject_name)
);

CREATE INDEX IF NOT EXISTS idx_hs_subjects_kid ON homeschool_subjects(kid_name);

-- ----------------------------------------------------------------------------
-- 2. homeschool_daily_tasks — per-date task instances
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homeschool_daily_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name          TEXT NOT NULL,
  subject_id        UUID REFERENCES homeschool_subjects(id) ON DELETE SET NULL,
  subject_name      TEXT NOT NULL,  -- denormalized for fast display + resilience
  subject_icon      TEXT DEFAULT '📚',
  task_date         DATE NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  duration_min      INTEGER,
  sort_order        INTEGER DEFAULT 0,
  resource_url      TEXT,
  resource_file     TEXT,
  is_required       BOOLEAN DEFAULT TRUE,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','skipped')),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  time_spent_min    INTEGER,
  quality_rating    INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  kid_notes         TEXT,
  parent_feedback   TEXT,
  needs_help        BOOLEAN DEFAULT FALSE,
  help_subject      TEXT,
  help_requested_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hs_daily_kid_date ON homeschool_daily_tasks(kid_name, task_date);
CREATE INDEX IF NOT EXISTS idx_hs_daily_needs_help ON homeschool_daily_tasks(needs_help) WHERE needs_help = TRUE;

-- ----------------------------------------------------------------------------
-- 3. Seed default subjects per homeschool kid
-- Idempotent via ON CONFLICT (kid_name, subject_name)
-- ----------------------------------------------------------------------------
-- Amos (10th) — rebuilding foundation, ASD-adapted pace
INSERT INTO homeschool_subjects (kid_name, subject_name, subject_icon, sort_order, default_duration_min, curriculum) VALUES
  ('amos',   'ELAR',           '📖', 1, 30, 'Olive\u2019s Ocean / guided reading'),
  ('amos',   'Math',            '🔢', 2, 45, 'Saxon Math (2nd grade level)'),
  ('amos',   'Science',         '🔬', 3, 30, 'Nature study + experiments'),
  ('amos',   'Social Studies',  '🌍', 4, 20, 'Geography & history'),
  ('amos',   'Bible',           '📜', 5, 15, 'Daily devotional'),
  ('amos',   'PE',              '💪', 6, 30, 'Outside time'),
  ('amos',   'Life Skills',     '🛠️', 7, 20, NULL)
ON CONFLICT (kid_name, subject_name) DO NOTHING;

-- Ellie (6th) — high-potential learner, business-minded
INSERT INTO homeschool_subjects (kid_name, subject_name, subject_icon, sort_order, default_duration_min, curriculum) VALUES
  ('ellie',  'ELAR',            '📖', 1, 30, 'Honors reading + writing'),
  ('ellie',  'Math',            '🔢', 2, 45, 'Advanced — 99th %ile growth'),
  ('ellie',  'Science',         '🔬', 3, 30, 'Nature study + experiments'),
  ('ellie',  'Social Studies',  '🌍', 4, 20, 'Geography & history'),
  ('ellie',  'Art',             '🎨', 5, 20, 'Free creative time'),
  ('ellie',  'PE',              '💪', 6, 30, 'Outside time'),
  ('ellie',  'Business',        '💼', 7, 20, 'Grit Collective planning')
ON CONFLICT (kid_name, subject_name) DO NOTHING;

-- Wyatt (4th) — severe ADHD, shorter sessions, color-adapted
INSERT INTO homeschool_subjects (kid_name, subject_name, subject_icon, sort_order, default_duration_min, curriculum) VALUES
  ('wyatt',  'ELAR',            '📖', 1, 20, 'Guided reading, patient pace'),
  ('wyatt',  'Math',            '🔢', 2, 25, 'IXL + hands-on manipulatives'),
  ('wyatt',  'Science',         '🔬', 3, 20, 'Hands-on experiments'),
  ('wyatt',  'Bible',           '📜', 4, 10, 'Short devotional'),
  ('wyatt',  'PE',              '💪', 5, 30, 'Movement breaks + outside'),
  ('wyatt',  'Art',             '🎨', 6, 20, 'Free creative time')
ON CONFLICT (kid_name, subject_name) DO NOTHING;

-- Hannah (3rd) — building confidence, interests in plants/cooking
INSERT INTO homeschool_subjects (kid_name, subject_name, subject_icon, sort_order, default_duration_min, curriculum) VALUES
  ('hannah', 'ELAR',            '📖', 1, 25, 'Sight words + comprehension'),
  ('hannah', 'Math',            '🔢', 2, 25, 'Foundational math'),
  ('hannah', 'Science',         '🔬', 3, 20, 'Plants & nature'),
  ('hannah', 'Bible',           '📜', 4, 10, 'Short devotional'),
  ('hannah', 'Cooking & Baking','👩\u200d🍳', 5, 20, 'Kitchen learning'),
  ('hannah', 'Art',             '🎨', 6, 20, 'Crafts & creative play'),
  ('hannah', 'Plants',          '🌱', 7, 15, 'Garden / plant care')
ON CONFLICT (kid_name, subject_name) DO NOTHING;
