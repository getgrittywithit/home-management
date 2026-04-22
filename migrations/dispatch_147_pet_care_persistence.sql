-- Dispatch 147 — Pet Care Checklist Persistence

-- Extend pet_care_log with kid_name + pet_name text columns for simpler queries
ALTER TABLE pet_care_log ADD COLUMN IF NOT EXISTS kid_name TEXT;
ALTER TABLE pet_care_log ADD COLUMN IF NOT EXISTS pet_name TEXT;
ALTER TABLE pet_care_log ADD COLUMN IF NOT EXISTS task TEXT;
ALTER TABLE pet_care_log ADD COLUMN IF NOT EXISTS care_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE pet_care_log ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT TRUE;
ALTER TABLE pet_care_log ADD COLUMN IF NOT EXISTS notes TEXT;

-- Unique constraint per kid+pet+task per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_pet_care_daily ON pet_care_log (pet_name, kid_name, task, care_date);

-- Snapshot tables for midnight freeze
CREATE TABLE IF NOT EXISTS pet_care_daily_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  kid_name TEXT NOT NULL,
  pet_name TEXT,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_total INTEGER NOT NULL DEFAULT 0,
  completion_pct NUMERIC(5,2),
  completed_task_types TEXT[] DEFAULT '{}'::TEXT[],
  missed_task_types TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, kid_name, pet_name)
);

CREATE TABLE IF NOT EXISTS daily_checklist_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  kid_name TEXT NOT NULL,
  category TEXT,
  tasks_completed INTEGER,
  tasks_total INTEGER,
  completion_pct NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, kid_name, category)
);

-- Goodwill makeup for Kaylee
INSERT INTO kid_points_log (kid_name, transaction_type, points, reason)
VALUES ('kaylee', 'earned', 30, 'Spike care makeup — we fixed the save bug. Thanks for your patience!')
ON CONFLICT DO NOTHING;
