-- Hotfix for PR #8 (Health P1 data hygiene), addressing two CodeRabbit catches.
-- Applied via Supabase MCP on 2026-04-25.
--
--   Issue 1: the original Sarah Chen scrub used `ILIKE 'dr. sarah%'` which
--            would over-match any future "Dr. Sarah ___" prescriber. Replaced
--            with an explicit IN-list of the actual placeholder values.
--   Issue 2: the unique index regex used lowercase tokens (`\s+hcl|...`) but
--            no `i` flag, so it only matched lowercase "hcl/xr/er/sr". The
--            real seed data is "HCl"/"XR"/"ER"/"SR", so the strip never ran
--            and the constraint silently let "Adderall XR" + "Adderall"
--            coexist for the same person + dose. Added the `i` flag.

-- Issue 1: tighten the scrub. Future-safety only — no current rows match
-- (PR #8 already nulled the legitimate Chen rows).
UPDATE medications
SET prescribing_doctor = NULL
WHERE LOWER(TRIM(prescribing_doctor)) IN (
  'dr. sarah chen',
  'sarah chen',
  'dr sarah chen',
  'chen, sarah'
);

-- Issue 2: rebuild the unique index with case-insensitive regex.
DROP INDEX IF EXISTS uniq_active_med_per_member;

CREATE UNIQUE INDEX uniq_active_med_per_member
ON medications (
  family_member_name,
  LOWER(REGEXP_REPLACE(medication_name, '\s*\(.*\)|\s+hcl|\s+xr|\s+er|\s+sr', '', 'gi')),
  COALESCE(dosage, '')
)
WHERE is_active = TRUE AND COALESCE(paused, FALSE) = FALSE;
