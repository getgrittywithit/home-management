-- Dispatch 139 — TEKS + STAAR Content Backfill

-- Fix UNIQUE constraint on teks_standards to allow same code across subjects
ALTER TABLE teks_standards DROP CONSTRAINT IF EXISTS teks_standards_teks_code_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teks_standards_code_subject_key') THEN
    ALTER TABLE teks_standards ADD CONSTRAINT teks_standards_code_subject_key UNIQUE (teks_code, subject);
  END IF;
END $$;

-- Zoey EOC prep decks
INSERT INTO flashcard_decks (kid_name, deck_name, deck_type, description, is_system_deck) VALUES
  ('zoey', 'EOC Prep — Algebra I', 'eoc_prep', 'Practice for your Algebra I End-of-Course exam.', TRUE),
  ('zoey', 'EOC Prep — English I', 'eoc_prep', 'Practice for your English I End-of-Course exam.', TRUE),
  ('zoey', 'EOC Prep — Biology', 'eoc_prep', 'Practice for your Biology End-of-Course exam.', TRUE)
ON CONFLICT (kid_name, deck_name) DO NOTHING;

-- Add eoc_courses to kid_ixl_config for Zoey
ALTER TABLE kid_ixl_config ADD COLUMN IF NOT EXISTS eoc_courses TEXT[];
UPDATE kid_ixl_config SET eoc_courses = ARRAY['algebra_1', 'english_1', 'biology'] WHERE kid_name = 'zoey';

-- Zoey Algebra I EOC cards (20 cards covering Readiness Standards)
INSERT INTO flashcard_cards (deck_id, front_text, back_text, example_sentence, source_type, leitner_box, next_review_date) VALUES
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Algebra I'),
   'Solve: 3x + 7 = 22', 'x = 5. Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5.', 'TEKS A.5A', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Algebra I'),
   'What is the slope of y = 4x - 3?', 'The slope is 4. In y = mx + b form, m is the slope.', 'TEKS A.3B', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Algebra I'),
   'Write an equation for: "5 more than twice a number is 17"', '2n + 5 = 17', 'TEKS A.2A', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Algebra I'),
   'Factor: x² + 5x + 6', '(x + 2)(x + 3)', 'TEKS A.10E', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Algebra I'),
   'What is the y-intercept of y = -2x + 8?', 'The y-intercept is 8 (the point (0, 8)).', 'TEKS A.3A', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Algebra I'),
   'Simplify: 4(2x - 3) + 5', '8x - 12 + 5 = 8x - 7', 'TEKS A.10D', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Algebra I'),
   'If f(x) = 3x - 1, find f(4)', 'f(4) = 3(4) - 1 = 12 - 1 = 11', 'TEKS A.12B', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Algebra I'),
   'Solve the system: y = 2x + 1 and y = -x + 7', 'x = 2, y = 5. Set equal: 2x+1 = -x+7 → 3x = 6 → x = 2, y = 5.', 'TEKS A.5C', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Algebra I'),
   'What is the domain of f(x) = √(x - 3)?', 'x ≥ 3 (or [3, ∞)). The value under the radical must be ≥ 0.', 'TEKS A.7A', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Algebra I'),
   'Is y = x² linear, quadratic, or exponential?', 'Quadratic. The highest exponent is 2.', 'TEKS A.6A', 'staar', 1, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Zoey English I EOC cards (15 cards)
INSERT INTO flashcard_cards (deck_id, front_text, back_text, source_type, leitner_box, next_review_date) VALUES
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — English I'),
   'What is the difference between a claim and evidence?', 'A claim is an arguable statement. Evidence is the facts, data, or quotes that support the claim.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — English I'),
   'What is a thesis statement?', 'A one-sentence summary of your main argument, usually at the end of the introduction.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — English I'),
   'Define "connotation" vs "denotation"', 'Denotation = dictionary definition. Connotation = emotional/cultural meaning beyond the literal definition.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — English I'),
   'What is an unreliable narrator?', 'A narrator whose credibility is compromised — they may lie, be naive, or have limited knowledge.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — English I'),
   'What is the purpose of a counterargument in persuasive writing?', 'To address opposing views and strengthen your argument by showing you considered other perspectives.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — English I'),
   'What does "tone" mean in literature?', 'The author''s attitude toward the subject, conveyed through word choice, style, and details.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — English I'),
   'What is the difference between theme and topic?', 'Topic is the subject (e.g., "war"). Theme is the message about the topic (e.g., "war destroys innocence").', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — English I'),
   'What is a rhetorical question?', 'A question asked for effect, not expecting an answer. Used to make the reader think.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — English I'),
   'Define "imagery" and give an example', 'Language that appeals to the senses. Example: "The crisp autumn leaves crunched under her boots."', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — English I'),
   'What is the difference between first person and third person limited POV?', 'First person: narrator is a character ("I"). Third person limited: narrator is outside but follows one character''s thoughts.', 'staar', 1, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Zoey Biology EOC cards (10 cards)
INSERT INTO flashcard_cards (deck_id, front_text, back_text, source_type, leitner_box, next_review_date) VALUES
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Biology'),
   'What are the four macromolecules?', 'Carbohydrates, lipids, proteins, nucleic acids. Each has different functions in living organisms.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Biology'),
   'What is the difference between mitosis and meiosis?', 'Mitosis: 1 division → 2 identical cells (growth/repair). Meiosis: 2 divisions → 4 different cells (gametes/reproduction).', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Biology'),
   'What is natural selection?', 'Organisms with traits better suited to their environment survive and reproduce more — "survival of the fittest."', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Biology'),
   'What is the function of DNA?', 'DNA stores genetic instructions for building and maintaining an organism. It codes for proteins.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Biology'),
   'What is homeostasis?', 'The ability of an organism to maintain stable internal conditions (temperature, pH, glucose) despite external changes.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Biology'),
   'What is the difference between prokaryotic and eukaryotic cells?', 'Prokaryotic: no nucleus, smaller (bacteria). Eukaryotic: has a nucleus, larger (plants, animals, fungi).', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Biology'),
   'What is photosynthesis?', '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. Plants convert sunlight into glucose (food) and release oxygen.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Biology'),
   'What is an ecosystem?', 'A community of living organisms interacting with their nonliving environment (water, soil, air, sunlight).', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Biology'),
   'What is a food web?', 'A diagram showing interconnected food chains in an ecosystem — who eats whom.', 'staar', 1, CURRENT_DATE),
  ((SELECT id FROM flashcard_decks WHERE kid_name='zoey' AND deck_name='EOC Prep — Biology'),
   'What is the cell theory?', 'All living things are made of cells. Cells are the basic unit of life. All cells come from existing cells.', 'staar', 1, CURRENT_DATE)
ON CONFLICT DO NOTHING;
