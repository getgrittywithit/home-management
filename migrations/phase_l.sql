CREATE TABLE IF NOT EXISTS kid_attendance (id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, attendance_date DATE NOT NULL, status TEXT NOT NULL DEFAULT 'present', notes TEXT, source TEXT DEFAULT 'manual', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (kid_name, attendance_date));
CREATE INDEX IF NOT EXISTS idx_attendance_kid_date ON kid_attendance(kid_name, attendance_date DESC);
CREATE TABLE IF NOT EXISTS kid_makeup_work (id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, sick_date DATE NOT NULL, subject TEXT NOT NULL, description TEXT, due_date DATE NOT NULL, status TEXT NOT NULL DEFAULT 'assigned', completed_date DATE, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_makeup_kid ON kid_makeup_work(kid_name, due_date ASC);
CREATE TABLE IF NOT EXISTS kid_subject_progress (id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, subject TEXT NOT NULL, current_level TEXT, notes TEXT, last_assessment TEXT, updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (kid_name, subject));
CREATE TABLE IF NOT EXISTS kid_life_skills_log (id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, skill TEXT NOT NULL, category TEXT DEFAULT 'Life Skills', date_achieved DATE NOT NULL DEFAULT CURRENT_DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_life_skills_kid ON kid_life_skills_log(kid_name, date_achieved DESC);
CREATE TABLE IF NOT EXISTS kid_excuse_letters (id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, sick_date DATE NOT NULL, letter_body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', school_name TEXT, school_email TEXT, sent_date DATE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_excuse_letters_kid ON kid_excuse_letters(kid_name, sick_date DESC);
CREATE TABLE IF NOT EXISTS kid_school_contacts (id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL UNIQUE, school_name TEXT, school_email TEXT, attendance_contact TEXT, teacher_name TEXT, teacher_email TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
-- kid_sick_days already exists from Phase B (reason, severity, saw_doctor columns)
