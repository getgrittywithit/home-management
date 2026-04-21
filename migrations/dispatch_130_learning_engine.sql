-- Dispatch 130 — Daily Learning Engine + Mary Poppins School Assistant

CREATE TABLE IF NOT EXISTS kid_workbook_progress (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  workbook_type TEXT NOT NULL,
  workbook_grade_label TEXT NOT NULL,
  last_page_completed INTEGER DEFAULT 0,
  total_pages INTEGER,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, workbook_type)
);

INSERT INTO kid_workbook_progress (kid_name, workbook_type, workbook_grade_label) VALUES
  ('amos', 'summer_bridge', '1st-to-2nd'), ('amos', 'ultimate_math', '2nd'),
  ('ellie', 'summer_bridge', '5th-to-6th'), ('ellie', 'ultimate_math', '5th'),
  ('wyatt', 'summer_bridge', '4th-to-5th'), ('wyatt', 'ultimate_math', '4th'),
  ('hannah', 'summer_bridge', '2nd-to-3rd'), ('hannah', 'ultimate_math', '3rd')
ON CONFLICT (kid_name, workbook_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS kid_ixl_log (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  log_date DATE NOT NULL,
  minutes_spent INTEGER,
  skills_worked_on TEXT,
  smartscore_changes TEXT,
  notes TEXT,
  entered_by TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, log_date)
);

CREATE TABLE IF NOT EXISTS kid_classroom_config (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL UNIQUE,
  class_code TEXT NOT NULL,
  class_name TEXT,
  gmail_address TEXT,
  classroom_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO kid_classroom_config (kid_name, class_code, class_name, gmail_address) VALUES
  ('amos', 'i5f7uz7k', 'Amos — Homeschool 2026', 'amosmoses.yt@gmail.com'),
  ('ellie', '7qnhf7nn', 'Ellie — Homeschool 2026', 'yellowellie98@gmail.com'),
  ('wyatt', 'ja2jx22k', 'Wyatt — Homeschool 2026', 'wildwildjames246@gmail.com'),
  ('hannah', 'dyfmx4zb', 'Hannah — Homeschool 2026', 'sweethannahpie7@gmail.com')
ON CONFLICT (kid_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS kid_ixl_config (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL UNIQUE,
  ixl_grade_level INTEGER NOT NULL,
  ixl_math_url TEXT,
  ixl_ela_url TEXT,
  audio_support BOOLEAN DEFAULT TRUE,
  hide_grade_labels BOOLEAN DEFAULT FALSE,
  hide_timer BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO kid_ixl_config (kid_name, ixl_grade_level, ixl_math_url, ixl_ela_url, hide_grade_labels) VALUES
  ('amos', 2, 'https://www.ixl.com/math/grade-2', 'https://www.ixl.com/ela/grade-2', TRUE),
  ('ellie', 5, 'https://www.ixl.com/math/grade-5', 'https://www.ixl.com/ela/grade-5', FALSE),
  ('wyatt', 4, 'https://www.ixl.com/math/grade-4', 'https://www.ixl.com/ela/grade-4', FALSE),
  ('hannah', 3, 'https://www.ixl.com/math/grade-3', 'https://www.ixl.com/ela/grade-3', FALSE)
ON CONFLICT (kid_name) DO NOTHING;

-- Extend homeschool_daily_tasks
ALTER TABLE homeschool_daily_tasks ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE homeschool_daily_tasks ADD COLUMN IF NOT EXISTS deep_link_url TEXT;
ALTER TABLE homeschool_daily_tasks ADD COLUMN IF NOT EXISTS generated_by TEXT;
