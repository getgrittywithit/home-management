-- Kid Daily Care routines and completion log
CREATE TABLE IF NOT EXISTS kid_daily_care (
  id SERIAL PRIMARY KEY,
  child_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  instructions TEXT NOT NULL,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'evening', 'both')),
  category TEXT DEFAULT 'medication' CHECK (category IN ('medication', 'skincare', 'supplement', 'other')),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kid_daily_care_log (
  id SERIAL PRIMARY KEY,
  care_item_id INT REFERENCES kid_daily_care(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'evening')),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(care_item_id, log_date, time_of_day)
);

CREATE INDEX IF NOT EXISTS idx_care_child ON kid_daily_care(child_name, active);
CREATE INDEX IF NOT EXISTS idx_care_log_date ON kid_daily_care_log(child_name, log_date);

-- Seed data: Amos medications (ongoing)
INSERT INTO kid_daily_care (child_name, item_name, instructions, time_of_day, category) VALUES
('amos', 'Focalin', 'Take your morning medication', 'morning', 'medication'),
('amos', 'Clonidine', 'Take your bedtime medication', 'evening', 'medication');

-- Seed data: Wyatt medications (ongoing)
INSERT INTO kid_daily_care (child_name, item_name, instructions, time_of_day, category) VALUES
('wyatt', 'Focalin', 'Take your morning medication', 'morning', 'medication'),
('wyatt', 'Clonidine', 'Take your bedtime medication', 'evening', 'medication');

-- Seed data: Hannah eczema Round 2 (temporary)
INSERT INTO kid_daily_care (child_name, item_name, instructions, time_of_day, category, start_date, end_date) VALUES
('hannah', 'Mupirocin 2%', 'Apply to open skin/scratches · FACE & MOUTH AREA ONLY', 'both', 'skincare', '2026-03-25', '2026-04-07'),
('hannah', 'Hydrocortisone 2.5%', 'Apply to affected areas · FACE & MOUTH AREA ONLY', 'both', 'skincare', '2026-03-25', '2026-03-31'),
('hannah', 'Triamcinolone 0.1%', 'Apply to affected areas · BODY ONLY (not face)', 'both', 'skincare', '2026-03-25', '2026-04-07');

-- Seed data: Hannah Vanicream (ongoing)
INSERT INTO kid_daily_care (child_name, item_name, instructions, time_of_day, category) VALUES
('hannah', 'Vanicream Moisturizing Cream', 'Soak it in! Cover all dry/itchy areas. Reapply anytime you feel dry throughout the day.', 'both', 'skincare');
