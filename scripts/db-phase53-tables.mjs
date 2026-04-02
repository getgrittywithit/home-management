import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const TABLES = [
  `CREATE TABLE IF NOT EXISTS safety_events (
    id SERIAL PRIMARY KEY,
    kid_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    source TEXT DEFAULT 'ai_buddy',
    message_snippet TEXT,
    context_data JSONB,
    ai_response_given BOOLEAN DEFAULT TRUE,
    parent_notified BOOLEAN DEFAULT TRUE,
    parent_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS system_error_log (
    id SERIAL PRIMARY KEY,
    error_source TEXT NOT NULL,
    error_message TEXT,
    kid_name TEXT,
    context JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    target_role TEXT NOT NULL,
    source_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(target_role, source_type)
  )`,
  `CREATE TABLE IF NOT EXISTS kid_regulation_preferences (
    id SERIAL PRIMARY KEY,
    kid_name TEXT NOT NULL,
    strategy TEXT NOT NULL,
    effectiveness_score INTEGER DEFAULT 0,
    custom_label TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kid_name, strategy)
  )`,
  `CREATE TABLE IF NOT EXISTS weekly_digests (
    id SERIAL PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    digest_data JSONB NOT NULL,
    digest_text TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS kid_journal_entries (
    id SERIAL PRIMARY KEY,
    kid_name TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    prompt_text TEXT,
    entry_text TEXT NOT NULL,
    mood_tag INTEGER,
    private BOOLEAN DEFAULT TRUE,
    flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS behavioral_observations (
    id SERIAL PRIMARY KEY,
    kid_name TEXT NOT NULL,
    observation_date DATE NOT NULL,
    observation_time TIME,
    context TEXT,
    antecedent TEXT,
    behavior TEXT NOT NULL,
    consequence TEXT,
    duration_minutes INTEGER,
    intensity TEXT,
    resolution TEXT,
    mood_before INTEGER,
    mood_after INTEGER,
    observed_by TEXT DEFAULT 'parent',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS kid_accommodations (
    id SERIAL PRIMARY KEY,
    kid_name TEXT NOT NULL,
    accommodation_type TEXT NOT NULL,
    parameters JSONB,
    source TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kid_name, accommodation_type)
  )`,
  `CREATE TABLE IF NOT EXISTS kid_benchmarks (
    id SERIAL PRIMARY KEY,
    kid_name TEXT NOT NULL,
    test_name TEXT NOT NULL,
    score TEXT,
    percentile TEXT,
    grade_equivalent TEXT,
    test_date DATE NOT NULL,
    notes TEXT,
    entered_by TEXT DEFAULT 'parent',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS iep_goal_progress (
    id SERIAL PRIMARY KEY,
    kid_name TEXT NOT NULL,
    plan_id INTEGER,
    goal_text TEXT NOT NULL,
    target_value TEXT,
    current_value TEXT,
    measurement_type TEXT,
    data_points JSONB DEFAULT '[]',
    status TEXT DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  // Column additions for existing tables
  `ALTER TABLE ai_buddy_conversations ADD COLUMN IF NOT EXISTS subject_detected TEXT`,
  `ALTER TABLE ai_buddy_conversations ADD COLUMN IF NOT EXISTS reminder_given BOOLEAN DEFAULT FALSE`,
]

async function main() {
  const client = await pool.connect()
  try {
    for (const sql of TABLES) {
      const name = sql.match(/(?:CREATE TABLE IF NOT EXISTS|ALTER TABLE) (\w+)/)?.[1] || 'unknown'
      try {
        await client.query(sql)
        console.log(`  ✅ ${name}`)
      } catch (e) {
        console.log(`  ⚠️ ${name}: ${e.message}`)
      }
    }
    console.log('\nDone! Phase 5.3 tables verified.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
