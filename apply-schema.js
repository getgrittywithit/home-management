const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function applySchema() {
  try {
    const client = await pool.connect();
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('./family-ops-schema.sql', 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`${i + 1}. Executing: ${statement.substring(0, 60)}...`);
        await client.query(statement);
        console.log('   ✅ Success');
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        // Continue with other statements even if one fails
      }
    }
    
    client.release();
    console.log('\n=== SCHEMA APPLICATION COMPLETE ===');
    
    // Verify new tables were created
    console.log('\nVerifying new tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'family_events', 'ride_tokens', 'token_config', 'credits_log',
        'zones', 'zone_completions', 'pets', 'pet_care_log', 
        'water_jugs', 'water_usage_log', 'money_sprints', 'money_sales',
        'on_call_schedule', 'daily_greenlights', 'family_config'
      )
      ORDER BY table_name;
    `);
    
    console.log('New tables created:');
    console.log(tablesResult.rows.map(row => `  ✅ ${row.table_name}`).join('\n'));
    
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await pool.end();
  }
}

applySchema();