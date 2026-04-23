-- ============================================================================
-- Dispatch 152 — Ingredient Aliases Bridge Table
-- Links recipe-level ingredient terms (e.g. "chicken breast") to actual
-- inventory_items (e.g. "Boneless Skinless Chicken Breast"). Enables the
-- "check my pantry" + auto-shopping-list pipeline.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ingredient_aliases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_term     TEXT NOT NULL,          -- recipe-level abstract name
  inventory_item_id   UUID,                   -- FK to inventory_items.id (nullable for terms with no match yet)
  is_primary_match    BOOLEAN DEFAULT FALSE,  -- one primary per ingredient_term
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ingredient_term, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_term ON ingredient_aliases (LOWER(ingredient_term));
CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_item ON ingredient_aliases (inventory_item_id);

-- Ensure stock_location_quantities exists (was referenced but never formally migrated)
-- Column names match the existing /api/stock route (stock_item_id, current_quantity)
CREATE TABLE IF NOT EXISTS stock_location_quantities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id     UUID NOT NULL,
  location_id       UUID NOT NULL,
  current_quantity  NUMERIC DEFAULT 0,
  unit              TEXT,
  recorded_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (stock_item_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_loc_qty_item ON stock_location_quantities (stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_loc_qty_loc ON stock_location_quantities (location_id);
