-- Weekly Checklist Tables for Supabase

-- Table for checklist item templates
CREATE TABLE IF NOT EXISTS weekly_checklist_items (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  category VARCHAR NOT NULL CHECK (category IN ('personal', 'business')),
  subcategory VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  requires_daily BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking daily completions
CREATE TABLE IF NOT EXISTS weekly_checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  item_id VARCHAR NOT NULL REFERENCES weekly_checklist_items(id) ON DELETE CASCADE,
  week_year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id, week_year, week_number, day_of_week)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_checklist_items_user_category 
ON weekly_checklist_items(user_id, category);

CREATE INDEX IF NOT EXISTS idx_weekly_checklist_completions_user_week 
ON weekly_checklist_completions(user_id, week_year, week_number);

CREATE INDEX IF NOT EXISTS idx_weekly_checklist_completions_item 
ON weekly_checklist_completions(item_id);

-- RLS Policies (if using Row Level Security)
ALTER TABLE weekly_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checklist_completions ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to manage their own checklist items
CREATE POLICY IF NOT EXISTS "Users can manage their own checklist items" 
ON weekly_checklist_items FOR ALL 
USING (true);

-- Policy to allow users to manage their own completions
CREATE POLICY IF NOT EXISTS "Users can manage their own completions" 
ON weekly_checklist_completions FOR ALL 
USING (true);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_weekly_checklist_items_updated_at 
BEFORE UPDATE ON weekly_checklist_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_checklist_completions_updated_at 
BEFORE UPDATE ON weekly_checklist_completions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();