-- ============================================================================
-- Dispatch 77 — Print Center
-- Library of blank printable forms + dynamic PDFs generated from live data.
-- file_url is NULL for static forms until the corresponding PDF/PNG is
-- uploaded to Supabase Storage (bucket: print-center).
-- ============================================================================

CREATE TABLE IF NOT EXISTS print_center_forms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  form_type     TEXT NOT NULL DEFAULT 'static' CHECK (form_type IN ('static','dynamic')),
  file_url      TEXT,
  icon          TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  requires_data BOOLEAN DEFAULT FALSE,
  data_source   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_forms_category ON print_center_forms(category);
CREATE INDEX IF NOT EXISTS idx_print_forms_active ON print_center_forms(is_active) WHERE is_active = TRUE;

-- Idempotent seed — use title+category as the dedupe key
INSERT INTO print_center_forms (category, title, description, form_type, icon, sort_order, requires_data, data_source)
SELECT * FROM (VALUES
  ('medical', 'NICHQ Vanderbilt Assessment — Teacher Informant',
    'ADHD behavioral screening form for teachers. 31 items rated Never to Very Often. Standard D4 form from American Academy of Pediatrics & NICHQ.',
    'static', 'ClipboardList', 1, FALSE, NULL::text),
  ('medical', 'NICHQ Vanderbilt Assessment — Parent Informant',
    'ADHD behavioral screening form for parents. Companion to the teacher form.',
    'static', 'ClipboardList', 2, FALSE, NULL),
  ('meal', 'Weekly Meal Plan — Blank Template',
    'Printable weekly meal planner. Sun-Sat layout with Meal and Grocery/Prep columns. Purple/teal design.',
    'static', 'UtensilsCrossed', 3, FALSE, NULL),
  ('meal', 'Weekly Meal Plan — This Week (Filled)',
    'Auto-populated with this week''s meals, dinner managers, themes, and grocery/prep needs.',
    'dynamic', 'UtensilsCrossed', 4, TRUE, 'meal_plan_current_week'),
  ('meal', 'Weekly Meal Plan — Next Week (Filled)',
    'Auto-populated with next week''s meals. Print before grocery shopping.',
    'dynamic', 'UtensilsCrossed', 5, TRUE, 'meal_plan_next_week'),
  ('reading', 'Monthly Reading Log — Rainbow Tracker',
    'Color 1 rainbow for every 20 minutes of reading. Visual reading minutes tracker for kids.',
    'static', 'BookOpen', 6, FALSE, NULL),
  ('school', 'IEP Goal Progress Tracking Sheet',
    'Blank template for logging IEP goal progress by grading period.',
    'static', 'GraduationCap', 7, FALSE, NULL),
  ('household', 'Weekly Zone Checklist',
    'Printable zone task checklist per area (Kitchen, Floors, Hotspot, etc.).',
    'static', 'Home', 8, FALSE, NULL)
) AS v(category, title, description, form_type, icon, sort_order, requires_data, data_source)
WHERE NOT EXISTS (
  SELECT 1 FROM print_center_forms
  WHERE print_center_forms.title = v.title AND print_center_forms.category = v.category
);
