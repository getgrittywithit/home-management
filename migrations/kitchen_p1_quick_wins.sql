-- Kitchen P1 Quick Wins (D24/25)
-- Applied via Supabase MCP on 2026-04-25.
--
-- P1-A: flip inventory_items default — assume "in stock at par" so
--       current_stock=0 means "I marked it out," not "I haven't recorded
--       it yet." The 671 never-touched-with-par-set rows are now stocked.
-- P1-C: collapse 12 drift categories into a fixed 13-value enum on
--       kid_grocery_requests.category, with a CHECK constraint enforcing
--       it. Pairs with the canonical enum in src/lib/constants.ts.
-- P1-B: pure UI (WeeklyMealCalendar banner) — no DB changes.

-- ===== P1-A =====
UPDATE inventory_items
SET current_stock = COALESCE(par_level, 1)
WHERE active = TRUE
  AND current_stock = 0
  AND last_purchased IS NULL
  AND par_level IS NOT NULL;

UPDATE inventory_items
SET current_stock = 1
WHERE active = TRUE
  AND current_stock = 0
  AND last_purchased IS NULL
  AND par_level IS NULL;

-- ===== P1-C =====
UPDATE kid_grocery_requests SET category = CASE LOWER(category)
  WHEN 'general'         THEN 'other'
  WHEN 'snack'           THEN 'snack_drink'
  WHEN 'meal_ingredient' THEN 'meal_cooking'
  WHEN 'meal'            THEN 'meal_cooking'
  WHEN 'drink'           THEN 'snack_drink'
  WHEN 'baking'          THEN 'pantry'
  WHEN 'school_supply'   THEN 'school'
  WHEN 'pet_supply'      THEN 'pet_care'
  WHEN 'cleaning'        THEN 'household'
  WHEN 'produce'         THEN 'produce'
  WHEN 'snacks'          THEN 'snacks'
  WHEN 'dairy'           THEN 'dairy'
  WHEN 'frozen'          THEN 'frozen'
  WHEN 'pantry'          THEN 'pantry'
  WHEN 'household'       THEN 'household'
  WHEN 'personal_care'   THEN 'personal_care'
  WHEN 'pet_care'        THEN 'pet_care'
  WHEN 'school'          THEN 'school'
  WHEN 'wishlist'        THEN 'wishlist'
  WHEN 'other'           THEN 'other'
  ELSE 'other'
END;

ALTER TABLE kid_grocery_requests ALTER COLUMN category SET DEFAULT 'other';

ALTER TABLE kid_grocery_requests
  ADD CONSTRAINT kid_grocery_requests_category_enum
  CHECK (category IN (
    'meal_cooking','snack_drink','produce','snacks','dairy','frozen',
    'pantry','household','personal_care','pet_care','school','wishlist','other'
  ));
