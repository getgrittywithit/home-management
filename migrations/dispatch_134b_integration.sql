-- D131-D134 Cross-System Integration

-- Parent consent for AI buddies (COPPA alignment)
CREATE TABLE IF NOT EXISTS buddy_parent_consent (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  persona_key TEXT NOT NULL,
  consented BOOLEAN DEFAULT FALSE,
  consented_at TIMESTAMPTZ,
  consented_by TEXT,
  consent_notes TEXT,
  UNIQUE(kid_name, persona_key)
);

-- Parent admin audit log
CREATE TABLE IF NOT EXISTS parent_admin_audit_log (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  target_entity TEXT,
  target_id TEXT,
  before_state JSONB,
  after_state JSONB,
  actor_account TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning level suggestions (adaptive hand-off)
CREATE TABLE IF NOT EXISTS learning_level_suggestions (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  current_level TEXT NOT NULL,
  suggested_level TEXT NOT NULL,
  evidence_type TEXT,
  evidence_ref TEXT,
  status TEXT DEFAULT 'pending',
  parent_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Speech practice sessions
CREATE TABLE IF NOT EXISTS speech_practice_sessions (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  deck_id INTEGER,
  card_id INTEGER,
  target_sound TEXT NOT NULL,
  kid_recording_url TEXT,
  kid_self_rating TEXT,
  parent_override_rating TEXT,
  session_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_speech_sessions_kid ON speech_practice_sessions(kid_name, session_date);

-- Extend flashcard_cards for speech practice
ALTER TABLE flashcard_cards ADD COLUMN IF NOT EXISTS target_sound TEXT;
ALTER TABLE flashcard_cards ADD COLUMN IF NOT EXISTS audio_model_url TEXT;
ALTER TABLE flashcard_cards ADD COLUMN IF NOT EXISTS minimal_pair TEXT;

-- Extend flashcard_decks for system decks + IEP linkage
ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS is_system_deck BOOLEAN DEFAULT FALSE;
ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS target_iep_goal_id INTEGER;

-- Seed speech decks for Hannah, Wyatt, Amos
INSERT INTO flashcard_decks (kid_name, deck_name, deck_type, is_system_deck) VALUES
  ('hannah', 'R Sounds — Beginning', 'speech_practice', TRUE),
  ('hannah', 'Grammar — Sentence Building', 'speech_practice', TRUE),
  ('wyatt', 'R Sounds — Mid & End', 'speech_practice', TRUE),
  ('amos', 'Articulation Refresh', 'speech_practice', TRUE)
ON CONFLICT (kid_name, deck_name) DO NOTHING;

-- Seed STAAR prep decks for BISD kids
INSERT INTO flashcard_decks (kid_name, deck_name, deck_type) VALUES
  ('kaylee', 'STAAR Prep — 7th Grade', 'staar_prep'),
  ('kaylee', 'Vocabulary', 'vocabulary'),
  ('kaylee', 'Math Facts', 'math'),
  ('zoey', 'EOC Prep', 'staar_prep'),
  ('zoey', 'Vocabulary', 'vocabulary'),
  ('zoey', 'Math Facts', 'math')
ON CONFLICT (kid_name, deck_name) DO NOTHING;

-- Extend homeschool_daily_tasks for Fun Friday eligibility flag
ALTER TABLE homeschool_daily_tasks ADD COLUMN IF NOT EXISTS counts_for_fun_friday BOOLEAN DEFAULT TRUE;
