-- Health P1-D: Insurance Pending State
-- Applied via Supabase MCP on 2026-04-25.
--
-- Adds a status enum + application tracking fields to insurance_plans
-- so the kids' Medicaid pending application is honestly surfaced
-- instead of the placeholder "$0 copays" card that read as if
-- coverage were active. Single row per member_group continues to
-- represent the family-level plan; per-kid status flexibility can be
-- added later by extending the schema with a family_member_name
-- column if/when it's needed.

ALTER TABLE insurance_plans
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'uninsured', 'terminated')),
  ADD COLUMN IF NOT EXISTS application_id TEXT,
  ADD COLUMN IF NOT EXISTS application_submitted_date DATE,
  ADD COLUMN IF NOT EXISTS decision_expected_date DATE,
  ADD COLUMN IF NOT EXISTS application_notes TEXT;

-- Seed: kids' Medicaid is pending. App ID 1787246458 submitted
-- 2026-04-23, decision expected ~2026-06-05.
UPDATE insurance_plans
SET status = 'pending',
    application_id = '1787246458',
    application_submitted_date = '2026-04-23',
    decision_expected_date = '2026-06-05',
    application_notes = 'All 6 kids on single application. Awaiting state decision.',
    member_id = NULL,
    group_number = NULL
WHERE member_group = 'kids' AND plan_name ILIKE '%medicaid%';

-- Adults: clear placeholder group_number ('FamilyOps-2024' isn't real
-- Oscar format). Status stays 'active' (default).
UPDATE insurance_plans
SET group_number = NULL,
    member_id = NULL
WHERE member_group = 'parents' AND group_number = 'FamilyOps-2024';
