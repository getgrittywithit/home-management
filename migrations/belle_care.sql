DROP TABLE IF EXISTS belle_care_log;
DROP TABLE IF EXISTS belle_care_schedule;

CREATE TABLE IF NOT EXISTS belle_weekday_assignments (
  day_of_week INTEGER NOT NULL, -- 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
  kid_name TEXT NOT NULL,
  PRIMARY KEY (day_of_week)
);

INSERT INTO belle_weekday_assignments VALUES
  (1, 'kaylee'),
  (2, 'amos'),
  (3, 'hannah'),
  (4, 'wyatt'),
  (5, 'ellie')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS belle_weekend_rotation (
  week_number INTEGER NOT NULL, -- 1 through 5
  kid_name TEXT NOT NULL,
  PRIMARY KEY (week_number)
);

INSERT INTO belle_weekend_rotation VALUES
  (1, 'kaylee'),
  (2, 'amos'),
  (3, 'hannah'),
  (4, 'wyatt'),
  (5, 'ellie')
ON CONFLICT DO NOTHING;

-- Anchor: Sat March 28, 2026 = week 1 (Kaylee)

CREATE TABLE IF NOT EXISTS belle_care_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  care_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task TEXT NOT NULL CHECK (task IN ('am_feed_walk', 'pm_feed', 'pm_walk', 'poop_patrol', 'brush_fur', 'brush_teeth')),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(care_date, task)
);
