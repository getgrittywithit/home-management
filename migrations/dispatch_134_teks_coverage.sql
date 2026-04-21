-- Dispatch 134 — TEKS Coverage Dashboard

CREATE TABLE IF NOT EXISTS teks_standards (
  id SERIAL PRIMARY KEY,
  teks_code TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL,
  subject TEXT NOT NULL,
  strand TEXT,
  knowledge_and_skills TEXT,
  student_expectation TEXT,
  effective_date DATE,
  full_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teks_grade_subject ON teks_standards(grade_level, subject);
CREATE INDEX IF NOT EXISTS idx_teks_strand ON teks_standards(strand);

CREATE TABLE IF NOT EXISTS activity_teks_map (
  id SERIAL PRIMARY KEY,
  activity_type TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  teks_code TEXT NOT NULL,
  tagged_by TEXT,
  confidence REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_type, activity_id, teks_code)
);
CREATE INDEX IF NOT EXISTS idx_activity_teks_lookup ON activity_teks_map(activity_type, activity_id);
CREATE INDEX IF NOT EXISTS idx_teks_activity_lookup ON activity_teks_map(teks_code);

CREATE TABLE IF NOT EXISTS kid_teks_coverage (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  school_year TEXT NOT NULL,
  teks_code TEXT NOT NULL,
  activity_count INTEGER DEFAULT 0,
  last_activity_date DATE,
  mastery_signal REAL DEFAULT 0,
  status TEXT DEFAULT 'not_started',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, school_year, teks_code)
);
CREATE INDEX IF NOT EXISTS idx_coverage_kid_year ON kid_teks_coverage(kid_name, school_year);

CREATE TABLE IF NOT EXISTS ixl_standards_proficiency_import (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  import_date DATE NOT NULL,
  teks_code TEXT,
  ixl_skill_code TEXT,
  smartscore INTEGER,
  minutes_practiced INTEGER,
  raw_csv_row JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
