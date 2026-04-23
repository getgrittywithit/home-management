-- ============================================================================
-- Dispatch 131 — Curriculum Planner Phase 1.5 + 2A
-- Phase A: Purchase junction tables (multi-kid, multi-unit)
-- Phase B: Family Library / Family Assets foundation
-- ============================================================================

-- ─── Phase A: Purchase Junction Tables ──────────────────────────────────────

-- A1: Per-kid cost allocation for shared purchases
CREATE TABLE IF NOT EXISTS tefa_purchase_kid_splits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     UUID NOT NULL REFERENCES tefa_purchases(id) ON DELETE CASCADE,
  kid_name        TEXT NOT NULL CHECK (kid_name IN ('amos', 'ellie', 'wyatt', 'hannah')),
  cost_share      NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (purchase_id, kid_name)
);

CREATE INDEX IF NOT EXISTS idx_tefa_splits_purchase ON tefa_purchase_kid_splits(purchase_id);
CREATE INDEX IF NOT EXISTS idx_tefa_splits_kid ON tefa_purchase_kid_splits(kid_name);

-- A2: Purchase-to-unit links (one purchase supports multiple units across kids)
CREATE TABLE IF NOT EXISTS tefa_purchase_unit_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     UUID NOT NULL REFERENCES tefa_purchases(id) ON DELETE CASCADE,
  outline_id      UUID NOT NULL REFERENCES curriculum_year_outline(id) ON DELETE CASCADE,
  kid_name        TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (purchase_id, outline_id)
);

CREATE INDEX IF NOT EXISTS idx_tefa_unit_links_purchase ON tefa_purchase_unit_links(purchase_id);
CREATE INDEX IF NOT EXISTS idx_tefa_unit_links_outline ON tefa_purchase_unit_links(outline_id);

-- A3: Migrate existing single-kid data into junction tables (idempotent)
INSERT INTO tefa_purchase_kid_splits (purchase_id, kid_name, cost_share)
SELECT id, kid_name, COALESCE(actual_cost, estimated_cost)
FROM tefa_purchases
WHERE NOT EXISTS (
  SELECT 1 FROM tefa_purchase_kid_splits s WHERE s.purchase_id = tefa_purchases.id
)
ON CONFLICT DO NOTHING;

INSERT INTO tefa_purchase_unit_links (purchase_id, outline_id, kid_name)
SELECT id, linked_outline_id, kid_name
FROM tefa_purchases
WHERE linked_outline_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tefa_purchase_unit_links u WHERE u.purchase_id = tefa_purchases.id
  )
ON CONFLICT DO NOTHING;

-- ─── Phase B: Family Library / Family Assets ────────────────────────────────

-- B1: Permanent asset inventory
CREATE TABLE IF NOT EXISTS family_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name          TEXT NOT NULL,
  asset_type          TEXT NOT NULL DEFAULT 'other'
    CHECK (asset_type IN (
      'book', 'workbook', 'curriculum', 'game', 'stem_kit', 'manipulative',
      'art_supply', 'digital_subscription', 'software_license', 'app',
      'instrument', 'sporting_equipment', 'tech_device', 'computer_accessory',
      'recipe', 'printable', 'other'
    )),
  description         TEXT,
  category_tags       TEXT[] DEFAULT '{}',
  topic_tags          TEXT[] DEFAULT '{}',
  pedagogy_tags       TEXT[] DEFAULT '{}',
  age_range_low       INTEGER,
  age_range_high      INTEGER,
  condition           TEXT DEFAULT 'good'
    CHECK (condition IN ('new', 'good', 'worn', 'damaged', 'broken')),
  status              TEXT DEFAULT 'in_use'
    CHECK (status IN ('in_use', 'storage', 'loaned_out', 'donated', 'sold', 'trashed')),
  is_consumable       BOOLEAN DEFAULT FALSE,
  quantity_on_hand    INTEGER DEFAULT 1,
  reorder_threshold   INTEGER,
  unit_of_measure     TEXT,
  home_location       TEXT,
  photo_url           TEXT,
  notes               TEXT,
  source              TEXT DEFAULT 'other'
    CHECK (source IN ('tefa_purchase', 'pre_tefa_owned', 'gift', 'thrift', 'library_book', 'other')),
  source_purchase_id  UUID REFERENCES tefa_purchases(id) ON DELETE SET NULL,
  first_acquired_date DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_assets_type ON family_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_family_assets_status ON family_assets(status);
CREATE INDEX IF NOT EXISTS idx_family_assets_topic ON family_assets USING GIN (topic_tags);
CREATE INDEX IF NOT EXISTS idx_family_assets_pedagogy ON family_assets USING GIN (pedagogy_tags);
CREATE INDEX IF NOT EXISTS idx_family_assets_source ON family_assets(source_purchase_id);
CREATE INDEX IF NOT EXISTS idx_family_assets_acquired ON family_assets(first_acquired_date);

-- B2: Many-to-many asset ↔ unit links
CREATE TABLE IF NOT EXISTS family_asset_unit_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    UUID NOT NULL REFERENCES family_assets(id) ON DELETE CASCADE,
  outline_id  UUID NOT NULL REFERENCES curriculum_year_outline(id) ON DELETE CASCADE,
  linked_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (asset_id, outline_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_unit_links_asset ON family_asset_unit_links(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_unit_links_outline ON family_asset_unit_links(outline_id);

-- B3: Kid affinity tracking (who used/loved/outgrew which asset)
CREATE TABLE IF NOT EXISTS family_asset_kid_affinity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES family_assets(id) ON DELETE CASCADE,
  kid_name        TEXT NOT NULL,
  affinity_type   TEXT DEFAULT 'used'
    CHECK (affinity_type IN ('used', 'loved', 'struggled', 'outgrew')),
  recorded_at     TIMESTAMPTZ DEFAULT NOW(),
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_asset_affinity_asset ON family_asset_kid_affinity(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_affinity_kid ON family_asset_kid_affinity(kid_name);

-- Auto-update updated_at on family_assets
CREATE OR REPLACE FUNCTION update_family_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_family_assets_updated_at') THEN
    CREATE TRIGGER trg_family_assets_updated_at
      BEFORE UPDATE ON family_assets
      FOR EACH ROW EXECUTE FUNCTION update_family_assets_updated_at();
  END IF;
END $$;
