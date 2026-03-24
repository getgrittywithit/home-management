CREATE TABLE IF NOT EXISTS kid_cycle_log (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('start', 'end')),
  event_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kid_cycle_symptoms (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  log_date DATE NOT NULL,
  mood TEXT,
  cramps INTEGER CHECK (cramps BETWEEN 0 AND 3),
  flow TEXT CHECK (flow IN ('none', 'light', 'medium', 'heavy')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, log_date)
);

CREATE TABLE IF NOT EXISTS kid_cycle_settings (
  kid_name TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'learning' CHECK (mode IN ('learning', 'full')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cycle_log_kid ON kid_cycle_log(kid_name, event_date);
CREATE INDEX IF NOT EXISTS idx_cycle_symptoms_kid ON kid_cycle_symptoms(kid_name, log_date);

INSERT INTO kid_cycle_settings (kid_name, mode) VALUES
  ('zoey', 'full'),
  ('kaylee', 'full'),
  ('ellie', 'learning')
ON CONFLICT (kid_name) DO NOTHING;
