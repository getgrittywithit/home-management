-- ============================================================================
-- Hotfix: Missing tables and columns causing 500 errors
-- ============================================================================

-- Error 3: star_savings_goals missing 'active' column
ALTER TABLE star_savings_goals ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Error 4: family_goals table may not exist
CREATE TABLE IF NOT EXISTS family_goals (
  id SERIAL PRIMARY KEY,
  goal_name TEXT NOT NULL,
  target_points INTEGER NOT NULL,
  current_points INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_by TEXT DEFAULT 'Lola',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
