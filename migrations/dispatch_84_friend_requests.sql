-- ============================================================================
-- Dispatch 84 — Friend Request Form Overhaul
-- Structured friend profiles + detailed request storage replacing the
-- freeform family_messages approach.
-- Single-family app, no family_id column.
-- ============================================================================

-- 1. Friend profiles (persistent directory, auto-saved from form) -----------
CREATE TABLE IF NOT EXISTS friend_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name        TEXT NOT NULL,
  friend_name     TEXT NOT NULL,
  how_know        TEXT,
  been_before     BOOLEAN,
  parent1_name    TEXT,
  parent1_phone   TEXT,
  parent1_email   TEXT,
  parent2_name    TEXT,
  parent2_phone   TEXT,
  parent2_email   TEXT,
  parents_married TEXT,
  other_adults    TEXT,
  address         TEXT,
  gate_code       TEXT,
  has_wifi        BOOLEAN,
  siblings        JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friend_profiles_kid ON friend_profiles(kid_name);

-- 2. Friend requests (structured) ------------------------------------------
CREATE TABLE IF NOT EXISTS friend_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name            TEXT NOT NULL,
  friend_profile_id   UUID REFERENCES friend_profiles(id) ON DELETE SET NULL,
  friend_name         TEXT NOT NULL,
  visit_type          TEXT NOT NULL DEFAULT 'hangout'
                        CHECK (visit_type IN ('hangout','sleepover','weekend','extended')),
  start_date          DATE NOT NULL,
  start_time          TIME,
  end_date            DATE,
  end_time            TIME,
  return_date         DATE,
  location_type       TEXT,
  address             TEXT,
  gate_code           TEXT,
  has_wifi            BOOLEAN,
  activities          JSONB DEFAULT '[]'::jsonb,
  plan_details        TEXT,
  special_event       TEXT,
  leaving_house       BOOLEAN,
  leaving_where       TEXT,
  ride_there          TEXT,
  ride_home           TEXT,
  ride_other_who      TEXT,
  travel_details      TEXT,
  destination         TEXT,
  siblings_present    TEXT,
  notes               TEXT,

  -- Status
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','denied','questions')),
  parent_note         TEXT,
  responded_at        TIMESTAMPTZ,
  responded_by        TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_kid ON friend_requests(kid_name, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
