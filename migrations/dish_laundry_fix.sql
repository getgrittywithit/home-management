-- Dish Duty Expandable Cards + Laundry Schedule Fix
-- Created: 2026-03-27

-- ══════════════════════════════════════════════
-- 1. DISH DUTY ZONE DEFINITIONS
-- ══════════════════════════════════════════════

INSERT INTO zone_definitions (zone_key, display_name, zone_type, assigned_to, done_means, anchor_count, rotating_count, supplies, zone_principle)
VALUES

('breakfast_dishes', 'Breakfast Dishes', 'duty',
 '{amos,wyatt}',
 'All 5 handwash items washed + dried + put away, leftovers stored, counters wiped, dishwasher flipped if full',
 5, 0,
 '[{"item":"dish soap","emoji":"🫧"},{"item":"drying rack or towel","emoji":"🧺"}]',
 'Your block, your 5 items. Don''t leave it for someone else.'),

('lunch_dishes', 'Lunch Dishes', 'duty',
 '{ellie,hannah}',
 'All 5 handwash items washed + dried + put away, lunch leftovers stored, counters wiped',
 5, 0,
 '[{"item":"dish soap","emoji":"🫧"},{"item":"drying rack or towel","emoji":"🧺"}]',
 'Your block, your 5 items. Don''t leave it for someone else.'),

('evening_dishes', 'Evening Dishes', 'duty',
 '{zoey,kaylee}',
 'All 5 handwash items washed + dried + put away, dinner leftovers stored, counters wiped, dishwasher flipped',
 5, 0,
 '[{"item":"dish soap","emoji":"🫧"},{"item":"drying rack or towel","emoji":"🧺"}]',
 'Your block, your 5 items. Don''t leave it for someone else.')

ON CONFLICT (zone_key) DO NOTHING;

-- ══════════════════════════════════════════════
-- 2. DISH DUTY ANCHOR TASKS
-- ══════════════════════════════════════════════

-- Breakfast Dishes (Amos + Wyatt)
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, instructions) VALUES
('breakfast_dishes', 'Wash your 5 handwash items — fully, with soap', 'anchor', true, 5,
 '["Fill the sink with warm soapy water or use the dish brush.", "Wash each item: both sides, inside and out, all surfaces.", "5 items each means if you and your partner are both here — 10 items total get washed.", "Handwash items = anything that can''t go in the dishwasher: pots, pans, non-stick, knives, large bowls, plastic containers.", "Rinse each item completely — no soap residue."]'),
('breakfast_dishes', 'Dry and put away every item you washed', 'anchor', false, 4,
 '["Dry with a clean dish towel or leave on the rack to air dry — but don''t walk away and leave it there.", "Put away = in its correct spot in the cabinet, not on the counter.", "If you don''t know where something goes — ask, don''t just leave it out."]'),
('breakfast_dishes', 'Put away leftovers, pantry items, and fridge items from breakfast', 'anchor', false, 3,
 '["Anything that was taken out for breakfast goes back: cereal boxes, milk, butter, jams, anything left on the counter.", "Any uneaten food that can be saved goes into a container in the fridge.", "Don''t leave food sitting out."]'),
('breakfast_dishes', 'Clear and wipe the table and counters', 'anchor', false, 3,
 '["Wipe the dining table — all of it, not just the part in front of you.", "Wipe all counters used during breakfast — the prep area, anything that got splashed or crumbed.", "Use a clean damp cloth or paper towel with spray."]'),
('breakfast_dishes', 'Flip the dishwasher — run it or empty it', 'anchor', false, 2,
 '["Check the dishwasher. Is it full of dirty dishes? Run it.", "Is it full of clean dishes? Empty it and put everything away.", "Is it mid-cycle or already empty? Leave it — nothing to do.", "Flipping the dishwasher is part of the block. Don''t ignore it."]');

-- Lunch Dishes (Ellie + Hannah)
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, instructions) VALUES
('lunch_dishes', 'Wash your 5 handwash items — fully, with soap', 'anchor', true, 5,
 '["Wash both sides of each item, inside and out, with soap.", "Rinse completely — no soapy film left on dishes.", "5 items each. If both of you are here — 10 items get washed between you."]'),
('lunch_dishes', 'Dry and put away every item you washed', 'anchor', false, 4,
 '["Dry or rack — but don''t leave and walk away with items still sitting wet on the counter.", "Put away in the correct spot."]'),
('lunch_dishes', 'Put away all lunch items and leftovers', 'anchor', false, 3,
 '["Everything taken out for lunch goes back — bread, condiments, lunch meat, any pantry items.", "Leftovers go in a container in the fridge.", "Nothing stays on the counter."]'),
('lunch_dishes', 'Clear and wipe the table and counters', 'anchor', false, 3,
 '["Full table wipe, all counters used. Crumbs on the floor around the table — sweep those too."]'),
('lunch_dishes', 'Check dishwasher — run or empty as needed', 'anchor', false, 2,
 '["Full of dirty dishes → run it. Full of clean → empty and put away. Mid-cycle or empty → leave it."]');

-- Evening Dishes (Zoey + Kaylee)
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, instructions) VALUES
('evening_dishes', 'Wash your 5 handwash items — fully, with soap', 'anchor', true, 6,
 '["Evening usually has more pots and pans from cooking. Same rule — both sides, inside out, fully rinsed.", "5 items each between you and your partner."]'),
('evening_dishes', 'Dry and put away every item you washed', 'anchor', false, 4,
 '["Don''t leave items drying on the rack overnight. Dry and put away before the block is done."]'),
('evening_dishes', 'Put away all dinner leftovers and food items', 'anchor', false, 4,
 '["All food off the stove, counters, and table. Into containers in the fridge or pantry.", "Don''t leave uncovered food on the stove overnight."]'),
('evening_dishes', 'Clear and wipe table, counters, and stovetop', 'anchor', true, 4,
 '["Full table wipe. All counters. Stovetop — wipe down while still slightly warm if possible.", "Use counter spray and paper towels."]'),
('evening_dishes', 'Flip the dishwasher — run it or empty it', 'anchor', false, 2,
 '["End of day — the dishwasher needs to be dealt with either way.", "Full of dirty → run it before bed. Full of clean → empty completely."]');

-- ══════════════════════════════════════════════
-- 3. LAUNDRY SCHEDULE TABLE
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS kid_laundry_schedule (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  laundry_days INTEGER[] NOT NULL,     -- 0=Sun, 1=Mon ... 6=Sat
  extra_duty TEXT DEFAULT NULL         -- 'towels' for Wyatt
);

INSERT INTO kid_laundry_schedule (kid_name, laundry_days, extra_duty) VALUES
('wyatt',   '{0}',   'towels'),
('amos',    '{4}',   NULL),
('zoey',    '{6}',   NULL),
('kaylee',  '{3,5}', NULL),
('ellie',   '{3,5}', NULL),
('hannah',  '{3,5}', NULL)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════
-- 4. REPLACE LAUNDRY TASKS
-- ══════════════════════════════════════════════

-- Delete old wrong laundry tasks
DELETE FROM zone_task_library WHERE zone_key = 'laundry_room';

-- Insert correct personal laundry tasks
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, instructions) VALUES

('laundry_room', 'Collect your dirty clothes from your room and bring to the machines', 'anchor', false, 5,
 '["Grab your hamper or a laundry basket.", "Get everything — clothes from your hamper, anything on the floor, anything you''ve been meaning to wash.", "Bring it all down to the laundry room.", "Tip: do this the night before your laundry day so you''re not scrambling in the morning."]'),

('laundry_room', 'Sort your laundry — lights, darks, delicates', 'anchor', false, 3,
 '["Three piles: lights (white and light colors), darks (black, navy, dark colors), delicates (anything with a care tag that says gentle or hand wash).", "Washing darks with lights turns lights pink or grey. Don''t skip this.", "If you only have one small load — do one wash, that''s fine. But check the colors first."]'),

('laundry_room', 'Start the washer — correct settings, correct amount of detergent', 'anchor', false, 3,
 '["Check the load size and set the water level to match — small, medium, or large.", "Add detergent: 1 cap for a normal load, 2 caps for a large or heavily soiled load. More detergent does NOT mean cleaner clothes — it leaves residue.", "Cold water is fine for most loads and saves energy.", "Start the machine. Set a timer so you don''t forget to move it to the dryer."]'),

('laundry_room', 'Move laundry from washer to dryer — same day, no leaving it wet', 'anchor', true, 3,
 '["Wet laundry left in the washer gets mildewy within a few hours and will smell even after drying.", "Move it immediately when the cycle ends.", "Clean the lint trap BEFORE starting the dryer — every single time. Full lint traps are a fire hazard.", "Check care tags on anything you''re unsure about — some items should not go in the dryer."]'),

('laundry_room', 'Fold and put away everything — same day', 'anchor', false, 20,
 '["Folding and putting away is part of laundry day. Leaving clean clothes in the dryer or in a pile on your floor doesn''t count as done.", "Fold shirts, pants, and anything that wrinkles while still slightly warm — it''s easier.", "Hang anything that should be hung. Put everything else in the correct drawer.", "All laundry done, washed, dried, and put away before the day ends."]');

-- Wyatt's towel duty (Sunday only)
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('laundry_room', 'Collect and wash household towels — your Sunday extra', 'anchor', true, 5, '{wyatt}',
 '["On Sundays your laundry day includes the household towels — bathroom towels, hand towels, and kitchen towels.", "Collect towels from: kids bathroom, guest bathroom, master bathroom, kitchen (dish towels).", "Wash towels separately from your clothes — they take longer to dry and are bulkier.", "Towels should be washed in warm or hot water.", "Dry on medium-high heat until completely dry. Damp towels get mildewy fast.", "Return folded towels to each bathroom when done."]');

-- ══════════════════════════════════════════════
-- 5. UPDATE LAUNDRY ZONE DEFINITION
-- ══════════════════════════════════════════════

UPDATE zone_definitions
SET
  done_means = 'All clothes washed, dried, folded, and put away same day. Lint trap cleaned. No wet laundry left in machine.',
  zone_principle = 'Laundry day means all the way through — start to finish, same day. Washed and sitting in the dryer is not done.'
WHERE zone_key = 'laundry_room';
