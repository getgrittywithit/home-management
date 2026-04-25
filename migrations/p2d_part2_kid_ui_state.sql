-- P2-D Part 2: persist last-expanded sidebar group per kid so the kid
-- portal restores wherever they were across sessions. Applied via
-- Supabase MCP on 2026-04-25.
--
-- Pairs with:
--   - GET/POST /api/kids/ui-state (route at src/app/api/kids/ui-state/route.ts)
--   - KidPortalWithNav restore-on-mount + debounce-POST-on-toggle
--
-- The "today only" check happens client-side (only restore if updated_at
-- is today's Chicago date), so the table itself is intentionally simple.

CREATE TABLE IF NOT EXISTS kid_ui_state (
  kid_name             TEXT PRIMARY KEY,
  last_expanded_group  TEXT,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kid_ui_state
  ADD CONSTRAINT kid_ui_state_kid_name_lowercase
  CHECK (kid_name = LOWER(kid_name));
