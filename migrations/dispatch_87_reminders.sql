-- ============================================================================
-- Dispatch 87 — Notifications Overhaul & Reminder System
-- Adds reminder_schedules + quiet hours to notification_preferences.
-- push_subscriptions, notification_preferences, and notifications tables
-- already exist from prior dispatches.
-- ============================================================================

-- 1. Reminder schedules (new) -----------------------------------------------
CREATE TABLE IF NOT EXISTS reminder_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role     TEXT NOT NULL DEFAULT 'parent',
  kid_name        TEXT,
  reminder_type   TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT,
  schedule_time   TIME NOT NULL,
  days_of_week    INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  active          BOOLEAN DEFAULT TRUE,
  last_fired_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_schedules_active ON reminder_schedules(active, schedule_time);

-- 2. Extend notification_preferences with quiet hours -----------------------
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS quiet_start    TIME,
  ADD COLUMN IF NOT EXISTS quiet_end      TIME,
  ADD COLUMN IF NOT EXISTS quiet_enabled  BOOLEAN DEFAULT FALSE;

-- 3. Seed default parent reminders (idempotent) ----------------------------
INSERT INTO reminder_schedules (target_role, reminder_type, title, message, schedule_time)
SELECT * FROM (VALUES
  ('parent', 'med_am',    '💊 Meds time',              'Amos & Wyatt — Focalin (morning dose)',     '06:45'::time),
  ('parent', 'chore_am',  '🏠 Morning zones start',    'Zone chores should be starting',            '07:00'::time),
  ('parent', 'meal_pick', '🍽️ Meal pick deadline',     'Check if kids have picked dinner yet',       '16:00'::time),
  ('parent', 'belle_pm',  '🐕 Belle PM feed',          'Evening feed + walk for Belle',              '17:00'::time),
  ('parent', 'bedtime',   '🌙 Bedtime routine',        'Meds (Clonidine), hygiene, Belle PM',       '20:00'::time),
  ('parent', 'med_pm',    '💊 Clonidine time',         'Amos & Wyatt — evening Clonidine',          '20:30'::time),
  ('parent', 'lights_out','😴 All kids asleep',         'Everyone should be in bed by now',          '21:00'::time)
) AS v(target_role, reminder_type, title, message, schedule_time)
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_schedules WHERE reminder_schedules.reminder_type = v.reminder_type AND reminder_schedules.target_role = v.target_role
);
