-- Family Ops Greenhouse Playbook Database Schema
-- Building on existing profiles, chores, allowances tables

-- Extended profiles for family management
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dock_time TIME;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emoji TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_parent_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS screen_time_limit_minutes INTEGER DEFAULT 60;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pod_assignment TEXT; -- 'levi' or 'lola'

-- Family events (rides, appointments, activities)
CREATE TABLE IF NOT EXISTS family_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'activity', -- 'medical', 'activity', 'ride', 'social'
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    captain_id UUID REFERENCES profiles(id), -- assigned parent
    backup_id UUID REFERENCES profiles(id), -- backup parent
    location TEXT,
    contact_info TEXT,
    gear_needed TEXT,
    pharmacy TEXT,
    swap_flag BOOLEAN DEFAULT FALSE,
    swap_requested_at TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'moved'
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ride token tracking
CREATE TABLE IF NOT EXISTS ride_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES profiles(id) NOT NULL,
    date DATE NOT NULL,
    tokens_available INTEGER NOT NULL DEFAULT 1,
    tokens_used INTEGER DEFAULT 0,
    last_minute_penalty INTEGER DEFAULT 0, -- extra tokens for <24h requests
    week_start DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Token configuration per child
CREATE TABLE IF NOT EXISTS token_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
    mon_tokens INTEGER DEFAULT 1,
    tue_tokens INTEGER DEFAULT 1,
    wed_tokens INTEGER DEFAULT 1,
    thu_tokens INTEGER DEFAULT 1,
    fri_tokens INTEGER DEFAULT 2,
    sat_tokens INTEGER DEFAULT 2,
    sun_tokens INTEGER DEFAULT 2,
    weekly_max INTEGER DEFAULT 10,
    last_minute_cost INTEGER DEFAULT 1, -- extra tokens for <24h
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Credits system for rewards/consequences
CREATE TABLE IF NOT EXISTS credits_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES profiles(id) NOT NULL,
    amount INTEGER NOT NULL, -- positive for earned, negative for spent
    reason TEXT NOT NULL,
    awarded_by UUID REFERENCES profiles(id),
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Zone management system
CREATE TABLE IF NOT EXISTS zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    primary_assignee_id UUID REFERENCES profiles(id),
    buddy_id UUID REFERENCES profiles(id),
    cadence TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
    definition_of_done TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
    last_completed_at TIMESTAMPTZ,
    next_due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Zone completion tracking
CREATE TABLE IF NOT EXISTS zone_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zone_id UUID REFERENCES zones(id) NOT NULL,
    completed_by UUID REFERENCES profiles(id) NOT NULL,
    completion_date DATE NOT NULL,
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5), -- 1-5 scale
    photo_url TEXT,
    notes TEXT,
    verified_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pet care tracking
CREATE TABLE IF NOT EXISTS pets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'dog', 'cat', 'reptile', etc.
    primary_caretaker_id UUID REFERENCES profiles(id) NOT NULL,
    backup_caretaker_id UUID REFERENCES profiles(id),
    daily_tasks TEXT[],
    weekly_tasks TEXT[],
    monthly_tasks TEXT[],
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pet_care_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES pets(id) NOT NULL,
    caretaker_id UUID REFERENCES profiles(id) NOT NULL,
    task_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    task_description TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    failsafe_triggered BOOLEAN DEFAULT FALSE, -- true if backup had to do it
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Water jug system
CREATE TABLE IF NOT EXISTS water_jugs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jug_number INTEGER NOT NULL UNIQUE CHECK (jug_number >= 1 AND jug_number <= 6),
    status TEXT NOT NULL DEFAULT 'full', -- 'full', 'empty', 'in_use'
    last_filled_date DATE,
    last_sanitized_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    jugs_filled INTEGER NOT NULL,
    total_gallons INTEGER NOT NULL, -- jugs_filled * 5
    filled_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Money sprint tracking for plant business
CREATE TABLE IF NOT EXISTS money_sprints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    sprint_type TEXT NOT NULL, -- 'revenue', 'fulfill'
    target_amount DECIMAL(10,2),
    actual_amount DECIMAL(10,2) DEFAULT 0,
    items_listed INTEGER DEFAULT 0,
    items_potted INTEGER DEFAULT 0,
    items_photographed INTEGER DEFAULT 0,
    story_posted BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS money_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    channel TEXT NOT NULL, -- 'FB', 'IG', 'ND', etc.
    product TEXT NOT NULL,
    gross_amount DECIMAL(10,2) NOT NULL,
    fees DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- On-call rotation tracking
CREATE TABLE IF NOT EXISTS on_call_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    on_call_parent_id UUID REFERENCES profiles(id) NOT NULL,
    manually_set BOOLEAN DEFAULT FALSE, -- true if manually overridden
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Greenlights (daily permissions)
CREATE TABLE IF NOT EXISTS daily_greenlights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES profiles(id) NOT NULL,
    date DATE NOT NULL,
    approved_activities TEXT[], -- array of approved activities
    token_allowance INTEGER,
    special_notes TEXT,
    posted_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(child_id, date)
);

-- System configuration
CREATE TABLE IF NOT EXISTS family_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default configuration
INSERT INTO family_config (key, value, description) VALUES
('pickup_windows', '15,45', 'Pickup windows per hour'),
('jug_captain_id', '', 'UUID of current water jug captain'),
('announce_sprints', 'false', 'Whether to announce money sprints to family'),
('school_day_start', '08:00', 'School day start time'),
('school_day_end', '15:30', 'School day end time'),
('low_water_threshold', '2', 'Alert when jugs <= this number'),
('refill_windows', 'Tue 17:00-19:00,Fri 17:00-19:00', 'Water refill windows')
ON CONFLICT (key) DO NOTHING;

-- Views for easy data access
CREATE OR REPLACE VIEW tokens_available_today AS
SELECT 
    p.id as child_id,
    p.first_name,
    COALESCE(rt.tokens_available, tc.mon_tokens) as tokens_available,
    COALESCE(rt.tokens_used, 0) as tokens_used,
    (COALESCE(rt.tokens_available, tc.mon_tokens) - COALESCE(rt.tokens_used, 0)) as tokens_remaining
FROM profiles p
LEFT JOIN ride_tokens rt ON p.id = rt.child_id AND rt.date = CURRENT_DATE
LEFT JOIN token_config tc ON p.id = tc.child_id
WHERE p.role = 'child';

CREATE OR REPLACE VIEW water_status AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'full') as jugs_full,
    COUNT(*) FILTER (WHERE status = 'empty') as jugs_empty,
    COUNT(*) FILTER (WHERE status = 'in_use') as jugs_in_use,
    ROUND(COUNT(*) FILTER (WHERE status = 'full') * 2.5, 1) as estimated_days_left -- assuming 2 jugs per day usage
FROM water_jugs;

CREATE OR REPLACE VIEW daily_money_summary AS
SELECT 
    date,
    SUM(net_amount) as daily_total,
    COUNT(*) as transactions
FROM money_sales 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_events_child_date ON family_events(child_id, start_time);
CREATE INDEX IF NOT EXISTS idx_ride_tokens_child_date ON ride_tokens(child_id, date);
CREATE INDEX IF NOT EXISTS idx_zone_completions_date ON zone_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_pet_care_log_date ON pet_care_log(completed_at);
CREATE INDEX IF NOT EXISTS idx_money_sales_date ON money_sales(date);
CREATE INDEX IF NOT EXISTS idx_daily_greenlights_child_date ON daily_greenlights(child_id, date);