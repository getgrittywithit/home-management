-- Dispatch 129 — Print Center Dynamic Forms

CREATE TABLE IF NOT EXISTS reef_notes (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  testing_notes TEXT,
  events_notes TEXT,
  rhythms_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reef_notes_week ON reef_notes(week_start_date);

-- Update Zone Checklist to dynamic
UPDATE print_center_forms
SET form_type = 'dynamic', requires_data = true, data_source = 'zone_checklist_current', updated_at = NOW()
WHERE title ILIKE '%zone checklist%' AND form_type != 'dynamic';

-- Insert Week at a Glance form
INSERT INTO print_center_forms (category, title, description, form_type, icon, sort_order, is_active, requires_data, data_source)
VALUES ('household', 'Week at a Glance', 'Consolidated weekly overview: meals, managers, laundry, Belle, zones, dish duty, and Reef Notes.', 'dynamic', 'LayoutDashboard', 9, true, true, 'week_at_a_glance_current')
ON CONFLICT DO NOTHING;
