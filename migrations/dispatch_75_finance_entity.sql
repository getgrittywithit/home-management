-- ============================================================================
-- Dispatch 75 — Finance entity tagging (surgical schema prep)
--
-- Adds entity (personal | triton | grit_collective) and tax_deductible columns
-- to finance_transactions so the ledger can properly distinguish Triton vs
-- Grit Collective vs personal spending. Backfills entity from the legacy
-- is_triton_income boolean.
--
-- NOT in this migration:
--   • New finance_accounts / finance_categories / finance_transactions schema
--     per the D75 spec — those would wipe the existing 1000-line FinanceTab.tsx
--     and 30-action /api/finance route, which is substantial working code.
--   • Per-transaction SNAP/cash split — existing system tracks SNAP split in
--     purchase_history (for grocery runs) via snap_amount/cash_amount/total_amount
--     columns. General finance_transactions keeps payment_method text.
--   • Account registry, envelope view, dashboard rewrite, etc. — deferred
--     pending a scope decision on enhance-existing vs. parallel rewrite.
-- ============================================================================

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS entity TEXT NOT NULL DEFAULT 'personal'
    CHECK (entity IN ('personal', 'triton', 'grit_collective'));

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS tax_deductible BOOLEAN DEFAULT FALSE;

-- Backfill entity from the legacy is_triton_income boolean.
-- Any row where is_triton_income = TRUE gets tagged 'triton'; everything else
-- stays 'personal'. Grit Collective has to be set manually once rows exist.
UPDATE finance_transactions
SET entity = 'triton'
WHERE is_triton_income = TRUE AND entity = 'personal';

CREATE INDEX IF NOT EXISTS idx_finance_txn_entity ON finance_transactions(entity);
CREATE INDEX IF NOT EXISTS idx_finance_txn_tax_deductible
  ON finance_transactions(tax_deductible) WHERE tax_deductible = TRUE;
