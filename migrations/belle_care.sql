CREATE TABLE IF NOT EXISTS belle_care_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  care_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(kid_name, care_date, task)
);

CREATE TABLE IF NOT EXISTS belle_care_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  week_start DATE NOT NULL,
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start)
);

INSERT INTO belle_care_schedule (kid_name, week_start, is_primary) VALUES
  ('amos', '2026-03-15', true),
  ('ellie', '2026-03-22', true),
  ('wyatt', '2026-03-29', true),
  ('hannah', '2026-04-05', true),
  ('zoey', '2026-04-12', true),
  ('kaylee', '2026-04-19', true),
  ('amos', '2026-04-26', true),
  ('ellie', '2026-05-03', true),
  ('wyatt', '2026-05-10', true),
  ('hannah', '2026-05-17', true),
  ('zoey', '2026-05-24', true),
  ('kaylee', '2026-05-31', true)
ON CONFLICT DO NOTHING;
