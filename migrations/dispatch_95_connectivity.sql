-- ============================================================================
-- Dispatch 95 — Ecosystem Connectivity Fixes
-- Seeds kid reminders, school contacts, fixes notification link_tabs.
-- ============================================================================

-- NOTIF-FIX-1: Fix existing notifications missing link_tab
UPDATE notifications SET link_tab = 'health' WHERE source_type LIKE 'reminder_med%' AND link_tab IS NULL;
UPDATE notifications SET link_tab = 'kids-checklist' WHERE source_type IN ('reminder_bedtime','reminder_lights_out','reminder_chore_am') AND link_tab IS NULL;
UPDATE notifications SET link_tab = 'belle-care' WHERE source_type = 'reminder_belle_pm' AND link_tab IS NULL;
UPDATE notifications SET link_tab = 'food-inventory' WHERE source_type = 'reminder_meal_pick' AND link_tab IS NULL;
UPDATE notifications SET link_tab = 'stars-rewards' WHERE source_type = 'bonus_stars' AND link_tab IS NULL;

-- NOTIF-FIX-4: Kid-facing reminders (meds + bedtime for all 6 kids)
INSERT INTO reminder_schedules (target_role, kid_name, reminder_type, title, message, schedule_time, days_of_week)
SELECT * FROM (VALUES
  ('kid', 'amos',   'med_am',   '💊 Time for Focalin!',      'Take your morning meds',    '06:45'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'amos',   'med_pm',   '💊 Clonidine time',         'Take your night meds',       '20:30'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'wyatt',  'med_am',   '💊 Time for Focalin!',      'Take your morning meds',    '06:45'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'wyatt',  'med_pm',   '💊 Clonidine time',         'Take your night meds',       '20:30'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'amos',   'bedtime',  '🌙 Bedtime routine!',       'Start winding down',         '20:00'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'zoey',   'bedtime',  '🌙 Bedtime routine!',       'Start winding down',         '20:00'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'kaylee', 'bedtime',  '🌙 Bedtime routine!',       'Start winding down',         '20:00'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'ellie',  'bedtime',  '🌙 Bedtime routine!',       'Start winding down',         '20:00'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'wyatt',  'bedtime',  '🌙 Bedtime routine!',       'Start winding down',         '20:00'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'hannah', 'bedtime',  '🌙 Bedtime routine!',       'Start winding down',         '20:00'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'amos',   'chore_am', '🏠 Morning zone time!',     'Start your zone chores',     '07:00'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'ellie',  'chore_am', '🏠 Morning zone time!',     'Start your zone chores',     '07:00'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'wyatt',  'chore_am', '🏠 Morning zone time!',     'Start your zone chores',     '07:00'::time, '{0,1,2,3,4,5,6}'::int[]),
  ('kid', 'hannah', 'chore_am', '🏠 Morning zone time!',     'Start your zone chores',     '07:00'::time, '{0,1,2,3,4,5,6}'::int[])
) AS v(target_role, kid_name, reminder_type, title, message, schedule_time, days_of_week)
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_schedules rs
  WHERE rs.target_role = v.target_role AND rs.kid_name = v.kid_name AND rs.reminder_type = v.reminder_type
);

-- REM-FIX-2: Additional parent reminders
INSERT INTO reminder_schedules (target_role, reminder_type, title, message, schedule_time)
SELECT * FROM (VALUES
  ('parent', 'belle_am',  '🐕 Belle AM walk + feed', 'Morning walk and feed for Belle', '07:00'::time)
) AS v(target_role, reminder_type, title, message, schedule_time)
WHERE NOT EXISTS (SELECT 1 FROM reminder_schedules WHERE reminder_type = 'belle_am');

-- SCHOOL-FIX-1: Update existing school contacts with CLAUDE.md data
UPDATE kid_school_contacts SET
  school_name = 'Champion High School',
  teacher_name = 'Susan Collentine, Ed.D.',
  teacher_email = 'Susan.Collentine@boerneisd.net',
  phone = '830-357-2721',
  attendance_contact = '504 Facilitator'
WHERE kid_name = 'zoey';

INSERT INTO kid_school_contacts (kid_name, school_name, teacher_name, teacher_email, phone, attendance_contact)
VALUES ('kaylee', 'BMSN', 'Ashlie D''Spain', 'ashlie.dspain@boerneisd.net', '830-357-3152', 'School Contact / Shining Stars')
ON CONFLICT (kid_name) DO UPDATE SET
  school_name = EXCLUDED.school_name,
  teacher_name = EXCLUDED.teacher_name,
  teacher_email = EXCLUDED.teacher_email,
  phone = EXCLUDED.phone,
  attendance_contact = EXCLUDED.attendance_contact;

-- SCHOOL-FIX-3: school_attendance has FK from makeup_work — keep both, no drop

-- MSG-FIX-1: Drop dead kid_notes table
DROP TABLE IF EXISTS kid_notes;

-- NOTIF-FIX-5: Drop dead parent_notifications table
DROP TABLE IF EXISTS parent_notifications;

-- MEAL-WIRE-5: grocery_receipts table
CREATE TABLE IF NOT EXISTS grocery_receipts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_date  DATE NOT NULL,
  store         TEXT,
  total         DECIMAL(10,2),
  snap_amount   DECIMAL(10,2) DEFAULT 0,
  cash_amount   DECIMAL(10,2) DEFAULT 0,
  image_url     TEXT,
  items         JSONB DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
