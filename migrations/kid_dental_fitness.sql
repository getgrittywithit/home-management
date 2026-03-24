-- Dental checklist items per kid (configurable)
CREATE TABLE IF NOT EXISTS kid_dental_items (
  id SERIAL PRIMARY KEY,
  child_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'evening')),
  enabled BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0
);

-- Dental checklist daily log
CREATE TABLE IF NOT EXISTS kid_dental_log (
  id SERIAL PRIMARY KEY,
  dental_item_id INT REFERENCES kid_dental_items(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(dental_item_id, child_name, log_date)
);

-- Dental notes (parent-managed)
CREATE TABLE IF NOT EXISTS kid_dental_notes (
  id SERIAL PRIMARY KEY,
  child_name TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dental streak tracking
CREATE TABLE IF NOT EXISTS kid_dental_streaks (
  id SERIAL PRIMARY KEY,
  child_name TEXT NOT NULL UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_completed_date DATE
);

-- Activity log entries
CREATE TABLE IF NOT EXISTS kid_activity_log (
  id SERIAL PRIMARY KEY,
  child_name TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  duration_minutes INT,
  notes TEXT,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily mood entries
CREATE TABLE IF NOT EXISTS kid_mood_log (
  id SERIAL PRIMARY KEY,
  child_name TEXT NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('great', 'good', 'ok', 'rough', 'bad')),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  UNIQUE(child_name, log_date)
);

-- Zoey's extended wellness tracking
CREATE TABLE IF NOT EXISTS kid_wellness_log (
  id SERIAL PRIMARY KEY,
  child_name TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INT,
  water_cups INT,
  fasting_start TIME,
  fasting_end TIME,
  weight DECIMAL(5,1),
  notes TEXT,
  UNIQUE(child_name, log_date)
);

CREATE INDEX IF NOT EXISTS idx_dental_items_child ON kid_dental_items(child_name, enabled);
CREATE INDEX IF NOT EXISTS idx_dental_log_date ON kid_dental_log(child_name, log_date);
CREATE INDEX IF NOT EXISTS idx_activity_date ON kid_activity_log(child_name, log_date);
CREATE INDEX IF NOT EXISTS idx_mood_date ON kid_mood_log(child_name, log_date);
CREATE INDEX IF NOT EXISTS idx_wellness_date ON kid_wellness_log(child_name, log_date);

-- Seed: Default dental checklist for each kid
INSERT INTO kid_dental_items (child_name, item_name, time_of_day, sort_order) VALUES
('amos', 'Brush Teeth', 'morning', 1),
('amos', 'Brush Teeth', 'evening', 2),
('amos', 'Floss', 'evening', 3),
('zoey', 'Brush Teeth', 'morning', 1),
('zoey', 'Brush Teeth', 'evening', 2),
('zoey', 'Floss', 'evening', 3),
('zoey', 'Mouthwash', 'evening', 4),
('kaylee', 'Brush Teeth', 'morning', 1),
('kaylee', 'Brush Teeth', 'evening', 2),
('kaylee', 'Floss', 'evening', 3),
('ellie', 'Brush Teeth', 'morning', 1),
('ellie', 'Brush Teeth', 'evening', 2),
('ellie', 'Floss', 'evening', 3),
('wyatt', 'Brush Teeth', 'morning', 1),
('wyatt', 'Brush Teeth', 'evening', 2),
('wyatt', 'Floss', 'evening', 3),
('hannah', 'Brush Teeth', 'morning', 1),
('hannah', 'Brush Teeth', 'evening', 2),
('hannah', 'Floss', 'evening', 3);

-- Initialize streak records
INSERT INTO kid_dental_streaks (child_name, current_streak, longest_streak) VALUES
('amos', 0, 0), ('zoey', 0, 0), ('kaylee', 0, 0),
('ellie', 0, 0), ('wyatt', 0, 0), ('hannah', 0, 0);
