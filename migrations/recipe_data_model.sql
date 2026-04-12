-- RECIPE-1: Add recipe step storage + metadata to meal_library
-- Dispatch 50, April 12 2026

ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS recipe_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS prep_time_min INTEGER;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS cook_time_min INTEGER;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS servings INTEGER DEFAULT 8;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS source TEXT;
