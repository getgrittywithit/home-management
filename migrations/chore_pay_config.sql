-- ============================================================================
-- Migration: Chore Pay Config table
-- ============================================================================

CREATE TABLE IF NOT EXISTS chore_pay_config (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL UNIQUE,
  monthly_target DECIMAL(6,2) DEFAULT 0,
  daily_paid_chores INTEGER DEFAULT 2,
  required_daily INTEGER DEFAULT 2,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO chore_pay_config (kid_name, monthly_target, daily_paid_chores, required_daily) VALUES
  ('amos', 40, 3, 2),
  ('zoey', 35, 3, 2),
  ('kaylee', 25, 2, 2),
  ('ellie', 20, 2, 2),
  ('wyatt', 15, 2, 2),
  ('hannah', 10, 1, 2)
ON CONFLICT (kid_name) DO NOTHING;

-- Ensure points_settings table exists with default row
CREATE TABLE IF NOT EXISTS points_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  mode TEXT NOT NULL DEFAULT 'points',
  conversion_rate DECIMAL(6,4) DEFAULT 0.10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO points_settings (id, mode, conversion_rate) VALUES (1, 'points', 0.10)
ON CONFLICT (id) DO NOTHING;
