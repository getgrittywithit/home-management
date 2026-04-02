import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const TABLES = [
  {
    name: 'calendar_events_cache',
    sql: `CREATE TABLE IF NOT EXISTS calendar_events_cache (
      id SERIAL PRIMARY KEY,
      event_id TEXT UNIQUE,
      title TEXT NOT NULL,
      start_time TIMESTAMPTZ,
      end_time TIMESTAMPTZ,
      all_day BOOLEAN DEFAULT FALSE,
      calendar_name TEXT,
      calendar_id TEXT,
      location TEXT,
      description TEXT,
      source TEXT DEFAULT 'google',
      synced_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'student_plans',
    sql: `CREATE TABLE IF NOT EXISTS student_plans (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      plan_type TEXT CHECK (plan_type IN ('iep', '504', 'ard')),
      plan_date DATE,
      next_review_date DATE,
      accommodations JSONB DEFAULT '[]',
      goals JSONB DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'health_episodes',
    sql: `CREATE TABLE IF NOT EXISTS health_episodes (
      id SERIAL PRIMARY KEY,
      person_name TEXT NOT NULL,
      episode_type TEXT,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE,
      severity TEXT DEFAULT 'mild',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'health_vitals_schedule',
    sql: `CREATE TABLE IF NOT EXISTS health_vitals_schedule (
      id SERIAL PRIMARY KEY,
      person_name TEXT NOT NULL,
      vital_type TEXT NOT NULL,
      frequency TEXT DEFAULT 'daily',
      last_recorded DATE,
      target_value TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'spending_insights',
    sql: `CREATE TABLE IF NOT EXISTS spending_insights (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      period TEXT DEFAULT 'monthly',
      insight_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'purchase_history',
    sql: `CREATE TABLE IF NOT EXISTS purchase_history (
      id SERIAL PRIMARY KEY,
      store_name TEXT,
      purchase_date DATE NOT NULL,
      total_amount NUMERIC,
      receipt_url TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'purchase_items',
    sql: `CREATE TABLE IF NOT EXISTS purchase_items (
      id SERIAL PRIMARY KEY,
      purchase_id INT REFERENCES purchase_history(id),
      item_name TEXT NOT NULL,
      quantity NUMERIC DEFAULT 1,
      unit_price NUMERIC,
      category TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'zone_photo_submissions',
    sql: `CREATE TABLE IF NOT EXISTS zone_photo_submissions (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      zone_name TEXT NOT NULL,
      photo_url TEXT,
      status TEXT DEFAULT 'pending',
      parent_note TEXT,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )`,
  },
  {
    name: 'library_submissions',
    sql: `CREATE TABLE IF NOT EXISTS library_submissions (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      item_type TEXT DEFAULT 'book',
      title TEXT NOT NULL,
      author_or_publisher TEXT,
      isbn TEXT,
      upc TEXT,
      description TEXT,
      reason TEXT,
      cover_image_url TEXT,
      location_in_home TEXT,
      custom_tags TEXT[],
      status TEXT DEFAULT 'pending',
      parent_note TEXT,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )`,
  },
  {
    name: 'ai_buddy_conversations',
    sql: `CREATE TABLE IF NOT EXISTS ai_buddy_conversations (
      id SERIAL PRIMARY KEY,
      conversation_id TEXT,
      role TEXT NOT NULL DEFAULT 'kid',
      kid_name TEXT,
      user_message TEXT NOT NULL,
      assistant_message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
]

async function main() {
  const client = await pool.connect()
  try {
    // Check existing tables
    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    )
    const existing = new Set(rows.map(r => r.table_name))
    console.log(`Found ${existing.size} existing tables`)

    for (const table of TABLES) {
      if (existing.has(table.name)) {
        console.log(`  ✅ ${table.name} — exists`)
      } else {
        console.log(`  🔨 ${table.name} — creating...`)
        await client.query(table.sql)
        console.log(`  ✅ ${table.name} — created`)
      }
    }

    console.log('\nDone! All tables verified.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
