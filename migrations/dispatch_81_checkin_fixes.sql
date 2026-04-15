-- ============================================================================
-- Dispatch 81 — Check-In Card bugs + star rewards from feed
-- Extends kid_reports with dismissal + stars-awarded tracking so the
-- parent feed can archive cards and tally rewards inline.
-- Single-family app, no family_id column.
-- ============================================================================

ALTER TABLE kid_reports
  ADD COLUMN IF NOT EXISTS dismissed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dismissed_by        TEXT,
  ADD COLUMN IF NOT EXISTS stars_awarded_total INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_kid_reports_dismissed ON kid_reports(dismissed_at);
