-- ============================================================================
-- Dispatch 83 — Plaid Integration, Transaction Tracking & Triton Business
-- Extends finance_transactions with Plaid fields; creates plaid_connections,
-- transaction_splits, and triton_jobs tables.
-- Single-family app, no family_id column.
-- ============================================================================

-- 1. Plaid connections -------------------------------------------------------
CREATE TABLE IF NOT EXISTS plaid_connections (
  id                SERIAL PRIMARY KEY,
  institution_name  TEXT NOT NULL,
  institution_id    TEXT,
  access_token      TEXT NOT NULL,
  item_id           TEXT UNIQUE NOT NULL,
  account_ids       JSONB,
  account_names     JSONB,
  cursor            TEXT,
  status            TEXT DEFAULT 'active' CHECK (status IN ('active','error','disconnected')),
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Extend finance_transactions for Plaid + review -------------------------
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS plaid_transaction_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS plaid_connection_id   INTEGER REFERENCES plaid_connections(id),
  ADD COLUMN IF NOT EXISTS merchant_name         TEXT,
  ADD COLUMN IF NOT EXISTS plaid_category        TEXT,
  ADD COLUMN IF NOT EXISTS is_split              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES finance_transactions(id),
  ADD COLUMN IF NOT EXISTS is_reviewed           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_hidden             BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ft_plaid_txn ON finance_transactions(plaid_transaction_id);
CREATE INDEX IF NOT EXISTS idx_ft_reviewed ON finance_transactions(is_reviewed);
CREATE INDEX IF NOT EXISTS idx_ft_entity ON finance_transactions(entity);

-- 3. Transaction splits ------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_splits (
  id                      SERIAL PRIMARY KEY,
  parent_transaction_id   UUID REFERENCES finance_transactions(id) ON DELETE CASCADE,
  amount                  DECIMAL(10,2) NOT NULL,
  category_id             UUID REFERENCES budget_categories(id),
  entity                  TEXT NOT NULL CHECK (entity IN ('personal','triton','grit_collective')),
  description             TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Triton jobs -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS triton_jobs (
  id                SERIAL PRIMARY KEY,
  client_name       TEXT NOT NULL,
  job_description   TEXT,
  status            TEXT DEFAULT 'lead'
                      CHECK (status IN ('lead','estimated','scheduled','in_progress','completed','invoiced','paid','cancelled')),
  estimated_amount  DECIMAL(10,2),
  invoiced_amount   DECIMAL(10,2),
  paid_amount       DECIMAL(10,2),
  materials_cost    DECIMAL(10,2) DEFAULT 0,
  labor_hours       DECIMAL(6,2),
  labor_rate        DECIMAL(6,2) DEFAULT 18.00,
  source            TEXT,
  source_email_id   INTEGER,
  action_item_id    INTEGER REFERENCES action_items(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_triton_jobs_status ON triton_jobs(status);
