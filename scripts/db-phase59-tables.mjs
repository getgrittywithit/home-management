import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS financial_literacy_progress (
    id SERIAL PRIMARY KEY,
    kid_name VARCHAR(50) UNIQUE NOT NULL,
    current_level INTEGER DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 6),
    level_1_complete BOOLEAN DEFAULT FALSE,
    level_2_complete BOOLEAN DEFAULT FALSE,
    level_3_complete BOOLEAN DEFAULT FALSE,
    level_4_complete BOOLEAN DEFAULT FALSE,
    level_5_complete BOOLEAN DEFAULT FALSE,
    level_6_complete BOOLEAN DEFAULT FALSE,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS elar_placement_passages (
    id SERIAL PRIMARY KEY,
    skill_id VARCHAR(3) NOT NULL,
    reading_level VARCHAR(20) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    passage_number INTEGER,
    passage_text TEXT NOT NULL,
    question TEXT NOT NULL,
    answer_key TEXT NOT NULL,
    scoring_rubric JSONB,
    age_appropriate_context VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (skill_id, reading_level, passage_number)
  )`,
  `CREATE TABLE IF NOT EXISTS elar_placement_results (
    id SERIAL PRIMARY KEY,
    kid_name VARCHAR(50) NOT NULL,
    skill_id VARCHAR(3) NOT NULL,
    starting_mastery INTEGER DEFAULT 0,
    placed_at_level VARCHAR(20),
    passages_attempted JSONB,
    raw_responses JSONB,
    placement_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (kid_name, skill_id)
  )`,
  `CREATE TABLE IF NOT EXISTS math_placement_problems (
    id SERIAL PRIMARY KEY,
    skill_id VARCHAR(3) NOT NULL,
    math_level VARCHAR(20) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    problem_number INTEGER,
    problem_text TEXT NOT NULL,
    answer TEXT NOT NULL,
    answer_type VARCHAR(20),
    choices JSONB,
    explanation TEXT,
    age_appropriate_context VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (skill_id, math_level, problem_number)
  )`,
  `CREATE TABLE IF NOT EXISTS math_placement_results (
    id SERIAL PRIMARY KEY,
    kid_name VARCHAR(50) NOT NULL,
    skill_id VARCHAR(3) NOT NULL,
    starting_mastery INTEGER DEFAULT 0,
    placed_at_level VARCHAR(20),
    problems_attempted JSONB,
    raw_responses JSONB,
    placement_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (kid_name, skill_id)
  )`,
  `CREATE TABLE IF NOT EXISTS kid_elar_progress (
    id SERIAL PRIMARY KEY,
    kid_name VARCHAR(50) NOT NULL,
    skill_id VARCHAR(3) NOT NULL,
    skill_name VARCHAR(100),
    current_mastery INTEGER DEFAULT 0,
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_practiced TIMESTAMP,
    focus_skill BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (kid_name, skill_id)
  )`,
  `CREATE TABLE IF NOT EXISTS book_buddy_responses (
    id SERIAL PRIMARY KEY,
    kid_name VARCHAR(50) NOT NULL,
    skill_id VARCHAR(3) NOT NULL,
    passage_id INTEGER,
    passage_text TEXT,
    question TEXT,
    kid_response TEXT NOT NULL,
    ai_score VARCHAR(20),
    ai_feedback TEXT,
    points_earned INTEGER,
    mastery_before INTEGER,
    mastery_after INTEGER,
    mastery_delta INTEGER,
    session_id VARCHAR(100),
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS book_buddy_reports (
    id SERIAL PRIMARY KEY,
    kid_name VARCHAR(50) NOT NULL,
    report_type VARCHAR(20),
    period_start_date DATE,
    period_end_date DATE,
    skills_practiced TEXT[],
    mastery_changes JSONB,
    strengths TEXT[],
    areas_for_growth TEXT[],
    parent_summary TEXT,
    ai_generated_summary TEXT,
    stars_earned INTEGER,
    activities_completed INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS kid_math_progress (
    id SERIAL PRIMARY KEY,
    kid_name VARCHAR(50) NOT NULL,
    skill_id VARCHAR(3) NOT NULL,
    skill_name VARCHAR(100),
    current_mastery INTEGER DEFAULT 0,
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_practiced TIMESTAMP,
    focus_skill BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (kid_name, skill_id)
  )`,
  `CREATE TABLE IF NOT EXISTS math_buddy_responses (
    id SERIAL PRIMARY KEY,
    kid_name VARCHAR(50) NOT NULL,
    skill_id VARCHAR(3) NOT NULL,
    problem_id INTEGER,
    problem_text TEXT,
    kid_answer TEXT NOT NULL,
    correct_answer TEXT,
    is_correct BOOLEAN,
    is_partial BOOLEAN DEFAULT FALSE,
    ai_feedback TEXT,
    points_earned INTEGER,
    mastery_before INTEGER,
    mastery_after INTEGER,
    mastery_delta INTEGER,
    session_id VARCHAR(100),
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS academic_records (
    id SERIAL PRIMARY KEY,
    kid_name VARCHAR(50) NOT NULL,
    record_type VARCHAR(50),
    subject VARCHAR(50),
    period_type VARCHAR(20),
    period_start_date DATE,
    period_end_date DATE,
    generated_data JSONB,
    pdf_url VARCHAR(512),
    pdf_created_at TIMESTAMP,
    parent_notes TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_elar_placement_skill ON elar_placement_passages(skill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_elar_placement_level ON elar_placement_passages(reading_level)`,
  `CREATE INDEX IF NOT EXISTS idx_elar_placement_kid_skill ON elar_placement_results(kid_name, skill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_math_placement_skill ON math_placement_problems(skill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_math_placement_level ON math_placement_problems(math_level)`,
  `CREATE INDEX IF NOT EXISTS idx_math_placement_kid_skill ON math_placement_results(kid_name, skill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_elar_progress_kid ON kid_elar_progress(kid_name)`,
  `CREATE INDEX IF NOT EXISTS idx_math_progress_kid ON kid_math_progress(kid_name)`,
  `CREATE INDEX IF NOT EXISTS idx_book_responses_kid_skill ON book_buddy_responses(kid_name, skill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_math_responses_kid_skill ON math_buddy_responses(kid_name, skill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_academic_records_kid_type ON academic_records(kid_name, record_type)`,
  // Seed financial literacy progress for all 6 kids
  `INSERT INTO financial_literacy_progress (kid_name, current_level) VALUES ('amos', 1), ('ellie', 1), ('wyatt', 1), ('hannah', 1), ('zoey', 1), ('kaylee', 1) ON CONFLICT (kid_name) DO NOTHING`,
]

async function main() {
  const client = await pool.connect()
  try {
    for (const sql of MIGRATIONS) {
      const name = sql.match(/(?:CREATE TABLE|CREATE INDEX|INSERT INTO) (?:IF NOT EXISTS )?(\w+)/)?.[1] || 'unknown'
      try {
        await client.query(sql)
        console.log(`  ✅ ${name}`)
      } catch (e) {
        console.log(`  ⚠️ ${name}: ${e.message.substring(0, 80)}`)
      }
    }
    console.log('\nDone! Phase 5.9 tables created.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
