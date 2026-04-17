-- ============================================================================
-- Dispatch 100 — Bugs, Fixes & Data Cleanup
-- ============================================================================

-- BUG-11: Fix meal_cooking_sessions.meal_id type (INTEGER → UUID)
-- Table has 0 rows so ALTER is safe
ALTER TABLE meal_cooking_sessions ALTER COLUMN meal_id TYPE UUID USING NULL;

-- BUG-12: Backfill event tags on existing calendar_events_cache
UPDATE calendar_events_cache SET tags = ARRAY['school']
WHERE (title ILIKE '%EOC%' OR title ILIKE '%Saturday School%' OR title ILIKE '%exam%' OR title ILIKE '%STAAR%')
  AND (tags IS NULL OR tags = '{}');

UPDATE calendar_events_cache SET tags = ARRAY['theater']
WHERE (title ILIKE '%starcatcher%' OR title ILIKE '%theater%' OR title ILIKE '%theatre%' OR title ILIKE '%drama%')
  AND (tags IS NULL OR tags = '{}');

UPDATE calendar_events_cache SET tags = ARRAY['music']
WHERE (title ILIKE '%band%' OR title ILIKE '%concert%' OR title ILIKE '%orchestra%' OR title ILIKE '%HCYO%' OR title ILIKE '%choir%')
  AND (tags IS NULL OR tags = '{}');

UPDATE calendar_events_cache SET tags = ARRAY['community']
WHERE (title ILIKE '%PTO%' OR title ILIKE '%volunteer%' OR title ILIKE '%fundraiser%' OR title ILIKE '%carnival%')
  AND (tags IS NULL OR tags = '{}');

UPDATE calendar_events_cache SET tags = ARRAY['career']
WHERE (title ILIKE '%pitch night%' OR title ILIKE '%workforce%' OR title ILIKE '%career%')
  AND (tags IS NULL OR tags = '{}');

UPDATE calendar_events_cache SET tags = ARRAY['sports']
WHERE (title ILIKE '%game%' OR title ILIKE '%practice%' OR title ILIKE '%tournament%' OR title ILIKE '%track%')
  AND (tags IS NULL OR tags = '{}');

UPDATE calendar_events_cache SET tags = ARRAY['jrotc']
WHERE (title ILIKE '%JROTC%' OR title ILIKE '%road cleanup%' OR title ILIKE '%color guard%')
  AND (tags IS NULL OR tags = '{}');

UPDATE calendar_events_cache SET tags = ARRAY['household']
WHERE (title ILIKE '%laundry%' OR title ILIKE '%zone%' OR title ILIKE '%strip%bed%' OR title ILIKE '%devices off%')
  AND (tags IS NULL OR tags = '{}');

-- Set kid_visible false for household/work events
UPDATE calendar_events_cache SET kid_visible = FALSE
WHERE calendar_name ILIKE '%work%' OR calendar_name ILIKE '%finance%'
  OR (calendar_name ILIKE '%household%' AND title NOT ILIKE '%dinner%');

-- BUG-13: Add source_calendar_id column
ALTER TABLE calendar_events_cache ADD COLUMN IF NOT EXISTS source_calendar_id TEXT;
