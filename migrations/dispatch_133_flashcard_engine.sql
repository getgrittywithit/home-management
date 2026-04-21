-- Dispatch 133 — Flashcard Engine (Leitner spaced repetition)

CREATE TABLE IF NOT EXISTS flashcard_decks (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  deck_name TEXT NOT NULL,
  deck_type TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_name, deck_name)
);

INSERT INTO flashcard_decks (kid_name, deck_name, deck_type) VALUES
  ('amos', 'Vocabulary', 'vocabulary'), ('amos', 'Math Facts', 'math'),
  ('ellie', 'Vocabulary', 'vocabulary'), ('ellie', 'Math Facts', 'math'),
  ('wyatt', 'Vocabulary', 'vocabulary'), ('wyatt', 'Math Facts', 'math'),
  ('hannah', 'Vocabulary', 'vocabulary'), ('hannah', 'Math Facts', 'math')
ON CONFLICT (kid_name, deck_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS flashcard_cards (
  id SERIAL PRIMARY KEY,
  deck_id INTEGER REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  example_sentence TEXT,
  leitner_box INTEGER NOT NULL DEFAULT 1,
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  times_reviewed INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  times_wrong INTEGER DEFAULT 0,
  source_type TEXT,
  source_ref TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_deck_review ON flashcard_cards(deck_id, next_review_date) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cards_due_today ON flashcard_cards(next_review_date) WHERE next_review_date <= CURRENT_DATE AND active = TRUE;

CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES flashcard_cards(id) ON DELETE CASCADE,
  kid_name TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  result TEXT NOT NULL,
  time_to_answer_seconds INTEGER,
  previous_box INTEGER,
  new_box INTEGER,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_reviews_kid_date ON flashcard_reviews(kid_name, reviewed_at DESC);
