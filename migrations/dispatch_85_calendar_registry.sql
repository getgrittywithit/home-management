-- ============================================================================
-- Dispatch 85 — Calendar registry extension
-- Adds sync_token to existing calendar_connections (D40 schema).
-- Seeds the 13 known family calendars if not already present.
-- ============================================================================

ALTER TABLE calendar_connections
  ADD COLUMN IF NOT EXISTS sync_token TEXT;

-- Seed known calendars (idempotent via ON CONFLICT)
INSERT INTO calendar_connections (google_calendar_id, display_name, color_hex, category, member_name, sort_order)
SELECT * FROM (VALUES
  ('primary',              'Family (Primary)',     '#3B82F6', 'family',  'Family',    1),
  ('lola-work-hub',        'Lola Work Hub',        '#14B8A6', 'parent',  'Lola',      2),
  ('finance-flow',         'Finance & Flow',       '#22C55E', 'system',  'Finance',   3),
  ('household-hub',        'Household Hub',        '#F97316', 'system',  'Household', 4),
  ('local-adventures',     'Local Adventures',     '#8B5CF6', 'family',  'Family',    5),
  ('pet-plant-jungle',     'Pet & Plant Jungle',   '#EC4899', 'system',  'Pets',      6),
  ('levi-work',            'Levi''s Work Calendar','#EF4444', 'parent',  'Levi',      7),
  ('kids-amos',            'Kids: Amos',           '#EAB308', 'kid',     'Amos',      8),
  ('kids-zoey',            'Kids: Zoey',           '#06B6D4', 'kid',     'Zoey',      9),
  ('kids-ellie',           'Kids: Ellie',          '#84CC16', 'kid',     'Ellie',    10),
  ('kids-hannah',          'Kids: Hannah',         '#F87171', 'kid',     'Hannah',   11),
  ('kids-wyatt',           'Kids: Wyatt',          '#F59E0B', 'kid',     'Wyatt',    12),
  ('kids-kaylee',          'Kids: Kaylee',         '#8B5CF6', 'kid',     'Kaylee',   13)
) AS v(google_calendar_id, display_name, color_hex, category, member_name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM calendar_connections WHERE calendar_connections.google_calendar_id = v.google_calendar_id
);
