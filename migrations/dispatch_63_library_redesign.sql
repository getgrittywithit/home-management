-- ============================================================================
-- Dispatch 63 — Library Book Detail Redesign
-- Adds enrichment columns to home_library + 3 new engagement tables.
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. home_library column additions
-- ----------------------------------------------------------------------------
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS hook TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS age_range_min INTEGER;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS age_range_max INTEGER;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS genres TEXT[] DEFAULT '{}';
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS location_details TEXT;

-- ----------------------------------------------------------------------------
-- 2. library_read_status — per-kid read tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS library_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES home_library(id) ON DELETE CASCADE,
  kid_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','want_to_read','reading','finished','read_again')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  current_page INTEGER,
  current_chapter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, kid_name)
);

CREATE INDEX IF NOT EXISTS idx_read_status_kid ON library_read_status(kid_name);
CREATE INDEX IF NOT EXISTS idx_read_status_book ON library_read_status(book_id);

-- ----------------------------------------------------------------------------
-- 3. library_ratings — per-kid 1–5 star ratings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS library_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES home_library(id) ON DELETE CASCADE,
  rated_by TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, rated_by)
);

CREATE INDEX IF NOT EXISTS idx_ratings_book ON library_ratings(book_id);

-- ----------------------------------------------------------------------------
-- 4. library_reviews — family reviews / mini book reports
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS library_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES home_library(id) ON DELETE CASCADE,
  reviewer TEXT NOT NULL,
  review_text TEXT NOT NULL,
  favorite_part TEXT,
  favorite_character TEXT,
  would_recommend BOOLEAN,
  stars_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_book ON library_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON library_reviews(reviewer);
