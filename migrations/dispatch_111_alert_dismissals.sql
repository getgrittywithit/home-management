-- Dispatch 111 — Parent alert dismissals (persist across devices/sessions)
CREATE TABLE IF NOT EXISTS parent_alert_dismissals (
  id SERIAL PRIMARY KEY,
  alert_key TEXT NOT NULL UNIQUE,
  dismissed_by TEXT DEFAULT 'parent',
  dismissed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_dismissals_key ON parent_alert_dismissals(alert_key);

-- Household assignment overrides (travel coverage, sick days, etc.)
CREATE TABLE IF NOT EXISTS household_overrides (
  id SERIAL PRIMARY KEY,
  override_date DATE NOT NULL,
  override_type TEXT NOT NULL,
  assigned_to TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(override_date, override_type)
);
