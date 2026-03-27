-- Zone Admin Fixes: soft-delete, laundry corrections, dishes trash task, missing zones
-- Created: 2026-03-27

-- ══════════════════════════════════════════════
-- Fix 1: Soft-delete column on zone_task_library
-- ══════════════════════════════════════════════
ALTER TABLE zone_task_library ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ══════════════════════════════════════════════
-- Fix 2: Replace laundry tasks with corrected set
-- ══════════════════════════════════════════════
DELETE FROM zone_task_library WHERE zone_key = 'laundry_room';

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES

('laundry_room', 'Collect your dirty clothes from your room AND the kids bathroom — girls leave stuff there', 'anchor', false, 5, NULL,
 '["Grab everything off your bedroom floor, chair, or hamper.", "Check the kids bathroom floor and hook area — there are almost always clothes left in there.", "Bring it all to the laundry machines."]'),

('laundry_room', 'Check pockets BEFORE loading — this is serious', 'anchor', true, 3, NULL,
 '["Go through every single pocket.", "Remove: tissues (they explode), chapstick (it melts everywhere), crayons or markers (they will dye the whole load), pens (ink ruins fabric), screws, razor blades, or any metal bits.", "Also check for loose change, earbuds, hair ties — anything that doesn''t belong.", "This step protects the machine and your clothes — skipping it has real consequences."]'),

('laundry_room', 'Load the washer — know what can and can''t go together', 'anchor', false, 5, NULL,
 '["Regular clothes: load together — we don''t sort lights from darks in this house.", "Towels: wash separately or with other towels only.", "Bath rugs: wash separately — rubber-backed ones CANNOT go in the dryer, air dry only.", "Sheets: wash with other sheets or with towels, not with regular clothes.", "Lola''s delicates (lace, mesh, fine fabric): ALWAYS separate from Levi''s work clothes — his velcro, metal bits, and sawdust in the fabric will snag and destroy delicate items.", "If in doubt, ask."]'),

('laundry_room', 'Add detergent and softener — then start the washer', 'anchor', false, 3, NULL,
 '["Tide Pods: use 3 pods — drop them into the drum BEFORE loading clothes.", "Downy liquid fabric softener: measure the cap to the line and pour into the softener dispenser (the round drawer compartment, NOT the drum).", "Select the correct cycle — regular for clothes, delicate for anything fragile.", "Start the machine."]'),

('laundry_room', 'Move laundry to the dryer the SAME day — do not leave it wet', 'anchor', true, 3, NULL,
 '["As soon as the washer is done, move everything to the dryer — wet clothes left too long get that sour smell and have to be rewashed.", "BEFORE putting anything in the dryer, check: NO rubber-backed rugs (they melt/warp), NO bath mats with plastic backing, NO mop heads with plastic parts, NO shoes.", "Sheets and towels can go in the dryer normally.", "Start the dryer."]'),

('laundry_room', 'Fold and put away everything — same day', 'anchor', false, 20, NULL,
 '["When the dryer finishes, take everything out while it''s still warm — this prevents wrinkles.", "Fold each item neatly.", "Put away in the right drawers or hang what needs hanging.", "Don''t leave a basket of clean laundry sitting out for days — same day means same day."]'),

('laundry_room', 'Collect and wash household towels — your Sunday extra', 'anchor', true, 5, '{wyatt}',
 '["Collect all bathroom hand towels, kitchen towels, and dish rags from around the house.", "Wash them together as a separate load.", "Towels go in the dryer — no softener needed for towels (it reduces absorbency).", "Fold and return to correct spots when done."]');

-- ══════════════════════════════════════════════
-- Fix 3: Evening Dishes trash task
-- ══════════════════════════════════════════════
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, instructions) VALUES
('evening_dishes', 'Take out trash and recycling — finish the kitchen right', 'anchor', false, 5,
 '["Pull the trash bag out of the kitchen can — tie it closed.", "Check the recycling bin too — if it''s full, take it out as well.", "Take both to the outdoor trash/recycling bins.", "Look inside the empty trash can — if it''s dirty, wipe it out with a paper towel or spray.", "Put a fresh trash bag in the can.", "Done — kitchen is fully reset for tomorrow."]');

-- ══════════════════════════════════════════════
-- Fix 4: Missing zone definitions
-- ══════════════════════════════════════════════
INSERT INTO zone_definitions (zone_key, display_name, zone_type, done_means, anchor_count, rotating_count, supplies, zone_principle) VALUES
('pantry', 'Pantry', 'shared',
 'Shelves organized, expired items pulled, containers refilled, surfaces wiped',
 3, 3,
 '[{"item":"trash bag","emoji":"🗑️"},{"item":"wipe cloth","emoji":"🧽"}]',
 'See it, do it. If something is expired, toss it. If something is out of place, fix it.'),

('floors', 'Floors', 'shared',
 'All floors swept, high-traffic areas vacuumed, sticky spots mopped, vents and baseboards checked',
 3, 3,
 '[{"item":"broom/dustpan","emoji":"🧹"},{"item":"vacuum","emoji":"🔌"},{"item":"mop","emoji":"🫧"}]',
 'Clean floors = a house that feels alive. Every sweep matters.'),

('hotspot', 'Hotspot', 'shared',
 'Shoes on shelf, out-of-place items returned, coffee bar clean, surfaces wiped, floor swept',
 3, 3,
 '[{"item":"counter spray","emoji":"🧴"},{"item":"paper towels","emoji":"🧻"}]',
 'The front of the house is the face we show the world. Keep it clear.'),

('guest_bathroom', 'Guest Bathroom', 'shared',
 'Sink and faucet clean, toilet wiped, mirror clean, floor swept, towels fresh, supplies stocked',
 3, 3,
 '[{"item":"bathroom cleaner","emoji":"🧴"},{"item":"paper towels","emoji":"🧻"},{"item":"toilet brush","emoji":"🪣"}]',
 'Guests don''t live here — they just visit. Make them feel welcome.')

ON CONFLICT (zone_key) DO NOTHING;

-- Add tasks for the missing zones
-- Pantry tasks
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins) VALUES
('pantry', 'Check fridges — pull expired or old food, reorganize shelves', 'anchor', true, 5),
('pantry', 'Tidy Ziploc bags — off the floor and neatly stored', 'anchor', false, 3),
('pantry', 'Declutter pantry shelves — check for expired items, straighten and face products', 'anchor', false, 5),
('pantry', 'Wipe down pantry shelves, cabinet faces, and small appliances', 'rotating', false, 5),
('pantry', 'Refill and organize containers, spices, and frequently used items', 'rotating', false, 5);

-- Floors tasks
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, equipment) VALUES
('floors', 'Pick up items off the floor first — clear the path', 'anchor', false, 3, null),
('floors', 'Sweep all high-traffic areas', 'anchor', true, 5, null),
('floors', 'Vacuum living areas and rugs', 'anchor', true, 8, 'regular_vacuum'),
('floors', 'Spot mop any sticky or dirty patches', 'rotating', false, 5, 'mop'),
('floors', 'Check floor vents and baseboards for dust buildup', 'rotating', true, 5, null);

-- Hotspot tasks
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins) VALUES
('hotspot', 'Collect and put away shoes on the shoe shelf — keep the walkway clear', 'anchor', false, 3),
('hotspot', 'Return out-of-place items to their proper homes', 'anchor', false, 5),
('hotspot', 'Wipe down coffee bar + empty and wash Keurig pods', 'anchor', false, 4),
('hotspot', 'Sweep floor — coffee grounds, wrappers, and water drips', 'rotating', false, 3),
('hotspot', 'Tidy and wipe all hotspot surfaces — entryway table, coffee bar counter, catchall spots', 'rotating', false, 5);

-- Guest Bathroom tasks
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins) VALUES
('guest_bathroom', 'Wipe sink and faucet — leave it clean and dry', 'anchor', true, 2),
('guest_bathroom', 'Wipe toilet seat, handle, and base', 'anchor', true, 3),
('guest_bathroom', 'Clean mirror', 'anchor', false, 2),
('guest_bathroom', 'Sweep floor', 'rotating', false, 3),
('guest_bathroom', 'Freshen towels and restock guest supplies if low', 'rotating', false, 3);

-- Update laundry zone definition
UPDATE zone_definitions
SET
  done_means = 'All clothes washed, dried, folded, and put away same day. Lint trap cleaned. No wet laundry left in machine.',
  zone_principle = 'Laundry day means all the way through — start to finish, same day. Washed and sitting in the dryer is not done.'
WHERE zone_key = 'laundry_room';
