-- ============================================================================
-- Dispatch 79 — Seed Data & Encouragement System
-- Adds hint/encouragement text columns to the learning engine content
-- tables so BookBuddy + MathBuddy can render personalized feedback.
-- ============================================================================

-- ELAR passages — add encouragement + hint
ALTER TABLE elar_placement_passages
  ADD COLUMN IF NOT EXISTS encouragement_correct TEXT,
  ADD COLUMN IF NOT EXISTS encouragement_wrong   TEXT,
  ADD COLUMN IF NOT EXISTS hint_text             TEXT,
  ADD COLUMN IF NOT EXISTS title                 TEXT,
  ADD COLUMN IF NOT EXISTS vocabulary            JSONB;

-- Math problems — add encouragement + hint + solution steps
ALTER TABLE math_placement_problems
  ADD COLUMN IF NOT EXISTS encouragement_correct TEXT,
  ADD COLUMN IF NOT EXISTS encouragement_wrong   TEXT,
  ADD COLUMN IF NOT EXISTS hint_text             TEXT,
  ADD COLUMN IF NOT EXISTS title                 TEXT,
  ADD COLUMN IF NOT EXISTS solution_steps        JSONB,
  ADD COLUMN IF NOT EXISTS answer_display        TEXT;
