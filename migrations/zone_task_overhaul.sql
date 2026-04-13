-- D60 ZONE-1 to ZONE-6: Full zone task library rewrite
-- Rewrites hotspot, kitchen_zone, guest_bathroom, kids_bathroom, pantry, floors
-- to match the actual physical scope of each zone (live-tested April 13, 2026).
-- Previous state had Hotspot showing kitchen tasks due to frontend mapping bug
-- (ZONE_NAME_TO_KEY in DailyChecklist.tsx), fixed in same commit.

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- Clear existing rotation and tasks for the 6 rotating zones
-- ──────────────────────────────────────────────────────────────
DELETE FROM zone_task_rotation
 WHERE zone_key IN ('hotspot','kitchen_zone','guest_bathroom','kids_bathroom','pantry','floors');

DELETE FROM zone_task_library
 WHERE zone_key IN ('hotspot','kitchen_zone','guest_bathroom','kids_bathroom','pantry','floors');

-- ──────────────────────────────────────────────────────────────
-- Update zone_definitions: supplies, done_means, counts, display
-- ──────────────────────────────────────────────────────────────

UPDATE zone_definitions SET
  display_name = 'Hotspot — Common Areas',
  done_means = 'Coffee bar clean, entryway tidy, stairs clear, no water spills, door handles wiped, plants checked',
  anchor_count = 5,
  rotating_count = 3,
  supplies = '[{"item":"all-purpose spray","emoji":"🧴"},{"item":"paper towels","emoji":"🧻"},{"item":"disinfectant wipes","emoji":"🧽"},{"item":"broom + dustpan","emoji":"🧹"}]'::jsonb
WHERE zone_key = 'hotspot';

UPDATE zone_definitions SET
  display_name = 'Kitchen Zone — Deep Clean & Organize',
  done_means = 'All counters washed and dry, stove/microwave wiped inside and out, cabinets and drawers organized, no expired items visible, kitchen running smooth',
  anchor_count = 4,
  rotating_count = 3,
  supplies = '[{"item":"counter spray","emoji":"🧴"},{"item":"dish soap","emoji":"🫧"},{"item":"paper towels","emoji":"🧻"},{"item":"clean cloths","emoji":"🧽"},{"item":"broom + dustpan","emoji":"🧹"},{"item":"mop + bucket","emoji":"🪣"}]'::jsonb
WHERE zone_key = 'kitchen_zone';

UPDATE zone_definitions SET
  display_name = 'Guest Bathroom',
  done_means = 'Toilet clean inside and out, no pee on seat or floor, sink scrubbed, mirror spotless, garbage can IN the room WITH a bag, floor swept and mopped, soap and towels stocked',
  anchor_count = 6,
  rotating_count = 3,
  supplies = '[{"item":"toilet brush + cleaner","emoji":"🪣"},{"item":"bathroom spray","emoji":"🧴"},{"item":"paper towels","emoji":"🧻"},{"item":"disinfectant wipes","emoji":"🧽"},{"item":"trash bags","emoji":"🗑️"},{"item":"broom/mop","emoji":"🧹"}]'::jsonb
WHERE zone_key = 'guest_bathroom';

UPDATE zone_definitions SET
  display_name = 'Kids Bathroom',
  done_means = 'Toilet scrubbed and no pee anywhere, sink clean and draining, mirror spotless, ALL wet/dirty laundry picked up, empty bottles thrown away, towels hung, shower walls wiped, floor dry and clean',
  anchor_count = 6,
  rotating_count = 3,
  supplies = '[{"item":"toilet brush + cleaner","emoji":"🪣"},{"item":"bathroom spray","emoji":"🧴"},{"item":"scrub sponge","emoji":"🧽"},{"item":"paper towels","emoji":"🧻"},{"item":"trash bags","emoji":"🗑️"},{"item":"disinfectant wipes","emoji":"💧"}]'::jsonb
WHERE zone_key = 'kids_bathroom';

UPDATE zone_definitions SET
  display_name = 'Pantry & Fridge — Food Management',
  done_means = 'All 3 fridges organized and clean, leftovers labeled and dated, expired items removed, pantry shelves organized, dinner manager has what they need, grocery list updated',
  anchor_count = 3,
  rotating_count = 3,
  supplies = '[{"item":"cleaning spray","emoji":"🧴"},{"item":"paper towels","emoji":"🧻"},{"item":"storage containers","emoji":"📦"},{"item":"marker + tape for labels","emoji":"🏷️"},{"item":"trash bag","emoji":"🗑️"}]'::jsonb
WHERE zone_key = 'pantry';

UPDATE zone_definitions SET
  display_name = 'Floors — Whole House',
  done_means = 'All floors vacuumed/swept, stairs scrubbed, under furniture cleaned, pet accidents treated, rugs shaken out, no sticky spots, all rooms covered by end of week',
  anchor_count = 3,
  rotating_count = 3,
  supplies = '[{"item":"vacuum","emoji":"🔌"},{"item":"broom + dustpan","emoji":"🧹"},{"item":"mop + bucket","emoji":"🪣"},{"item":"carpet cleaner spray","emoji":"🧴"},{"item":"clean cloths","emoji":"🧽"},{"item":"stair scrub brush","emoji":"🪥"}]'::jsonb
WHERE zone_key = 'floors';

-- ──────────────────────────────────────────────────────────────
-- HOTSPOT — Common Areas
-- ──────────────────────────────────────────────────────────────
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, sort_order, instructions) VALUES
-- Anchors
('hotspot', 'Wipe down coffee bar — clean surface, organize K-cups, wipe coffee grounds/spills', 'anchor', false, 5, 1,
 '["Spray the coffee bar surface with cleaner and wipe dry.","Put scattered K-cups back in the holder.","Wipe up any coffee grounds, drips, or sugar spills.","Clean the drip tray if needed."]'::jsonb),

('hotspot', 'Check filtered water tank — wipe any spills, note if tank needs refilling', 'anchor', false, 2, 2,
 '["Look around and under the filtered water tank.","Wipe up any puddles or drips with a paper towel.","If the tank is getting low, let Mom or Dad know."]'::jsonb),

('hotspot', 'Clear the stairs — nothing left on steps', 'anchor', true, 3, 3,
 '["Walk the full staircase.","Pick up anything left on steps (toys, clothes, shoes, cups, books).","Put items where they belong or in a lost-and-found basket.","Stairs should be completely clear for safety."]'::jsonb),

('hotspot', 'Shoe shelf — straighten up, pairs together, no clutter', 'anchor', false, 3, 4,
 '["Line up shoes in pairs on the shelf.","Remove anything that doesn''t belong (toys, trash, random items).","If shoes are overflowing, stack neatly."]'::jsonb),

('hotspot', 'Entryway — quick tidy, nothing on the floor', 'anchor', false, 3, 5,
 '["Check the entryway for backpacks, jackets, shoes, or items left on the floor.","Hang up what belongs on hooks, put shoes on the shelf.","Clear the floor completely."]'::jsonb),

-- Rotating
('hotspot', 'Wipe all door handles and light switches — germ patrol', 'rotating', true, 6, 10,
 '["Use a disinfectant wipe on every door handle and light switch in common areas (kitchen, hallway, bathrooms, front door, back door).","Both sides of the handle.","This keeps germs from spreading."]'::jsonb),

('hotspot', 'Wipe down handrails on stairs', 'rotating', true, 4, 11,
 '["Use a damp cloth or disinfectant wipe and go the full length of the handrail, top and bottom.","Don''t forget the posts at the top and bottom."]'::jsonb),

('hotspot', 'Plant check — hallway by coffee bar and front room / plant room / school room', 'rotating', false, 5, 12,
 '["Look at all the plants in the hallway near the coffee bar and in the front room (plant room / school room).","Clean up any fallen leaves or dirt around the pots.","If soil looks very dry or leaves look droopy/yellow, tell Mom — do NOT water them yourself.","Mom uses special fertilizers and rain water."]'::jsonb),

('hotspot', 'Plant check — shoe shelf area and front entryway / porch', 'rotating', false, 5, 13,
 '["Check all plants on or near the shoe shelf and by the front door / porch.","Pick up dead leaves, brush away dirt.","If any plants look like they need water, let Mom know.","Do NOT water."]'::jsonb),

('hotspot', 'Plant check — master bathroom and master bedroom', 'rotating', false, 5, 14,
 '["Carefully check plants in Mom and Dad''s bathroom and bedroom.","Clean up any dead leaves or dirt.","Report to Mom if anything looks dry or unhealthy.","Do NOT water or move the plants."]'::jsonb),

('hotspot', 'Floor zone accountability check — has vacuuming happened this week?', 'rotating', false, 3, 15,
 '["Check if the Floors zone person has vacuumed the common areas this week.","If it''s Thursday or later and it hasn''t been done, remind them.","If it''s the weekend and it still hasn''t happened, tell Mom.","You share responsibility for making sure it gets done."]'::jsonb),

('hotspot', 'Wipe baseboards in entryway and hallway', 'rotating', true, 6, 16,
 '["Use a damp cloth and wipe the baseboards in the entryway and hallway.","Dust and dirt collect here fast with all the foot traffic."]'::jsonb);

-- ──────────────────────────────────────────────────────────────
-- KITCHEN ZONE — Deep Clean & Organize
-- ──────────────────────────────────────────────────────────────
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, sort_order, instructions, equipment) VALUES
-- Anchors
('kitchen_zone', 'Wipe down and WASH all kitchen counters', 'anchor', true, 6, 1,
 '["This is more than a quick wipe — spray every counter surface with cleaner and scrub with a clean cloth.","Get around the toaster, coffee maker, knife block, and any appliances.","Dry with a paper towel.","Counters should be clean enough to prep food on."]'::jsonb, null),

('kitchen_zone', 'Wipe stovetop surface, knobs, and microwave exterior', 'anchor', true, 5, 2,
 '["Wipe the full stovetop — burner area, knobs, and the front panel.","Then wipe the microwave door, handle, and top.","Use a damp cloth with a little dish soap for grease."]'::jsonb, null),

('kitchen_zone', 'If you spilled it — clean it now, not later', 'anchor', false, 1, 3,
 '["Any spill anywhere in the kitchen gets cleaned immediately.","Don''t leave it for someone else.","Wipe it up, dry the area, done."]'::jsonb, null),

('kitchen_zone', 'Any dish you took out of the kitchen comes back before bed', 'anchor', false, 3, 4,
 '["Walk the house before bed.","Any cups, plates, bowls, or utensils that left the kitchen come back to the sink.","This is separate from dish duty — this is kitchen zone accountability."]'::jsonb, null),

-- Rotating (deep clean focus)
('kitchen_zone', 'Deep clean microwave inside — damp cloth to loosen and wipe', 'rotating', true, 6, 10,
 '["Microwave a damp cloth for 30 seconds to steam the inside.","Then wipe all walls, ceiling, turntable, and door seal.","Remove turntable and wash in sink if needed."]'::jsonb, null),

('kitchen_zone', 'Clean and organize one kitchen drawer', 'rotating', false, 8, 11,
 '["Pull out one drawer (silverware, utensils, junk drawer, etc.).","Remove everything, wipe inside, throw away trash, organize items back neatly.","Rotate to a different drawer each time."]'::jsonb, null),

('kitchen_zone', 'Clean and organize tupperware cabinet', 'rotating', false, 10, 12,
 '["Pull out all containers and lids.","Match lids to containers.","Throw away or set aside any without matches.","Stack neatly — this gets messy fast, keep on top of it."]'::jsonb, null),

('kitchen_zone', 'Organize silverware drawer — clean divider tray', 'rotating', false, 8, 13,
 '["Remove the divider tray, wash it, wipe inside the drawer, put it back.","Sort silverware correctly.","Remove anything that doesn''t belong."]'::jsonb, null),

('kitchen_zone', 'Wipe inside one cabinet section (doors and shelves)', 'rotating', false, 10, 14,
 '["Pick one cabinet (plates, cups, spices, etc.).","Wipe the shelves and inside of the cabinet doors.","Check for expired items — set aside for Mom to review."]'::jsonb, null),

('kitchen_zone', 'Scrub kitchen sink basin — full scrub', 'rotating', true, 5, 15,
 '["Use dish soap or Bar Keeper''s Friend and a scrub sponge.","Scrub the full basin, around the drain, and the faucet base.","Rinse and dry — sink should shine."]'::jsonb, null),

('kitchen_zone', 'Mop kitchen floor', 'rotating', true, 8, 16,
 '["Sweep first, then mop the full kitchen floor including under the table and around appliances.","Use clean water — change the mop water if it gets dirty."]'::jsonb, 'mop'),

('kitchen_zone', 'Wipe cabinet door fronts — one section per day', 'rotating', false, 6, 17,
 '["Wipe the outside of cabinet doors in one section of the kitchen (above stove, above sink, under counter, etc.).","Grease and fingerprints build up — use a little dish soap."]'::jsonb, null),

('kitchen_zone', 'Clean toaster — empty crumb tray and wipe exterior', 'rotating', true, 4, 18,
 '["Pull out the crumb tray, dump it, wipe it, slide it back.","Wipe the outside of the toaster.","Unplug before cleaning if needed."]'::jsonb, null),

('kitchen_zone', 'Plant check — kitchen plants', 'rotating', false, 4, 19,
 '["Check all plants in the kitchen area.","Clean up any fallen leaves or dirt around pots.","If soil looks dry or plants look droopy, tell Mom.","Do NOT water."]'::jsonb, null),

('kitchen_zone', 'Wipe light switches and door handles in kitchen', 'rotating', true, 3, 20,
 '["Use a disinfectant wipe on the kitchen light switch(es) and any door handles (pantry door, back door if accessible from kitchen)."]'::jsonb, null);

-- ──────────────────────────────────────────────────────────────
-- GUEST BATHROOM
-- ──────────────────────────────────────────────────────────────
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, sort_order, instructions) VALUES
-- Anchors
('guest_bathroom', 'Check garbage can — is it IN the bathroom? Does it have a bag?', 'anchor', true, 2, 1,
 '["This is #1 because it''s missing almost every day.","Find the garbage can if it''s been moved.","Put a fresh bag in it.","If there are no bags under the sink, tell Mom.","The garbage can must be in this bathroom at all times."]'::jsonb),

('guest_bathroom', 'Wipe toilet seat, lid, and base — check for pee on floor', 'anchor', true, 4, 2,
 '["Lift the seat and check.","Wipe the seat top and bottom, the lid, and the base of the toilet with disinfectant wipes.","Check the floor around the base — if there''s pee, wipe it up.","Every. Single. Day."]'::jsonb),

('guest_bathroom', 'Clean toothpaste out of sink and scrub basin', 'anchor', true, 4, 3,
 '["Scrub the pedestal sink with bathroom spray.","Get the toothpaste globs, soap scum, and any hair out of the drain area.","Rinse and dry."]'::jsonb),

('guest_bathroom', 'Wipe mirror — no splatter, no toothpaste dots', 'anchor', false, 2, 4,
 '["Spray the mirror and wipe until streak-free.","Check from an angle to make sure you got everything."]'::jsonb),

('guest_bathroom', 'Pick up ALL dirty clothes off the floor', 'anchor', false, 2, 5,
 '["Grab every piece of clothing on the floor and put it in the laundry hamper (or bring to laundry room if no hamper in bathroom).","The floor should be completely clear."]'::jsonb),

('guest_bathroom', 'Restock check — soap, hand towels, toilet paper', 'anchor', false, 2, 6,
 '["Is there soap at the sink?","Is there a clean hand towel hanging?","Is there toilet paper on the roll (and a backup nearby)?","If anything is missing, restock it or tell Mom."]'::jsonb),

-- Rotating
('guest_bathroom', 'Scrub toilet bowl inside with brush and cleaner', 'rotating', true, 5, 10,
 '["Squirt toilet bowl cleaner under the rim.","Scrub the full bowl with the toilet brush, including under the rim.","Flush."]'::jsonb),

('guest_bathroom', 'Pull out blue floor cabinet and sweep/mop behind it — 1x per week minimum', 'rotating', true, 10, 11,
 '["Carefully pull the freestanding blue cabinet away from the wall.","Sweep behind it and along the baseboards.","Mop the full bathroom floor while the cabinet is out.","Push it back when dry.","Do this at least once per week."]'::jsonb),

('guest_bathroom', 'Organize above-toilet blue cabinet', 'rotating', false, 6, 12,
 '["Open the blue cabinet above the toilet.","Straighten up hair supplies and personal items.","Throw away any empty bottles.","Wipe the shelves if needed."]'::jsonb),

('guest_bathroom', 'Wipe door handle and light switch', 'rotating', true, 2, 13,
 '["Disinfectant wipe on the door handle (both sides) and the light switch."]'::jsonb),

('guest_bathroom', 'Wipe baseboards', 'rotating', true, 5, 14,
 '["Damp cloth along all the baseboards in the bathroom.","Hair and dust collect here."]'::jsonb),

('guest_bathroom', 'Empty and reline trash can', 'rotating', false, 2, 15,
 '["Even if it''s not full, swap the bag at least every few days.","Wipe inside the can if it''s sticky or gross."]'::jsonb);

-- ──────────────────────────────────────────────────────────────
-- KIDS BATHROOM
-- ──────────────────────────────────────────────────────────────
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, sort_order, instructions) VALUES
-- Anchors
('kids_bathroom', 'Pick up ALL wet towels and dirty clothes — off floor, off counter, off hooks if soaking', 'anchor', true, 4, 1,
 '["This bathroom always has wet and dirty laundry everywhere.","Pick up every single piece.","Wet towels go to the laundry room.","Dirty clothes go to the hamper.","The floor, counter, and hooks should be clear of soggy fabric."]'::jsonb),

('kids_bathroom', 'Wipe toilet seat, lid, base, and floor around toilet', 'anchor', true, 4, 2,
 '["Same as guest bath — check for pee on the seat, lid, base, and floor.","Wipe everything with disinfectant.","This happens daily, no exceptions."]'::jsonb),

('kids_bathroom', 'Clean sink basin and faucet — remove gunk, hair, toothpaste', 'anchor', true, 4, 3,
 '["The sink gets clogged with hair, toothpaste, and soap.","Scrub the basin, clean around the faucet handles and base, clear the drain.","Rinse and dry."]'::jsonb),

('kids_bathroom', 'Wipe mirror', 'anchor', false, 2, 4,
 '["Spray and wipe streak-free."]'::jsonb),

('kids_bathroom', 'Throw away empty bottles', 'anchor', false, 3, 5,
 '["Check the shower, sink area, and counter for empty shampoo, conditioner, body wash, toothpaste tubes.","If it''s empty, throw it away.","Don''t just leave it sitting there."]'::jsonb),

('kids_bathroom', 'Hang clean towels neatly', 'anchor', false, 3, 6,
 '["Each person should have their own towel.","Hang them up neatly on hooks or bars.","If towels are dirty or smell, swap for clean ones from the linen closet."]'::jsonb),

-- Rotating
('kids_bathroom', 'Scrub toilet bowl inside', 'rotating', true, 5, 10,
 '["Squirt cleaner under the rim, scrub the full bowl with the brush, flush."]'::jsonb),

('kids_bathroom', 'Clean shower walls and tub interior', 'rotating', true, 8, 11,
 '["Spray shower walls with bathroom cleaner.","Scrub soap scum and buildup with a sponge.","Wipe down the tub floor.","Rinse everything."]'::jsonb),

('kids_bathroom', 'Sweep and mop floor', 'rotating', true, 7, 12,
 '["Sweep the full bathroom floor including behind the toilet and in corners.","Then mop.","Make sure floor is dry when done — wet bathroom floors are a slip hazard."]'::jsonb),

('kids_bathroom', 'Wipe soap dispenser, toothbrush holder, and counter items', 'rotating', true, 4, 13,
 '["Take everything off the counter, wipe each item and the counter surface underneath.","Put items back organized."]'::jsonb),

('kids_bathroom', 'Organize under-sink cabinet', 'rotating', false, 6, 14,
 '["Pull items out, throw away empties and trash, wipe the shelf, put items back neatly.","This gets trashed fast."]'::jsonb),

('kids_bathroom', 'Wipe light switches, door handle, and cabinet handles', 'rotating', true, 3, 15,
 '["Disinfectant wipe on all touch surfaces."]'::jsonb),

('kids_bathroom', 'Wipe baseboards', 'rotating', true, 5, 16,
 '["Damp cloth along all baseboards — hair and dust collect fast in bathrooms."]'::jsonb),

('kids_bathroom', 'Empty and reline trash can', 'rotating', false, 2, 17,
 '["Swap the bag, wipe inside the can if needed."]'::jsonb),

('kids_bathroom', 'Clean shower door/curtain — wipe off soap scum and water spots', 'rotating', true, 5, 18,
 '["Spray the shower door or curtain with bathroom cleaner.","Wipe down from top to bottom."]'::jsonb);

-- ──────────────────────────────────────────────────────────────
-- PANTRY — Food Management (3 fridges)
-- ──────────────────────────────────────────────────────────────
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, sort_order, instructions) VALUES
-- Anchors
('pantry', 'Check main kitchen fridge — move leftovers to front, check for expired/old items', 'anchor', true, 6, 1,
 '["Open the main fridge.","Pull leftovers to the front so they get used first.","Check dates on anything open — if it smells bad or looks old, set it aside for Mom to confirm tossing.","Wipe up any spills you see."]'::jsonb),

('pantry', 'Check with today''s dinner manager — do they need anything prepped or pulled from freezer?', 'anchor', false, 3, 2,
 '["Find out who''s cooking tonight and what meal is planned.","Ask if they need anything thawed from the freezer, pulled out, or prepped ahead of time.","This coordination saves Mom time and prevents last-minute chaos."]'::jsonb),

('pantry', 'Label and date any new leftovers', 'anchor', true, 3, 3,
 '["After any meal, make sure leftovers go into containers with a label (what it is) and today''s date written on tape.","No mystery containers in the fridge."]'::jsonb),

-- Rotating
('pantry', 'Deep clean main kitchen fridge — one shelf or section', 'rotating', true, 10, 10,
 '["Pull everything off one shelf.","Wipe the shelf and the wall behind it.","Check expiration dates on items as you put them back.","Organize by category (drinks together, condiments together, etc.)."]'::jsonb),

('pantry', 'Check garage fridge/freezer — organize and rotate', 'rotating', true, 8, 11,
 '["Go to the garage fridge/freezer.","Move older items to the front.","Check for freezer burn or old unlabeled items.","Wipe up any spills.","Report anything questionable to Mom."]'::jsonb),

('pantry', 'Check standing tall freezer — organize and rotate', 'rotating', true, 8, 12,
 '["Go through the tall freezer.","Rotate older items forward.","Stack neatly.","Report anything with heavy freezer burn or no label."]'::jsonb),

('pantry', 'Organize one pantry shelf section', 'rotating', false, 8, 13,
 '["Pick one section of the dry pantry.","Pull items forward, group similar items together, check expiration dates.","Wipe the shelf if dusty."]'::jsonb),

('pantry', 'Help put away a grocery haul', 'rotating', false, 10, 14,
 '["When Mom or Dad brings groceries home, you''re the first helper.","Put cold items away first (fridge/freezer).","Organize pantry items on correct shelves.","Break down and recycle bags/boxes."]'::jsonb),

('pantry', 'Bulk food prep helper — assist with meal prep tasks', 'rotating', false, 15, 15,
 '["When the family is doing bulk prep (portioning meat, washing produce, organizing freezer meals), Pantry zone person is the primary helper.","Follow Mom''s instructions for what needs prepping."]'::jsonb),

('pantry', 'Update the grocery list — flag items running low', 'rotating', false, 6, 16,
 '["Walk through the pantry, fridge, and freezer.","If something is running low (less than 1 remaining), add it to the grocery list or tell Mom.","Check basics: milk, eggs, bread, butter, cheese, lunch meat."]'::jsonb),

('pantry', 'Wipe pantry shelves and sweep pantry floor', 'rotating', true, 8, 17,
 '["Pick a section of pantry shelves to wipe down.","Sweep the pantry floor — crumbs and spills collect fast."]'::jsonb),

('pantry', 'Plant check — dining room plants', 'rotating', false, 4, 18,
 '["Check any plants in the dining room.","Clean up any fallen leaves or dirt around pots.","If anything looks dry, tell Mom.","Do NOT water."]'::jsonb);

-- ──────────────────────────────────────────────────────────────
-- FLOORS — Whole House
-- ──────────────────────────────────────────────────────────────
INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, sort_order, instructions, equipment) VALUES
-- Anchors
('floors', 'Sweep/vacuum main common areas — kitchen, hallway, living room, front room', 'anchor', true, 10, 1,
 '["Hit the high-traffic areas every day.","Sweep tile areas, vacuum carpet areas.","Don''t just go around things — move items if needed to get a clean sweep."]'::jsonb, 'regular_vacuum'),

('floors', 'Check stairs — sweep and scrub if sticky or dirty', 'anchor', true, 6, 2,
 '["Kids eat on the stairs, so they''re always gross.","Sweep each step.","If steps are sticky, use a damp cloth with a little cleaner and scrub.","This is a DAILY check — don''t let it build up."]'::jsonb, null),

('floors', 'Check for pet accidents (Belle or Midnight) — treat immediately', 'anchor', true, 3, 3,
 '["Walk through common areas and check for any accidents.","For hard floors, clean with paper towels and floor cleaner.","For carpet, blot (don''t rub), then use carpet cleaner spray.","Tell Mom if it needs the carpet cleaner machine."]'::jsonb, null),

-- Rotating
('floors', 'Vacuum/sweep bedrooms — coordinate with each kid', 'rotating', true, 12, 10,
 '["Check which kids want to do their own room (Zoey usually does).","For other kids, vacuum their bedroom floor.","Some kids may need help — grab a partner to lift and move things while you vacuum under beds and furniture."]'::jsonb, 'regular_vacuum'),

('floors', 'Vacuum under beds and closet floors', 'rotating', true, 10, 11,
 '["Pull out items stored under beds.","Vacuum under the bed and along closet floors.","Push items back.","This gets dusty fast."]'::jsonb, 'regular_vacuum'),

('floors', 'Vacuum/sweep under couches, tables, and furniture', 'rotating', true, 10, 12,
 '["Move couch cushions, pull furniture out slightly if possible.","Vacuum or sweep under all major furniture pieces.","Push back when done.","The family moves things around regularly — this is expected."]'::jsonb, 'regular_vacuum'),

('floors', 'Mop all tile areas — kitchen, bathrooms, hallways, entryway', 'rotating', true, 12, 13,
 '["Sweep first, then mop all hard-floor areas.","Use clean water — change mop water if it gets dirty.","Let floors dry before walking on them."]'::jsonb, 'mop'),

('floors', 'Shake out rugs — take outside and shake, then vacuum', 'rotating', true, 8, 14,
 '["Any area rugs on tile should be taken outside, shaken out well (dust, crumbs, pet hair), brought back in and laid flat.","Vacuum the rug and the tile underneath."]'::jsonb, 'regular_vacuum'),

('floors', 'Scrub stairs — full deep clean (1x per week)', 'rotating', true, 15, 15,
 '["Beyond the daily check: scrub each step with cleaner and a brush.","Wipe the risers (vertical part).","Get into the corners.","Dry each step.","Do this once per week minimum."]'::jsonb, null),

('floors', 'Bathroom floors — sweep and mop all bathrooms', 'rotating', true, 8, 16,
 '["Sweep and mop the floors in both kids bathroom and guest bathroom.","Get behind toilets and in corners."]'::jsonb, 'mop'),

('floors', 'Vacuum hallways and closets', 'rotating', true, 8, 17,
 '["Hit the hallways, coat closet floor, linen closet floor, any other closet floors.","These get neglected."]'::jsonb, 'regular_vacuum'),

('floors', 'Coordinate with Hotspot zone — have common areas been covered?', 'rotating', false, 3, 18,
 '["Check in with the Hotspot zone person.","If they''ve flagged that vacuuming hasn''t happened, prioritize it.","You and Hotspot share accountability for common area cleanliness."]'::jsonb, null),

('floors', 'Plant check — backyard plants', 'rotating', false, 5, 19,
 '["Check any plants in the backyard / patio area.","Clean up any fallen leaves or dirt around pots.","If anything looks dry or unhealthy, tell Mom.","Do NOT water."]'::jsonb, null);

COMMIT;
