const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTables() {
  try {
    const client = await pool.connect();
    
    console.log('Creating Money Sprints table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS money_sprints (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          date DATE NOT NULL,
          sprint_type TEXT NOT NULL,
          target_amount DECIMAL(10,2),
          actual_amount DECIMAL(10,2) DEFAULT 0,
          items_listed INTEGER DEFAULT 0,
          items_potted INTEGER DEFAULT 0,
          items_photographed INTEGER DEFAULT 0,
          story_posted BOOLEAN DEFAULT FALSE,
          completed_by UUID REFERENCES profiles(id),
          created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    console.log('Creating On-Call Schedule table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS on_call_schedule (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          date DATE NOT NULL UNIQUE,
          on_call_parent_id UUID REFERENCES profiles(id) NOT NULL,
          manually_set BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    console.log('Creating Daily Greenlights table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_greenlights (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          child_id UUID REFERENCES profiles(id) NOT NULL,
          date DATE NOT NULL,
          approved_activities TEXT[],
          token_allowance INTEGER,
          special_notes TEXT,
          posted_by UUID REFERENCES profiles(id) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(child_id, date)
      );
    `);
    
    console.log('Creating Family Config table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_config (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          description TEXT,
          updated_by UUID REFERENCES profiles(id),
          updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    console.log('Inserting default configuration...');
    await client.query(`
      INSERT INTO family_config (key, value, description) VALUES
      ('pickup_windows', '15,45', 'Pickup windows per hour'),
      ('jug_captain_id', '', 'UUID of current water jug captain'),
      ('announce_sprints', 'false', 'Whether to announce money sprints to family'),
      ('school_day_start', '08:00', 'School day start time'),
      ('school_day_end', '15:30', 'School day end time'),
      ('low_water_threshold', '2', 'Alert when jugs <= this number'),
      ('refill_windows', 'Tue 17:00-19:00,Fri 17:00-19:00', 'Water refill windows')
      ON CONFLICT (key) DO NOTHING;
    `);
    
    console.log('Creating views...');
    await client.query(`
      CREATE OR REPLACE VIEW water_status AS
      SELECT 
          COUNT(*) FILTER (WHERE status = 'full') as jugs_full,
          COUNT(*) FILTER (WHERE status = 'empty') as jugs_empty,
          COUNT(*) FILTER (WHERE status = 'in_use') as jugs_in_use,
          ROUND(COUNT(*) FILTER (WHERE status = 'full') * 2.5, 1) as estimated_days_left
      FROM water_jugs;
    `);
    
    await client.query(`
      CREATE OR REPLACE VIEW tokens_available_today AS
      SELECT 
          p.id as child_id,
          p.first_name,
          COALESCE(rt.tokens_available, tc.mon_tokens) as tokens_available,
          COALESCE(rt.tokens_used, 0) as tokens_used,
          (COALESCE(rt.tokens_available, tc.mon_tokens) - COALESCE(rt.tokens_used, 0)) as tokens_remaining
      FROM profiles p
      LEFT JOIN ride_tokens rt ON p.id = rt.child_id AND rt.date = CURRENT_DATE
      LEFT JOIN token_config tc ON p.id = tc.child_id
      WHERE p.role = 'child';
    `);
    
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_family_events_child_date ON family_events(child_id, start_time);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ride_tokens_child_date ON ride_tokens(child_id, date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_zone_completions_date ON zone_completions(completion_date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pet_care_log_date ON pet_care_log(completed_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_greenlights_child_date ON daily_greenlights(child_id, date);`);
    
    client.release();
    console.log('✅ Part 3 tables and views created successfully!');
    
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await pool.end();
  }
}

createTables();