-- ============================================================================
-- Dispatch 103 — Finance & Money Ecosystem
-- Cleanup duplicates, seed budgets, bills table, transaction columns.
-- ============================================================================

-- A-1: Clean duplicate expense categories (keep one per name)
DELETE FROM expense_categories a USING expense_categories b
WHERE a.name = b.name AND a.created_at > b.created_at;

-- A-2: Seed budget_monthly for all categories (April 2026)
INSERT INTO budget_monthly (category_id, month, budgeted, spent_snap, spent_cash)
SELECT bc.id, '2026-04',
  COALESCE(bc.monthly_amount, bc.budget_amount, 0),
  0, 0
FROM budget_categories bc
WHERE bc.is_active = TRUE
  AND NOT EXISTS (SELECT 1 FROM budget_monthly bm WHERE bm.category_id = bc.id AND bm.month = '2026-04')
ON CONFLICT (category_id, month) DO NOTHING;

-- A-3: Extend finance_transactions for import
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS is_snap BOOLEAN DEFAULT FALSE;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT FALSE;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS import_batch_id UUID;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS auto_categorized BOOLEAN DEFAULT FALSE;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS user_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS recurring_label TEXT;

-- C-1: Recurring bills table
CREATE TABLE IF NOT EXISTS recurring_bills (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  amount          NUMERIC(10,2),
  frequency       TEXT DEFAULT 'monthly' CHECK (frequency IN ('weekly','biweekly','monthly','quarterly','annual')),
  due_day         INTEGER,
  category_id     UUID REFERENCES budget_categories(id),
  payment_method  TEXT,
  is_auto_pay     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  last_paid_date  DATE,
  last_paid_amount NUMERIC(10,2),
  notes           TEXT,
  alert_days_before INTEGER DEFAULT 3,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed known recurring bills
INSERT INTO recurring_bills (name, frequency, payment_method, is_auto_pay)
SELECT * FROM (VALUES
  ('Progressive Insurance',  'monthly', 'Ally Checking', TRUE),
  ('GVTC Internet',          'monthly', 'Ally Checking', TRUE),
  ('CPS Energy',             'monthly', 'Ally Checking', FALSE),
  ('Netflix',                'monthly', 'Ally Checking', TRUE),
  ('Spotify',                'monthly', 'Ally Checking', TRUE),
  ('Disney+',                'monthly', 'Ally Checking', TRUE),
  ('Amazon Prime',           'monthly', 'Ally Checking', TRUE),
  ('Hulu',                   'monthly', 'Ally Checking', TRUE)
) AS v(name, frequency, payment_method, is_auto_pay)
WHERE NOT EXISTS (SELECT 1 FROM recurring_bills rb WHERE rb.name = v.name);
