-- Secure approach for adding new tables to your Supabase database
-- This follows security best practices

-- =====================================================
-- OPTION 1: Simple API Key Authentication
-- =====================================================
-- For a family app where all users are trusted
-- Uses service role key on backend only

-- First, update existing tables to add family context
ALTER TABLE todos ADD COLUMN IF NOT EXISTS family_id UUID DEFAULT 'moses-family-id';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS family_id UUID DEFAULT 'moses-family-id';

-- Create new tables with built-in security
CREATE TABLE IF NOT EXISTS food_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID DEFAULT 'moses-family-id',
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

-- Enable RLS
ALTER TABLE food_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies that use service role key
CREATE POLICY "Service role can do everything" ON food_inventory
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- For anon/authenticated access (if using Supabase Auth later)
CREATE POLICY "Authenticated users can view food inventory" ON food_inventory
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- =====================================================
-- OPTION 2: Family-based access (Recommended)
-- =====================================================
-- Better approach using a families table

-- Create families table
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  access_code TEXT UNIQUE, -- Simple access code for the family
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create family_members junction table
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT CHECK (role IN ('parent', 'child')) DEFAULT 'parent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(family_id, user_email)
);

-- Update tables to reference families
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE todos ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE food_inventory ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

-- Enable RLS on family tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Family-based policies
CREATE POLICY "Users can view their family" ON families
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Users can view their family members" ON family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm2
      WHERE fm2.family_id = family_members.family_id 
      AND fm2.user_email = auth.jwt()->>'email'
    )
  );

-- Apply family-based policies to data tables
CREATE POLICY "Users can manage their family todos" ON todos
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Users can manage their family contacts" ON contacts
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Users can manage their family food inventory" ON food_inventory
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_email = auth.jwt()->>'email'
    )
  );

-- =====================================================
-- OPTION 3: Simplified approach for your use case
-- =====================================================
-- Since this is a family app with trusted users
-- Use API key authentication with simple checks

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on todos" ON todos;
DROP POLICY IF EXISTS "Allow all operations on contacts" ON contacts;
DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;

-- Create environment-based policies
-- These check for a valid API key in the request
CREATE POLICY "Valid API key required for todos" ON todos
  FOR ALL 
  USING (
    current_setting('request.headers', true)::json->>'apikey' = 
    current_setting('app.settings.api_key', true)
  );

CREATE POLICY "Valid API key required for contacts" ON contacts
  FOR ALL 
  USING (
    current_setting('request.headers', true)::json->>'apikey' = 
    current_setting('app.settings.api_key', true)
  );

-- =====================================================
-- Recommended approach for your app
-- =====================================================

/*
For your family management app, I recommend:

1. Use Supabase Auth with a simple email/password setup
2. Create one family account that all family members share
3. Use RLS policies that check for authenticated users
4. Store the family_id in localStorage after first login
5. All queries automatically filter by family_id

This gives you:
- Security (RLS enabled, no wide-open access)
- Simplicity (one shared account)
- Flexibility (can add individual accounts later)
- Performance (proper indexes on family_id)
*/

-- Final setup for recommended approach:
INSERT INTO families (id, name, access_code) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Moses Family', 'moses2024')
ON CONFLICT DO NOTHING;

-- Update all existing data to belong to this family
UPDATE profiles SET family_id = '11111111-1111-1111-1111-111111111111' WHERE family_id IS NULL;
UPDATE todos SET family_id = '11111111-1111-1111-1111-111111111111' WHERE family_id IS NULL;
UPDATE contacts SET family_id = '11111111-1111-1111-1111-111111111111' WHERE family_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_todos_family_id ON todos(family_id);
CREATE INDEX IF NOT EXISTS idx_contacts_family_id ON contacts(family_id);
CREATE INDEX IF NOT EXISTS idx_food_inventory_family_id ON food_inventory(family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_todos_family_status ON todos(family_id, status);
CREATE INDEX IF NOT EXISTS idx_food_inventory_family_location ON food_inventory(family_id, location);
CREATE INDEX IF NOT EXISTS idx_contacts_family_org ON contacts(family_id, organization);