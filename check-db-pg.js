const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDatabase() {
  try {
    const client = await pool.connect();
    
    // Get all tables in public schema
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('=== EXISTING TABLES ===');
    console.log(tablesResult.rows.map(row => row.table_name));
    
    // For each table, get structure and sample data
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      console.log(`\n=== ${tableName.toUpperCase()} ===`);
      
      // Get columns
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position;
      `, [tableName]);
      
      console.log('Columns:');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
      
      // Get sample data
      try {
        const sampleResult = await client.query(`SELECT * FROM "${tableName}" LIMIT 3;`);
        if (sampleResult.rows.length > 0) {
          console.log('Sample data:');
          console.log(sampleResult.rows);
        } else {
          console.log('No data in table');
        }
      } catch (err) {
        console.log('Could not fetch sample data:', err.message);
      }
    }
    
    client.release();
    console.log('\n=== DATABASE ANALYSIS COMPLETE ===');
    
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await pool.end();
  }
}

checkDatabase();