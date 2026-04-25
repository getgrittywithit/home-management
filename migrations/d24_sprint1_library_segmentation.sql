-- D24 Sprint 1 — Library segmentation foundation
-- Applied via Supabase MCP on 2026-04-24.
--
-- LIB-1: owner_segment is for ORGANIZATION (sort hint), not access control.
--        Every kid sees every book; My Shelf surfaces kids-segment first.
-- LIB-7: dra_level + guided_reading_level columns; chip UI populates from these.
-- LIB-8: book_similar table created (data load deferred to Sprint 2).
-- LIB-6: recommended_for TEXT[] separate from existing who_uses (different semantic).

ALTER TABLE home_library
  ADD COLUMN IF NOT EXISTS owner_segment TEXT DEFAULT 'kids'
    CHECK (owner_segment IN ('kids','family','parent','professional')),
  ADD COLUMN IF NOT EXISTS dra_level INTEGER,
  ADD COLUMN IF NOT EXISTS guided_reading_level TEXT,
  ADD COLUMN IF NOT EXISTS recommended_for TEXT[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS book_similar (
  book_id UUID NOT NULL REFERENCES home_library(id) ON DELETE CASCADE,
  similar_book_id UUID NOT NULL REFERENCES home_library(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (book_id, similar_book_id)
);
CREATE INDEX IF NOT EXISTS idx_book_similar_book ON book_similar(book_id, score DESC);
