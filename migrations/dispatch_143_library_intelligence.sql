-- Dispatch 143 — Living Library Intelligence + Reading Companion

-- Extend home_library with intelligence columns
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS ar_level NUMERIC;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS reading_time_min INTEGER;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS chapter_count INTEGER;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS content_tags TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS historical_era TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS primary_setting TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS main_themes TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS elar_standards TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS content_warnings TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_library_tags ON home_library USING GIN(content_tags);
CREATE INDEX IF NOT EXISTS idx_library_themes ON home_library USING GIN(main_themes);

-- Chapter outlines per book
CREATE TABLE IF NOT EXISTS book_chapter_outline (
  id SERIAL PRIMARY KEY,
  book_id INTEGER,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT,
  summary TEXT NOT NULL,
  key_events TEXT[],
  locations_introduced TEXT[],
  characters_introduced TEXT[],
  themes TEXT[],
  page_start INTEGER,
  page_end INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, chapter_number)
);
CREATE INDEX IF NOT EXISTS idx_chapter_book ON book_chapter_outline(book_id, chapter_number);

-- Extend book_vocabulary with chapter scoping
ALTER TABLE book_vocabulary ADD COLUMN IF NOT EXISTS chapter_number INTEGER;
ALTER TABLE book_vocabulary ADD COLUMN IF NOT EXISTS reading_percent INTEGER;
ALTER TABLE book_vocabulary ADD COLUMN IF NOT EXISTS word_category TEXT DEFAULT 'vocabulary';
ALTER TABLE book_vocabulary ADD COLUMN IF NOT EXISTS modern_equivalent TEXT;

-- Extend book_buddy_prompts with chapter scoping
ALTER TABLE book_buddy_prompts ADD COLUMN IF NOT EXISTS chapter_scope_start INTEGER;
ALTER TABLE book_buddy_prompts ADD COLUMN IF NOT EXISTS chapter_scope_end INTEGER;
ALTER TABLE book_buddy_prompts ADD COLUMN IF NOT EXISTS elar_standard_code TEXT;
ALTER TABLE book_buddy_prompts ADD COLUMN IF NOT EXISTS grade_level INTEGER;

-- Extend kid_reading_log with chapter progress
ALTER TABLE kid_reading_log ADD COLUMN IF NOT EXISTS current_chapter INTEGER;
ALTER TABLE kid_reading_log ADD COLUMN IF NOT EXISTS current_page INTEGER;
ALTER TABLE kid_reading_log ADD COLUMN IF NOT EXISTS reading_percent INTEGER;
ALTER TABLE kid_reading_log ADD COLUMN IF NOT EXISTS chapters_completed INTEGER[] DEFAULT '{}'::INTEGER[];
