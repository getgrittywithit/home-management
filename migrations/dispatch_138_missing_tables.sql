-- Dispatch 138 — Reconcile missing production tables
-- These tables were defined in D131-D136 migrations but may not have been applied to Supabase.
-- This file is idempotent (IF NOT EXISTS everywhere) — safe to run multiple times.

-- D131 — Buddy access config (per-kid per-buddy toggles + time limits)
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

-- D131 — Moderation flags (crisis/safety + content flags)
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

-- D131 — Session log (time tracking for daily caps)
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

-- D134b — Parent consent for AI buddies (COPPA)
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

-- D132 — Book vocabulary (AI-extracted words per book)
CREATE TABLE IF NOT EXISTS book_vocabulary (
  id SERIAL PRIMARY KEY,
  book_id INTEGER,
  word TEXT NOT NULL,
  definition TEXT,
  example_sentence TEXT,
  difficulty_rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, word)
);

-- D132 — Book buddy prompts (AI-generated discussion questions)
CREATE TABLE IF NOT EXISTS book_buddy_prompts (
  id SERIAL PRIMARY KEY,
  book_id INTEGER,
  prompt_type TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  target_reading_level TEXT,
  chapter_or_section INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bb_prompts_book ON book_buddy_prompts(book_id);

-- D134b — Parent admin audit log
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

-- D134b — Learning level suggestions (adaptive hand-off)
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

-- D136 — Pet supply types
CREATE TABLE IF NOT EXISTS pet_supply_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID,
  item_name TEXT NOT NULL,
  item_category TEXT,
  typical_qty NUMERIC,
  typical_unit TEXT,
  typical_interval_days INTEGER,
  preferred_shop TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- D136 — Pet supplies purchased
CREATE TABLE IF NOT EXISTS pet_supplies_purchased (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID,
  supply_type_id UUID,
  item_name TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  cost_cents INTEGER,
  shop TEXT,
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  purchased_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplies_pet_date ON pet_supplies_purchased(pet_id, purchased_at DESC);

-- D140 — Book extraction log (AI call audit trail)
CREATE TABLE IF NOT EXISTS book_extraction_log (
  id SERIAL PRIMARY KEY,
  book_id INTEGER,
  extraction_type TEXT NOT NULL,
  raw_llm_response JSONB,
  parsed_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_book_extraction_log_book ON book_extraction_log(book_id);

-- D134 — TEKS coverage events
CREATE TABLE IF NOT EXISTS kid_teks_coverage (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  school_year TEXT NOT NULL,
  teks_code TEXT NOT NULL,
  activity_count INTEGER DEFAULT 0,
  last_activity_date DATE,
  mastery_signal REAL DEFAULT 0,
  status TEXT DEFAULT 'not_started',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, school_year, teks_code)
);
CREATE INDEX IF NOT EXISTS idx_coverage_kid_year ON kid_teks_coverage(kid_name, school_year);
