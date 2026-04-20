-- Dispatch 127 — Day Mode System
-- Unified abstraction for Normal, Fun Friday, Off Day, Vacation, Sick Day,
-- Field Trip, Work Day, Half Day, Catch-Up

CREATE TABLE IF NOT EXISTS day_modes (
  id SERIAL PRIMARY KEY,
  kid_name TEXT,
  date DATE NOT NULL,
  mode_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  set_by TEXT NOT NULL DEFAULT 'parent',
  reason TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  notify_school BOOLEAN DEFAULT FALSE,
  parent_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, date)
);

CREATE INDEX IF NOT EXISTS idx_day_modes_date ON day_modes(date);
CREATE INDEX IF NOT EXISTS idx_day_modes_kid_date ON day_modes(kid_name, date);
CREATE INDEX IF NOT EXISTS idx_day_modes_pending ON day_modes(status) WHERE status = 'pending_confirm';

CREATE TABLE IF NOT EXISTS day_mode_coverage (
  id SERIAL PRIMARY KEY,
  day_mode_id INTEGER REFERENCES day_modes(id) ON DELETE CASCADE,
  duty_type TEXT NOT NULL,
  original_kid TEXT NOT NULL,
  covered_by TEXT,
  covered_by_type TEXT,
  auto_assigned BOOLEAN DEFAULT FALSE,
  parent_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coverage_day_mode ON day_mode_coverage(day_mode_id);

-- Backfill from existing sick day attendance records
INSERT INTO day_modes (kid_name, date, mode_type, status, set_by, reason, parent_confirmed_at, created_at)
SELECT
  kid_name, attendance_date, 'sick_day', 'active',
  'parent', notes, created_at, created_at
FROM school_attendance
WHERE status = 'absent_sick' AND kid_name IS NOT NULL
ON CONFLICT (kid_name, date) DO NOTHING;
