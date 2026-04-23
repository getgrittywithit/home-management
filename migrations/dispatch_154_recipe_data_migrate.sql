-- ============================================================================
-- Dispatch 154 — Recipe Data Migration
-- Copies seeded jsonb data into the columns the existing UI reads:
--   1. adult_directions → recipe_steps (for the 100 meals where recipe_steps is empty)
--   2. meal_library.ingredients jsonb → meal_ingredients normalized rows
-- This is idempotent — safe to run multiple times.
-- ============================================================================

-- ─── Phase 1: Copy adult_directions → recipe_steps ──────────────────────────
-- Converts string[] into {order, text, group}[] format that RecipeCard reads
UPDATE meal_library
SET recipe_steps = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'order', rn,
      'text', elem,
      'group', 'cook'
    )
  )
  FROM (
    SELECT elem, ROW_NUMBER() OVER () AS rn
    FROM jsonb_array_elements_text(adult_directions) AS elem
  ) sub
)
WHERE (recipe_steps IS NULL OR recipe_steps = '[]'::jsonb)
  AND adult_directions IS NOT NULL
  AND adult_directions != '[]'::jsonb
  AND jsonb_array_length(adult_directions) > 0;

-- ─── Phase 2: Copy meal_library.ingredients jsonb → meal_ingredients rows ───
-- Only for meals that have zero normalized rows but have jsonb ingredient data
INSERT INTO meal_ingredients (meal_id, name, quantity, unit, department, preferred_store, notes)
SELECT
  ml.id AS meal_id,
  ing->>'name' AS name,
  CASE
    WHEN ing->>'quantity' IS NOT NULL AND ing->>'quantity' != 'null'
    THEN (ing->>'quantity')::numeric
    ELSE NULL
  END AS quantity,
  NULLIF(ing->>'unit', 'null') AS unit,
  COALESCE(NULLIF(ing->>'department', 'null'), 'Other') AS department,
  'either' AS preferred_store,
  NULLIF(ing->>'notes', 'null') AS notes
FROM meal_library ml,
     jsonb_array_elements(ml.ingredients) AS ing
WHERE ml.ingredients IS NOT NULL
  AND ml.ingredients != '[]'::jsonb
  AND jsonb_array_length(ml.ingredients) > 0
  AND NOT EXISTS (
    SELECT 1 FROM meal_ingredients mi WHERE mi.meal_id = ml.id
  )
  AND ing->>'name' IS NOT NULL
  AND TRIM(ing->>'name') != '';
