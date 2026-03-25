DROP TABLE IF EXISTS belle_care_log CASCADE;
DROP TABLE IF EXISTS belle_care_schedule CASCADE;
DROP TABLE IF EXISTS belle_weekday_assignments CASCADE;
DROP TABLE IF EXISTS belle_weekend_rotation CASCADE;
DROP TABLE IF EXISTS belle_grooming_log CASCADE;
DROP TABLE IF EXISTS belle_care_swaps CASCADE;

CREATE TABLE belle_weekday_assignments (
  day_of_week INTEGER PRIMARY KEY, -- 1=Mon..5=Fri
  kid_name TEXT NOT NULL
);
INSERT INTO belle_weekday_assignments VALUES
  (1, 'kaylee'), (2, 'amos'), (3, 'hannah'), (4, 'wyatt'), (5, 'ellie');

CREATE TABLE belle_weekend_rotation (
  week_number INTEGER PRIMARY KEY, -- 1..5
  kid_name TEXT NOT NULL
);
INSERT INTO belle_weekend_rotation VALUES
  (1, 'kaylee'), (2, 'amos'), (3, 'hannah'), (4, 'wyatt'), (5, 'ellie');
-- Anchor: Sat March 28, 2026 = week 1 (Kaylee)

CREATE TABLE belle_care_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  care_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task TEXT NOT NULL CHECK (task IN ('am_feed_walk','pm_feed','pm_walk','poop_patrol','brush_fur','brush_teeth')),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(care_date, task)
);

CREATE TABLE belle_grooming_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  task TEXT NOT NULL CHECK (task IN ('bath','nail_trim','fur_brush','ear_clean')),
  due_date DATE NOT NULL,
  weekend_start DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  missed_flag BOOLEAN DEFAULT FALSE,
  UNIQUE(due_date, task)
);

CREATE TABLE belle_care_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_kid TEXT NOT NULL,
  covering_kid TEXT NOT NULL,
  swap_type TEXT NOT NULL CHECK (swap_type IN ('weekday','weekend')),
  swap_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  lola_notified BOOLEAN DEFAULT FALSE
);
