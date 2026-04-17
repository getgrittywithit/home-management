-- ============================================================================
-- Dispatch 98 — Meal Cooking Experience & Recipe System
-- Adds recipe data columns to meal_library + cooking session tracking.
-- ============================================================================

-- A-1: Recipe columns on meal_library
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS servings_default INTEGER DEFAULT 6;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS prep_time_min INTEGER DEFAULT 15;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS cook_time_min INTEGER DEFAULT 30;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'easy';
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '[]'::jsonb;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS directions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS tips TEXT;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Sub-option ingredient additions
ALTER TABLE meal_sub_options ADD COLUMN IF NOT EXISTS ingredients_add JSONB DEFAULT '[]'::jsonb;

-- A-3: Cooking session tracking
CREATE TABLE IF NOT EXISTS meal_cooking_sessions (
  id                  SERIAL PRIMARY KEY,
  kid_name            TEXT NOT NULL,
  meal_id             INTEGER,
  week_start          DATE,
  day_of_week         INTEGER,
  servings_multiplier REAL DEFAULT 1.0,
  sub_option_id       INTEGER,
  ingredient_checks   JSONB DEFAULT '[]'::jsonb,
  step_checks         JSONB DEFAULT '[]'::jsonb,
  rating              INTEGER,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  stars_awarded       INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cooking_sessions_kid ON meal_cooking_sessions(kid_name, created_at DESC);
