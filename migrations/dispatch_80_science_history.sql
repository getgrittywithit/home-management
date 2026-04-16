-- ============================================================================
-- Dispatch 80 — Science & History Buddies + Teacher Resource Library
-- Clones the ELAR/Math learning engine tables for two new subjects.
-- Single-family app, no family_id column.
-- ============================================================================

-- ── Science ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kid_science_progress (
  id                  SERIAL PRIMARY KEY,
  kid_name            TEXT NOT NULL,
  skill_id            VARCHAR(3) NOT NULL,
  skill_name          TEXT,
  current_mastery     INTEGER NOT NULL DEFAULT 0,
  questions_attempted INTEGER NOT NULL DEFAULT 0,
  questions_correct   INTEGER NOT NULL DEFAULT 0,
  streak              INTEGER NOT NULL DEFAULT 0,
  longest_streak      INTEGER NOT NULL DEFAULT 0,
  last_practiced      TIMESTAMPTZ,
  focus_skill         BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, skill_id)
);

CREATE TABLE IF NOT EXISTS science_placement_passages (
  id                      SERIAL PRIMARY KEY,
  skill_id                VARCHAR(3) NOT NULL,
  reading_level           VARCHAR(20) NOT NULL DEFAULT '2nd-3rd',
  difficulty              VARCHAR(20) NOT NULL DEFAULT 'easy',
  passage_number          INTEGER NOT NULL DEFAULT 1,
  passage_text            TEXT NOT NULL,
  question                TEXT NOT NULL,
  answer_key              TEXT,
  scoring_rubric          JSONB,
  age_appropriate_context VARCHAR(255),
  interest_tag            TEXT DEFAULT 'general',
  encouragement_correct   TEXT,
  encouragement_wrong     TEXT,
  hint_text               TEXT,
  title                   TEXT,
  vocabulary              JSONB,
  UNIQUE(skill_id, reading_level, passage_number, interest_tag)
);

CREATE TABLE IF NOT EXISTS science_buddy_responses (
  id              SERIAL PRIMARY KEY,
  kid_name        TEXT NOT NULL,
  skill_id        VARCHAR(3),
  passage_id      INTEGER,
  passage_text    TEXT,
  question        TEXT,
  kid_response    TEXT,
  ai_score        VARCHAR(20),
  ai_feedback     TEXT,
  points_earned   INTEGER DEFAULT 0,
  mastery_before  INTEGER,
  mastery_after   INTEGER,
  mastery_delta   INTEGER,
  session_id      VARCHAR(100),
  attempted_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS science_placement_results (
  id               SERIAL PRIMARY KEY,
  kid_name         TEXT NOT NULL,
  skill_id         VARCHAR(3) NOT NULL,
  starting_mastery INTEGER DEFAULT 0,
  placed_at_level  TEXT,
  passages_attempted JSONB,
  raw_responses    JSONB,
  placement_date   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, skill_id)
);

-- ── History / Social Studies ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kid_history_progress (
  id                  SERIAL PRIMARY KEY,
  kid_name            TEXT NOT NULL,
  skill_id            VARCHAR(3) NOT NULL,
  skill_name          TEXT,
  current_mastery     INTEGER NOT NULL DEFAULT 0,
  questions_attempted INTEGER NOT NULL DEFAULT 0,
  questions_correct   INTEGER NOT NULL DEFAULT 0,
  streak              INTEGER NOT NULL DEFAULT 0,
  longest_streak      INTEGER NOT NULL DEFAULT 0,
  last_practiced      TIMESTAMPTZ,
  focus_skill         BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, skill_id)
);

CREATE TABLE IF NOT EXISTS history_placement_passages (
  id                      SERIAL PRIMARY KEY,
  skill_id                VARCHAR(3) NOT NULL,
  reading_level           VARCHAR(20) NOT NULL DEFAULT '2nd-3rd',
  difficulty              VARCHAR(20) NOT NULL DEFAULT 'easy',
  passage_number          INTEGER NOT NULL DEFAULT 1,
  passage_text            TEXT NOT NULL,
  question                TEXT NOT NULL,
  answer_key              TEXT,
  scoring_rubric          JSONB,
  age_appropriate_context VARCHAR(255),
  interest_tag            TEXT DEFAULT 'general',
  encouragement_correct   TEXT,
  encouragement_wrong     TEXT,
  hint_text               TEXT,
  title                   TEXT,
  vocabulary              JSONB,
  UNIQUE(skill_id, reading_level, passage_number, interest_tag)
);

CREATE TABLE IF NOT EXISTS history_buddy_responses (
  id              SERIAL PRIMARY KEY,
  kid_name        TEXT NOT NULL,
  skill_id        VARCHAR(3),
  passage_id      INTEGER,
  passage_text    TEXT,
  question        TEXT,
  kid_response    TEXT,
  ai_score        VARCHAR(20),
  ai_feedback     TEXT,
  points_earned   INTEGER DEFAULT 0,
  mastery_before  INTEGER,
  mastery_after   INTEGER,
  mastery_delta   INTEGER,
  session_id      VARCHAR(100),
  attempted_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS history_placement_results (
  id               SERIAL PRIMARY KEY,
  kid_name         TEXT NOT NULL,
  skill_id         VARCHAR(3) NOT NULL,
  starting_mastery INTEGER DEFAULT 0,
  placed_at_level  TEXT,
  passages_attempted JSONB,
  raw_responses    JSONB,
  placement_date   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, skill_id)
);

-- ── Teacher Resource Library ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teacher_resources (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  file_url        TEXT,
  file_type       TEXT CHECK (file_type IN ('pdf', 'image', 'link', 'canva')),
  thumbnail_url   TEXT,
  subject         TEXT CHECK (subject IN ('elar', 'math', 'science', 'history', 'art', 'life_skills', 'other')),
  skills          TEXT[],
  grade_level     TEXT,
  tags            TEXT[],
  source          TEXT DEFAULT 'uploaded',
  canva_link      TEXT,
  times_used      INTEGER DEFAULT 0,
  last_used_at    TIMESTAMPTZ,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worksheet_assignments (
  id              SERIAL PRIMARY KEY,
  resource_id     INTEGER REFERENCES teacher_resources(id) ON DELETE CASCADE,
  kid_name        TEXT NOT NULL,
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  assigned_by     TEXT,
  due_date        DATE,
  status          TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'skipped')),
  completed_at    TIMESTAMPTZ,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_worksheet_assignments_kid ON worksheet_assignments(kid_name, status);
CREATE INDEX IF NOT EXISTS idx_teacher_resources_subject ON teacher_resources(subject);

-- Seed progress rows for all 4 homeschool kids × 8 science skills × 8 history skills
INSERT INTO kid_science_progress (kid_name, skill_id, skill_name)
SELECT kid, skill_id, skill_name FROM
  (VALUES ('amos'), ('ellie'), ('wyatt'), ('hannah')) AS k(kid)
  CROSS JOIN (VALUES
    ('S1', 'Observation & Classification'),
    ('S2', 'Scientific Method'),
    ('S3', 'Life Science'),
    ('S4', 'Earth Science'),
    ('S5', 'Physical Science'),
    ('S6', 'Space Science'),
    ('S7', 'Environmental Science'),
    ('S8', 'Health & Human Body')
  ) AS s(skill_id, skill_name)
ON CONFLICT (kid_name, skill_id) DO NOTHING;

INSERT INTO kid_history_progress (kid_name, skill_id, skill_name)
SELECT kid, skill_id, skill_name FROM
  (VALUES ('amos'), ('ellie'), ('wyatt'), ('hannah')) AS k(kid)
  CROSS JOIN (VALUES
    ('H1', 'Civics & Community'),
    ('H2', 'Geography'),
    ('H3', 'Economics & Financial Literacy'),
    ('H4', 'Texas History & Culture'),
    ('H5', 'US History'),
    ('H6', 'World Cultures'),
    ('H7', 'Media Literacy & Current Events'),
    ('H8', 'Critical Thinking & Real-World')
  ) AS s(skill_id, skill_name)
ON CONFLICT (kid_name, skill_id) DO NOTHING;
