-- ============================================================================
-- Dispatch 101b — Family Adventure Board
-- Event discovery + family interest voting + parent approval pipeline.
-- Extends D99's explore/vibe matching system.
-- ============================================================================

CREATE TABLE IF NOT EXISTS adventure_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  event_date      DATE,
  event_end_date  DATE,
  event_time      TEXT,
  location        TEXT,
  address         TEXT,
  category        TEXT,
  image_url       TEXT,
  source_url      TEXT,
  source          TEXT NOT NULL DEFAULT 'curated',
  source_site     TEXT,
  submitted_by    TEXT,
  cost            TEXT,
  family_friendly BOOLEAN DEFAULT TRUE,
  age_range       TEXT DEFAULT 'all ages',
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','approved','archived')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adventure_interests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES adventure_events(id) ON DELETE CASCADE,
  person          TEXT NOT NULL,
  interest_level  TEXT DEFAULT 'interested' CHECK (interest_level IN ('interested','really_want_to','pass')),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, person)
);

CREATE TABLE IF NOT EXISTS adventure_decisions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID REFERENCES adventure_events(id) ON DELETE CASCADE,
  decision          TEXT NOT NULL CHECK (decision IN ('approved','maybe','not_this_time','too_expensive','schedule_conflict')),
  decided_by        TEXT,
  planned_date      DATE,
  notes             TEXT,
  calendar_event_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adventure_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES adventure_events(id) ON DELETE CASCADE,
  person      TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adventure_events_date ON adventure_events(event_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_adventure_interests_event ON adventure_interests(event_id);
