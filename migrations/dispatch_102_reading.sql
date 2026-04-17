-- ============================================================================
-- Dispatch 102 — Reading Ecosystem & Book Buddy Intelligence
-- Book metadata enrichment, reading sessions, pace tracking.
-- ============================================================================

-- A-2: Enrich home_library with book metadata
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS total_pages INTEGER;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS reading_level_tag TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS description_short TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS isbn TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS lookup_source TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS lookup_at TIMESTAMPTZ;

-- B-1: Extend kid_book_progress for intelligence
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS reading_level_tag TEXT;
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS days_reading INTEGER DEFAULT 0;
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS total_minutes INTEGER DEFAULT 0;
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS avg_pages_per_session NUMERIC(5,1) DEFAULT 0;
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- A-3: Seed genres on existing books based on known info
UPDATE home_library SET genres = ARRAY['animals', 'fantasy'], reading_level_tag = 'early_reader'
WHERE (title ILIKE 'Fairy%' OR title ILIKE 'Purrmaids%' OR title ILIKE 'Magic Pony%' OR title ILIKE 'Dolphin School%')
  AND (genres IS NULL OR genres = '{}');

UPDATE home_library SET genres = ARRAY['animals'], reading_level_tag = 'chapter_book'
WHERE title ILIKE 'Animal Ark%' AND (genres IS NULL OR genres = '{}');

UPDATE home_library SET genres = ARRAY['fantasy', 'adventure'], reading_level_tag = 'middle_grade'
WHERE title ILIKE 'Harry Potter%' AND (genres IS NULL OR genres = '{}');

UPDATE home_library SET genres = ARRAY['fantasy', 'adventure'], reading_level_tag = 'middle_grade'
WHERE title ILIKE '%Land of Stories%' AND (genres IS NULL OR genres = '{}');

UPDATE home_library SET genres = ARRAY['fantasy', 'adventure'], reading_level_tag = 'ya'
WHERE title IN ('Eragon', 'Eldest', 'Brisingr') AND (genres IS NULL OR genres = '{}');

UPDATE home_library SET genres = ARRAY['animals', 'adventure'], reading_level_tag = 'chapter_book'
WHERE title ILIKE '%Dog Diaries%' AND (genres IS NULL OR genres = '{}');

UPDATE home_library SET genres = ARRAY['humor', 'graphic_novel'], reading_level_tag = 'middle_grade'
WHERE title ILIKE '%Captain Underpants%' AND (genres IS NULL OR genres = '{}');

UPDATE home_library SET genres = ARRAY['humor', 'graphic_novel'], reading_level_tag = 'chapter_book'
WHERE title ILIKE '%Diary of a Wimpy Kid%' AND (genres IS NULL OR genres = '{}');
