-- Database schema for AI Family Assistant integration
-- Run these commands in your Supabase SQL editor

-- Todos table
CREATE TABLE IF NOT EXISTS todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    category VARCHAR(50) DEFAULT 'general',
    assigned_to VARCHAR(100),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    organization VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    office VARCHAR(100),
    notes TEXT,
    tags JSONB DEFAULT '[]',
    importance VARCHAR(10) DEFAULT 'medium' CHECK (importance IN ('high', 'medium', 'low')),
    last_contact TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) DEFAULT 'default',
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to ON todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);

CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON contacts(organization);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_todo_completed_at BEFORE UPDATE ON todos 
    FOR EACH ROW EXECUTE FUNCTION set_completed_at();

-- Row Level Security (RLS) policies
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed for your auth setup)
CREATE POLICY "Allow all for authenticated users" ON todos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON contacts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON chat_history FOR ALL TO authenticated USING (true);

-- Insert some sample data to test
INSERT INTO todos (content, priority, category, assigned_to) VALUES
('Test AI integration - this should show up in TodoTab', 'high', 'development', 'Levi'),
('Sample family todo from AI assistant', 'medium', 'family', 'Parents');

INSERT INTO contacts (name, title, organization, email, phone, tags, importance) VALUES
('AI Test Contact', 'Test Role', 'Test Organization', 'test@example.com', '(555) 123-4567', '["AI Generated", "Test"]', 'medium');