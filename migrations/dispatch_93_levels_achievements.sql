-- ============================================================================
-- Dispatch 93 — Digi-Pet Levels + Achievement Wiring
-- ============================================================================

ALTER TABLE digi_pets ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE digi_pets ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE digi_pets ADD COLUMN IF NOT EXISTS xp_to_next_level INTEGER DEFAULT 100;

-- Seed XP from existing stars (retroactive — 1 star = ~2 XP)
UPDATE digi_pets SET xp = LEAST(stars_balance * 2, 500), level = GREATEST(1, LEAST(20, stars_balance / 50 + 1))
WHERE xp = 0 AND stars_balance > 0;

-- Sibling messages table for Part B
CREATE TABLE IF NOT EXISTS sibling_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_kid        TEXT NOT NULL,
  to_kid          TEXT,
  message         TEXT NOT NULL,
  message_type    TEXT DEFAULT 'text',
  photo_url       TEXT,
  read_by         JSONB DEFAULT '[]'::jsonb,
  parent_flagged  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sibling_messages_created ON sibling_messages(created_at DESC);

-- Active challenges table
CREATE TABLE IF NOT EXISTS active_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  started_by      TEXT NOT NULL,
  participants    TEXT[] NOT NULL,
  tracking_metric TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  star_prize      INTEGER DEFAULT 10,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  winner          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID REFERENCES active_challenges(id) ON DELETE CASCADE,
  kid_name        TEXT NOT NULL,
  progress_count  INTEGER DEFAULT 0,
  daily_log       JSONB DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, kid_name)
);
