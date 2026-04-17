-- Dispatch 100d: Belle Care Improvements
-- 1. Helper/assist logging table (Hannah's idea — any kid can log they helped)
-- 2. belle_care_swaps needs ON CONFLICT support for extended absence coverage

-- Helper log: tracks when non-assigned kids help with Belle tasks
CREATE TABLE IF NOT EXISTS belle_care_helpers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  care_date DATE NOT NULL,
  task TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by date range and kid
CREATE INDEX IF NOT EXISTS idx_belle_helpers_date ON belle_care_helpers(care_date);
CREATE INDEX IF NOT EXISTS idx_belle_helpers_kid ON belle_care_helpers(kid_name, care_date);

-- Add unique constraint to belle_care_swaps for ON CONFLICT support in bulk coverage inserts
-- (only one swap per kid per date per type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_belle_swaps_unique
  ON belle_care_swaps(requesting_kid, swap_date, swap_type)
  WHERE status IN ('pending', 'accepted');
