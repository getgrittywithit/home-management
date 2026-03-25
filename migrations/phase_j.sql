CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  meal_plan_id INTEGER,
  title TEXT NOT NULL,
  ingredients JSONB DEFAULT '[]',
  steps JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_plan ON recipes(meal_plan_id);

ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS recipe_id INTEGER;
ALTER TABLE food_inventory ADD COLUMN IF NOT EXISTS min_quantity NUMERIC DEFAULT NULL;
ALTER TABLE food_inventory ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS shopping_list (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity TEXT,
  category TEXT DEFAULT 'other',
  checked BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'manual',
  added_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
