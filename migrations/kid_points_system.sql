-- Points balance per kid
CREATE TABLE IF NOT EXISTS kid_points_balance (
  kid_name TEXT PRIMARY KEY,
  current_points INTEGER DEFAULT 0,
  total_earned_all_time INTEGER DEFAULT 0,
  last_payout_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full transaction history
CREATE TABLE IF NOT EXISTS kid_points_log (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'deducted', 'payout')),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  logged_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual savings goals
CREATE TABLE IF NOT EXISTS kid_savings_goals (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  goal_name TEXT NOT NULL,
  target_points INTEGER NOT NULL,
  current_points INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family shared goals
CREATE TABLE IF NOT EXISTS family_goals (
  id SERIAL PRIMARY KEY,
  goal_name TEXT NOT NULL,
  target_points INTEGER NOT NULL,
  current_points INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_by TEXT DEFAULT 'Lola',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sick day log
CREATE TABLE IF NOT EXISTS kid_sick_days (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  sick_date DATE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('Headache', 'Stomach', 'Nausea', 'Fatigue', 'Fever', 'Anxiety', 'Not feeling well', 'Other')),
  severity TEXT NOT NULL CHECK (severity IN ('Mild', 'Moderate', 'Couldn''t get out of bed')),
  notes TEXT,
  saw_doctor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, sick_date)
);

-- System settings (points mode, conversion rate)
CREATE TABLE IF NOT EXISTS points_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  mode TEXT DEFAULT 'points' CHECK (mode IN ('points', 'dollars')),
  conversion_rate NUMERIC(10,2) DEFAULT 0.10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO points_settings (id, mode, conversion_rate) VALUES (1, 'points', 0.10)
ON CONFLICT (id) DO NOTHING;

-- Seed balance rows for all 6 kids
INSERT INTO kid_points_balance (kid_name) VALUES
  ('amos'), ('ellie'), ('wyatt'), ('hannah'), ('zoey'), ('kaylee')
ON CONFLICT (kid_name) DO NOTHING;

-- Add point_value column to earn_money_chores if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'earn_money_chores' AND column_name = 'point_value'
  ) THEN
    ALTER TABLE earn_money_chores ADD COLUMN point_value INTEGER DEFAULT 10;
  END IF;
END $$;
