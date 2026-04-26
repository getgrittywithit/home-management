-- Kitchen Quick Wins (Item 1.2): tab badge mark-as-read
-- Applied via Supabase MCP on 2026-04-25.
--
-- Track when the parent last opened the Kitchen tab cluster so the
-- unread tab badge clears without making the underlying meal_requests
-- vanish from view. Old behavior: badge cleared on click but the items
-- were still pending — Lola lost track of what triggered "15." New
-- behavior: badge counts only requests created AFTER last_viewed_at;
-- requests stay visible in their list surfaces for action.

ALTER TABLE meal_requests
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;
