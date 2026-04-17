-- ============================================================================
-- Dispatch 92 Parts F+G — Bug fixes + Daily Routines + Activity System
-- ============================================================================

-- Part F: Message archive support
ALTER TABLE family_messages ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Part F: Enrichment gem reward column
ALTER TABLE enrichment_activities ADD COLUMN IF NOT EXISTS gem_reward INTEGER DEFAULT 0;

-- Part G: Daily routines (morning/evening)
CREATE TABLE IF NOT EXISTS daily_routines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name        TEXT NOT NULL,
  routine_type    TEXT NOT NULL CHECK (routine_type IN ('morning','evening')),
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, routine_type)
);

CREATE TABLE IF NOT EXISTS routine_completions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name          TEXT NOT NULL,
  routine_type      TEXT NOT NULL CHECK (routine_type IN ('morning','evening')),
  completion_date   DATE NOT NULL,
  items_completed   JSONB DEFAULT '[]'::jsonb,
  all_complete      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, routine_type, completion_date)
);

CREATE TABLE IF NOT EXISTS routine_streaks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name            TEXT NOT NULL,
  routine_type        TEXT NOT NULL CHECK (routine_type IN ('morning','evening','both')),
  current_streak      INTEGER DEFAULT 0,
  best_streak         INTEGER DEFAULT 0,
  last_completed_date DATE,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, routine_type)
);

-- Part G: Activity logs + goals
CREATE TABLE IF NOT EXISTS activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name        TEXT NOT NULL,
  activity_type   TEXT NOT NULL,
  duration_minutes INTEGER,
  notes           TEXT,
  logged_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name        TEXT NOT NULL UNIQUE,
  weekly_goal     INTEGER DEFAULT 3,
  min_duration    INTEGER DEFAULT 10,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Part G: Med pause columns (on base table, not the view)
ALTER TABLE medications ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT FALSE;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS pause_reason TEXT;

-- Seed default routines for the 4 homeschool kids
INSERT INTO daily_routines (kid_name, routine_type, items) VALUES
  ('amos', 'morning', '[{"name":"Take Focalin","type":"medication","order":0},{"name":"Brush teeth","type":"hygiene","order":1},{"name":"Get dressed","type":"hygiene","order":2},{"name":"Make bed","type":"tidy","order":3},{"name":"Eat breakfast","type":"nutrition","order":4}]'),
  ('amos', 'evening', '[{"name":"Take Clonidine","type":"medication","order":0},{"name":"Brush teeth","type":"hygiene","order":1},{"name":"Shower","type":"hygiene","order":2},{"name":"Tidy room","type":"tidy","order":3},{"name":"Pajamas on","type":"hygiene","order":4},{"name":"Read 15 min","type":"enrichment","order":5}]'),
  ('wyatt', 'morning', '[{"name":"Take Focalin","type":"medication","order":0},{"name":"Brush teeth","type":"hygiene","order":1},{"name":"Get dressed","type":"hygiene","order":2},{"name":"Make bed","type":"tidy","order":3},{"name":"Eat breakfast","type":"nutrition","order":4}]'),
  ('wyatt', 'evening', '[{"name":"Take Clonidine","type":"medication","order":0},{"name":"Brush teeth","type":"hygiene","order":1},{"name":"Shower","type":"hygiene","order":2},{"name":"Tidy room","type":"tidy","order":3},{"name":"Pajamas on","type":"hygiene","order":4}]'),
  ('ellie', 'morning', '[{"name":"Brush teeth","type":"hygiene","order":0},{"name":"Get dressed","type":"hygiene","order":1},{"name":"Make bed","type":"tidy","order":2},{"name":"Eat breakfast","type":"nutrition","order":3}]'),
  ('ellie', 'evening', '[{"name":"Brush teeth","type":"hygiene","order":0},{"name":"Floss","type":"hygiene","order":1},{"name":"Shower","type":"hygiene","order":2},{"name":"Tidy room","type":"tidy","order":3},{"name":"Pajamas on","type":"hygiene","order":4},{"name":"Read 15 min","type":"enrichment","order":5}]'),
  ('hannah', 'morning', '[{"name":"Brush teeth","type":"hygiene","order":0},{"name":"Get dressed","type":"hygiene","order":1},{"name":"Make bed","type":"tidy","order":2},{"name":"Eat breakfast","type":"nutrition","order":3}]'),
  ('hannah', 'evening', '[{"name":"Brush teeth","type":"hygiene","order":0},{"name":"Floss","type":"hygiene","order":1},{"name":"Bath/shower","type":"hygiene","order":2},{"name":"Tidy room","type":"tidy","order":3},{"name":"Pajamas on","type":"hygiene","order":4},{"name":"Read 15 min","type":"enrichment","order":5}]'),
  ('zoey', 'morning', '[{"name":"Brush teeth","type":"hygiene","order":0},{"name":"Get dressed","type":"hygiene","order":1},{"name":"Make bed","type":"tidy","order":2},{"name":"Eat breakfast","type":"nutrition","order":3}]'),
  ('zoey', 'evening', '[{"name":"Brush teeth","type":"hygiene","order":0},{"name":"Shower","type":"hygiene","order":1},{"name":"Skincare","type":"hygiene","order":2},{"name":"Tidy room","type":"tidy","order":3},{"name":"Pajamas on","type":"hygiene","order":4}]'),
  ('kaylee', 'morning', '[{"name":"Brush teeth","type":"hygiene","order":0},{"name":"Get dressed","type":"hygiene","order":1},{"name":"Make bed","type":"tidy","order":2},{"name":"Eat breakfast","type":"nutrition","order":3}]'),
  ('kaylee', 'evening', '[{"name":"Brush teeth","type":"hygiene","order":0},{"name":"Shower","type":"hygiene","order":1},{"name":"Tidy room","type":"tidy","order":2},{"name":"Pajamas on","type":"hygiene","order":3}]')
ON CONFLICT (kid_name, routine_type) DO NOTHING;

-- Seed activity goals
INSERT INTO activity_goals (kid_name) VALUES ('amos'),('zoey'),('kaylee'),('ellie'),('wyatt'),('hannah')
ON CONFLICT (kid_name) DO NOTHING;
