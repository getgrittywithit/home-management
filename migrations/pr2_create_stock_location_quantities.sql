-- PR2 follow-up — stock_location_quantities table.
-- Applied via Supabase MCP on 2026-04-27.
--
-- Why this is its own follow-up: PR2 verification found that
-- /api/stock get_par_board was returning {locations: [], items: []}
-- even with cleaning items + par rows seeded. Root cause: the route
-- queries stock_location_quantities for current-on-hand, that table
-- never existed, the 42P01 was being silently swallowed by the outer
-- catch (lines 131-136), and the early-return at line 63 (no items
-- → skip qty query) hid the bug pre-seed.
--
-- The schema was already prepared in
-- migrations/dispatch_152_ingredient_aliases.sql but never applied.
-- Reproduced here verbatim. set_quantity / adjust_quantity actions
-- on the same route also write to this table — patching just the read
-- path would have left the writes broken.

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
