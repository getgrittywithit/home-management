-- Restructure homeschool_settings: per-kid rows for currently_reading
-- Drop old key-value table if it exists
DROP TABLE IF EXISTS homeschool_settings;

CREATE TABLE homeschool_settings (
  kid_name TEXT PRIMARY KEY,
  currently_reading TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO homeschool_settings (kid_name, currently_reading) VALUES
  ('Amos', 'Olive''s Ocean'),
  ('Ellie', 'Olive''s Ocean'),
  ('Wyatt', 'Olive''s Ocean'),
  ('Hannah', 'Olive''s Ocean')
ON CONFLICT (kid_name) DO NOTHING;
