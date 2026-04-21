-- Dispatch 132 — Living Library Activation

ALTER TABLE home_library ADD COLUMN IF NOT EXISTS lexile_level INTEGER;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS reading_grade_equivalent TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS interest_tags TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS teks_codes TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS age_range_low INTEGER;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS age_range_high INTEGER;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS content_advisory TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS series_name TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS has_bookbuddy_prompts BOOLEAN DEFAULT FALSE;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_library_reading_level ON home_library(reading_grade_equivalent);
CREATE INDEX IF NOT EXISTS idx_library_interest_tags ON home_library USING GIN(interest_tags);

CREATE TABLE IF NOT EXISTS book_buddy_prompts (
  id SERIAL PRIMARY KEY,
  book_id INTEGER,
  prompt_type TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  target_reading_level TEXT,
  chapter_or_section INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bb_prompts_book ON book_buddy_prompts(book_id);

CREATE TABLE IF NOT EXISTS book_vocabulary (
  id SERIAL PRIMARY KEY,
  book_id INTEGER,
  word TEXT NOT NULL,
  definition TEXT,
  example_sentence TEXT,
  difficulty_rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, word)
);

ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS current_page INTEGER;
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS total_pages INTEGER;
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS kid_rating INTEGER;
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS kid_notes TEXT;
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started';
