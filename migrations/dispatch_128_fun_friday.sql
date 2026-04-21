-- Dispatch 128 — Fun Friday Earning Engine

CREATE TABLE IF NOT EXISTS fun_friday_criteria (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL UNIQUE,
  threshold_pct INTEGER NOT NULL,
  days_required INTEGER NOT NULL DEFAULT 3,
  core_only BOOLEAN NOT NULL DEFAULT TRUE,
  core_subjects TEXT[] DEFAULT ARRAY['ELAR', 'Math']::TEXT[],
  all_subjects TEXT[] DEFAULT ARRAY['ELAR', 'Math', 'Social Studies', 'Science', 'Enrichment']::TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO fun_friday_criteria (kid_name, threshold_pct, days_required, core_only) VALUES
  ('amos', 60, 3, TRUE), ('ellie', 85, 3, FALSE), ('wyatt', 70, 3, TRUE), ('hannah', 75, 3, TRUE)
ON CONFLICT (kid_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS fun_friday_menu (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  option_text TEXT NOT NULL,
  option_category TEXT NOT NULL,
  icon TEXT,
  estimated_duration_min INTEGER,
  supplies_needed TEXT,
  active BOOLEAN DEFAULT TRUE,
  last_picked_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ff_menu_kid ON fun_friday_menu(kid_name) WHERE active = TRUE;

-- Amos
INSERT INTO fun_friday_menu (kid_name, option_text, option_category, icon, estimated_duration_min, supplies_needed) VALUES
  ('amos', 'Shop day helping Dad on a Triton job', 'with_parent', '🔨', 240, 'Coordinate with Levi'),
  ('amos', 'Driving practice hour with parent', 'with_parent', '🚗', 60, 'Car + parent'),
  ('amos', 'Tool organization and inventory with Dad', 'with_parent', '🧰', 90, 'Garage/shop'),
  ('amos', 'Trades YouTube documentary marathon', 'screen', '📺', 120, 'Streaming'),
  ('amos', 'Video game hours', 'screen', '🎮', 120, 'Existing games'),
  ('amos', 'Learn-a-trade-skill YouTube session', 'home_activity', '🔧', 90, 'YouTube')
ON CONFLICT DO NOTHING;
-- Ellie
INSERT INTO fun_friday_menu (kid_name, option_text, option_category, icon, estimated_duration_min, supplies_needed) VALUES
  ('ellie', 'Design a Grit Collective product', 'creative', '🎨', 120, 'Art supplies'),
  ('ellie', 'Plan a lemonade stand or yard sale', 'creative', '🍋', 120, 'Pantry + paper'),
  ('ellie', 'Shark Tank pitch to parents with mock budget', 'with_parent', '💡', 60, 'Paper'),
  ('ellie', 'Research + present a business she admires', 'creative', '📊', 90, 'Internet'),
  ('ellie', 'Design flyer/menu/social post for Grit Collective', 'creative', '📱', 90, 'Existing tools'),
  ('ellie', 'Craft project from existing supplies', 'creative', '✂️', 120, 'Craft supplies')
ON CONFLICT DO NOTHING;
-- Wyatt
INSERT INTO fun_friday_menu (kid_name, option_text, option_category, icon, estimated_duration_min, supplies_needed) VALUES
  ('wyatt', 'Bike adventure to a new trail', 'physical', '🚲', 90, 'Bike, water'),
  ('wyatt', 'Backyard obstacle course he designs', 'physical', '🏃', 90, 'Yard + household'),
  ('wyatt', 'Messy science experiment', 'home_activity', '🧪', 60, 'Pantry chemicals'),
  ('wyatt', 'Minecraft theme build challenge', 'screen', '⛏️', 120, 'Device'),
  ('wyatt', 'Nature scavenger hunt', 'physical', '🔍', 60, 'Yard or park'),
  ('wyatt', 'Blanket fort construction', 'home_activity', '🏰', 90, 'Blankets, chairs')
ON CONFLICT DO NOTHING;
-- Hannah
INSERT INTO fun_friday_menu (kid_name, option_text, option_category, icon, estimated_duration_min, supplies_needed) VALUES
  ('hannah', 'Garden Friday — plant, water, journal', 'home_activity', '🌱', 90, 'Yard + plants'),
  ('hannah', 'Bake something start-to-finish', 'with_parent', '🧁', 120, 'Pantry ingredients'),
  ('hannah', 'Craft from existing kit or supplies', 'creative', '🎨', 90, 'Craft supplies'),
  ('hannah', 'Creative Minecraft or Roblox build', 'screen', '🏗', 120, 'Device'),
  ('hannah', 'Nature journal walk', 'physical', '🌿', 60, 'Notebook, pencils'),
  ('hannah', 'Cook lunch with Mom', 'with_parent', '🍳', 90, 'Pantry'),
  ('hannah', 'Propagate houseplants', 'home_activity', '🪴', 45, 'Existing plants')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS shared_reward_pool (
  id SERIAL PRIMARY KEY,
  option_text TEXT NOT NULL,
  option_category TEXT NOT NULL,
  icon TEXT,
  details TEXT,
  active BOOLEAN DEFAULT TRUE,
  last_picked_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO shared_reward_pool (option_text, option_category, icon) VALUES
  ('Board game afternoon', 'board_game', '🎲'),
  ('Movie afternoon — pick from list', 'movie', '🎬'),
  ('Themed afternoon — pick a theme', 'themed_afternoon', '🎭'),
  ('Park or nature preserve trip', 'outing', '🌳'),
  ('Library trip', 'outing', '📚'),
  ('Backyard pool or water play', 'family_activity', '💦'),
  ('Boerne City Lake day', 'outing', '🏖')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS movie_library (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  streaming_source TEXT NOT NULL,
  rating TEXT,
  duration_min INTEGER,
  description TEXT,
  last_watched_at DATE,
  cooldown_days INTEGER DEFAULT 90,
  active BOOLEAN DEFAULT TRUE,
  added_by TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS themed_afternoon_library (
  id SERIAL PRIMARY KEY,
  theme_name TEXT NOT NULL,
  description TEXT NOT NULL,
  supplies_needed TEXT,
  setup_time_min INTEGER,
  last_used_at DATE,
  cooldown_days INTEGER DEFAULT 120,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO themed_afternoon_library (theme_name, description, supplies_needed) VALUES
  ('Pirate Afternoon', 'Hidden treasure hunt, pirate snacks, costume', 'Paper for map, household items'),
  ('Detective Mystery', 'Solve a made-up case with clues', 'Paper, pens'),
  ('Time Travel Day', 'Pick a decade, dress and play like you are there', 'Closet + pantry'),
  ('Olympics Day', 'Backyard mini-Olympics', 'Yard, stopwatch'),
  ('Chef for a Day', 'Each kid creates one dish', 'Pantry ingredients'),
  ('Museum Day at Home', 'Kids set up exhibits from toys', 'Existing toys'),
  ('Spy Academy', 'Obstacle courses, codes to crack', 'Household items'),
  ('Nature Journal Day', 'Walk, draw, identify plants', 'Notebook, pencils'),
  ('Inventor Workshop', 'Build from recycling bin', 'Cardboard, tape'),
  ('Around the World', 'Pick a country, try a recipe, learn phrases', 'Pantry, internet'),
  ('Art Gallery Day', 'Each kid creates art, set up show', 'Art supplies'),
  ('Science Fair Afternoon', 'Each kid does one experiment', 'Household items'),
  ('Reading Cave', 'Build fort, stock with snacks, read', 'Blankets, pillows, books'),
  ('Film Festival', 'Each kid picks a clip, family votes', 'Streaming'),
  ('Dance Party', 'Playlist, dance contest, everyone judges', 'Music')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS fun_friday_evaluations (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  week_of DATE NOT NULL,
  days_evaluated INTEGER NOT NULL,
  days_hit_threshold INTEGER NOT NULL,
  threshold_pct_required INTEGER NOT NULL,
  days_required INTEGER NOT NULL,
  qualified BOOLEAN NOT NULL,
  day_breakdown JSONB,
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, week_of)
);

CREATE TABLE IF NOT EXISTS fun_friday_picks (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  friday_date DATE NOT NULL,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  option_text_snapshot TEXT NOT NULL,
  picked_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  parent_notes TEXT,
  UNIQUE(kid_name, friday_date)
);

CREATE TABLE IF NOT EXISTS friday_move_log (
  id SERIAL PRIMARY KEY,
  friday_date DATE NOT NULL UNIQUE,
  activity TEXT NOT NULL,
  duration_min INTEGER,
  who_participated TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
