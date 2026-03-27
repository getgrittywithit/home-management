-- Phase O: Special Ed, School Contacts Upgrade & Public School Makeup
-- Created: 2026-03-27

-- ══════════════════════════════════════════════
-- 1. Add phone fields to existing school contacts
-- ══════════════════════════════════════════════
ALTER TABLE kid_school_contacts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE kid_school_contacts ADD COLUMN IF NOT EXISTS phone_ext TEXT;

-- ══════════════════════════════════════════════
-- 2. Multiple special contacts per kid
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kid_special_contacts (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  role TEXT NOT NULL,
  role_label TEXT,
  email TEXT,
  phone TEXT,
  phone_ext TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 3. Special ed plans
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kid_special_ed_plans (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  start_date DATE,
  review_date DATE,
  next_meeting_date TIMESTAMPTZ,
  next_meeting_time TEXT,
  next_meeting_location TEXT,
  meeting_confirmed BOOLEAN DEFAULT FALSE,
  accommodations JSONB DEFAULT '[]',
  goals JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 4. Special ed meeting log
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kid_special_ed_meetings (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  plan_id INT REFERENCES kid_special_ed_plans(id) ON DELETE SET NULL,
  meeting_date DATE NOT NULL,
  meeting_time TEXT,
  meeting_type TEXT,
  location TEXT,
  attendees TEXT,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 5. School documents metadata
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kid_school_documents (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  doc_name TEXT NOT NULL,
  academic_year TEXT,
  upload_date DATE DEFAULT CURRENT_DATE,
  file_path TEXT,
  file_size_kb INT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 6. A/B day schedule
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kid_ab_schedule (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  date DATE NOT NULL,
  day_type CHAR(1) NOT NULL,
  UNIQUE(kid_name, date)
);

-- ══════════════════════════════════════════════
-- 7. Public school makeup work
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kid_public_makeup (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  sick_date DATE NOT NULL,
  ab_day CHAR(1),
  subject TEXT,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 8. Pre-seed contacts
-- ══════════════════════════════════════════════
INSERT INTO kid_special_contacts (kid_name, contact_name, role, role_label, email, phone) VALUES
  ('zoey', 'Cynthia Turner', 'attendance_secretary', 'Attendance Secretary', 'Cynthia.Turner@boerneisd.net', '830-357-2606'),
  ('zoey', 'Susan Collentine Ed.D.', '504_facilitator', '504 Facilitator', 'Susan.Collentine@boerneisd.net', '830-357-2721')
ON CONFLICT DO NOTHING;

INSERT INTO kid_special_contacts (kid_name, contact_name, role, role_label, email, phone, phone_ext) VALUES
  ('kaylee', 'Christine Siemens', 'attendance_secretary', 'Attendance Secretary', NULL, '830-357-3100', NULL),
  ('kaylee', 'Emily Jackson', 'ard_coordinator', 'ARD Facilitator', 'Emily.Jackson@boerneisd.net', '830-357-3100', '3159')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════
-- 9. Pre-seed plans
-- ══════════════════════════════════════════════
INSERT INTO kid_special_ed_plans
  (kid_name, plan_type, status, next_meeting_date, next_meeting_time, next_meeting_location, meeting_confirmed, notes)
VALUES
  ('zoey', '504', 'active', '2026-04-09', '1:50 PM',
   'CHS Counseling Center — Dr. Collentine''s office',
   FALSE,
   'Annual 504 review. Contact: Susan Collentine Ed.D. (Susan.Collentine@boerneisd.net / 830-357-2721). Reply to her email to confirm attendance or provide phone number for call-in.');

INSERT INTO kid_special_ed_plans
  (kid_name, plan_type, status, review_date, notes)
VALUES
  ('kaylee', 'IEP', 'active', '2026-02-27',
   'Annual ARD completed Feb 27, 2026. ARD Facilitator: Emily Jackson (Emily.Jackson@boerneisd.net / 830-357-3100 x3159). Updated IEP document on file.');

-- Log Kaylee's completed ARD meeting
INSERT INTO kid_special_ed_meetings (kid_name, plan_id, meeting_date, meeting_type, outcome, notes)
SELECT 'kaylee', id, '2026-02-27', 'annual_review', 'IEP renewed', 'Annual ARD completed. Emily Jackson facilitated.'
FROM kid_special_ed_plans WHERE kid_name = 'kaylee' AND plan_type = 'IEP' LIMIT 1;
