-- Dispatch 149 — Build 4 Greenlit Feature Clusters

-- Phase 1: Behavior Events extension
ALTER TABLE behavior_events ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE behavior_events ADD COLUMN IF NOT EXISTS resolution_note TEXT;

-- Phase 3: Journal prompts seed table
CREATE TABLE IF NOT EXISTS journal_prompts (
  id SERIAL PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  age_range_min INTEGER,
  age_range_max INTEGER,
  category TEXT,
  active BOOLEAN DEFAULT TRUE
);

INSERT INTO journal_prompts (prompt_text, age_range_min, age_range_max, category) VALUES
  ('What made you smile today?', 6, 18, 'gratitude'),
  ('What is something you are grateful for?', 6, 18, 'gratitude'),
  ('What was the hardest thing you did today?', 8, 18, 'reflection'),
  ('If you could teach a class on anything, what would it be?', 8, 18, 'creativity'),
  ('What is something kind someone did for you today?', 6, 18, 'social'),
  ('What is a goal you are working toward?', 8, 18, 'goals'),
  ('Describe your perfect day from start to finish.', 6, 18, 'creativity'),
  ('What is something you learned today that surprised you?', 8, 18, 'learning'),
  ('If you could have a superpower, what would it be and why?', 6, 14, 'creativity'),
  ('What is a book or movie that changed how you think?', 10, 18, 'reflection'),
  ('Write about a time you helped someone.', 6, 18, 'social'),
  ('What does bravery mean to you?', 8, 18, 'values'),
  ('If you could travel anywhere, where would you go?', 6, 18, 'creativity'),
  ('What is something you want to get better at?', 8, 18, 'growth'),
  ('Write a letter to your future self.', 10, 18, 'reflection'),
  ('What is your favorite family tradition?', 6, 18, 'family'),
  ('Describe a place where you feel safe and calm.', 6, 18, 'wellness'),
  ('What is one thing you would change about the world?', 10, 18, 'values'),
  ('What does home feel like?', 6, 18, 'family'),
  ('Write about an animal you admire and why.', 6, 14, 'creativity'),
  ('What is something that makes you feel proud?', 6, 18, 'confidence'),
  ('If you could invent something, what would it solve?', 8, 18, 'creativity'),
  ('What is one word that describes how you feel right now?', 6, 18, 'emotion'),
  ('Write about a mistake you learned from.', 10, 18, 'growth'),
  ('What makes a good friend?', 6, 18, 'social')
ON CONFLICT DO NOTHING;

-- Phase 3: Ensure unique constraint on journal entries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kid_journal_entries_kid_date_unique') THEN
    ALTER TABLE kid_journal_entries ADD CONSTRAINT kid_journal_entries_kid_date_unique UNIQUE (kid_name, entry_date);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Phase 3: Ensure unique constraint on wellness log
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kid_wellness_log_child_date_unique') THEN
    ALTER TABLE kid_wellness_log ADD CONSTRAINT kid_wellness_log_child_date_unique UNIQUE (child_name, log_date);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Phase 4: Money feature flag
ALTER TABLE family_settings ADD COLUMN IF NOT EXISTS show_money_features BOOLEAN DEFAULT FALSE;

-- Phase 2: Report cards unique constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_cards_kid_year_period_subject_unique') THEN
    ALTER TABLE report_cards ADD CONSTRAINT report_cards_kid_year_period_subject_unique UNIQUE (kid_name, school_year, grading_period, subject);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;
