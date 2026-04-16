-- ============================================================================
-- Dispatch 86 — Triton Client Pipeline & Job Management
-- Extends D83 triton_jobs with client profiles, estimates, and invoices.
-- Single-family app, no family_id column.
-- ============================================================================

-- 1. Client profiles ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS triton_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  nickname        TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  gate_code       TEXT,
  city            TEXT DEFAULT 'Boerne',
  source          TEXT,
  referred_by     TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','do_not_contact')),
  notes           TEXT,
  total_jobs      INTEGER DEFAULT 0,
  total_revenue   NUMERIC(10,2) DEFAULT 0,
  first_contact_at TIMESTAMPTZ,
  last_contact_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Link jobs to clients + add missing columns ----------------------------
ALTER TABLE triton_jobs
  ADD COLUMN IF NOT EXISTS client_id       UUID REFERENCES triton_clients(id),
  ADD COLUMN IF NOT EXISTS job_address     TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_date  DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time  TIME,
  ADD COLUMN IF NOT EXISTS completion_date DATE,
  ADD COLUMN IF NOT EXISTS photos          JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS category        TEXT;

-- 3. Estimates ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS triton_estimates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          INTEGER REFERENCES triton_jobs(id),
  client_id       UUID REFERENCES triton_clients(id),
  line_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal        NUMERIC(10,2),
  tax_rate        NUMERIC(4,2) DEFAULT 0,
  tax_amount      NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2),
  notes           TEXT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','declined','expired')),
  sent_at         TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  valid_until     DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Invoices ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS triton_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          INTEGER REFERENCES triton_jobs(id),
  client_id       UUID REFERENCES triton_clients(id),
  estimate_id     UUID REFERENCES triton_estimates(id),
  invoice_number  TEXT UNIQUE,
  line_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal        NUMERIC(10,2),
  tax_rate        NUMERIC(4,2) DEFAULT 0,
  tax_amount      NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2),
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','void')),
  due_date        DATE,
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  payment_method  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed known clients from CLAUDE.md (idempotent) -------------------------
INSERT INTO triton_clients (name, phone, source, notes, status)
SELECT * FROM (VALUES
  ('Pedro Vazquez',            NULL,              'google',   'Drywall cracks job — sent photos to Levi, awaiting estimate', 'active'),
  ('Fátima',                   NULL,              NULL,       'Estimate pending from Levi',                                  'active'),
  ('Tiffany Muir',             NULL,              NULL,       'Ceiling fans & lights — invoiced & paid',                     'active'),
  ('Steve & Alejandra Tunnell',NULL,              NULL,       'Gym studio + sauna plugs + gas fitting — invoiced & paid. Goes by Ale (AH-leh)', 'active'),
  ('Annelise Osborn',          '(432) 556-6644',  'referral', 'LuAnn Gilmore job — awaiting her reply on timeframe',         'active'),
  ('Victoria Nickel',          '(210) 725-6938',  NULL,       'Costco swing set build — 29006 Bulls Pond, Fair Oaks TX 78015 (Front Gate)', 'active'),
  ('Chris Tovar',              NULL,              NULL,       'Potential sub/partner — does painting. Triton does drywall.',  'active')
) AS v(name, phone, source, notes, status)
WHERE NOT EXISTS (SELECT 1 FROM triton_clients WHERE triton_clients.name = v.name);
