-- ============================================================================
-- Dispatch 90 — Grocery Phase 2: Sensory Profiles + Spending PDFs
-- Completes Phase S (S9 + S10).
-- ============================================================================

CREATE TABLE IF NOT EXISTS food_sensory_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name              TEXT NOT NULL UNIQUE,
  textures_preferred    TEXT[],
  textures_avoided      TEXT[],
  temp_preferred        TEXT[],
  temp_avoided          TEXT[],
  flavors_preferred     TEXT[],
  flavors_avoided       TEXT[],
  colors_avoided        TEXT[],
  safe_foods            TEXT[],
  never_foods           TEXT[],
  conditional_foods     JSONB DEFAULT '[]'::jsonb,
  needs_separate_plate  BOOLEAN DEFAULT FALSE,
  preferred_utensils    TEXT[],
  eating_notes          TEXT,
  allergies             TEXT[],
  intolerances          TEXT[],
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
