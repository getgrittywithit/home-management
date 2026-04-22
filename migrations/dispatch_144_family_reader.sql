-- Dispatch 144 — Family Reader Experience

-- Extend kid_reading_log
ALTER TABLE kid_reading_log ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMPTZ;
ALTER TABLE kid_reading_log ADD COLUMN IF NOT EXISTS total_minutes_read INTEGER DEFAULT 0;
ALTER TABLE kid_reading_log ADD COLUMN IF NOT EXISTS sessions_count INTEGER DEFAULT 0;

-- Book reviews
CREATE TABLE IF NOT EXISTS book_reviews (
  id SERIAL PRIMARY KEY,
  book_id INTEGER,
  kid_name TEXT NOT NULL,
  rating TEXT NOT NULL,
  review_text TEXT,
  favorite_part TEXT,
  favorite_character TEXT,
  would_recommend_to TEXT[],
  spoiler_flag BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, kid_name)
);
CREATE INDEX IF NOT EXISTS idx_reviews_book ON book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_kid ON book_reviews(kid_name);

-- Sibling recommendations
CREATE TABLE IF NOT EXISTS book_recommendations (
  id SERIAL PRIMARY KEY,
  book_id INTEGER,
  from_kid TEXT NOT NULL,
  to_kid TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_book_rec_to ON book_recommendations(to_kid, status);

-- Want to Read list
CREATE TABLE IF NOT EXISTS kid_want_to_read (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  book_id INTEGER,
  source TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, book_id)
);
