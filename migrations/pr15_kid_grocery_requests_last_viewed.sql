-- PR15 (P1-2): parallel last_viewed_at on kid_grocery_requests so the
-- Kitchen tab "mark viewed" stamps both queues together. Pre-empts the
-- badge-also-counts-grocery diagnosis Lola flagged.
-- Applied via Supabase MCP on 2026-04-26.

ALTER TABLE kid_grocery_requests
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;
