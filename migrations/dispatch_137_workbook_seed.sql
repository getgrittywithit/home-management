-- Dispatch 137 — Workbook Tracker Seed (fill total_pages + pages_per_day)

-- Add pages_per_day_target column if missing
ALTER TABLE kid_workbook_progress ADD COLUMN IF NOT EXISTS pages_per_day_target INTEGER DEFAULT 2;
ALTER TABLE kid_workbook_progress ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing rows with total_pages and correct grade labels
UPDATE kid_workbook_progress SET total_pages = 160, pages_per_day_target = 2
WHERE workbook_type = 'summer_bridge' AND total_pages IS NULL;

UPDATE kid_workbook_progress SET total_pages = 128, pages_per_day_target = 2
WHERE workbook_type = 'ultimate_math' AND total_pages IS NULL;

-- Ensure grade labels match the intentional per-kid levels
UPDATE kid_workbook_progress SET workbook_grade_label = '1st-to-2nd' WHERE kid_name = 'amos' AND workbook_type = 'summer_bridge';
UPDATE kid_workbook_progress SET workbook_grade_label = '2nd' WHERE kid_name = 'amos' AND workbook_type = 'ultimate_math';
UPDATE kid_workbook_progress SET workbook_grade_label = '5th-to-6th' WHERE kid_name = 'ellie' AND workbook_type = 'summer_bridge';
UPDATE kid_workbook_progress SET workbook_grade_label = '5th' WHERE kid_name = 'ellie' AND workbook_type = 'ultimate_math';
UPDATE kid_workbook_progress SET workbook_grade_label = '4th-to-5th' WHERE kid_name = 'wyatt' AND workbook_type = 'summer_bridge';
UPDATE kid_workbook_progress SET workbook_grade_label = '4th' WHERE kid_name = 'wyatt' AND workbook_type = 'ultimate_math';
UPDATE kid_workbook_progress SET workbook_grade_label = '2nd-to-3rd' WHERE kid_name = 'hannah' AND workbook_type = 'summer_bridge';
UPDATE kid_workbook_progress SET workbook_grade_label = '3rd' WHERE kid_name = 'hannah' AND workbook_type = 'ultimate_math';
