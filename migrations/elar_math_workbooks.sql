-- ============================================================================
-- Migration: ELAR + Math TEKS Progress, Workbook Tracking, Positive Reports,
--            Hidden Bonus, Goals, Gift Suggestions, Profile Extensions
-- ============================================================================

-- ELAR skill progress
CREATE TABLE IF NOT EXISTS kid_elar_progress (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  current_level TEXT DEFAULT 'beginner',
  attempts INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  mastery_score DECIMAL(5,2) DEFAULT 0,
  last_practiced TIMESTAMPTZ,
  review_interval INTEGER DEFAULT 3,
  sessions_since_review INTEGER DEFAULT 0,
  times_reviewed INTEGER DEFAULT 0,
  decay_count INTEGER DEFAULT 0,
  UNIQUE(kid_name, skill_id)
);

-- Book buddy responses
CREATE TABLE IF NOT EXISTS book_buddy_responses (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  book_id UUID,
  book_title TEXT NOT NULL,
  progress_percent INTEGER,
  question_type TEXT,
  question TEXT NOT NULL,
  kid_response TEXT,
  response_quality TEXT,
  comprehension_notes TEXT,
  elar_skill TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ELAR placement
CREATE TABLE IF NOT EXISTS elar_placement_results (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  reading_level_used TEXT NOT NULL,
  skill_results JSONB NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  overridden_by_parent BOOLEAN DEFAULT FALSE,
  override_notes TEXT
);

-- Math skill progress
CREATE TABLE IF NOT EXISTS kid_math_progress (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  current_level TEXT DEFAULT 'beginner',
  attempts INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  mastery_score DECIMAL(5,2) DEFAULT 0,
  review_interval INTEGER DEFAULT 3,
  sessions_since_review INTEGER DEFAULT 0,
  times_reviewed INTEGER DEFAULT 0,
  decay_count INTEGER DEFAULT 0,
  last_practiced TIMESTAMPTZ,
  UNIQUE(kid_name, skill_id)
);

-- Math buddy responses
CREATE TABLE IF NOT EXISTS math_buddy_responses (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_level TEXT NOT NULL,
  question_text TEXT NOT NULL,
  kid_response TEXT,
  correct BOOLEAN,
  response_quality TEXT,
  points_change DECIMAL(5,2),
  session_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workbook progress
CREATE TABLE IF NOT EXISTS kid_workbook_progress (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  workbook_name TEXT NOT NULL,
  workbook_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_pages INTEGER NOT NULL,
  current_page INTEGER DEFAULT 0,
  daily_target INTEGER DEFAULT 2,
  started_date DATE,
  completed_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, workbook_name)
);

-- Workbook daily log
CREATE TABLE IF NOT EXISTS kid_workbook_log (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  workbook_name TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pages_completed INTEGER NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  skill_tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, workbook_name, log_date)
);

-- Workbook skill map
CREATE TABLE IF NOT EXISTS workbook_skill_map (
  id SERIAL PRIMARY KEY,
  workbook_name TEXT NOT NULL,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  section_name TEXT,
  subject_mix TEXT[],
  skill_ids TEXT[],
  topic_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positive reports
CREATE TABLE IF NOT EXISTS kid_positive_reports (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  source TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  points DECIMAL(3,1) NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hidden bonus config
CREATE TABLE IF NOT EXISTS hidden_bonus_config (
  id SERIAL PRIMARY KEY,
  trigger_type TEXT NOT NULL,
  probability DECIMAL(3,2) DEFAULT 0.15,
  min_bonus INTEGER DEFAULT 2,
  max_bonus INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kid goals (multi-type)
CREATE TABLE IF NOT EXISTS kid_goals (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  target_unit TEXT,
  linked_metric TEXT,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'kid',
  approved_by_parent BOOLEAN DEFAULT FALSE,
  celebration_seen BOOLEAN DEFAULT FALSE
);

-- AI gift suggestions
CREATE TABLE IF NOT EXISTS ai_gift_suggestions (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  quarter TEXT NOT NULL,
  suggestions JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  edited_by_parent BOOLEAN DEFAULT FALSE,
  parent_notes TEXT,
  shared BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMPTZ,
  UNIQUE(kid_name, quarter)
);

-- Profile extensions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reading_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS math_level TEXT;

-- Update reading/math levels
UPDATE profiles SET reading_level = '2nd-3rd' WHERE LOWER(first_name) = 'amos';
UPDATE profiles SET reading_level = '6th+' WHERE LOWER(first_name) = 'ellie';
UPDATE profiles SET reading_level = '4th' WHERE LOWER(first_name) = 'wyatt';
UPDATE profiles SET reading_level = '3rd' WHERE LOWER(first_name) = 'hannah';

UPDATE profiles SET math_level = '2nd' WHERE LOWER(first_name) = 'amos';
UPDATE profiles SET math_level = '6th+' WHERE LOWER(first_name) = 'ellie';
UPDATE profiles SET math_level = '4th' WHERE LOWER(first_name) = 'wyatt';
UPDATE profiles SET math_level = '3rd' WHERE LOWER(first_name) = 'hannah';

-- Library extensions
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS streaming_service TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS location_note TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS media_rating TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS episode_or_season TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS recommended_day TEXT DEFAULT 'any';
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS audience_type TEXT DEFAULT 'everyone';

-- Seed hidden bonus defaults
INSERT INTO hidden_bonus_config (trigger_type, probability, min_bonus, max_bonus) VALUES
  ('any_task', 0.15, 2, 5),
  ('first_task_of_day', 0.30, 3, 5),
  ('all_tasks_complete', 0.50, 5, 10),
  ('weekend_chore', 0.25, 3, 7),
  ('parent_caught_good', 0.40, 5, 8),
  ('kind_act', 0.35, 3, 5),
  ('streak_7', 0.80, 10, 15)
ON CONFLICT DO NOTHING;

-- Seed Summer Bridge workbook mappings
INSERT INTO workbook_skill_map (workbook_name, page_start, page_end, section_name, subject_mix, skill_ids, topic_description) VALUES
  ('Summer Bridge 5-6', 13, 52, 'Section 1: Flexibility — Activity Pages', '{"math","elar","vocabulary"}', '{}', 'Mixed daily pages — math + reading + vocabulary'),
  ('Summer Bridge 5-6', 53, 54, 'Section 1: Science Experiments', '{"science"}', '{}', 'Hands-on science activities'),
  ('Summer Bridge 5-6', 55, 57, 'Section 1: Social Studies', '{"social_studies"}', '{}', 'Social studies activities'),
  ('Summer Bridge 5-6', 61, 100, 'Section 2: Strength — Activity Pages', '{"math","elar","vocabulary"}', '{}', 'Mixed daily pages'),
  ('Summer Bridge 5-6', 101, 102, 'Section 2: Science Experiments', '{"science"}', '{}', 'Hands-on science activities'),
  ('Summer Bridge 5-6', 103, 105, 'Section 2: Social Studies', '{"social_studies"}', '{}', 'Social studies activities'),
  ('Summer Bridge 5-6', 109, 148, 'Section 3: Endurance — Activity Pages', '{"math","elar","vocabulary"}', '{}', 'Mixed daily pages'),
  ('Summer Bridge 5-6', 149, 150, 'Section 3: Science Experiments', '{"science"}', '{}', 'Hands-on science activities'),
  ('Summer Bridge 5-6', 151, 153, 'Section 3: Social Studies', '{"social_studies"}', '{}', 'Social studies activities')
ON CONFLICT DO NOTHING;

-- Seed initial workbook progress for all kids
INSERT INTO kid_workbook_progress (kid_name, workbook_name, workbook_type, subject, total_pages, daily_target) VALUES
  ('amos', 'Summer Bridge 1-2', 'summer_bridge', 'mixed', 120, 2),
  ('amos', 'IXL 2nd Grade Math', 'ixl_workbook', 'math', 200, 2),
  ('ellie', 'Summer Bridge 5-6', 'summer_bridge', 'mixed', 160, 2),
  ('ellie', 'IXL 5th Grade Math', 'ixl_workbook', 'math', 200, 2),
  ('wyatt', 'Summer Bridge 4-5', 'summer_bridge', 'mixed', 160, 2),
  ('wyatt', 'IXL 4th Grade Math', 'ixl_workbook', 'math', 200, 2),
  ('hannah', 'Summer Bridge 2-3', 'summer_bridge', 'mixed', 120, 2),
  ('hannah', 'IXL 3rd Grade Math', 'ixl_workbook', 'math', 200, 2)
ON CONFLICT (kid_name, workbook_name) DO NOTHING;
