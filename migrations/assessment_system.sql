-- D61: Weekly Assessment System — vocab tests, math speed tests, score tracking
-- New tables: weekly_focus, weekly_math_focus, vocab_words, assessment_scores, vocab_practice_log
-- Foreign keys reference home_library (existing books table). All idempotent via IF NOT EXISTS.

-- ──────────────────────────────────────────────────────────────
-- 1. Weekly Focus — Monday of the week
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_focus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  vocab_book_id UUID REFERENCES home_library(id),
  vocab_set_name TEXT,
  vocab_test_date DATE,
  science_unit TEXT,
  history_unit TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start)
);
CREATE INDEX IF NOT EXISTS idx_weekly_focus_week ON weekly_focus(week_start DESC);

-- ──────────────────────────────────────────────────────────────
-- 2. Weekly Math Focus — per-kid skill area for the week
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_math_focus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_focus_id UUID REFERENCES weekly_focus(id) ON DELETE CASCADE,
  kid_name TEXT NOT NULL,
  skill_area TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(weekly_focus_id, kid_name)
);
CREATE INDEX IF NOT EXISTS idx_weekly_math_focus_parent ON weekly_math_focus(weekly_focus_id);

-- ──────────────────────────────────────────────────────────────
-- 3. Vocab Words — book + set → word + definition
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vocab_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES home_library(id),
  set_name TEXT,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  example_sentence TEXT,
  difficulty INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, set_name, word)
);
CREATE INDEX IF NOT EXISTS idx_vocab_words_book ON vocab_words(book_id, set_name);

-- ──────────────────────────────────────────────────────────────
-- 4. Assessment Scores — all tests (vocab + math + science + history)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  assessment_type TEXT NOT NULL,
  week_start DATE NOT NULL,
  book_id UUID REFERENCES home_library(id),
  skill_area TEXT,
  grade_level INTEGER,
  score_earned DECIMAL(6,2),
  score_possible DECIMAL(6,2),
  part_scores JSONB,
  time_seconds INTEGER,
  problems_attempted INTEGER,
  problems_correct INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, assessment_type, week_start, skill_area)
);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_kid ON assessment_scores(kid_name, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_type ON assessment_scores(assessment_type, week_start DESC);

-- ──────────────────────────────────────────────────────────────
-- 5. Vocab Practice Log — kid reviewed words this week
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vocab_practice_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  week_start DATE NOT NULL,
  word_id UUID REFERENCES vocab_words(id),
  practiced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, week_start, word_id)
);
CREATE INDEX IF NOT EXISTS idx_vocab_practice_week ON vocab_practice_log(kid_name, week_start);

-- ──────────────────────────────────────────────────────────────
-- 6. Seed vocab for Olive's Ocean (Kevin Henkes)
-- STARTER SET — plausible literary vocabulary consistent with the novel.
-- Lola should review/edit via the admin UI before the Friday test.
-- ──────────────────────────────────────────────────────────────

-- Blue Set — 15 easier words (grades 3-5 appropriate)
INSERT INTO vocab_words (book_id, set_name, word, definition, example_sentence, difficulty, sort_order)
SELECT b.id, 'Blue Set', v.word, v.definition, v.example_sentence, v.difficulty, v.sort_order
FROM home_library b
CROSS JOIN (VALUES
  ('luminous',   'Giving off light; shining brightly',                             'The luminous moon lit the ocean water.',                 1, 1),
  ('melancholy', 'A feeling of deep, thoughtful sadness',                          'Martha felt a wave of melancholy at the beach.',          2, 2),
  ('hesitate',   'To pause or hold back before doing something',                   'She did not hesitate to dive into the cold water.',       1, 3),
  ('peculiar',   'Strange, odd, or unusual',                                       'There was a peculiar smell in the old cottage.',          1, 4),
  ('fragile',    'Easily broken or damaged',                                       'The seashell was fragile in her hand.',                   1, 5),
  ('gaze',       'To look steadily and quietly at something',                      'She liked to gaze out at the waves for hours.',           1, 6),
  ('drift',      'To be carried slowly by a current of water or air',              'Clouds drifted across the summer sky.',                   1, 7),
  ('whisper',    'To speak very softly using breath, not voice',                   'The sea seemed to whisper secrets at night.',             1, 8),
  ('solitude',   'The state of being alone — often by choice',                     'Martha found solitude on the quiet beach.',               2, 9),
  ('reminisce',  'To remember and talk about past experiences',                    'Grandmother loved to reminisce about her childhood.',     2, 10),
  ('quiver',     'To shake or tremble slightly',                                   'Her hands began to quiver when she read the note.',       1, 11),
  ('gleam',      'To shine or glow with soft, bright light',                       'The water gleamed in the morning sun.',                   1, 12),
  ('yearn',      'To have a strong, deep desire for something',                    'She began to yearn for the summer to never end.',         2, 13),
  ('ordinary',   'Normal, common, or usual',                                       'It was an ordinary Tuesday until everything changed.',    1, 14),
  ('bewilder',   'To confuse or puzzle completely',                                'The sudden news seemed to bewilder everyone.',            2, 15)
) AS v(word, definition, example_sentence, difficulty, sort_order)
WHERE b.title = 'Olive''s Ocean'
  AND b.item_type = 'book'
  AND NOT EXISTS (
    SELECT 1 FROM vocab_words vw
    WHERE vw.book_id = b.id AND vw.set_name = 'Blue Set' AND vw.word = v.word
  );

-- Pink Set — 15 harder words (grades 5-8 appropriate)
INSERT INTO vocab_words (book_id, set_name, word, definition, example_sentence, difficulty, sort_order)
SELECT b.id, 'Pink Set', v.word, v.definition, v.example_sentence, v.difficulty, v.sort_order
FROM home_library b
CROSS JOIN (VALUES
  ('exquisite',   'Extremely beautiful, delicate, and refined',                    'The sunset over the ocean was exquisite that evening.',    3, 1),
  ('profound',    'Very deep and meaningful',                                      'She had a profound sense that something had changed.',     3, 2),
  ('contemplate', 'To think about something deeply and carefully',                 'He sat on the dune to contemplate the waves.',             3, 3),
  ('tangible',    'Real enough to be touched or clearly sensed',                   'Her sadness felt almost tangible, like a weight.',         3, 4),
  ('eloquent',    'Skilled at speaking or writing in a moving way',                'Her letter was simple but eloquent.',                      3, 5),
  ('solemn',      'Serious, formal, and quiet',                                    'The service by the sea was solemn and brief.',             2, 6),
  ('reverie',     'A daydream or state of pleasant thoughtfulness',                'She fell into a reverie watching the gulls.',              3, 7),
  ('anguish',     'Severe mental or physical suffering',                           'The anguish of losing a friend stayed with her.',          3, 8),
  ('obscure',     'Not clear, difficult to see or understand',                     'The cliff was obscure in the morning fog.',                2, 9),
  ('serene',      'Calm, peaceful, untroubled',                                    'The serene bay was like glass at dawn.',                   2, 10),
  ('poignant',    'Evoking a keen sense of sadness or regret',                     'It was a poignant moment when they said goodbye.',         3, 11),
  ('irrevocable', 'Not able to be changed or taken back',                          'Her decision felt irrevocable once she spoke it.',         3, 12),
  ('ephemeral',   'Lasting for a very short time',                                 'Summer felt ephemeral at Grandmother''s house.',          3, 13),
  ('tumultuous',  'Full of noise, confusion, or wild emotion',                     'The tumultuous waves crashed against the shore.',          3, 14),
  ('evanescent',  'Quickly fading or disappearing',                                'Memories of that summer were evanescent, slipping away.', 3, 15)
) AS v(word, definition, example_sentence, difficulty, sort_order)
WHERE b.title = 'Olive''s Ocean'
  AND b.item_type = 'book'
  AND NOT EXISTS (
    SELECT 1 FROM vocab_words vw
    WHERE vw.book_id = b.id AND vw.set_name = 'Pink Set' AND vw.word = v.word
  );
