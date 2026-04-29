-- PR2 follow-up: drop belle_care_log task CHECK constraint + backfill am_feed_walk legacy rows
--
-- Applied: 2026-04-28 via Supabase MCP apply_migration
-- Migration name: pr2_belle_task_constraint_drop_and_backfill
--
-- Why drop the constraint: the task allowlist was never updated when am_feed/am_walk
-- were added as first-class tasks in src/app/api/kids/belle/route.ts. Application layer
-- already validates via TASK_INFO map; DB-level CHECK creates a migration burden every
-- time a new Belle task type is added. Source of truth = application.
--
-- Why backfill now: bundles Phase A.1 of the Apr 28 completion-source audit. Splitting
-- am_feed_walk into am_feed + am_walk keeps historical leaderboard counts coherent
-- with the new daily denominator (4 base + extra-task-day).
--
-- Pre-state: 304 rows (101 am_feed_walk, 101 pm_feed, 101 pm_walk, 1 poop_patrol)
-- Post-state: 405 rows (101 am_feed, 101 am_walk, 101 pm_feed, 101 pm_walk, 1 poop_patrol)

ALTER TABLE belle_care_log DROP CONSTRAINT belle_care_log_task_check;

INSERT INTO belle_care_log (kid_name, care_date, task, completed, completed_at)
SELECT kid_name, care_date, 'am_feed', completed, completed_at
FROM belle_care_log WHERE task = 'am_feed_walk'
ON CONFLICT (care_date, task) DO NOTHING;

INSERT INTO belle_care_log (kid_name, care_date, task, completed, completed_at)
SELECT kid_name, care_date, 'am_walk', completed, completed_at
FROM belle_care_log WHERE task = 'am_feed_walk'
ON CONFLICT (care_date, task) DO NOTHING;

DELETE FROM belle_care_log WHERE task = 'am_feed_walk';
