-- ============================================================================
-- Dispatch 139 — Curriculum Planner Final Wiring
-- Alert preferences + calendar event ID columns
-- ============================================================================

-- Tunable alert thresholds
CREATE TABLE IF NOT EXISTS curriculum_alert_preferences (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name               TEXT NOT NULL DEFAULT 'lola',
  budget_warning_threshold  INTEGER DEFAULT 75 CHECK (budget_warning_threshold BETWEEN 50 AND 95),
  budget_critical_threshold INTEGER DEFAULT 90 CHECK (budget_critical_threshold BETWEEN 75 AND 99),
  unit_starts_soon_days     INTEGER DEFAULT 7 CHECK (unit_starts_soon_days BETWEEN 1 AND 30),
  stale_order_days          INTEGER DEFAULT 14 CHECK (stale_order_days BETWEEN 7 AND 45),
  asset_unused_days         INTEGER DEFAULT 60 CHECK (asset_unused_days BETWEEN 30 AND 180),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_name)
);

INSERT INTO curriculum_alert_preferences (parent_name) VALUES ('lola') ON CONFLICT DO NOTHING;

-- Calendar event ID tracking for auto-created events
ALTER TABLE tefa_purchases ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
ALTER TABLE curriculum_year_outline ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
