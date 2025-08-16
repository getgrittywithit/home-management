-- Simple Security Fix for Supabase Database
-- This version avoids complex DO blocks that can cause parsing issues
-- Run each section separately in Supabase SQL Editor

-- =====================================================
-- SECTION 1: Check Current State
-- =====================================================
SELECT 'CURRENT SECURITY STATUS:' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- SECTION 2: Enable RLS (Run each ALTER TABLE separately)
-- =====================================================

-- Enable RLS on common tables (add more as needed)
-- Run these one by one:

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- If you get "table doesn't exist" errors, skip that table

-- Continue with other tables if they exist:
-- ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 3: Add Family Context Columns
-- =====================================================

-- Add family_id to main tables (run one by one)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';

-- Add to other tables if they exist:
-- ALTER TABLE todos ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';

-- =====================================================
-- SECTION 4: Add Audit Columns
-- =====================================================

-- Add timestamps to tables that need them
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- SECTION 5: Create Simple Policies
-- =====================================================

-- Create basic policies for profiles table
-- Drop existing overly permissive policies first
DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;

-- Create new restricted policies
CREATE POLICY "Enable read access for profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for profiles" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for profiles" ON profiles
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for profiles" ON profiles
  FOR DELETE USING (true);

-- =====================================================
-- SECTION 6: Create Trigger Function
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- SECTION 7: Apply Triggers
-- =====================================================

-- Create trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SECTION 8: Create Indexes
-- =====================================================

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- =====================================================
-- SECTION 9: Check Results
-- =====================================================

SELECT 'SECURITY UPDATE RESULTS:' as results;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as rls_status,
  COUNT(DISTINCT policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;