-- ============================================================================
-- Professional Review Fixes — highest-impact items
-- Reward store defaults, star earning foundation, growth tracking.
-- ============================================================================

-- #2: Populate Rewards Store with default rewards (Gamer, Kid, ADHD Coach)
INSERT INTO reward_store_items (name, description, star_cost, category, requires_approval)
SELECT * FROM (VALUES
  ('Extra 15 min screen time',  'Earn 15 extra minutes of screen/game time',  15, 'screen_time', TRUE),
  ('Pick tonight''s dinner',    'You choose what the family eats tonight',     20, 'activity',    TRUE),
  ('Stay up 15 min later',      'Bedtime pushed back 15 minutes',              25, 'activity',    TRUE),
  ('Pick family movie night',   'You pick the movie this weekend',             15, 'screen_time', TRUE),
  ('Skip one chore (not zone)', 'Skip any single non-zone daily task',         30, 'chore_pass',  TRUE),
  ('Breakfast in bed',          'Mom or Dad brings you breakfast',              20, 'activity',    TRUE),
  ('$5 spending money',         'Real $5 for the store next trip',              50, 'allowance',   TRUE),
  ('Friend sleepover',          'Invite a friend for a sleepover',             40, 'social',      TRUE),
  ('New book of your choice',   'Pick any book under $15',                      35, 'allowance',   TRUE),
  ('Craft supply run',          'Pick $10 of craft supplies',                    30, 'allowance',   TRUE)
) AS v(name, description, star_cost, category, requires_approval)
WHERE NOT EXISTS (SELECT 1 FROM reward_store_items rsi WHERE rsi.name = v.name);

-- #11: Growth tracking table (Pediatrician)
CREATE TABLE IF NOT EXISTS growth_measurements (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kid_name    TEXT NOT NULL,
  measure_date DATE NOT NULL,
  height_inches NUMERIC(5,1),
  weight_lbs    NUMERIC(5,1),
  bmi           NUMERIC(4,1),
  notes         TEXT,
  measured_by   TEXT DEFAULT 'parent',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Immunization tracking (Pediatrician)
CREATE TABLE IF NOT EXISTS immunization_records (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kid_name        TEXT NOT NULL,
  vaccine_name    TEXT NOT NULL,
  dose_number     INTEGER DEFAULT 1,
  administered_date DATE,
  next_due_date   DATE,
  provider        TEXT,
  lot_number      TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Per-child allergy list (Pediatrician)
CREATE TABLE IF NOT EXISTS kid_allergies (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kid_name    TEXT NOT NULL,
  allergy_type TEXT NOT NULL CHECK (allergy_type IN ('food','drug','environmental','other')),
  allergen    TEXT NOT NULL,
  severity    TEXT DEFAULT 'mild' CHECK (severity IN ('mild','moderate','severe','life_threatening')),
  reaction    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Family-wide: NO mushrooms
INSERT INTO kid_allergies (kid_name, allergy_type, allergen, severity, notes)
SELECT kid, 'food', 'Mushrooms', 'moderate', 'Family-wide hard no — all kids'
FROM UNNEST(ARRAY['amos','zoey','kaylee','ellie','wyatt','hannah']) AS kid
WHERE NOT EXISTS (SELECT 1 FROM kid_allergies WHERE kid_name = kid AND allergen = 'Mushrooms');
