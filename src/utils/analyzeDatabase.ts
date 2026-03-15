import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const { Pool } = pg

// Use the provided connection string
const connectionString = 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres'

export async function analyzeDatabaseStructure() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔍 Analyzing Database Structure...\n')

    // 1. List all tables
    const tablesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables 
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename;
    `)
    
    console.log('📊 Existing Tables:')
    console.table(tablesResult.rows)

    // 2. Check for RLS (Row Level Security) status
    const rlsResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `)
    
    console.log('\n🔒 Row Level Security Status:')
    console.table(rlsResult.rows)

    // 3. List all columns for public tables
    const columnsResult = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `)
    
    console.log('\n📋 Table Columns:')
    const tableColumns: Record<string, any[]> = {}
    columnsResult.rows.forEach(col => {
      if (!tableColumns[col.table_name]) {
        tableColumns[col.table_name] = []
      }
      tableColumns[col.table_name].push({
        column: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable,
        default: col.column_default
      })
    })
    
    Object.entries(tableColumns).forEach(([table, columns]) => {
      console.log(`\n  Table: ${table}`)
      console.table(columns)
    })

    // 4. Check indexes
    const indexesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `)
    
    console.log('\n🔍 Indexes:')
    console.table(indexesResult.rows.map(idx => ({
      table: idx.tablename,
      index: idx.indexname,
      definition: idx.indexdef.substring(0, 60) + '...'
    })))

    // 5. Check constraints
    const constraintsResult = await pool.query(`
      SELECT 
        conname AS constraint_name,
        conrelid::regclass AS table_name,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace
      ORDER BY conrelid::regclass::text, conname;
    `)
    
    console.log('\n🔗 Constraints:')
    console.table(constraintsResult.rows)

    // 6. Check for exposed functions
    const functionsResult = await pool.query(`
      SELECT 
        proname AS function_name,
        pronargs AS num_args
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY proname;
    `)
    
    console.log('\n⚡ Public Functions:')
    console.table(functionsResult.rows)

    // 7. Check RLS policies
    const policiesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `)
    
    console.log('\n🛡️ RLS Policies:')
    if (policiesResult.rows.length === 0) {
      console.log('  ⚠️  No RLS policies found! This is a security risk.')
    } else {
      console.table(policiesResult.rows.map(p => ({
        table: p.tablename,
        policy: p.policyname,
        command: p.cmd,
        permissive: p.permissive,
        roles: p.roles
      })))
    }

    // 8. Check for common security issues
    console.log('\n⚠️  Security Analysis:')
    
    // Check for tables without RLS
    const tablesWithoutRLS = rlsResult.rows.filter(t => !t.rowsecurity)
    if (tablesWithoutRLS.length > 0) {
      console.log(`\n  ❌ Tables without RLS enabled: ${tablesWithoutRLS.map(t => t.tablename).join(', ')}`)
    }

    // Check for wide-open permissions
    const wideOpenPolicies = policiesResult.rows.filter(p => 
      p.qual === 'true' || p.with_check === 'true'
    )
    if (wideOpenPolicies.length > 0) {
      console.log(`\n  ❌ Policies with unrestricted access: ${wideOpenPolicies.map(p => `${p.tablename}.${p.policyname}`).join(', ')}`)
    }

    // Check for missing primary keys
    const primaryKeysResult = await pool.query(`
      SELECT 
        t.table_name
      FROM information_schema.tables t
      LEFT JOIN information_schema.table_constraints tc
        ON t.table_name = tc.table_name
        AND tc.constraint_type = 'PRIMARY KEY'
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND tc.constraint_name IS NULL;
    `)
    
    if (primaryKeysResult.rows.length > 0) {
      console.log(`\n  ❌ Tables without primary keys: ${primaryKeysResult.rows.map(r => r.table_name).join(', ')}`)
    }

    return {
      tables: tablesResult.rows,
      rlsStatus: rlsResult.rows,
      columns: tableColumns,
      indexes: indexesResult.rows,
      constraints: constraintsResult.rows,
      functions: functionsResult.rows,
      policies: policiesResult.rows,
      securityIssues: {
        tablesWithoutRLS,
        wideOpenPolicies,
        tablesWithoutPrimaryKeys: primaryKeysResult.rows
      }
    }

  } catch (error) {
    console.error('Error analyzing database:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the analysis
if (require.main === module) {
  analyzeDatabaseStructure()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}