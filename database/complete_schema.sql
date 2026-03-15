-- Complete Supabase Schema for Home Management System
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (for family members)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  role TEXT CHECK (role IN ('parent', 'child')),
  avatar_url TEXT,
  birth_date DATE,
  grade TEXT,
  school TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Todos table
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  category VARCHAR(50) DEFAULT 'general',
  assigned_to TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  source TEXT, -- Where the todo came from (e.g., which document)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES profiles(id)
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organization TEXT,
  role TEXT,
  address TEXT,
  notes TEXT,
  tags TEXT[], -- Array of tags like ['teacher', '4th-grade', 'kaylee']
  source TEXT, -- Where contact came from
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Food Inventory table
CREATE TABLE IF NOT EXISTS food_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  date DATE NOT NULL,
  meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  dish_name TEXT NOT NULL,
  ingredients TEXT[], -- Array of ingredients
  servings INTEGER DEFAULT 8,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents table (for bulk document processing)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  file_type VARCHAR(20),
  content TEXT,
  folder VARCHAR(50), -- Which student folder it's filed under
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
  session_id TEXT NOT NULL,
  role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_assigned ON todos(assigned_to);
CREATE INDEX idx_todos_created ON todos(created_at DESC);

CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_org ON contacts(organization);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);

CREATE INDEX idx_food_inventory_location ON food_inventory(location);
CREATE INDEX idx_food_inventory_category ON food_inventory(category);
CREATE INDEX idx_food_inventory_expiration ON food_inventory(expiration_date);

CREATE INDEX idx_meal_plans_date ON meal_plans(date);
CREATE INDEX idx_meal_plans_meal_type ON meal_plans(meal_type);

CREATE INDEX idx_documents_folder ON documents(folder);
CREATE INDEX idx_documents_processed ON documents(processed);

CREATE INDEX idx_chat_history_session ON chat_history(session_id);
CREATE INDEX idx_chat_history_created ON chat_history(created_at DESC);

-- Triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_inventory_updated_at BEFORE UPDATE ON food_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set completed_at when todo status changes to completed
CREATE OR REPLACE FUNCTION set_todo_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_todo_completed_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION set_todo_completed_at();

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you can tighten this later with auth)
CREATE POLICY "Allow all operations on profiles" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on todos" ON todos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on contacts" ON contacts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on food_inventory" ON food_inventory
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on meal_plans" ON meal_plans
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on documents" ON documents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on chat_history" ON chat_history
  FOR ALL USING (true) WITH CHECK (true);

-- Insert initial family members
INSERT INTO profiles (email, first_name, role) VALUES
  ('levi@family.com', 'Levi', 'parent'),
  ('lola@family.com', 'Lola', 'parent'),
  ('amos@family.com', 'Amos', 'child'),
  ('zoey@family.com', 'Zoey', 'child'),
  ('kaylee@family.com', 'Kaylee', 'child'),
  ('ellie@family.com', 'Ellie', 'child'),
  ('wyatt@family.com', 'Wyatt', 'child'),
  ('hannah@family.com', 'Hannah', 'child')
ON CONFLICT (email) DO NOTHING;