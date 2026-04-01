-- ============================================================================
-- Migration: Attendance, Reading Log, AI Buddy
-- ============================================================================

-- 1. SCHOOL ATTENDANCE
CREATE TABLE IF NOT EXISTS school_attendance (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  absence_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  school_type TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  makeup_needed BOOLEAN DEFAULT FALSE,
  makeup_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, absence_date)
);

-- 2. MAKEUP WORK
CREATE TABLE IF NOT EXISTS makeup_work (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  attendance_id INTEGER REFERENCES school_attendance(id),
  absent_date DATE NOT NULL,
  subject TEXT,
  assignment_description TEXT,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_makeup_work_kid ON makeup_work(kid_name, status);

-- 3. KID READING LOG
CREATE TABLE IF NOT EXISTS kid_reading_log (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  book_id UUID,
  book_title TEXT NOT NULL,
  minutes_read INTEGER NOT NULL,
  pages_read INTEGER,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_notes TEXT,
  finished_book BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_log_kid ON kid_reading_log(kid_name, log_date);

-- 4. KID BOOK PROGRESS
CREATE TABLE IF NOT EXISTS kid_book_progress (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  book_id UUID,
  book_title TEXT NOT NULL,
  total_pages INTEGER,
  current_page INTEGER DEFAULT 0,
  status TEXT DEFAULT 'reading',
  started_at DATE DEFAULT CURRENT_DATE,
  finished_at DATE,
  rating INTEGER,
  review TEXT,
  UNIQUE(kid_name, book_title)
);

CREATE INDEX IF NOT EXISTS idx_book_progress_kid ON kid_book_progress(kid_name, status);

-- 5. AI BUDDY CONVERSATIONS
CREATE TABLE IF NOT EXISTS ai_buddy_conversations (
  id SERIAL PRIMARY KEY,
  conversation_id UUID DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  kid_name TEXT,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buddy_convos ON ai_buddy_conversations(role, kid_name, created_at);
