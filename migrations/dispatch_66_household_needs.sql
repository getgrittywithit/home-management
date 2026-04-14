-- ============================================================================
-- Dispatch 66 — Household Needs List
-- Persistent household wish list / needs registry for durable goods.
-- Single-family app, no family_id column.
-- ============================================================================

CREATE TABLE IF NOT EXISTS household_needs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL,
  name            TEXT NOT NULL,
  brand           TEXT,
  model           TEXT,
  price_min       NUMERIC(10,2),
  price_max       NUMERIC(10,2),
  notes           TEXT,
  photo_url       TEXT,
  is_starred      BOOLEAN DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','pending','purchased','cancelled','denied')),
  requested_by    TEXT DEFAULT 'parent',
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  denied_reason   TEXT,
  purchased_at    TIMESTAMPTZ,
  purchased_price NUMERIC(10,2),
  purchased_where TEXT,
  for_person      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_household_needs_category ON household_needs(category);
CREATE INDEX IF NOT EXISTS idx_household_needs_status ON household_needs(status);
CREATE INDEX IF NOT EXISTS idx_household_needs_requested_by ON household_needs(requested_by);

CREATE TABLE IF NOT EXISTS household_need_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  icon        TEXT DEFAULT '📦',
  sort_order  INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed 12 default categories (idempotent via ON CONFLICT)
INSERT INTO household_need_categories (name, icon, sort_order) VALUES
  ('Kitchen',          '🍳', 1),
  ('School',           '🎒', 2),
  ('Bedding',          '🛏️', 3),
  ('Bathroom',         '🚿', 4),
  ('Furniture',        '🪑', 5),
  ('Tech & Electronics','💻', 6),
  ('Clothing',         '👕', 7),
  ('Outdoor & Yard',   '🌳', 8),
  ('Crafts & Art',     '🎨', 9),
  ('Pet Supplies',     '🐾', 10),
  ('Home Repair & Tools','🔧', 11),
  ('Other',            '📦', 99)
ON CONFLICT (name) DO NOTHING;
