-- ============================================================================
-- Migration: Homeschool Tasks + Completions + Vocab Mixer Sessions
-- ============================================================================

-- ============================================================================
-- 1. HOMESCHOOL TASKS (daily checkable tasks per kid)
-- ============================================================================
CREATE TABLE IF NOT EXISTS homeschool_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  task_label TEXT NOT NULL,
  task_description TEXT,
  duration_min INTEGER DEFAULT 15,
  is_recurring BOOLEAN DEFAULT TRUE,
  recurrence_days TEXT[] DEFAULT ARRAY['mon','tue','wed','thu','fri'],
  stars_value INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT DEFAULT 'lola',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. HOMESCHOOL TASK COMPLETIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS homeschool_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES homeschool_tasks(id),
  kid_name TEXT NOT NULL,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  stars_earned INTEGER DEFAULT 1,
  UNIQUE(task_id, kid_name, task_date)
);

CREATE INDEX IF NOT EXISTS idx_hs_tasks_kid ON homeschool_tasks(kid_name);
CREATE INDEX IF NOT EXISTS idx_hs_tasks_active ON homeschool_tasks(kid_name, active);
CREATE INDEX IF NOT EXISTS idx_hs_completions_date ON homeschool_task_completions(kid_name, task_date);

-- ============================================================================
-- 3. VOCAB MIXER SESSIONS (table was referenced but never created)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vocab_mixer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  source_book_ids JSONB,
  word_ids JSONB,
  locked_word_ids UUID[],
  word_count INTEGER,
  output_type TEXT,
  source_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. SEED DAILY TASKS — ALL KIDS: Word of the Day
-- ============================================================================
INSERT INTO homeschool_tasks (kid_name, subject, task_label, task_description, duration_min, stars_value, sort_order) VALUES
  ('Amos',   'ELAR', 'Word of the Day', 'Review today''s vocab word, say it, use it in a sentence', 5, 1, 1),
  ('Ellie',  'ELAR', 'Word of the Day', 'Review today''s vocab word, write definition + sentence', 5, 1, 1),
  ('Wyatt',  'ELAR', 'Word of the Day', 'Review today''s vocab word, say it, draw or act it out', 5, 1, 1),
  ('Hannah', 'ELAR', 'Word of the Day', 'Review today''s vocab word, say it, draw or act it out', 5, 1, 1)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. SEED DAILY TASKS — ALL KIDS: Independent Reading
-- ============================================================================
INSERT INTO homeschool_tasks (kid_name, subject, task_label, task_description, duration_min, stars_value, sort_order) VALUES
  ('Amos',   'ELAR', 'Independent Reading', 'Read for 20 minutes — log in Reading Log when done', 20, 2, 10),
  ('Ellie',  'ELAR', 'Independent Reading', 'Read for 20 minutes — log in Reading Log when done', 20, 2, 10),
  ('Wyatt',  'ELAR', 'Independent Reading', 'Read for 20 minutes — log in Reading Log when done', 20, 2, 10),
  ('Hannah', 'ELAR', 'Independent Reading', 'Read for 20 minutes — log in Reading Log when done', 20, 2, 10)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. SEED DAILY TASKS — AMOS (10th grade, ~2nd grade math)
-- ============================================================================
INSERT INTO homeschool_tasks (kid_name, subject, task_label, task_description, duration_min, stars_value, sort_order) VALUES
  ('Amos', 'Math',    'IXL Math — 2nd Grade',              'Complete 15 minutes in IXL 2nd Grade Math workbook', 15, 2, 2),
  ('Amos', 'Math',    'Summer Bridge — Grades 1→2',        'Complete today''s Summer Bridge pages (math section)', 15, 2, 3),
  ('Amos', 'ELAR',    'Summer Bridge — Grades 1→2 (ELAR)', 'Complete today''s Summer Bridge pages (reading/writing section)', 15, 2, 4),
  ('Amos', 'Science', 'Science / Social Studies Block',     'Hands-on activity, video, or reading — see weekly plan', 30, 2, 5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. SEED DAILY TASKS — ELLIE (6th grade)
-- ============================================================================
INSERT INTO homeschool_tasks (kid_name, subject, task_label, task_description, duration_min, stars_value, sort_order) VALUES
  ('Ellie', 'Math',    'IXL Math — 5th Grade',              'Complete 15 minutes in IXL 5th Grade Math workbook', 15, 2, 2),
  ('Ellie', 'Math',    'Summer Bridge — Grades 5→6',        'Complete today''s Summer Bridge pages (math section)', 15, 2, 3),
  ('Ellie', 'ELAR',    'Summer Bridge — Grades 5→6 (ELAR)', 'Complete today''s Summer Bridge pages (reading/writing section)', 15, 2, 4),
  ('Ellie', 'Science', 'Science / Social Studies Block',     'Hands-on activity, video, or reading — see weekly plan', 30, 2, 5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. SEED DAILY TASKS — WYATT (4th grade, severe ADHD)
-- ============================================================================
INSERT INTO homeschool_tasks (kid_name, subject, task_label, task_description, duration_min, stars_value, sort_order) VALUES
  ('Wyatt', 'Math',    'IXL Math — 4th Grade',              'Complete 15 minutes in IXL 4th Grade Math workbook', 15, 2, 2),
  ('Wyatt', 'Math',    'Summer Bridge — Grades 4→5',        'Complete today''s Summer Bridge pages (math section)', 15, 2, 3),
  ('Wyatt', 'ELAR',    'Summer Bridge — Grades 4→5 (ELAR)', 'Complete today''s Summer Bridge pages (reading/writing section)', 15, 2, 4),
  ('Wyatt', 'Science', 'Science / Social Studies Block',     'Hands-on activity, video, or reading — see weekly plan', 30, 2, 5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. SEED DAILY TASKS — HANNAH (3rd grade, building confidence)
-- ============================================================================
INSERT INTO homeschool_tasks (kid_name, subject, task_label, task_description, duration_min, stars_value, sort_order) VALUES
  ('Hannah', 'Math',    'IXL Math — 3rd Grade',              'Complete 15 minutes in IXL 3rd Grade Math workbook', 15, 2, 2),
  ('Hannah', 'Math',    'Summer Bridge — Grades 2→3',        'Complete today''s Summer Bridge pages (math section)', 15, 2, 3),
  ('Hannah', 'ELAR',    'Summer Bridge — Grades 2→3 (ELAR)', 'Complete today''s Summer Bridge pages (reading/writing section)', 15, 2, 4),
  ('Hannah', 'Science', 'Science / Social Studies Block',     'Hands-on activity, video, or reading — see weekly plan', 30, 2, 5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. SEED CURRENT FAMILY BOOKS (hs_books)
-- ============================================================================
INSERT INTO hs_books (title, author, book_type, read_type, student_names, total_pages, current_page, subject_tag, school_year, status)
VALUES ('Olive''s Ocean', 'Kevin Henkes', 'curriculum', 'read_aloud', ARRAY['Amos','Ellie','Wyatt','Hannah'], 217, 0, 'ELAR', '2025-2026', 'in_progress')
ON CONFLICT DO NOTHING;
