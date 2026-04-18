-- Dispatch 113 — Schema fixes
-- Add weekly_stars column to digi_pets (referenced in recalcBalanceFromLog but missing from CREATE TABLE)
ALTER TABLE digi_pets ADD COLUMN IF NOT EXISTS weekly_stars INTEGER DEFAULT 0;

-- Notification preferences table for quiet hours
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'parent',
  kid_name TEXT,
  quiet_start INTEGER,
  quiet_end INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, kid_name)
);

-- Zone photo submissions (referenced by rewards/route.ts)
CREATE TABLE IF NOT EXISTS zone_photo_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  zone_name TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
