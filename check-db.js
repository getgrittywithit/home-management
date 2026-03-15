const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vhqgzgqklwrjmglaezmh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocWd6Z3FrbHdyam1nbGFlem1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3Nzk5MDQsImV4cCI6MjA0OTM1NTkwNH0.Bl1sYCF8ILJOjEh6G4CxeOkD8qMXtRLHKJK-y5XJQFA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    // Get all table names
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
      
    if (tablesError) {
      console.log('Trying alternative method to check tables...');
      
      // Try a direct query to get table info
      const { data, error } = await supabase.rpc('get_table_info');
      if (error) {
        console.log('Database connection test...');
        const { data: testData, error: testError } = await supabase
          .from('pg_tables')
          .select('*')
          .eq('schemaname', 'public');
          
        if (testError) {
          console.error('Error connecting to database:', testError);
        } else {
          console.log('Connected! Tables found:');
          console.log(testData);
        }
      }
    } else {
      console.log('Tables in database:');
      console.log(tables);
      
      // For each table, get its structure
      for (const table of tables) {
        console.log(`\n--- Structure of ${table.table_name} ---`);
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', table.table_name)
          .eq('table_schema', 'public');
          
        if (!columnsError) {
          console.log(columns);
        }
        
        // Get a sample of data
        const { data: sample, error: sampleError } = await supabase
          .from(table.table_name)
          .select('*')
          .limit(3);
          
        if (!sampleError && sample.length > 0) {
          console.log('Sample data:');
          console.log(sample);
        }
      }
    }
  } catch (error) {
    console.error('Connection error:', error);
  }
}

checkDatabase();