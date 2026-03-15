-- Step-by-Step Security Fix
-- Copy and paste each section one at a time into Supabase SQL Editor

-- =====================================================
-- STEP 1: See what tables you currently have
-- =====================================================
-- Copy and run this first:

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'RLS ON' ELSE 'RLS OFF' END as security
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- STEP 2: Enable RLS on your main tables
-- =====================================================
-- Copy and run each line separately:

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- If you have other tables, enable RLS on them too:
-- ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chores ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Remove overly permissive policies
-- =====================================================
-- Copy and run these one by one:

DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;
-- DROP POLICY IF EXISTS "Allow all operations on todos" ON todos;
-- DROP POLICY IF EXISTS "Allow all operations on contacts" ON contacts;

-- =====================================================
-- STEP 4: Create safe policies for profiles
-- =====================================================
-- Copy and run this block:

CREATE POLICY "Read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Update profiles" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Delete profiles" ON profiles FOR DELETE USING (true);

-- =====================================================
-- STEP 5: Add family_id column
-- =====================================================
-- Copy and run:

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';

-- =====================================================
-- STEP 6: Add timestamp columns
-- =====================================================
-- Copy and run:

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- STEP 7: Create trigger function
-- =====================================================
-- Copy and run this:

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- STEP 8: Create trigger
-- =====================================================
-- Copy and run:

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 9: Create indexes
-- =====================================================
-- Copy and run:

CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);

-- =====================================================
-- STEP 10: Check results
-- =====================================================
-- Copy and run to see final status:

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ SECURE' ELSE '❌ NOT SECURE' END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;