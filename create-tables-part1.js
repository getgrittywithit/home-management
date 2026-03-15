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
    
    console.log('Creating Family Events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_events (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          child_id UUID REFERENCES profiles(id),
          title TEXT NOT NULL,
          event_type TEXT NOT NULL DEFAULT 'activity',
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ,
          captain_id UUID REFERENCES profiles(id),
          backup_id UUID REFERENCES profiles(id),
          location TEXT,
          contact_info TEXT,
          gear_needed TEXT,
          pharmacy TEXT,
          swap_flag BOOLEAN DEFAULT FALSE,
          swap_requested_at TIMESTAMPTZ,
          status TEXT DEFAULT 'scheduled',
          tokens_used INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    console.log('Creating Ride Tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ride_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          child_id UUID REFERENCES profiles(id) NOT NULL,
          date DATE NOT NULL,
          tokens_available INTEGER NOT NULL DEFAULT 1,
          tokens_used INTEGER DEFAULT 0,
          last_minute_penalty INTEGER DEFAULT 0,
          week_start DATE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    console.log('Creating Token Config table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS token_config (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          child_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
          mon_tokens INTEGER DEFAULT 1,
          tue_tokens INTEGER DEFAULT 1,
          wed_tokens INTEGER DEFAULT 1,
          thu_tokens INTEGER DEFAULT 1,
          fri_tokens INTEGER DEFAULT 2,
          sat_tokens INTEGER DEFAULT 2,
          sun_tokens INTEGER DEFAULT 2,
          weekly_max INTEGER DEFAULT 10,
          last_minute_cost INTEGER DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    console.log('Creating Credits Log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS credits_log (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          child_id UUID REFERENCES profiles(id) NOT NULL,
          amount INTEGER NOT NULL,
          reason TEXT NOT NULL,
          awarded_by UUID REFERENCES profiles(id),
          balance_after INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    client.release();
    console.log('✅ Part 1 tables created successfully!');
    
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await pool.end();
  }
}

createTables();