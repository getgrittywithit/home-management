-- D127 Phase D2 — Gmail send scope + teacher communications logging

-- Ensure scopes column exists (already added in gmail.ts ensureGmailTables, but explicit)
ALTER TABLE gmail_tokens ADD COLUMN IF NOT EXISTS scopes TEXT;

-- Teacher communications log for outbound excuse emails + inbound school messages
CREATE TABLE IF NOT EXISTS teacher_communications (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  recipient TEXT,
  sender TEXT,
  cc TEXT[],
  subject TEXT NOT NULL,
  body_snippet TEXT,
  body_full TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  day_mode_id INTEGER REFERENCES day_modes(id) ON DELETE SET NULL,
  message_id TEXT,
  acknowledgement_received BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_comms_kid_date ON teacher_communications(kid_name, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_comms_day_mode ON teacher_communications(day_mode_id);
