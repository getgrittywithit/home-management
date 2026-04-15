-- ============================================================================
-- Dispatch 78 — Unified Budget System
-- Extend existing budget_categories (UUID) with slug/funding_source/month
-- splits. Create budget_monthly for actual vs planned tracking. Link
-- household_needs to a budget category so the Needs List feeds the budget.
-- Single-family app, no family_id column.
-- ============================================================================

-- 1. Extend budget_categories ------------------------------------------------
ALTER TABLE budget_categories
  ADD COLUMN IF NOT EXISTS slug           TEXT,
  ADD COLUMN IF NOT EXISTS funding_source TEXT,
  ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS monthly_snap   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS monthly_cash   NUMERIC(10,2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_categories_funding_source_check') THEN
    ALTER TABLE budget_categories
      ADD CONSTRAINT budget_categories_funding_source_check
      CHECK (funding_source IS NULL OR funding_source IN ('snap','cash','both'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_categories_slug_key') THEN
    ALTER TABLE budget_categories ADD CONSTRAINT budget_categories_slug_key UNIQUE (slug);
  END IF;
END$$;

-- 2. Normalize existing rows to slugs (idempotent) --------------------------
UPDATE budget_categories SET slug = 'food',        funding_source = 'both', monthly_amount = 1500, monthly_snap = 1141, monthly_cash = 359, emoji = COALESCE(emoji,'🍎'), name = 'Food & Groceries' WHERE name = 'Groceries' AND slug IS NULL;
UPDATE budget_categories SET slug = 'utilities',   funding_source = 'cash', emoji = COALESCE(emoji,'💡') WHERE name = 'Utilities'        AND slug IS NULL;
UPDATE budget_categories SET slug = 'gas',         funding_source = 'cash', emoji = COALESCE(emoji,'⛽') WHERE name = 'Gas'              AND slug IS NULL;
UPDATE budget_categories SET slug = 'household',   funding_source = 'cash', emoji = COALESCE(emoji,'🧹') WHERE name = 'Household'        AND slug IS NULL;
UPDATE budget_categories SET slug = 'school',      funding_source = 'cash', emoji = COALESCE(emoji,'🏫') WHERE name = 'Kids & School'    AND slug IS NULL;
UPDATE budget_categories SET slug = 'medical',     funding_source = 'cash', emoji = COALESCE(emoji,'💊') WHERE name = 'Medical/Pharmacy' AND slug IS NULL;
UPDATE budget_categories SET slug = 'discretionary', funding_source = 'cash', emoji = COALESCE(emoji,'🎈') WHERE name = 'Discretionary'    AND slug IS NULL;
UPDATE budget_categories SET slug = 'subscriptions', funding_source = 'cash', emoji = COALESCE(emoji,'🔁') WHERE name = 'Subscriptions'    AND slug IS NULL;

-- 3. Seed additional Lola-requested categories (idempotent) -----------------
INSERT INTO budget_categories (name, slug, emoji, funding_source, sort_order, is_active)
SELECT * FROM (VALUES
  ('Kids Clothing & Shoes', 'clothing',    '👟', 'cash',  9,  TRUE),
  ('Personal Care',         'personal',    '🧴', 'cash', 10,  TRUE),
  ('Thrift & Deals',        'thrift',      '🎁', 'cash', 11,  TRUE),
  ('Books & Resources',     'books',       '📚', 'cash', 12,  TRUE),
  ('Home Maintenance',      'maintenance', '🔧', 'cash', 13,  TRUE)
) AS v(name, slug, emoji, funding_source, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM budget_categories WHERE budget_categories.slug = v.slug);

-- 4. budget_monthly ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_monthly (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
  month         TEXT NOT NULL,                   -- 'YYYY-MM'
  budgeted      NUMERIC(10,2) NOT NULL DEFAULT 0,
  spent_snap    NUMERIC(10,2) NOT NULL DEFAULT 0,
  spent_cash    NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, month)
);

CREATE INDEX IF NOT EXISTS idx_budget_monthly_month ON budget_monthly(month);

-- 5. Link household_needs to a budget category -----------------------------
ALTER TABLE household_needs
  ADD COLUMN IF NOT EXISTS budget_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_household_needs_budget_category ON household_needs(budget_category_id);
