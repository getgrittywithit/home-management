ALTER TABLE family_events ADD COLUMN IF NOT EXISTS show_on_kids_home BOOLEAN DEFAULT FALSE;
ALTER TABLE family_events ADD COLUMN IF NOT EXISTS is_countdown BOOLEAN DEFAULT FALSE;
ALTER TABLE family_events ADD COLUMN IF NOT EXISTS countdown_label TEXT;

CREATE TABLE IF NOT EXISTS parent_availability (
  id SERIAL PRIMARY KEY,
  parent_name TEXT NOT NULL,
  status_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'available',
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_name, status_date)
);
CREATE INDEX IF NOT EXISTS idx_parent_avail ON parent_availability(parent_name, status_date);
