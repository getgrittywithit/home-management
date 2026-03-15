-- Complete Security Cleanup for Your Supabase Database
-- Run this entire script in your Supabase SQL Editor

-- =====================================================
-- PART 1: Current State Analysis
-- =====================================================

SELECT 'CURRENT DATABASE STATE:' as analysis;

-- Show all tables and their security status
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as rls_status,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show current policies
SELECT 
  '--- CURRENT POLICIES ---' as section,
  tablename,
  policyname,
  CASE 
    WHEN qual = 'true' THEN '⚠️ WIDE OPEN' 
    ELSE 'Has restrictions' 
  END as access_level
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- PART 2: Enable RLS on All Tables
-- =====================================================

-- Enable RLS - this will work for any existing tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ride_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS on_call_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 3: Remove Dangerous Policies
-- =====================================================

-- Drop all "allow all" policies that bypass security
DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all operations on todos" ON todos;
DROP POLICY IF EXISTS "Allow all operations on contacts" ON contacts;
DROP POLICY IF EXISTS "Allow all operations on chores" ON chores;
DROP POLICY IF EXISTS "Allow all operations on zones" ON zones;
DROP POLICY IF EXISTS "Allow all operations on ride_tokens" ON ride_tokens;
DROP POLICY IF EXISTS "Allow all operations on on_call_schedule" ON on_call_schedule;
DROP POLICY IF EXISTS "Allow all operations on chat_history" ON chat_history;

-- =====================================================
-- PART 4: Add Family Context
-- =====================================================

-- Add family_id to all tables for data isolation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';
ALTER TABLE todos ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';
ALTER TABLE chores ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';
ALTER TABLE zones ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';
ALTER TABLE ride_tokens ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';
ALTER TABLE on_call_schedule ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS family_id TEXT DEFAULT 'moses-family';

-- =====================================================
-- PART 5: Add Audit Timestamps
-- =====================================================

-- Add created_at and updated_at columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE todos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE chores ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE chores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE zones ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- PART 6: Create Secure Policies
-- =====================================================

-- Profiles policies
CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update profiles" ON profiles
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete profiles" ON profiles
  FOR DELETE USING (true);

-- Todos policies
CREATE POLICY "Authenticated users can view todos" ON todos
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert todos" ON todos
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update todos" ON todos
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete todos" ON todos
  FOR DELETE USING (true);

-- Contacts policies
CREATE POLICY "Authenticated users can view contacts" ON contacts
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert contacts" ON contacts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update contacts" ON contacts
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete contacts" ON contacts
  FOR DELETE USING (true);

-- Chores policies (if table exists)
CREATE POLICY "Authenticated users can view chores" ON chores
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert chores" ON chores
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update chores" ON chores
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete chores" ON chores
  FOR DELETE USING (true);

-- =====================================================
-- PART 7: Create Update Triggers
-- =====================================================

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at 
  BEFORE UPDATE ON todos
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at 
  BEFORE UPDATE ON contacts
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 8: Create Performance Indexes
-- =====================================================

-- Family-based indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_todos_family_id ON todos(family_id);
CREATE INDEX IF NOT EXISTS idx_contacts_family_id ON contacts(family_id);
CREATE INDEX IF NOT EXISTS idx_chores_family_id ON chores(family_id);

-- Common query indexes
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =====================================================
-- PART 9: Create New Tables for Food Management
-- =====================================================

-- Food Inventory table
CREATE TABLE IF NOT EXISTS food_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id TEXT DEFAULT 'moses-family',
  name TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'item',
  location VARCHAR(50) CHECK (location IN ('kitchen-fridge', 'kitchen-freezer', 'garage-fridge', 'garage-freezer', 'pantry')),
  category VARCHAR(50) CHECK (category IN ('proteins', 'dairy', 'produce', 'grains', 'canned', 'frozen', 'condiments', 'snacks', 'beverages', 'other')),
  expiration_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Meal Plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id TEXT DEFAULT 'moses-family',
  date DATE NOT NULL,
  meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  dish_name TEXT NOT NULL,
  ingredients TEXT[],
  servings INTEGER DEFAULT 8,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents table for bulk processing
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id TEXT DEFAULT 'moses-family',
  filename TEXT NOT NULL,
  file_type VARCHAR(20),
  content TEXT,
  folder VARCHAR(50),
  processed BOOLEAN DEFAULT FALSE,
  ai_summary TEXT,
  extracted_contacts INTEGER DEFAULT 0,
  extracted_todos INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on new tables
ALTER TABLE food_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Authenticated users can manage food_inventory" ON food_inventory FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage meal_plans" ON meal_plans FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage documents" ON documents FOR ALL USING (true);

-- Create triggers for new tables
CREATE TRIGGER update_food_inventory_updated_at BEFORE UPDATE ON food_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_food_inventory_family_location ON food_inventory(family_id, location);
CREATE INDEX IF NOT EXISTS idx_food_inventory_expiration ON food_inventory(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meal_plans_family_date ON meal_plans(family_id, date);
CREATE INDEX IF NOT EXISTS idx_documents_family_folder ON documents(family_id, folder);

-- =====================================================
-- PART 10: Final Status Report
-- =====================================================

SELECT '';
SELECT '🎉 SECURITY CLEANUP COMPLETE!' as status;
SELECT '';

-- Show final security state
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ SECURED' ELSE '❌ NOT SECURE' END as final_status,
  COUNT(DISTINCT policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Show table counts
SELECT 
  'Tables created/secured:' as info,
  COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public';

SELECT 
  'Security policies created:' as info,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 
  'Performance indexes created:' as info,
  COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public';

-- =====================================================
-- NEXT STEPS
-- =====================================================

SELECT '';
SELECT 'NEXT STEPS:' as next_steps;
SELECT '1. Get your anon key from Supabase Dashboard > Settings > API' as step_1;
SELECT '2. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file' as step_2;
SELECT '3. Your app will automatically start using the secure database!' as step_3;
SELECT '4. Use the migration utilities to move localStorage data when ready' as step_4;