-- ============================================================================
-- Dispatch 100b — Remaining Bug Fixes (BUG-7,8,15,16,19,20,21)
-- ============================================================================

-- BUG-15: Auto-assign reading levels from grade ranges for untagged books
UPDATE home_library SET reading_level_tag = 'early_reader' WHERE reading_level_tag IS NULL AND grade_max <= 3 AND item_type = 'book';
UPDATE home_library SET reading_level_tag = 'chapter_book' WHERE reading_level_tag IS NULL AND grade_min >= 2 AND grade_max <= 5 AND item_type = 'book';
UPDATE home_library SET reading_level_tag = 'middle_grade' WHERE reading_level_tag IS NULL AND grade_min >= 4 AND grade_max <= 8 AND item_type = 'book';
UPDATE home_library SET reading_level_tag = 'ya' WHERE reading_level_tag IS NULL AND grade_min >= 7 AND item_type = 'book';
UPDATE home_library SET reading_level_tag = 'all_ages' WHERE reading_level_tag IS NULL AND item_type = 'book';

-- BUG-15 continued: Tag more genres by title keywords
UPDATE home_library SET genres = ARRAY['animals'] WHERE (genres IS NULL OR genres = '{}') AND item_type = 'book'
  AND (title ILIKE '%dog%' OR title ILIKE '%puppy%' OR title ILIKE '%kitten%' OR title ILIKE '%horse%' OR title ILIKE '%bunny%');
UPDATE home_library SET genres = ARRAY['humor', 'graphic_novel'] WHERE (genres IS NULL OR genres = '{}') AND item_type = 'book'
  AND (title ILIKE '%Captain Underpants%' OR title ILIKE '%Big Nate%' OR title ILIKE '%Diary of%');
UPDATE home_library SET genres = ARRAY['fantasy'] WHERE (genres IS NULL OR genres = '{}') AND item_type = 'book'
  AND (title ILIKE '%fairy%' OR title ILIKE '%magic%' OR title ILIKE '%dragon%' OR title ILIKE '%Disney%' OR title ILIKE '%Rainbow%');
UPDATE home_library SET genres = ARRAY['adventure'] WHERE (genres IS NULL OR genres = '{}') AND item_type = 'book'
  AND (title ILIKE '%hatchet%' OR title ILIKE '%survival%' OR title ILIKE '%island%' OR title ILIKE '%paulsen%');
UPDATE home_library SET genres = ARRAY['history'] WHERE (genres IS NULL OR genres = '{}') AND item_type = 'book'
  AND (title ILIKE '%communities%' OR title ILIKE '%history%' OR title ILIKE '%war%');
UPDATE home_library SET genres = ARRAY['sports'] WHERE (genres IS NULL OR genres = '{}') AND item_type = 'book'
  AND (title ILIKE '%level up%' OR title ILIKE '%game%' OR title ILIKE '%sport%');

-- BUG-19: Add expected_finish_date column
ALTER TABLE kid_book_progress ADD COLUMN IF NOT EXISTS expected_finish_date DATE;

-- BUG-20: Add shared_with column to running notes
ALTER TABLE kid_running_notes ADD COLUMN IF NOT EXISTS shared_with TEXT[] DEFAULT '{}';

-- BUG-21: Expanded event tagging pass
UPDATE calendar_events_cache SET tags = ARRAY['medical'], category = 'medical'
WHERE (title ILIKE '%doctor%' OR title ILIKE '%Gonzales%' OR title ILIKE '%CVS%' OR title ILIKE '%meds%' OR title ILIKE '%appt%' OR title ILIKE '%dental%' OR title ILIKE '%therapy%' OR title ILIKE '%Flores%')
  AND (tags = '{}' OR tags IS NULL);

UPDATE calendar_events_cache SET tags = ARRAY['school'], category = 'school'
WHERE (title ILIKE '%504%' OR title ILIKE '%IEP%' OR title ILIKE '%No School%' OR title ILIKE '%school%' OR title ILIKE '%EOC%' OR title ILIKE '%STAAR%' OR title ILIKE '%teacher%' OR title ILIKE '%conference%')
  AND (tags = '{}' OR tags IS NULL);

UPDATE calendar_events_cache SET tags = ARRAY['finance'], category = 'finance'
WHERE (title ILIKE '%TEFA%' OR title ILIKE '%funding%' OR title ILIKE '%bank%' OR title ILIKE '%bill%' OR title ILIKE '%payment%')
  AND (tags = '{}' OR tags IS NULL);

UPDATE calendar_events_cache SET category = 'household'
WHERE tags && ARRAY['household'] AND category IS NULL;

UPDATE calendar_events_cache SET category = 'school'
WHERE tags && ARRAY['school'] AND category IS NULL;

UPDATE calendar_events_cache SET category = 'community'
WHERE tags && ARRAY['community'] AND category IS NULL;

UPDATE calendar_events_cache SET category = 'music'
WHERE tags && ARRAY['music'] AND category IS NULL;

UPDATE calendar_events_cache SET category = 'sports'
WHERE tags && ARRAY['sports'] AND category IS NULL;

UPDATE calendar_events_cache SET kid_visible = FALSE WHERE category IN ('finance', 'work');
