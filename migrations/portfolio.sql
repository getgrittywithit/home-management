CREATE TABLE IF NOT EXISTS kid_reading_log (
  id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, book_title TEXT NOT NULL, author TEXT,
  status TEXT NOT NULL DEFAULT 'reading', rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT, date_started DATE, date_completed DATE, added_by TEXT DEFAULT 'kid',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS kid_reading_sessions (
  id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes INTEGER, points_earned INTEGER NOT NULL DEFAULT 5, created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (kid_name, session_date)
);
CREATE TABLE IF NOT EXISTS kid_learn_wishlist (
  id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, topic TEXT NOT NULL, notes TEXT,
  completed BOOLEAN DEFAULT FALSE, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS kid_work_log (
  id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
  subject TEXT, work_date DATE NOT NULL DEFAULT CURRENT_DATE, image_url TEXT,
  added_by TEXT DEFAULT 'parent', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS kid_curriculum_notes (
  id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL UNIQUE, notes TEXT,
  current_focus TEXT, updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reading_log_kid ON kid_reading_log(kid_name);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_kid ON kid_reading_sessions(kid_name, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_learn_wishlist_kid ON kid_learn_wishlist(kid_name);
CREATE INDEX IF NOT EXISTS idx_work_log_kid ON kid_work_log(kid_name);
