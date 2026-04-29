-- PR2: Bring pet_care_log to the route's actual intent (string-based shape).
--
-- Applied: 2026-04-29 via Supabase MCP apply_migration
-- Migration name: pr2_pet_care_log_normalize
--
-- Why: kids/pet-care/route.ts was 100% silently failing because (a) the
-- INSERT referenced `completed` and `notes` columns that didn't exist in
-- the table, and (b) writes flowed through application code expecting a
-- string-based (kid_name, pet_name, task, care_date) shape while the table
-- still had NOT NULL on the legacy uuid columns (pet_id, caretaker_id,
-- task_type, task_description, completed_at). 4th silent-fail latent bug
-- surfaced during the Apr 28 completion-source audit.
--
-- Path forward: normalize the table to support the string shape going
-- forward. The 31 legacy uuid-shape rows stay as historical/audit data
-- (frozen — won't be re-written, but won't break reads either).
--
-- Pre-state: 14 columns, 5 NOT NULL on legacy uuid cols, no `completed`
-- or `notes`, route's INSERT impossible.
-- Post-state: legacy NOT NULLs dropped, `completed` + `notes` columns
-- added. Existing partial UNIQUE idx_pet_care_log_daily_unique on
-- (pet_name, kid_name, task, care_date) becomes the canonical UPSERT
-- target — discovered already present, so the temporary new index this
-- migration created (pet_care_log_kid_pet_task_date_uniq) was dropped
-- in a paired follow-up.

ALTER TABLE pet_care_log
  ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes     TEXT;

ALTER TABLE pet_care_log ALTER COLUMN pet_id            DROP NOT NULL;
ALTER TABLE pet_care_log ALTER COLUMN caretaker_id      DROP NOT NULL;
ALTER TABLE pet_care_log ALTER COLUMN task_type         DROP NOT NULL;
ALTER TABLE pet_care_log ALTER COLUMN task_description  DROP NOT NULL;
ALTER TABLE pet_care_log ALTER COLUMN completed_at      DROP NOT NULL;

-- Note: The follow-up migration pr2_pet_care_log_drop_redundant_index
-- removed an extra unique index added here that turned out to duplicate
-- an existing idx_pet_care_log_daily_unique. Single canonical UPSERT
-- target is the existing partial UNIQUE on (pet_name, kid_name, task, care_date).
