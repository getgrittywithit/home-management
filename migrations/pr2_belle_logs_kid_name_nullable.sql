-- PR2 hotfix: drop NOT NULL on belle_care_log.kid_name + belle_grooming_log.kid_name
--
-- Applied: 2026-04-29 via Supabase MCP apply_migration
-- Migration name: pr2_belle_logs_kid_name_nullable
--
-- Why: unlogTaskCompletion in src/lib/task-completion.ts resets kid_name to NULL
-- on uncomplete (Option 2 wart fix from Step 1 review). The two Belle log tables
-- still had NOT NULL constraints on kid_name, so every uncomplete was rolling
-- back the helper's transaction with: "null value in column kid_name violates
-- not-null constraint".
--
-- An "unclaimed" or "freshly-uncompleted" task with NULL kid_name is more
-- accurate than a stale name lingering after un-tap. Inserts still set
-- kid_name to a real value (helper passes opts.kid; pre-seed paths pass the
-- assigned kid for the day). NULL only ever appears post-uncomplete.
--
-- Scope: scan of all completion-shaped tables (run 2026-04-29) confirmed the
-- only at-risk columns were these two. Other NOT NULL kid_name/child_name
-- columns are either:
--   - dead tables (zone_completions, routine_completions,
--     daily_checklist_completion — Phase F drop targets, no helper writes)
--   - per-kid logs where kid_name is part of row identity
--     (homeschool_task_completions, zone_task_rotation — helper won't NULL them)
--   - siloed health logs out of audit scope (kid_daily_care, kid_daily_care_log)
--   - already nullable (pet_care_log.kid_name)
-- kid_daily_checklist.child_name stays NOT NULL — every helper write sets it.

ALTER TABLE belle_care_log     ALTER COLUMN kid_name DROP NOT NULL;
ALTER TABLE belle_grooming_log ALTER COLUMN kid_name DROP NOT NULL;
