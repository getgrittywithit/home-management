CREATE TABLE IF NOT EXISTS kid_mood_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  one_win TEXT,
  one_hard_thing TEXT,
  what_helped TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, log_date)
);

CREATE TABLE IF NOT EXISTS kid_break_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ
);
