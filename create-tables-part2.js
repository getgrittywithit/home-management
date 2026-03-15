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
    
    console.log('Creating Zones table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS zones (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          primary_assignee_id UUID REFERENCES profiles(id),
          buddy_id UUID REFERENCES profiles(id),
          cadence TEXT NOT NULL DEFAULT 'daily',
          definition_of_done TEXT,
          status TEXT DEFAULT 'pending',
          last_completed_at TIMESTAMPTZ,
          next_due_date DATE,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    console.log('Creating Zone Completions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS zone_completions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          zone_id UUID REFERENCES zones(id) NOT NULL,
          completed_by UUID REFERENCES profiles(id) NOT NULL,
          completion_date DATE NOT NULL,
          quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
          photo_url TEXT,
          notes TEXT,
          verified_by UUID REFERENCES profiles(id),
          created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    console.log('Creating Pets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pets (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          primary_caretaker_id UUID REFERENCES profiles(id) NOT NULL,
          backup_caretaker_id UUID REFERENCES profiles(id),
          daily_tasks TEXT[],
          weekly_tasks TEXT[],
          monthly_tasks TEXT[],
          special_instructions TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    console.log('Creating Pet Care Log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pet_care_log (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          pet_id UUID REFERENCES pets(id) NOT NULL,
          caretaker_id UUID REFERENCES profiles(id) NOT NULL,
          task_type TEXT NOT NULL,
          task_description TEXT NOT NULL,
          completed_at TIMESTAMPTZ NOT NULL,
          failsafe_triggered BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    console.log('Creating Water Jugs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS water_jugs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          jug_number INTEGER NOT NULL UNIQUE CHECK (jug_number >= 1 AND jug_number <= 6),
          status TEXT NOT NULL DEFAULT 'full',
          last_filled_date DATE,
          last_sanitized_date DATE,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    
    client.release();
    console.log('✅ Part 2 tables created successfully!');
    
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await pool.end();
  }
}

createTables();