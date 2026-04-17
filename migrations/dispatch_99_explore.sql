-- ============================================================================
-- Dispatch 99 — Events Discovery & Vibe Matching
-- Kid interest profiles + event tagging + calendar request pipeline.
-- ============================================================================

-- Event tags + visibility on cached events
ALTER TABLE calendar_events_cache ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE calendar_events_cache ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE calendar_events_cache ADD COLUMN IF NOT EXISTS kid_visible BOOLEAN DEFAULT TRUE;

-- Kid interest profiles for vibe matching
CREATE TABLE IF NOT EXISTS kid_interest_tags (
  id          SERIAL PRIMARY KEY,
  kid_name    TEXT NOT NULL,
  tag         TEXT NOT NULL,
  weight      REAL DEFAULT 1.0,
  source      TEXT DEFAULT 'parent',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, tag)
);

-- Seed interests from CLAUDE.md kid profiles
INSERT INTO kid_interest_tags (kid_name, tag, weight, source) VALUES
  ('zoey','geography',2.0,'parent'), ('zoey','history',1.5,'parent'),
  ('zoey','science',1.5,'parent'), ('zoey','art',1.5,'parent'), ('zoey','jrotc',2.0,'parent'),
  ('kaylee','theater',2.0,'parent'), ('kaylee','music',1.0,'parent'), ('kaylee','community',1.0,'parent'),
  ('hannah','outdoors',2.0,'parent'), ('hannah','art',1.5,'parent'),
  ('hannah','food',1.5,'parent'), ('hannah','reading',1.0,'parent'), ('hannah','technology',1.0,'parent'),
  ('ellie','career',2.0,'parent'), ('ellie','community',1.5,'parent'),
  ('ellie','food',1.0,'parent'), ('ellie','art',1.0,'parent'),
  ('wyatt','outdoors',2.0,'parent'), ('wyatt','sports',2.0,'parent'), ('wyatt','technology',1.0,'parent'),
  ('amos','career',2.0,'parent'), ('amos','sports',1.5,'parent'),
  ('amos','technology',1.0,'parent'), ('amos','outdoors',1.0,'parent')
ON CONFLICT (kid_name, tag) DO NOTHING;

-- Mark work/finance calendars as not kid-visible
UPDATE calendar_events_cache SET kid_visible = FALSE
WHERE calendar_name ILIKE '%work%' OR calendar_name ILIKE '%finance%' OR calendar_name ILIKE '%household%';
