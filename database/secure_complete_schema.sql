-- Secure Complete Schema for Home Management System
-- This version includes all security best practices
-- Run AFTER immediate_security_fix.sql

-- =====================================================
-- New Tables with Security Built-In
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Todos table (if not exists, otherwise skip)
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id TEXT DEFAULT 'moses-family',
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  category VARCHAR(50) DEFAULT 'general',
  assigned_to TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table (if not exists)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id TEXT DEFAULT 'moses-family',
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organization TEXT,
  role TEXT,
  address TEXT,
  notes TEXT,
  tags TEXT[],
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Food Inventory table
CREATE TABLE IF NOT EXISTS food_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Chat History table  
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id TEXT DEFAULT 'moses-family',
  session_id TEXT NOT NULL,
  role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Enable RLS on all new tables
-- =====================================================

ALTER TABLE food_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS Policies for new tables
-- =====================================================

-- Food Inventory policies
CREATE POLICY "Enable all operations for food_inventory" ON food_inventory
  FOR ALL USING (true);

-- Meal Plans policies  
CREATE POLICY "Enable all operations for meal_plans" ON meal_plans
  FOR ALL USING (true);

-- Documents policies
CREATE POLICY "Enable all operations for documents" ON documents
  FOR ALL USING (true);

-- Chat History policies
CREATE POLICY "Enable all operations for chat_history" ON chat_history
  FOR ALL USING (true);

-- =====================================================
-- Create Indexes for Performance
-- =====================================================

-- Todos indexes
CREATE INDEX IF NOT EXISTS idx_todos_family_status ON todos(family_id, status);
CREATE INDEX IF NOT EXISTS idx_todos_family_created ON todos(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to ON todos(assigned_to) WHERE assigned_to IS NOT NULL;

-- Contacts indexes  
CREATE INDEX IF NOT EXISTS idx_contacts_family_name ON contacts(family_id, name);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

-- Food Inventory indexes
CREATE INDEX IF NOT EXISTS idx_food_inventory_family_location ON food_inventory(family_id, location);
CREATE INDEX IF NOT EXISTS idx_food_inventory_family_category ON food_inventory(family_id, category);
CREATE INDEX IF NOT EXISTS idx_food_inventory_expiration ON food_inventory(expiration_date) WHERE expiration_date IS NOT NULL;

-- Meal Plans indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_family_date ON meal_plans(family_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_type ON meal_plans(meal_type);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_family_folder ON documents(family_id, folder);
CREATE INDEX IF NOT EXISTS idx_documents_processed ON documents(processed);

-- Chat History indexes
CREATE INDEX IF NOT EXISTS idx_chat_history_family_session ON chat_history(family_id, session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created ON chat_history(created_at DESC);

-- =====================================================
-- Create Update Triggers for new tables
-- =====================================================

-- Apply update trigger to new tables
CREATE TRIGGER update_food_inventory_updated_at BEFORE UPDATE ON food_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Create completed_at trigger for todos
-- =====================================================

CREATE OR REPLACE FUNCTION set_todo_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_todo_completed_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION set_todo_completed_at();

-- =====================================================
-- Insert default family members
-- =====================================================

INSERT INTO profiles (email, first_name, role, family_id) VALUES
  ('levi@family.com', 'Levi', 'parent', 'moses-family'),
  ('lola@family.com', 'Lola', 'parent', 'moses-family'),
  ('amos@family.com', 'Amos', 'child', 'moses-family'),
  ('zoey@family.com', 'Zoey', 'child', 'moses-family'),
  ('kaylee@family.com', 'Kaylee', 'child', 'moses-family'),
  ('ellie@family.com', 'Ellie', 'child', 'moses-family'),
  ('wyatt@family.com', 'Wyatt', 'child', 'moses-family'),
  ('hannah@family.com', 'Hannah', 'child', 'moses-family')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- Status Report
-- =====================================================

SELECT 'SCHEMA CREATION COMPLETE!' as status;

-- Show what was created
SELECT 
  'Tables Created' as category,
  COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Indexes Created' as category,
  COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'RLS Policies Created' as category,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public';

-- =====================================================
-- Connection Configuration
-- =====================================================

SELECT '';
SELECT 'Add these to your .env.local file:' as config;
SELECT 'NEXT_PUBLIC_SUPABASE_URL=https://vhqgzgqklwrjmglaezmh.supabase.co' as env1;
SELECT 'NEXT_PUBLIC_SUPABASE_ANON_KEY=(get from Supabase dashboard)' as env2;
SELECT 'DATABASE_URL=postgresql://postgres.vhqgzgqklwrjmglaezmh:[PASSWORD]@aws-0-us-east-2.pooler.supabase.com:5432/postgres' as env3;