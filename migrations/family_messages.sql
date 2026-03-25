-- Family communication board
CREATE TABLE IF NOT EXISTS family_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_kid TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_by_parent BOOLEAN DEFAULT FALSE,
  parent_reply TEXT,
  reply_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS family_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT DEFAULT 'Lola'
);
