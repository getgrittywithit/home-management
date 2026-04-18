-- Dispatch 115 — Seed data + infrastructure fixes

-- Quiet hours default (needed for D113 Phase 5 to actually work)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'parent',
  kid_name TEXT,
  quiet_start INTEGER,
  quiet_end INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, kid_name)
);

INSERT INTO notification_preferences (role, quiet_start, quiet_end)
VALUES ('parent', 21, 7)
ON CONFLICT (role, kid_name) DO NOTHING;

-- Grocery staples seed (30 common items for the Moses family)
INSERT INTO grocery_items (item_name, category) VALUES
  ('Rice (long grain)', 'pantry'),
  ('Pasta (spaghetti)', 'pantry'),
  ('Pasta (penne)', 'pantry'),
  ('Canned tomatoes (diced)', 'pantry'),
  ('Canned tomatoes (sauce)', 'pantry'),
  ('Chicken broth', 'pantry'),
  ('Olive oil', 'pantry'),
  ('Vegetable oil', 'pantry'),
  ('Peanut butter', 'pantry'),
  ('Jelly (grape)', 'pantry'),
  ('All-purpose flour', 'baking'),
  ('Sugar', 'baking'),
  ('Brown sugar', 'baking'),
  ('Baking soda', 'baking'),
  ('Salt', 'spices'),
  ('Black pepper', 'spices'),
  ('Garlic powder', 'spices'),
  ('Cumin', 'spices'),
  ('Chili powder', 'spices'),
  ('Butter', 'dairy'),
  ('Milk (whole)', 'dairy'),
  ('Eggs (18ct)', 'dairy'),
  ('Shredded cheese (cheddar)', 'dairy'),
  ('Sour cream', 'dairy'),
  ('Cream cheese', 'dairy'),
  ('Ground beef', 'meat'),
  ('Chicken thighs', 'meat'),
  ('Bacon', 'meat'),
  ('Bread (whole wheat)', 'bakery'),
  ('Tortillas (flour, large)', 'bakery'),
  ('Bananas', 'produce'),
  ('Apples', 'produce'),
  ('Onions (yellow)', 'produce'),
  ('Potatoes (russet)', 'produce'),
  ('Lettuce (romaine)', 'produce'),
  ('Tomatoes', 'produce'),
  ('Bell peppers', 'produce'),
  ('Cilantro', 'produce'),
  ('Limes', 'produce'),
  ('Avocados', 'produce'),
  ('Cereal (variety)', 'breakfast'),
  ('Oatmeal', 'breakfast'),
  ('Pancake mix', 'breakfast'),
  ('Syrup', 'breakfast'),
  ('Canned beans (black)', 'pantry'),
  ('Canned beans (pinto)', 'pantry'),
  ('Canned corn', 'pantry'),
  ('Taco seasoning', 'spices'),
  ('Ranch dressing', 'condiments'),
  ('Ketchup', 'condiments'),
  ('Mustard', 'condiments'),
  ('Mayo', 'condiments'),
  ('Hot sauce', 'condiments'),
  ('Soy sauce', 'condiments'),
  ('Chips (tortilla)', 'snacks'),
  ('Goldfish crackers', 'snacks'),
  ('Fruit snacks', 'snacks'),
  ('Juice boxes', 'beverages'),
  ('Water bottles (case)', 'beverages'),
  ('Lemonade mix', 'beverages')
ON CONFLICT DO NOTHING;

-- Add skip_reason column if not exists (for sick day task skipping)
ALTER TABLE kid_daily_checklist ADD COLUMN IF NOT EXISTS skip_reason TEXT;
ALTER TABLE kid_daily_checklist ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMPTZ;
