-- ============================================================================
-- Dispatch 68b — Recipe Import Pipeline
-- RECIPE-4: expand meal_library with meal_type + full recipe fields
-- RECIPE-1: recipe_import_staging table for OCR + AI parsing workflow
-- Single-family app — no family_id.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. meal_library — new columns
-- ----------------------------------------------------------------------------
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS meal_type TEXT DEFAULT 'dinner';
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '[]'::jsonb;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS kid_manager_fit TEXT;
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS dietary_notes TEXT[] DEFAULT '{}';
ALTER TABLE meal_library ADD COLUMN IF NOT EXISTS has_mushrooms BOOLEAN DEFAULT FALSE;

-- meal_type CHECK constraint (drop-and-recreate for idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_library_meal_type_check') THEN
    ALTER TABLE meal_library DROP CONSTRAINT meal_library_meal_type_check;
  END IF;
END $$;

ALTER TABLE meal_library ADD CONSTRAINT meal_library_meal_type_check
  CHECK (meal_type IN ('breakfast','lunch','dinner','side','dessert','drink','snack','sauce'));

-- difficulty CHECK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_library_difficulty_check') THEN
    ALTER TABLE meal_library DROP CONSTRAINT meal_library_difficulty_check;
  END IF;
END $$;

ALTER TABLE meal_library ADD CONSTRAINT meal_library_difficulty_check
  CHECK (difficulty IS NULL OR difficulty IN ('easy','medium','hard'));

-- Backfill: all existing rows are dinners
UPDATE meal_library SET meal_type = 'dinner' WHERE meal_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_meal_library_meal_type ON meal_library(meal_type);

-- ----------------------------------------------------------------------------
-- 2. recipe_import_staging — PDF uploads + OCR output + parsed data
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipe_import_staging (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID NOT NULL,
  original_filename TEXT,
  file_size_bytes   INTEGER,
  pdf_base64        TEXT,         -- MVP: inline PDF bytes (base64-encoded)
  raw_text          TEXT,         -- extracted text (OCR or PDF text layer)
  parsed_data       JSONB,        -- AI-parsed structured recipe
  status            TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','extracted','parsed','imported','skipped','failed','needs_review')),
  error_message     TEXT,
  confidence        NUMERIC(3,2), -- 0.00 – 1.00 from parser
  imported_meal_id  UUID REFERENCES meal_library(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_staging_batch ON recipe_import_staging(batch_id);
CREATE INDEX IF NOT EXISTS idx_recipe_staging_status ON recipe_import_staging(status);
