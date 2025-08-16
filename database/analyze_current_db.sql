-- Database Structure Analysis Script
-- Run this in Supabase SQL Editor to see current state

-- 1. List all tables
SELECT 
  'CURRENT TABLES:' as section;

SELECT 
  schemaname,
  tablename,
  tableowner,
  CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Check table structure for each table
SELECT 
  '-------------------' as separator,
  'TABLE STRUCTURES:' as section;

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. Check existing RLS policies
SELECT 
  '-------------------' as separator,
  'RLS POLICIES:' as section;

SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  CASE 
    WHEN qual = 'true' THEN '⚠️ WIDE OPEN' 
    ELSE 'Has restrictions' 
  END as access_level
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Security issues summary
SELECT 
  '-------------------' as separator,
  'SECURITY ANALYSIS:' as section;

-- Tables without RLS
SELECT 
  '❌ Tables without RLS:' as issue,
  string_agg(tablename, ', ') as affected
FROM pg_tables 
WHERE schemaname = 'public' 
  AND NOT rowsecurity
GROUP BY 1;

-- Tables without primary keys
SELECT 
  '❌ Tables without primary keys:' as issue,
  string_agg(t.table_name, ', ') as affected
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc
  ON t.table_name = tc.table_name
  AND tc.constraint_type = 'PRIMARY KEY'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND tc.constraint_name IS NULL
GROUP BY 1;

-- Wide open policies
SELECT 
  '⚠️ Policies allowing all access:' as issue,
  string_agg(tablename || '.' || policyname, ', ') as affected
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
GROUP BY 1;

-- 5. Existing indexes
SELECT 
  '-------------------' as separator,
  'INDEXES:' as section;

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Row counts
SELECT 
  '-------------------' as separator,
  'ROW COUNTS:' as section;

SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;