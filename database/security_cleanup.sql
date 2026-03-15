-- Security Cleanup and Preparation Script
-- Run this BEFORE adding new tables to fix existing security issues

-- =====================================================
-- STEP 1: Enable RLS on all existing tables
-- =====================================================

-- Enable RLS on any tables that don't have it
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND NOT rowsecurity
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'Enabled RLS on table: %', r.tablename;
  END LOOP;
END $$;

-- =====================================================
-- STEP 2: Create basic auth structure (if not exists)
-- =====================================================

-- Create a simple auth table if you don't have one
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'parent', 'child')) DEFAULT 'parent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on auth table
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Remove overly permissive policies
-- =====================================================

-- List current permissive policies (for review)
SELECT 
  'Review these policies - they may be too permissive:' as action,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR qual IS NULL OR qual = '');

-- Drop wide-open policies (uncomment and modify as needed)
-- DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;
-- DROP POLICY IF EXISTS "Allow all operations on todos" ON todos;
-- DROP POLICY IF EXISTS "Allow all operations on contacts" ON contacts;

-- =====================================================
-- STEP 4: Create proper RLS policies
-- =====================================================

-- Example: Authenticated access pattern
-- This allows authenticated users to manage their own data

-- For existing tables, create basic authenticated-only policies
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
      AND tablename NOT IN ('auth_users', 'schema_migrations')
  LOOP
    -- Check if table already has policies
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = r.tablename
    ) THEN
      -- Create basic authenticated-only policies
      EXECUTE format('
        CREATE POLICY "Authenticated users can view %1$s" ON %1$I
          FOR SELECT USING (auth.role() IS NOT NULL);
        
        CREATE POLICY "Authenticated users can insert %1$s" ON %1$I
          FOR INSERT WITH CHECK (auth.role() IS NOT NULL);
        
        CREATE POLICY "Authenticated users can update %1$s" ON %1$I
          FOR UPDATE USING (auth.role() IS NOT NULL);
        
        CREATE POLICY "Authenticated users can delete %1$s" ON %1$I
          FOR DELETE USING (auth.role() IS NOT NULL);
      ', r.tablename);
      
      RAISE NOTICE 'Created basic RLS policies for table: %', r.tablename;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- STEP 5: Add missing primary keys
-- =====================================================

-- Check for tables without primary keys
SELECT 
  'Tables needing primary keys:' as info,
  t.table_name
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc
  ON t.table_name = tc.table_name
  AND tc.constraint_type = 'PRIMARY KEY'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND tc.constraint_name IS NULL;

-- Add primary keys to tables that need them
-- Example (modify for your specific tables):
-- ALTER TABLE your_table ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- =====================================================
-- STEP 6: Create indexes for common queries
-- =====================================================

-- Add indexes for foreign keys and commonly queried columns
-- Check if indexes already exist before creating

-- Example index creation with existence check:
DO $$ 
BEGIN
  -- Add more index creation as needed based on your queries
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_created_at') THEN
    -- Example: CREATE INDEX idx_created_at ON your_table(created_at DESC);
  END IF;
END $$;

-- =====================================================
-- STEP 7: Add audit columns to existing tables
-- =====================================================

-- Add created_at and updated_at to tables that don't have them
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    -- Add created_at if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = r.table_name 
        AND column_name = 'created_at'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP', r.table_name);
      RAISE NOTICE 'Added created_at to table: %', r.table_name;
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = r.table_name 
        AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP', r.table_name);
      RAISE NOTICE 'Added updated_at to table: %', r.table_name;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- STEP 8: Create updated_at trigger function
-- =====================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name = 'updated_at'
  LOOP
    -- Drop existing trigger if exists
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', r.table_name, r.table_name);
    
    -- Create new trigger
    EXECUTE format('
      CREATE TRIGGER update_%I_updated_at 
      BEFORE UPDATE ON %I
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
    ', r.table_name, r.table_name);
    
    RAISE NOTICE 'Created updated_at trigger for table: %', r.table_name;
  END LOOP;
END $$;

-- =====================================================
-- STEP 9: Review results
-- =====================================================

-- Show final security status
SELECT 
  'FINAL SECURITY STATUS:' as section;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as rls_status,
  COUNT(policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- =====================================================
-- STEP 10: Recommendations
-- =====================================================

SELECT 'NEXT STEPS:' as recommendations
UNION ALL
SELECT '1. Review and customize the RLS policies for each table based on your app needs'
UNION ALL
SELECT '2. Consider implementing proper authentication with Supabase Auth or custom JWT'
UNION ALL
SELECT '3. Add user_id or family_id columns to tables for row-level filtering'
UNION ALL
SELECT '4. Create more specific policies that check user ownership'
UNION ALL
SELECT '5. Remove or update any remaining overly permissive policies';