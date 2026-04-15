-- ============================================================================
-- Dispatch 60 ZONE-7 — Hannah's Plant Patrol
-- Hannah loves helping with plants. This is a recurring 10-15 minute task
-- on her homeschool daily checklist Mon/Wed/Fri/Sat. NOT tied to the zone
-- rotation — completely separate.
--
-- Kids never water plants themselves (Mom uses fertilizers, chemicals, and
-- rain water). Hannah's role: eyes-only observation, dead leaf cleanup,
-- dirt sweep, and reporting to Mom which plants might need water.
-- ============================================================================

INSERT INTO homeschool_tasks (
  kid_name, subject, task_label, task_description,
  duration_min, is_recurring, recurrence_days, stars_value, sort_order,
  active, created_by
)
SELECT 'Hannah', 'Life Skills', 'Plant Patrol — Help Mom with Plants',
  'Spend 10–15 minutes checking plants in ONE area today.' || E'\n' ||
  '• Monday: Front room / plant room / school room' || E'\n' ||
  '• Wednesday: Kitchen + dining room' || E'\n' ||
  '• Friday: Hallway + entryway + porch' || E'\n' ||
  '• Saturday: Master bathroom + master bedroom + backyard' || E'\n\n' ||
  'What to do: Pick up dead leaves, brush away dirt, check if soil looks dry. ' ||
  'Tell Mom which plants might need water. IMPORTANT: do NOT water plants ' ||
  'yourself — Mom uses special fertilizers and rain water. Your job is ' ||
  'eyes-only. Observe and report.',
  15, TRUE, ARRAY['mon','wed','fri','sat'], 2, 20,
  TRUE, 'D60-ZONE-7'
WHERE NOT EXISTS (
  SELECT 1 FROM homeschool_tasks
  WHERE kid_name = 'Hannah' AND task_label = 'Plant Patrol — Help Mom with Plants'
);
