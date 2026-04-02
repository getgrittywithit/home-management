import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const MIGRATIONS = [
  // New tables
  `CREATE TABLE IF NOT EXISTS kid_positive_reports (
    id SERIAL PRIMARY KEY,
    kid_name TEXT NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    source TEXT DEFAULT 'self',
    submitted_by TEXT,
    points NUMERIC DEFAULT 1,
    approved BOOLEAN DEFAULT FALSE,
    approved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS vocab_mixer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID,
    name TEXT,
    source_book_ids TEXT[],
    source_mode TEXT DEFAULT 'select',
    word_ids UUID[],
    word_count INTEGER,
    output_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS vocab_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID,
    mixer_session_id UUID,
    section_1_ids UUID[],
    section_2_ids UUID[],
    section_3_ids UUID[],
    section_4_ids UUID[],
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    pdf_url TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ai_gift_suggestions (
    id SERIAL PRIMARY KEY,
    kid_name TEXT NOT NULL,
    quarter TEXT NOT NULL,
    suggestions JSONB NOT NULL,
    parent_approved JSONB DEFAULT '[]',
    generated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS cycle_privacy_settings (
    kid_name TEXT PRIMARY KEY,
    share_cramps BOOLEAN DEFAULT TRUE,
    share_irregularities BOOLEAN DEFAULT TRUE,
    share_flow BOOLEAN DEFAULT FALSE,
    share_cycle_mood BOOLEAN DEFAULT FALSE,
    share_cycle_length BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS kid_workbook_progress (
    id SERIAL PRIMARY KEY,
    kid_name TEXT NOT NULL,
    workbook_name TEXT NOT NULL,
    workbook_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    total_pages INTEGER NOT NULL,
    current_page INTEGER DEFAULT 0,
    daily_target INTEGER DEFAULT 2,
    started_date DATE,
    completed_date DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kid_name, workbook_name)
  )`,
  `CREATE TABLE IF NOT EXISTS workbook_skill_map (
    id SERIAL PRIMARY KEY,
    workbook_name TEXT NOT NULL,
    page_start INTEGER NOT NULL,
    page_end INTEGER NOT NULL,
    section_name TEXT,
    subject_mix TEXT[],
    skill_ids TEXT[],
    topic_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  // Column additions for existing tables
  `ALTER TABLE achievement_definitions ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1`,
  `ALTER TABLE achievement_definitions ADD COLUMN IF NOT EXISTS points_required INTEGER`,
  `ALTER TABLE achievement_definitions ADD COLUMN IF NOT EXISTS star_reward INTEGER DEFAULT 5`,
  `ALTER TABLE achievement_definitions ADD COLUMN IF NOT EXISTS category TEXT`,
  `ALTER TABLE vocab_words ADD COLUMN IF NOT EXISTS synonyms TEXT[]`,
  `ALTER TABLE vocab_words ADD COLUMN IF NOT EXISTS antonyms TEXT[]`,
  `ALTER TABLE vocab_words ADD COLUMN IF NOT EXISTS example_sentence TEXT`,
  `ALTER TABLE vocab_words ADD COLUMN IF NOT EXISTS etymology TEXT`,
  `ALTER TABLE vocab_words ADD COLUMN IF NOT EXISTS pronunciation TEXT`,
  `ALTER TABLE vocab_words ADD COLUMN IF NOT EXISTS difficulty TEXT`,
  `ALTER TABLE vocab_words ADD COLUMN IF NOT EXISTS grade_level TEXT`,
  `ALTER TABLE kid_mood_log ADD COLUMN IF NOT EXISTS energy INTEGER`,
  `ALTER TABLE kid_mood_log ADD COLUMN IF NOT EXISTS anxiety INTEGER`,
  `ALTER TABLE kid_mood_log ADD COLUMN IF NOT EXISTS irritability INTEGER`,
  `ALTER TABLE kid_mood_log ADD COLUMN IF NOT EXISTS focus INTEGER`,
]

async function main() {
  const client = await pool.connect()
  try {
    for (const sql of MIGRATIONS) {
      const name = sql.match(/(?:CREATE TABLE IF NOT EXISTS|ALTER TABLE) (\w+)/)?.[1] || 'unknown'
      try {
        await client.query(sql)
        console.log(`  ✅ ${name}`)
      } catch (e) {
        console.log(`  ⚠️ ${name}: ${e.message}`)
      }
    }
    console.log('\nDone! Phase 5.4 migrations complete.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
