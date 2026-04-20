-- Dispatch 121 gaps — hs_lesson_logs seed + teacher_communications table

-- Seed hs_lesson_logs so Homeschool Overview "This Week at a Glance" isn't all gray
INSERT INTO hs_lesson_logs (student_id, subject_name, log_date, duration_mins, activity_type, notes, completed)
SELECT s.id, sub.subject_name, d.log_date, sub.duration, sub.activity_type, sub.notes, true
FROM hs_students s
CROSS JOIN (VALUES
  ('Math', CURRENT_DATE - 1, 30, 'lesson', 'Fraction review + practice problems'),
  ('Math', CURRENT_DATE - 2, 25, 'lesson', 'Place value and rounding'),
  ('Reading', CURRENT_DATE - 1, 20, 'reading', 'Chapter reading + comprehension questions'),
  ('Reading', CURRENT_DATE - 3, 25, 'reading', 'Independent reading time'),
  ('Science', CURRENT_DATE - 2, 30, 'lesson', 'Plant life cycle observation'),
  ('Writing', CURRENT_DATE - 1, 15, 'practice', 'Journal entry'),
  ('Social Studies', CURRENT_DATE - 3, 20, 'lesson', 'Map skills practice')
) AS sub(subject_name, log_date, duration, activity_type, notes)
CROSS JOIN (VALUES (CURRENT_DATE)) AS d(log_date)
WHERE s.kid_name IN ('amos', 'ellie', 'wyatt', 'hannah')
ON CONFLICT DO NOTHING;

-- Teacher communications table (school → parent message tracking)
CREATE TABLE IF NOT EXISTS teacher_communications (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  teacher_name TEXT,
  school TEXT,
  subject TEXT,
  message_type TEXT DEFAULT 'note',
  message TEXT NOT NULL,
  urgency TEXT DEFAULT 'normal',
  source TEXT DEFAULT 'email',
  action_needed BOOLEAN DEFAULT FALSE,
  action_taken TEXT,
  resolved_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_comms_kid ON teacher_communications(kid_name);
CREATE INDEX IF NOT EXISTS idx_teacher_comms_unresolved ON teacher_communications(kid_name) WHERE resolved_at IS NULL;
