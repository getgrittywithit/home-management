-- Dispatch 131 — AI Buddy Safety + Persona Architecture

CREATE TABLE IF NOT EXISTS buddy_personas (
  id SERIAL PRIMARY KEY,
  persona_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  short_description TEXT,
  system_prompt TEXT NOT NULL,
  tone_guardrails TEXT,
  off_topic_redirect TEXT,
  icon TEXT,
  color_theme TEXT,
  active BOOLEAN DEFAULT TRUE,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO buddy_personas (persona_key, display_name, domain, short_description, icon, color_theme, system_prompt, off_topic_redirect) VALUES
('bookbuddy', 'Book Buddy', 'reading', 'Reading comprehension coach', '📚', 'purple',
 'You help kids practice reading comprehension. Ask questions about passages, celebrate effort, guide toward deeper understanding. Use Socratic questioning. Never give answers directly — help the kid discover them.',
 'That sounds like a great question for Curio!'),
('mathbuddy', 'Math Buddy', 'math', 'Math practice partner', '🔢', 'teal',
 'You help kids practice math at their level. Show one step at a time. Use real-world examples. Celebrate correct work. For wrong answers, guide gently — "Hmm, let''s try that step again."',
 'That sounds like a writing question — Wordsmith would love to help!'),
('wordsmith', 'Wordsmith', 'writing', 'Writing coach who loves words', '✍️', 'amber',
 'You are Wordsmith, a kind writing coach who loves words like a gardener loves seeds. Help kids write sentences, paragraphs, stories, and essays at THEIR level. Offer 2-3 word choices when stuck. Suggest sentence starters, not full sentences. Celebrate specifics: "You used a verb that really paints a picture!" Give one piece of feedback at a time. Ask questions that help kids think: "What does your character see?"',
 'That sounds like a great one for Curio or Book Buddy!'),
('curio', 'Curio', 'qa', 'Curious companion for why and how questions', '🔍', 'blue',
 'You are Curio, a curious and warm companion who loves answering "why" and "how" questions. Answer with age-appropriate accuracy. Break complex ideas into simple pieces. Use analogies kids can picture. End with a fun follow-up question. If something is beyond you: "Hmm, that''s a great one — let''s ask Mom, she might know!"',
 'Sounds like Book Buddy or Math Buddy would love that one!')
ON CONFLICT (persona_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS buddy_access_config (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  persona_key TEXT NOT NULL,
  access_enabled BOOLEAN DEFAULT TRUE,
  max_session_minutes INTEGER DEFAULT 20,
  max_daily_minutes INTEGER DEFAULT 45,
  cool_down_hours INTEGER DEFAULT 2,
  blocked_topics TEXT[] DEFAULT '{}'::TEXT[],
  custom_notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, persona_key)
);

-- Seed default access for all 4 homeschool kids × 4 personas
INSERT INTO buddy_access_config (kid_name, persona_key, custom_notes) VALUES
  ('amos', 'bookbuddy', 'Reading at 2nd grade level. Age-appropriate topics only. Dyslexia + APD — use simple sentences.'),
  ('amos', 'mathbuddy', 'Dyscalculia — extra patience. 2nd grade math level.'),
  ('amos', 'wordsmith', 'Dyslexia — offer word choices, never criticize spelling.'),
  ('amos', 'curio', 'Interests: construction, trucks, tools, video games, sports.'),
  ('ellie', 'bookbuddy', NULL), ('ellie', 'mathbuddy', NULL),
  ('ellie', 'wordsmith', 'Business-minded. Loves writing business plans.'),
  ('ellie', 'curio', 'Interests: business, money, entrepreneurship.'),
  ('wyatt', 'bookbuddy', 'Severe ADHD — keep responses short.'),
  ('wyatt', 'mathbuddy', 'Severe ADHD — one step at a time. Color vision deficiency.'),
  ('wyatt', 'wordsmith', NULL),
  ('wyatt', 'curio', 'Interests: Roblox, Minecraft, animals, outdoors.'),
  ('hannah', 'bookbuddy', 'Building confidence in reading. Loves plants and crafts.'),
  ('hannah', 'mathbuddy', NULL),
  ('hannah', 'wordsmith', 'Loves plants, cooking, crafts. Encourage creative writing.'),
  ('hannah', 'curio', 'Interests: plants, cooking, baking, Roblox, Minecraft.')
ON CONFLICT (kid_name, persona_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS buddy_moderation_flags (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER,
  kid_name TEXT,
  persona_key TEXT,
  direction TEXT NOT NULL,
  content_snippet TEXT,
  moderation_categories JSONB,
  severity TEXT NOT NULL,
  parent_reviewed BOOLEAN DEFAULT FALSE,
  parent_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mod_flags_pending ON buddy_moderation_flags(parent_reviewed) WHERE parent_reviewed = FALSE;

CREATE TABLE IF NOT EXISTS buddy_session_log (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  persona_key TEXT NOT NULL,
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ,
  duration_minutes INTEGER,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_log_kid_date ON buddy_session_log(kid_name, session_start DESC);
