-- Dispatch 142 — Zoey Driver's License deck (shared from Amos)
-- Apply AFTER Amos_Content_Seed_Spring_2026.md has been applied

-- Create Zoey's copy of the deck
INSERT INTO flashcard_decks (kid_name, deck_name, deck_type, description, is_system_deck) VALUES
  ('zoey', 'Driver''s License Prep (Texas)', 'life_skills',
   'Texas road rules, signs, car controls, insurance basics. Practice for your permit and license.', TRUE)
ON CONFLICT (kid_name, deck_name) DO NOTHING;

-- Copy all of Amos's Driver's License cards into Zoey's deck
INSERT INTO flashcard_cards (deck_id, front_text, back_text, example_sentence, leitner_box, next_review_date)
SELECT
  zoey_deck.id,
  card.front_text,
  card.back_text,
  card.example_sentence,
  1,
  CURRENT_DATE
FROM flashcard_cards card
JOIN flashcard_decks amos_deck ON amos_deck.id = card.deck_id
JOIN flashcard_decks zoey_deck ON zoey_deck.kid_name = 'zoey' AND zoey_deck.deck_name = amos_deck.deck_name
WHERE amos_deck.kid_name = 'amos'
  AND amos_deck.deck_name = 'Driver''s License Prep (Texas)';
