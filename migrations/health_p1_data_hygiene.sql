-- Health P1 Data Hygiene
-- Applied via Supabase MCP on 2026-04-25.
--
-- P1-A: dedup 4 active duplicate medication rows (Lola-spec'd 3 + Wyatt
--       Focalin which is the exact parallel of Wyatt Clonidine that was
--       spec'd; left the inactive Amos rows + inactive Zoey Lexapro alone).
-- P1-B: lowercase family_member_name across medications; add CHECK so
--       the DB rejects future capitalized writes.
-- P1-C: NULL out the seed-data 'Dr. Sarah Chen' prescriber so the UI's
--       new "+ Add prescriber" link prompts Lola for the real value.
--
-- Pairs with code-side write-path lowercase in /api/health/route.ts and
-- /api/admin/seed/route.ts.

DELETE FROM medications WHERE id IN (
  '984d4105-f7e3-4312-80c8-9dee23641460',
  'aff48d3d-d952-4da8-b672-2114a40dff54',
  '47a691f9-034a-4656-96cf-9bdc3aa9dc36',
  'b9a38c35-5c3d-4d25-9772-96bb491b997a'
);

UPDATE medications
SET family_member_name = LOWER(family_member_name)
WHERE family_member_name <> LOWER(family_member_name);

UPDATE medications
SET prescribing_doctor = NULL
WHERE prescribing_doctor ILIKE '%sarah chen%' OR prescribing_doctor ILIKE 'dr. sarah%';

ALTER TABLE medications
  ADD CONSTRAINT medications_family_member_name_lowercase
  CHECK (family_member_name = LOWER(family_member_name));

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_med_per_member
ON medications (
  family_member_name,
  LOWER(REGEXP_REPLACE(medication_name, '\s*\(.*\)|\s+hcl|\s+xr|\s+er|\s+sr', '', 'g')),
  COALESCE(dosage, '')
)
WHERE is_active = TRUE AND COALESCE(paused, FALSE) = FALSE;
