-- Dispatch 115 — Seed data + infrastructure fixes
-- UPDATED April 18, 2026 to match live DB schema

-- notification_preferences table already exists (created in earlier migration).
-- Live schema: id, target_role, source_type, enabled, created_at, quiet_start (TIME),
--   quiet_end (TIME), quiet_enabled
-- Original migration referenced wrong columns (role, kid_name, INTEGER quiet hours).

-- Quiet hours default seed
INSERT INTO notification_preferences (target_role, source_type, quiet_start, quiet_end, quiet_enabled, enabled)
VALUES ('parent', 'all', '21:00:00', '07:00:00', true, true)
ON CONFLICT DO NOTHING;

-- Grocery staples seed (60 common items for the Moses family)
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

-- skip_reason + skipped_at already exist on kid_daily_checklist (added in earlier migration)
-- Original lines kept commented for reference:
-- ALTER TABLE kid_daily_checklist ADD COLUMN IF NOT EXISTS skip_reason TEXT;
-- ALTER TABLE kid_daily_checklist ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMPTZ;
