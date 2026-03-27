-- Phase M: Zone Task Rotation & Chore Detail Cards
-- Created: 2026-03-27

-- ══════════════════════════════════════════════
-- 1. CORE TABLES
-- ══════════════════════════════════════════════

-- Zone definitions — master config for each zone
CREATE TABLE IF NOT EXISTS zone_definitions (
  id SERIAL PRIMARY KEY,
  zone_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  zone_type TEXT NOT NULL DEFAULT 'shared', -- 'shared' | 'bedroom' | 'duty' | 'routine'
  assigned_to TEXT[], -- NULL = rotates per schedule; ['wyatt'] = always this kid
  supplies JSONB DEFAULT '[]', -- [{"item": "blue spray bottle", "emoji": "..."}]
  done_means TEXT,
  anchor_count INT DEFAULT 2,
  rotating_count INT DEFAULT 4,
  active BOOLEAN DEFAULT TRUE,
  zone_principle TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master task library per zone
CREATE TABLE IF NOT EXISTS zone_task_library (
  id SERIAL PRIMARY KEY,
  zone_key TEXT NOT NULL,
  task_text TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'rotating', -- 'anchor' | 'rotating' | 'weekly' | 'monthly'
  health_priority BOOLEAN DEFAULT FALSE,
  equipment TEXT, -- 'regular_vacuum' | 'shop_vac' | 'carpet_machine' | 'mop' | null
  duration_mins INT DEFAULT 5,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  kid_filter TEXT[],
  instructions JSONB DEFAULT NULL,
  once_daily BOOLEAN DEFAULT FALSE,
  bonus_task BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_zone_tasks ON zone_task_library(zone_key, task_type, active);

-- Rotation log — tracks what was assigned and completed per session
CREATE TABLE IF NOT EXISTS zone_task_rotation (
  id SERIAL PRIMARY KEY,
  zone_key TEXT NOT NULL,
  task_id INT REFERENCES zone_task_library(id),
  assigned_date DATE NOT NULL,
  kid_name TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  bonus_task BOOLEAN DEFAULT FALSE,
  bonus_description TEXT,
  UNIQUE (zone_key, task_id, assigned_date, kid_name)
);
CREATE INDEX IF NOT EXISTS idx_rotation_zone_kid ON zone_task_rotation(zone_key, kid_name, assigned_date DESC);

-- Bath schedule
CREATE TABLE IF NOT EXISTS kid_bath_schedule (
  id SERIAL PRIMARY KEY,
  kid_name TEXT UNIQUE NOT NULL,
  bath_days INTEGER[], -- day-of-week numbers: 0=Sun, 1=Mon ... 6=Sat
  cutoff_hour INTEGER DEFAULT 20,
  self_managed BOOLEAN DEFAULT FALSE,
  preferred_time TEXT DEFAULT 'pm' -- 'am' | 'pm' | 'flexible'
);

-- Morning check-ins (Kaylee + Zoey weekday accountability)
CREATE TABLE IF NOT EXISTS kid_morning_checkins (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  checkin_date DATE NOT NULL,
  checkin_type TEXT NOT NULL DEFAULT 'wake', -- 'wake' | 'ready'
  checkin_time TIME NOT NULL,
  points_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (kid_name, checkin_date, checkin_type)
);

-- Kid routine flags (eczema, glasses, etc.)
CREATE TABLE IF NOT EXISTS kid_routine_flags (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  flag_key TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (kid_name, flag_key)
);

-- ══════════════════════════════════════════════
-- 2. SEED: Zone Definitions
-- ══════════════════════════════════════════════

INSERT INTO zone_definitions (zone_key, display_name, zone_type, done_means, anchor_count, rotating_count, supplies) VALUES

('kids_bathroom', 'Kids Bathroom', 'shared',
 'Sink dry and clean, countertop clear, towels hung, floor clear, toilet exterior wiped, mirror streak-free',
 3, 4,
 '[{"item":"blue spray bottle","emoji":"🧴"},{"item":"paper towels","emoji":"🧻"},{"item":"toilet brush + cleaner","emoji":"🪣"},{"item":"scrub sponge","emoji":"🧽"}]'),

('kitchen_zone', 'Kitchen Zone', 'shared',
 'All counters dry and clear, stovetop clean, floor swept, no food left out, no standing spills',
 2, 4,
 '[{"item":"counter spray","emoji":"🧴"},{"item":"paper towels","emoji":"🧻"},{"item":"dish soap","emoji":"🫧"},{"item":"floor broom/dustpan","emoji":"🧹"}]'),

('school_room', 'School Room', 'shared',
 'All surfaces wiped, books put away, floor clear, chairs pushed in, whiteboard clean',
 4, 3,
 '[{"item":"surface spray","emoji":"🧴"},{"item":"paper towels","emoji":"🧻"},{"item":"whiteboard eraser","emoji":"⬜"}]'),

('laundry_room', 'Laundry Room', 'duty',
 'No laundry left in washer or dryer, lint trap clean, floor clear, surfaces wiped',
 2, 3,
 '[{"item":"damp cloth","emoji":"🧽"},{"item":"washer cleaner tab (monthly)","emoji":"🫧"}]'),

('dinner_manager', 'Dinner Manager Tasks', 'duty',
 'Kitchen cleared after dinner, stovetop wiped, table wiped, leftovers put away, trash not overflowing',
 3, 3,
 '[{"item":"counter spray","emoji":"🧴"},{"item":"paper towels","emoji":"🧻"},{"item":"food storage containers","emoji":"📦"}]'),

('belle_care', 'Belle Care', 'duty',
 'Water bowl refilled, Belle fed correct amount, bathroom break done, any concerns noted',
 4, 1,
 '[{"item":"Belle''s food scoop","emoji":"🐾"},{"item":"poop bags","emoji":"💩"},{"item":"brush (brushing days)","emoji":"🐕"}]'),

('bedroom_amos', 'Amos — My Room', 'bedroom', 'Floor clear, laundry in hamper, bed made, dishes out, surfaces dusted, trash emptied', 5, 3,
 '[{"item":"regular vacuum","emoji":"🔌"},{"item":"dust cloth","emoji":"🧹"}]'),

('bedroom_ellie', 'Ellie — My Room', 'bedroom', 'Floor clear, laundry in hamper, bed made, dishes out, surfaces dusted, trash emptied', 5, 3,
 '[{"item":"regular vacuum","emoji":"🔌"},{"item":"dust cloth","emoji":"🧹"}]'),

('bedroom_wyatt', 'Wyatt — My Room', 'bedroom', 'Floor clear, laundry in hamper, bed made, dishes out, surfaces dusted, trash emptied', 5, 3,
 '[{"item":"regular vacuum","emoji":"🔌"},{"item":"dust cloth","emoji":"🧹"}]'),

('bedroom_hannah', 'Hannah — My Room', 'bedroom', 'Floor clear, laundry in hamper, bed made, dishes out, surfaces dusted, trash emptied', 5, 3,
 '[{"item":"regular vacuum","emoji":"🔌"},{"item":"dust cloth","emoji":"🧹"}]'),

('bedroom_zoey', 'Zoey — My Room', 'bedroom', 'Floor clear, laundry in hamper, bed made, dishes out, surfaces dusted, trash emptied', 5, 3,
 '[{"item":"regular vacuum","emoji":"🔌"},{"item":"dust cloth","emoji":"🧹"}]'),

('bedroom_kaylee', 'Kaylee — My Room', 'bedroom', 'Floor clear, laundry in hamper, bed made, dishes out, surfaces dusted, trash emptied', 5, 3,
 '[{"item":"regular vacuum","emoji":"🔌"},{"item":"dust cloth","emoji":"🧹"}]'),

('morning_routine', 'Morning Routine', 'routine', 'Teeth brushed, face washed, dressed, bed made, breakfast eaten, dishes cleared', 7, 2,
 '[]'),

('bedtime_routine', 'Bedtime Routine', 'routine', 'Teeth brushed, pajamas on, floor clear, device charging in designated spot', 4, 3,
 '[]')

ON CONFLICT (zone_key) DO NOTHING;

-- Set the global "See It, Do It" principle on all zones
UPDATE zone_definitions SET zone_principle =
'See it, do it. If something needs doing and you''re standing right there — a tissue on the floor, a cup left out, a toilet seat that needs wiping — take care of it. You don''t have to own the mess to fix it. That''s what it means to live here.';

-- ══════════════════════════════════════════════
-- 3. SEED: Task Library — Kids Bathroom
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins) VALUES
-- Anchors
('kids_bathroom', 'Wipe sink faucet and basin dry', 'anchor', true, 2),
('kids_bathroom', 'Wipe countertop clear and dry', 'anchor', false, 2),
('kids_bathroom', 'Hang towels neatly on bar or hook', 'anchor', false, 1),
-- Rotating
('kids_bathroom', 'Clean toilet bowl with brush and cleaner', 'rotating', true, 4),
('kids_bathroom', 'Wipe toilet seat, lid, and full exterior', 'rotating', true, 3),
('kids_bathroom', 'Scrub sink basin with sponge', 'rotating', true, 3),
('kids_bathroom', 'Clean mirror streak-free', 'rotating', false, 2),
('kids_bathroom', 'Sweep and mop bathroom floor', 'rotating', true, 5),
('kids_bathroom', 'Clean shower walls or tub interior', 'rotating', true, 6),
('kids_bathroom', 'Empty and reline trash can', 'rotating', false, 2),
('kids_bathroom', 'Wipe soap dispenser and toothbrush holder', 'rotating', true, 2),
('kids_bathroom', 'Wipe light switch, door handle, cabinet handles', 'rotating', true, 2),
('kids_bathroom', 'Organize under-sink cabinet', 'rotating', false, 5),
('kids_bathroom', 'Wipe baseboards', 'rotating', true, 4),
('kids_bathroom', 'Replace toilet paper roll and check supply', 'rotating', false, 1);

-- Update equipment for mop task
UPDATE zone_task_library SET equipment = 'mop' WHERE zone_key = 'kids_bathroom' AND task_text LIKE 'Sweep and mop%';

-- ══════════════════════════════════════════════
-- 4. SEED: Task Library — Kitchen Zone
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, equipment, duration_mins) VALUES
-- Anchors
('kitchen_zone', 'Wipe all counters clear and dry', 'anchor', false, null, 3),
('kitchen_zone', 'Sweep kitchen floor', 'anchor', true, null, 3),
-- Rotating
('kitchen_zone', 'Clean microwave inside — damp cloth to loosen and wipe', 'rotating', true, null, 4),
('kitchen_zone', 'Wipe microwave exterior and door handle', 'rotating', false, null, 2),
('kitchen_zone', 'Wipe stovetop surface and knobs', 'rotating', true, null, 4),
('kitchen_zone', 'Wipe cabinet door fronts — one full section', 'rotating', false, null, 5),
('kitchen_zone', 'Scrub kitchen sink basin', 'rotating', true, null, 3),
('kitchen_zone', 'Wipe outside of fridge — top, front, handles', 'rotating', false, null, 3),
('kitchen_zone', 'Mop kitchen floor', 'rotating', true, 'mop', 6),
('kitchen_zone', 'Organize one pantry section', 'rotating', false, null, 6),
('kitchen_zone', 'Organize one kitchen drawer', 'rotating', false, null, 5),
('kitchen_zone', 'Wipe backsplash tiles', 'rotating', true, null, 4),
('kitchen_zone', 'Clean toaster — empty crumb tray and wipe', 'rotating', true, null, 3),
('kitchen_zone', 'Wipe light switches and door handles', 'rotating', true, null, 2),
('kitchen_zone', 'Vacuum under and around appliances', 'rotating', true, 'shop_vac', 5),
('kitchen_zone', 'Wipe baseboards in kitchen', 'rotating', true, null, 4);

-- ══════════════════════════════════════════════
-- 5. SEED: Task Library — School Room
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, equipment, duration_mins) VALUES
-- Anchors
('school_room', 'Put away all books, papers, and school materials', 'anchor', false, null, 4),
('school_room', 'Wipe all table and desk surfaces', 'anchor', false, null, 3),
('school_room', 'Push in all chairs', 'anchor', false, null, 1),
('school_room', 'Pick up entire floor — no items left out', 'anchor', false, null, 3),
-- Rotating
('school_room', 'Erase and clean whiteboard fully', 'rotating', true, null, 2),
('school_room', 'Vacuum rug or carpet', 'rotating', true, 'regular_vacuum', 5),
('school_room', 'Organize one bookshelf section', 'rotating', false, null, 5),
('school_room', 'Sort and file loose papers', 'rotating', false, null, 4),
('school_room', 'Clean and organize art/craft supplies', 'rotating', false, null, 5),
('school_room', 'Dust windowsills and any ledges', 'rotating', true, null, 3),
('school_room', 'Wipe baseboards', 'rotating', true, null, 4),
('school_room', 'Wipe light switches and door handles', 'rotating', true, null, 2);

-- ══════════════════════════════════════════════
-- 6. SEED: Task Library — Bedrooms (all 6 kids)
-- ══════════════════════════════════════════════

DO $$
DECLARE
  kid TEXT;
  kids TEXT[] := ARRAY['amos','ellie','wyatt','hannah','zoey','kaylee'];
BEGIN
  FOREACH kid IN ARRAY kids LOOP
    INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, equipment, duration_mins) VALUES
    -- Anchors (every day, non-negotiable)
    ('bedroom_' || kid, 'Pick up floor — nothing on the floor', 'anchor', false, null, 3),
    ('bedroom_' || kid, 'Dirty laundry in hamper — not on chair or floor', 'anchor', false, null, 2),
    ('bedroom_' || kid, 'Make bed', 'anchor', false, null, 3),
    ('bedroom_' || kid, 'Remove any dishes or cups — take to kitchen', 'anchor', false, null, 1),
    ('bedroom_' || kid, 'Trash in trash can', 'anchor', false, null, 1),
    -- Rotating
    ('bedroom_' || kid, 'Vacuum full bedroom floor and under bed edges', 'rotating', true, 'regular_vacuum', 6),
    ('bedroom_' || kid, 'Dust all surfaces — dresser, nightstand, shelves', 'rotating', true, null, 5),
    ('bedroom_' || kid, 'Pull out from under bed and vacuum underneath', 'rotating', true, 'regular_vacuum', 6),
    ('bedroom_' || kid, 'Change bedsheets — remove, wash, and remake', 'rotating', true, null, 10),
    ('bedroom_' || kid, 'Wipe light switch and door handle', 'rotating', true, null, 2),
    ('bedroom_' || kid, 'Wipe baseboards', 'rotating', true, null, 4),
    ('bedroom_' || kid, 'Wipe ceiling fan blades if reachable', 'rotating', true, null, 4),
    ('bedroom_' || kid, 'Organize one dresser drawer', 'rotating', false, null, 5),
    ('bedroom_' || kid, 'Organize one section of closet', 'rotating', false, null, 6),
    ('bedroom_' || kid, 'Wipe windowsill and window ledge', 'rotating', true, null, 3),
    ('bedroom_' || kid, 'Empty and reline trash can', 'rotating', false, null, 2);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════
-- 7. SEED: Task Library — Laundry Duty
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, equipment, duration_mins) VALUES
-- Anchors
('laundry_room', 'Move laundry from washer to dryer — no leaving wet laundry', 'anchor', true, null, 3),
('laundry_room', 'Clean lint trap before starting dryer', 'anchor', true, null, 1),
-- Rotating
('laundry_room', 'Wipe inside of washing machine drum and door seal', 'rotating', true, null, 4),
('laundry_room', 'Wipe dryer lint trap area and surrounding drum', 'rotating', true, null, 3),
('laundry_room', 'Wipe top and exterior of washer and dryer', 'rotating', false, null, 3),
('laundry_room', 'Sweep laundry room floor', 'rotating', true, null, 3),
('laundry_room', 'Mop laundry room floor', 'rotating', true, 'mop', 4),
('laundry_room', 'Clean detergent dispenser drawer — remove and rinse', 'rotating', true, null, 5),
('laundry_room', 'Organize laundry supply shelf', 'rotating', false, null, 4),
('laundry_room', 'Check dryer vent hose for lint buildup — report to Mom', 'rotating', true, null, 2);

-- ══════════════════════════════════════════════
-- 8. SEED: Task Library — Dinner Manager
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins) VALUES
-- Anchors
('dinner_manager', 'Set out ingredients and tools before cooking begins', 'anchor', false, 5),
('dinner_manager', 'Wipe stovetop after cooking while still warm', 'anchor', true, 3),
('dinner_manager', 'Wipe cooking surfaces and counters used', 'anchor', false, 3),
-- Rotating
('dinner_manager', 'Set the table before dinner', 'rotating', false, 3),
('dinner_manager', 'Put away all leftovers in containers after dinner', 'rotating', false, 5),
('dinner_manager', 'Wipe dining table and chairs after dinner', 'rotating', false, 3),
('dinner_manager', 'Take out kitchen trash if at or near full', 'rotating', false, 3),
('dinner_manager', 'Put away all cooking ingredients and tools used', 'rotating', false, 4),
('dinner_manager', 'Sweep under and around dining table after dinner', 'rotating', true, 3);

-- ══════════════════════════════════════════════
-- 9. SEED: Task Library — Belle Care
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins) VALUES
('belle_care', 'Rinse and refill Belle''s water bowl', 'anchor', false, 2),
('belle_care', 'Feed Belle — correct scoop amount, no double-feeding', 'anchor', false, 2),
('belle_care', 'Take Belle outside for bathroom break — wait and supervise', 'anchor', false, 5),
('belle_care', 'Note anything unusual — eating, drinking, behavior, bathroom', 'anchor', false, 1),
-- Rotating
('belle_care', 'Brush Belle — check for tangles or skin issues', 'rotating', false, 5);

-- Belle care handwashing anchor
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('belle_care', 'Wash your hands after caring for Belle', 'anchor', true, 1, NULL,
 '["Dog mouths, paws, and fur carry bacteria — even from a healthy, clean dog.", "Always wash with soap after feeding, handling, or picking up after Belle.", "This goes double if you touched her mouth area or cleaned up a mess."]');

-- ══════════════════════════════════════════════
-- 10. SEED: Task Library — Morning Routine
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins) VALUES
('morning_routine', 'Brush teeth — 2 full minutes', 'anchor', true, 2),
('morning_routine', 'Wash face', 'anchor', true, 2),
('morning_routine', 'Get dressed — yesterday''s clothes in hamper, not on floor', 'anchor', false, 5),
('morning_routine', 'Make bed', 'anchor', false, 3),
('morning_routine', 'Eat breakfast', 'anchor', false, 15),
('morning_routine', 'Scrape and rinse your own dishes — don''t leave for someone else', 'anchor', false, 2),
('morning_routine', 'Put away anything you got out for breakfast', 'anchor', false, 2),
('morning_routine', 'Take any medications if applicable', 'rotating', true, 1);

-- Add instructions to brush teeth
UPDATE zone_task_library
SET instructions = '["Use a pea-sized amount of toothpaste.", "Brush all surfaces of every tooth: outside (facing your cheeks), inside (facing your tongue), and the chewing surface on top. All three sides.", "Brush for 2 full minutes — set a timer. Most people stop at 30 seconds and wonder why their breath stinks.", "Don''t forget your back molars — that''s where cavities hide because everyone rushes past them.", "Brush the inside of your cheeks — the soft tissue against your teeth traps bacteria too.", "Brush the roof of your mouth — it gets a film of bacteria on it just like everything else.", "Brush your tongue. All of it, front to back. Tongue bacteria is the #1 cause of bad breath. If you skip your tongue, your breath will still smell even if your teeth are clean.", "Rinse with mouthwash — swish for 30 seconds, then spit. Don''t rinse with water right after or you wash the mouthwash off.", "Spit — don''t swallow any of this.", "Floss at least once a day — bedtime is best. Slide between every tooth in a C-shape and go just below the gumline. If your gums bleed, that means they need more flossing, not less."]'
WHERE task_text LIKE 'Brush teeth%' AND zone_key = 'morning_routine' AND instructions IS NULL;

-- Add instructions to wash face
UPDATE zone_task_library
SET instructions = '["Wet face with warm water — not hot.", "Apply a small amount of face wash or cleanser to your hands.", "Gently massage onto face in small circles — forehead, nose, chin, cheeks.", "Rinse fully until no cleanser remains on skin.", "Pat dry with a clean towel — never rub.", "Apply moisturizer if you have one (especially important for Hannah)."]'
WHERE zone_key = 'morning_routine' AND task_text LIKE 'Wash face%';

-- ══════════════════════════════════════════════
-- 11. SEED: Task Library — Bedtime Routine
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins) VALUES
('bedtime_routine', 'Brush teeth — 2 full minutes', 'anchor', true, 2),
('bedtime_routine', 'Pajamas on — today''s clothes in hamper', 'anchor', false, 3),
('bedtime_routine', 'Bedroom floor clear before bed', 'anchor', false, 3),
('bedtime_routine', 'Device charged and placed in designated charging spot — not in bed', 'anchor', false, 1),
('bedtime_routine', 'Lay out tomorrow''s clothes', 'rotating', false, 2),
('bedtime_routine', 'Shower or bath (on your assigned bath night)', 'rotating', true, 15),
('bedtime_routine', 'Take any evening medications if applicable', 'rotating', true, 1);

-- Add instructions to bedtime brush teeth
UPDATE zone_task_library
SET instructions = '["Use a pea-sized amount of toothpaste.", "Brush all surfaces of every tooth: outside (facing your cheeks), inside (facing your tongue), and the chewing surface on top. All three sides.", "Brush for 2 full minutes — set a timer. Most people stop at 30 seconds and wonder why their breath stinks.", "Don''t forget your back molars — that''s where cavities hide because everyone rushes past them.", "Brush the inside of your cheeks — the soft tissue against your teeth traps bacteria too.", "Brush the roof of your mouth — it gets a film of bacteria on it just like everything else.", "Brush your tongue. All of it, front to back. Tongue bacteria is the #1 cause of bad breath. If you skip your tongue, your breath will still smell even if your teeth are clean.", "Rinse with mouthwash — swish for 30 seconds, then spit. Don''t rinse with water right after or you wash the mouthwash off.", "Spit — don''t swallow any of this.", "Floss at least once a day — bedtime is best. Slide between every tooth in a C-shape and go just below the gumline. If your gums bleed, that means they need more flossing, not less."]'
WHERE task_text LIKE 'Brush teeth%' AND zone_key = 'bedtime_routine' AND instructions IS NULL;

-- ══════════════════════════════════════════════
-- 12. SEED: Kid-Specific Medication Anchors
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter) VALUES
('morning_routine', 'Take Focalin — ADHD morning dose', 'anchor', true, 1, '{amos,wyatt}'),
('morning_routine', 'Wipe your lenses clean — sparkly new day', 'anchor', false, 1, '{kaylee}'),
('morning_routine', 'Apply eczema cream to any flare areas', 'anchor', true, 2, '{hannah}');

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter) VALUES
('bedtime_routine', 'Take Clonidine — evening sleep dose', 'anchor', true, 1, '{wyatt}');

-- ══════════════════════════════════════════════
-- 13. SEED: Bath Schedule
-- ══════════════════════════════════════════════

INSERT INTO kid_bath_schedule (kid_name, bath_days, cutoff_hour, self_managed, preferred_time) VALUES
('amos',   '{1,3,5,0}', 20, false, 'am'),
('wyatt',  '{1,3,5,0}', 20, false, 'pm'),
('ellie',  '{1,3,6}',   20, false, 'pm'),
('hannah', '{2,4,6}',   20, false, 'pm'),
('zoey',   '{}',        21, true,  'flexible'),
('kaylee', '{}',        20, true,  'flexible')
ON CONFLICT (kid_name) DO NOTHING;

-- ══════════════════════════════════════════════
-- 14. SEED: Routine Flags
-- ══════════════════════════════════════════════

INSERT INTO kid_routine_flags (kid_name, flag_key, active) VALUES
('hannah', 'eczema_flare', false),
('kaylee', 'wears_glasses', true)
ON CONFLICT (kid_name, flag_key) DO NOTHING;

-- ══════════════════════════════════════════════
-- 15. SEED: Personal Hygiene & Grooming Tasks
-- ══════════════════════════════════════════════

-- Deodorant — daily anchor, all kids
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('morning_routine', 'Put on deodorant', 'anchor', true, 1, NULL,
 '["Apply to clean, dry underarms — both sides.", "Let it dry before putting on your shirt.", "If using spray: hold 6 inches away, spray for 1–2 seconds each side.", "Replace when it stops working or runs out — tell Mom so she can restock."]');

-- Amos beard trim — weekly
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('morning_routine', 'Check your beard — trim or tidy if it''s getting scraggly', 'weekly', false, 10, '{amos}',
 '["Take a look in the mirror. If it''s looking patchy, uneven, or longer than you want — trim it today.", "Make sure your trimmer is charged before you start. If it''s dead, plug it in now and come back to this.", "Pick your guard length and run it evenly across your jaw, chin, and upper lip.", "Clean up your neckline — the line should follow the natural curve just above your Adam''s apple. Freehand it or use the edge of the trimmer guard.", "Check both sides are even — turn your head and look from different angles.", "Rinse your face when done. Clean out the trimmer head so it''s ready for next time.", "Put the trimmer back on the charger when you''re done — future you will thank you."]');

-- Deep face scrub — weekly bedtime
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('bedtime_routine', 'Deep face scrub — weekly', 'weekly', false, 5, '{amos,kaylee,zoey}',
 '["Wet face with warm water.", "Apply a small pea-sized amount of exfoliating scrub (or a gentle cleanser + washcloth).", "Use two fingers in small gentle circles — forehead, nose, chin, cheeks. Gentle — you''re not scrubbing a pan.", "Rinse fully.", "Pat dry. Don''t rub.", "Apply moisturizer while skin is still slightly damp — helps it absorb.", "Don''t do this more than once a week — over-exfoliating causes breakouts."]');

-- Nail trimming — weekly bedtime
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('bedtime_routine', 'Check and trim fingernails if needed', 'weekly', false, 5, NULL,
 '["Best time to trim: right after a shower or bath when nails are soft.", "Use nail clippers — clip in a slight curve, following the shape of your fingertip.", "Don''t clip too short — leave a tiny bit of white at the edge.", "File any sharp or jagged edges with a nail file.", "Check all 10 fingers — don''t forget your thumbs.", "Throw clippings in the trash, not the floor."]'),
('bedtime_routine', 'Check and trim toenails if needed', 'monthly', false, 5, NULL,
 '["Use nail clippers. Toenails: clip STRAIGHT ACROSS — not curved. Curved toenail cuts cause ingrown nails.", "Don''t clip too short.", "File any sharp edges.", "Check under toenails — if there''s dark buildup, clean gently with a nail tool or corner of a towel.", "Throw clippings in the trash."]');

-- Ear cleaning — weekly
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('bedtime_routine', 'Clean ears', 'weekly', true, 2, NULL,
 '["Use a damp washcloth or cotton ball — NOT a Q-tip inside your ear canal. You can push wax deeper and hurt yourself.", "Wipe the outer part of your ear — the curves and folds you can see.", "Behind your ears too — it gets waxy and smelly back there.", "If your ear feels plugged or you can''t hear well, tell Mom — that''s a job for ear drops, not a Q-tip."]');

-- Leg shaving — weekly, Kaylee + Zoey
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('bedtime_routine', 'Shave legs if needed', 'weekly', false, 10, '{kaylee,zoey}',
 '["Always shave in the shower or right after — warm water softens hair and opens pores.", "Apply shaving cream, body wash, or conditioner to your legs first. Never dry shave — it will nick you every time.", "Use a clean razor. Hold it at a low angle against your skin.", "Start shaving upward (against the direction of hair growth) with slow, gentle strokes.", "Rinse the razor after every 2–3 strokes — clogged razors cut worse.", "Go slowly around knees and ankles — those angles are where you nick yourself.", "Rinse legs fully when done.", "Pat dry. Apply lotion — freshly shaved skin gets dry fast.", "Replace your razor when the blades feel rough or you''re getting nicks. A dull razor is more dangerous than a sharp one."]');

-- Moisturizing — weekly for all, anchor for Hannah
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('bedtime_routine', 'Lotion — moisturize your skin', 'weekly', false, 3, NULL,
 '["Apply lotion after a shower while your skin is still slightly damp — it absorbs better.", "Pay attention to elbows, knees, heels, and hands — these dry out fastest.", "Use a fragrance-free lotion if you have sensitive skin.", "Don''t forget your face — use a face-specific moisturizer if you have one."]');

-- Hannah eczema moisturize anchor
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('bedtime_routine', 'Moisturize right after bath — don''t wait', 'anchor', true, 3, '{hannah}',
 '["Apply eczema cream or moisturizer IMMEDIATELY after your bath — within 3 minutes of getting out.", "Do NOT air dry first. Pat lightly with a towel, then apply cream while skin is still damp.", "This is the most important part of managing your skin. The moisture seal you''re creating keeps your skin barrier healthy.", "Cover any areas that look red, dry, or itchy — apply extra there.", "If a spot looks cracked or is really itchy, tell Mom — it may need a different treatment."]');

-- Body hygiene check — weekly
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('bedtime_routine', 'Check: did you actually wash your body in the shower?', 'weekly', true, 1, NULL,
 '["A real shower means soap touches every major area — not just a rinse.", "Armpits — both of them, with soap.", "Your booty — front AND back. All of it. With soap. This is non-negotiable and yes, every single time.", "Between your legs, front and back — fully. This is the area that causes the most odor and the most laundry problems when skipped.", "Feet — including the bottoms and between your toes. Feet sitting in soapy water that drains past them does not count as washing your feet.", "Rinse everything completely.", "Rinsing without soap is just getting wet. It does not count.", "Shampooing your hair does not wash your body.", "Your underwear tells the story — clean yourself and the laundry will reflect it."]');

-- Hair brush — Ellie + Hannah, both routines
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter) VALUES
('morning_routine', 'Brush and detangle hair', 'anchor', true, 5, '{ellie,hannah}'),
('bedtime_routine', 'Brush and fully detangle hair', 'anchor', true, 5, '{ellie,hannah}');

-- ══════════════════════════════════════════════
-- 16. SEED: Handwashing Anchors
-- ══════════════════════════════════════════════

-- Morning routine anchor
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('morning_routine', 'Wash your hands', 'anchor', true, 1, NULL,
 '["Wet hands with warm water.", "Apply soap — enough to lather.", "Scrub for at least 20 seconds — that''s longer than you think. Hum the Happy Birthday song once through.", "Get between your fingers, under your nails, the backs of your hands, and your wrists.", "Rinse completely.", "Dry with a clean towel or paper towel — wet hands spread more germs than dry ones.", "The times that matter most: after the bathroom (every single time), before eating, after blowing your nose, after touching your face or eyes, after petting Belle, after being outside or at a store."]');

-- Bedtime routine anchor
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('bedtime_routine', 'Wash your hands before bed', 'anchor', true, 1, NULL,
 '["Your hands have touched door handles, phones, remotes, other people''s stuff, your own face — all day.", "Warm water + soap + 20 seconds. Every night before you touch your pillow.", "This is one of the easiest ways to stop a cold, stomach bug, or pink eye from spreading through the whole house.", "One person skipping this isn''t just a risk to them — it''s a risk to everyone they share space with."]');

-- ══════════════════════════════════════════════
-- 17. SEED: Pillowcase Rotation — Weekly (all bedrooms)
-- ══════════════════════════════════════════════

DO $$
DECLARE
  kid TEXT;
  kids TEXT[] := ARRAY['amos','ellie','wyatt','zoey','kaylee'];
  instr TEXT := '["Pull the pillowcase off and toss it in the hamper.", "Put a fresh one on.", "Your face is on this for 8 hours every night. It gets dirty faster than your sheets.", "Doing this weekly prevents breakouts, eye irritation, and that stale smell your pillow gets.", "If you''ve been sick — change it the same day you start feeling better, not a week later."]';
BEGIN
  FOREACH kid IN ARRAY kids LOOP
    INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, equipment, duration_mins, kid_filter, instructions)
    VALUES ('bedroom_' || kid, 'Change your pillowcase', 'weekly', true, null, 3, null, instr::jsonb);
  END LOOP;
  -- Hannah gets extra skin note
  INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, equipment, duration_mins, kid_filter, instructions)
  VALUES ('bedroom_hannah', 'Change your pillowcase', 'weekly', true, null, 3, null,
    '["Pull the pillowcase off and toss it in the hamper.", "Put a fresh one on.", "Your face is on this for 8 hours every night. It gets dirty faster than your sheets.", "Doing this weekly prevents breakouts, eye irritation, and that stale smell your pillow gets. Especially important for your skin.", "If you''ve been sick — change it the same day you start feeling better, not a week later."]'::jsonb);
END $$;

-- ══════════════════════════════════════════════
-- 18. SEED: "Don't Touch Your Face" Reminder
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('morning_routine', 'Reminder: hands away from your face today', 'weekly', true, 1, NULL,
 '["The average person touches their face 20–25 times an hour without realizing it.", "Every time you touch your eyes, nose, or mouth with unwashed hands, you give germs a direct path in.", "Pink eye spreads this way. Stomach bugs spread this way. Colds spread this way.", "You don''t have to be paranoid — just wash your hands regularly and try to catch yourself before you rub your eyes or bite your nails.", "In this house, when one person gets sick, everyone gets a turn. Protecting yourself is protecting everyone."]');

-- ══════════════════════════════════════════════
-- 19. SEED: Bedtime "Leave the house right" scan
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('bedtime_routine', 'Quick scan before bed — did you leave anything out?', 'anchor', false, 2, NULL,
 '["Before you go to bed, do a 30-second mental walk-through of where you were today.", "Did you leave a cup or plate somewhere that isn''t the kitchen? Go get it.", "Did you leave a tissue, wrapper, or trash somewhere? Grab it.", "Did you leave the bathroom a mess after getting ready? Take 60 seconds to fix it.", "Did you leave lights on in a room you''re done in? Turn them off.", "This isn''t about perfection — it''s about not leaving your messes for someone else to wake up to."]');

-- ══════════════════════════════════════════════
-- 20. SEED: "See It, Do It" Zone-Specific Anchors
-- ══════════════════════════════════════════════

-- Kids Bathroom — 3 new anchors
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('kids_bathroom', 'Wipe the toilet seat before you leave — every time', 'anchor', true, 1, NULL,
 '["If you used the toilet, check the seat and rim before you leave.", "Boys especially: if you stood up to pee, check the seat, the rim, and the floor directly in front of the toilet.", "You don''t have to admit you made a mess. You just have to wipe it up. Grab a square of toilet paper or a paper towel, wipe, flush or trash it.", "Nobody wants to sit in someone else''s drips. This is a basic respect thing."]'),
('kids_bathroom', 'Rinse the sink after you use it', 'anchor', false, 1, NULL,
 '["After brushing teeth, washing face, or anything else — rinse the basin.", "Toothpaste spit dries to concrete if you leave it. Takes 10 seconds to rinse it now vs. 5 minutes to scrub it later.", "Run water around the basin, wipe any toothpaste off the faucet handle if you got any on it.", "Leave the sink clean for the next person."]'),
('kids_bathroom', 'Towel on the hook, not the floor', 'anchor', false, 1, NULL,
 '["After drying off, hang your towel back on the bar or hook.", "A towel on the floor can''t dry properly — it stays wet and gets mildewy and gross.", "If your towel is soaking wet from your hair — hang it spread out so it can actually dry.", "Towels on the floor become a slip hazard and a laundry problem."]');

-- Kitchen Zone — 2 new anchors
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('kitchen_zone', 'If you spilled it — clean it now, not later', 'anchor', true, 2, NULL,
 '["A spill cleaned immediately takes 10 seconds. A spill left to dry takes 5 minutes and a scrub.", "Juice on the counter, water on the floor, crumbs on the table — if you made it, you own it.", "Grab a paper towel or cloth, wipe it up, done.", "Leaving a spill for ''the zone person'' or for Mom is not okay. You were standing right there."]'),
('kitchen_zone', 'Any dish you took out of the kitchen comes back before bed', 'anchor', false, 2, NULL,
 '["If you carried a cup, plate, bowl, or snack container to another room — it comes back to the kitchen before you go to bed.", "This includes the living room, your bedroom, the school room, anywhere.", "It''s not the zone cleaner''s job to collect your dishes from around the house.", "Do a quick mental scan before bed: did I take anything out of the kitchen today? Go get it."]');

-- All Bedrooms — tissue/trash scan anchor
DO $$
DECLARE
  kid TEXT;
  kids TEXT[] := ARRAY['amos','ellie','wyatt','hannah','zoey','kaylee'];
  instr TEXT := '["A quick visual scan of your floor, nightstand, and any surfaces for tissues, candy wrappers, water bottles, or trash.", "Pick up your own. If you see one that wasn''t yours — pick it up anyway.", "Leaving used tissues around spreads germs to everyone in the house. Colds, pink eye, and stomach bugs travel on tissues.", "Takes 30 seconds. Trash it."]';
BEGIN
  FOREACH kid IN ARRAY kids LOOP
    INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions)
    VALUES ('bedroom_' || kid, 'Scan for tissues, wrappers, or trash — yours and any you see', 'anchor', true, 2, NULL, instr::jsonb);
  END LOOP;
END $$;

-- School Room — awareness anchor
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES
('school_room', 'If you see something out of place — put it away, don''t walk past it', 'anchor', false, 1, NULL,
 '["If you''re the last one in the school room and something is obviously wrong — a book on the floor, a marker without a cap, someone''s water bottle left — take care of it.", "The rule isn''t ''it''s not my mess.'' The rule is: if you''re there and it takes less than 30 seconds, just do it.", "This is how a shared space stays workable for everyone."]');

-- ══════════════════════════════════════════════
-- 21. SEED: Carpet Cleaning Machine Rotation (monthly)
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, equipment, duration_mins) VALUES
('bedroom_amos',   'Deep clean carpet with carpet cleaning machine', 'monthly', true, 'carpet_machine', 20),
('bedroom_ellie',  'Deep clean carpet with carpet cleaning machine', 'monthly', true, 'carpet_machine', 20),
('bedroom_wyatt',  'Deep clean carpet with carpet cleaning machine', 'monthly', true, 'carpet_machine', 20),
('bedroom_hannah', 'Deep clean carpet with carpet cleaning machine', 'monthly', true, 'carpet_machine', 20),
('bedroom_zoey',   'Deep clean carpet with carpet cleaning machine', 'monthly', true, 'carpet_machine', 20),
('bedroom_kaylee', 'Deep clean carpet with carpet cleaning machine', 'monthly', true, 'carpet_machine', 20),
('school_room',    'Deep clean carpet/rug with carpet cleaning machine', 'monthly', true, 'carpet_machine', 25),
('kitchen_zone',   'Deep clean living room carpet with carpet cleaning machine', 'monthly', true, 'carpet_machine', 30);

-- Shop vac tasks
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, equipment, duration_mins) VALUES
('kids_bathroom',  'Shop vac bathroom corners, baseboards, and vent', 'rotating', true, 'shop_vac', 5),
('kitchen_zone',   'Shop vac stairs — every step top to bottom', 'rotating', true, 'shop_vac', 10),
('kitchen_zone',   'Shop vac upholstered furniture — couch, chairs, cushions', 'rotating', true, 'shop_vac', 10),
('kitchen_zone',   'Shop vac under furniture edges and corners', 'rotating', true, 'shop_vac', 8);
