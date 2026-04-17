-- ============================================================================
-- Dispatch 100c — Final Bug Fixes
-- BUG-23 (bill amounts), BUG-24 (typos), BUG-8 (habit completions)
-- ============================================================================

-- BUG-23: Populate recurring_bills with estimated amounts + due dates
-- NOTE: Lola should confirm actual amounts — these are typical rates
UPDATE recurring_bills SET amount = 185, due_day = 15 WHERE name = 'Progressive Insurance';
UPDATE recurring_bills SET amount = 90, due_day = 1 WHERE name = 'GVTC Internet';
UPDATE recurring_bills SET amount = 150, due_day = 20 WHERE name = 'CPS Energy';
UPDATE recurring_bills SET amount = 16, due_day = 5 WHERE name = 'Netflix';
UPDATE recurring_bills SET amount = 11, due_day = 10 WHERE name = 'Spotify';
UPDATE recurring_bills SET amount = 14, due_day = 12 WHERE name = 'Disney+';
UPDATE recurring_bills SET amount = 15, due_day = 8 WHERE name = 'Amazon Prime';
UPDATE recurring_bills SET amount = 18, due_day = 15 WHERE name = 'Hulu';

-- BUG-24: Fix typos in expense_categories
UPDATE expense_categories SET name = 'Business: COGS - Grit Collective' WHERE name = 'Business: COGS - Grit College';
DELETE FROM expense_categories WHERE name = 'Bank-rup';

-- BUG-8: Wire med adherence to habit completions
INSERT INTO habit_completions (habit_id, member_name, completion_date, status)
SELECT h.id, mal.kid_name, mal.log_date, 'completed'
FROM med_adherence_log mal
JOIN habits h ON (
  (h.title ILIKE '%focalin%' AND mal.time_of_day = 'am' AND LOWER(h.member_name) = mal.kid_name) OR
  (h.title ILIKE '%clonidine%' AND mal.time_of_day = 'pm' AND LOWER(h.member_name) = mal.kid_name)
)
WHERE mal.taken = TRUE
ON CONFLICT DO NOTHING;
