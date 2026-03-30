-- Fix A: Delete test visit note data
DELETE FROM health_visit_notes WHERE LOWER(provider_name) LIKE '%pablo%' OR LOWER(raw_notes) LIKE '%pablo%';

-- Fix B: Add frequency column to zone_task_library
ALTER TABLE zone_task_library ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'always';

-- Fix B: Set frequency for weekly/monthly task types
UPDATE zone_task_library SET frequency = 'weekly' WHERE task_type = 'weekly' AND (frequency IS NULL OR frequency = 'always');
UPDATE zone_task_library SET frequency = 'monthly' WHERE task_type = 'monthly' AND (frequency IS NULL OR frequency = 'always');

-- Fix C: Seed instructions for tasks with NULL instructions
-- Kitchen zone tasks
UPDATE zone_task_library SET instructions = 'Spray the counter with cleaner and wipe with a clean cloth. Start at one end and work across. Don''t forget around the toaster and coffee maker. Dry with a paper towel if it''s still wet.' WHERE LOWER(task_text) LIKE '%wipe%counter%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Get the broom and dustpan from the closet. Start at the far wall and sweep toward the center, then toward the dustpan. Make sure to get under the table and chairs. Dump the dustpan in the trash and put everything back.' WHERE LOWER(task_text) LIKE '%sweep%kitchen%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Fill one side of the sink with hot soapy water. Wash dishes starting with glasses, then plates, then pots. Rinse each one and set in the drying rack. Wipe down the sink when you''re done.' WHERE LOWER(task_text) LIKE '%wash%dish%' OR (LOWER(task_text) LIKE '%dishes%' AND LOWER(task_text) LIKE '%sink%') AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Take the trash bag out of the can and tie it closed. Carry it to the outside bin. Put a new trash bag in the kitchen can. If the recycling is full, take that out too.' WHERE LOWER(task_text) LIKE '%trash%' AND zone_key LIKE '%kitchen%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Open the microwave and wipe the inside with a damp cloth and a little cleaner. Don''t forget the door and the turntable plate. If there''s stuck-on food, heat a cup of water for 1 minute first to loosen it.' WHERE LOWER(task_text) LIKE '%microwave%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Use a damp cloth with a small amount of cleaner. Wipe the outside of the stove, the knobs, and the area around the burners. If there are drip pans, pull them out and wipe underneath. Put everything back neatly.' WHERE LOWER(task_text) LIKE '%stove%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Take everything off the table. Spray it with cleaner and wipe it down with a cloth. Wipe the chairs too if they look sticky. Put the centerpiece or napkin holder back when you''re done.' WHERE LOWER(task_text) LIKE '%table%' AND zone_key LIKE '%kitchen%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Open the dishwasher and unload clean dishes into the right cabinets and drawers. Stack plates neatly. Put silverware in the organizer. If dishes are dirty, load them properly — plates face the center, cups on top rack upside down.' WHERE (LOWER(task_text) LIKE '%dishwasher%' OR LOWER(task_text) LIKE '%unload%' OR LOWER(task_text) LIKE '%load dish%') AND instructions IS NULL;

-- Bathroom zone tasks
UPDATE zone_task_library SET instructions = 'Spray the toilet with bathroom cleaner — inside the bowl, under the rim, the seat (both sides), the lid, and the base. Use the toilet brush to scrub inside the bowl. Wipe the outside with a paper towel or cloth. Flush when done.' WHERE LOWER(task_text) LIKE '%toilet%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Spray the mirror with glass cleaner and wipe in big circle motions with a paper towel or lint-free cloth. Start at the top and work down. Make sure there are no streaks — hold it at an angle to check.' WHERE LOWER(task_text) LIKE '%mirror%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Spray the sink and faucet with cleaner. Scrub the basin with a sponge, especially around the drain. Wipe the faucet handles and the area around the sink. Rinse and dry with a towel so it shines.' WHERE LOWER(task_text) LIKE '%sink%' AND zone_key LIKE '%bath%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Spray the shower walls and tub with bathroom cleaner. Use a scrub brush or sponge to scrub from top to bottom. Pay attention to the corners and the bottom of the tub. Rinse everything with the showerhead when done.' WHERE (LOWER(task_text) LIKE '%shower%' OR LOWER(task_text) LIKE '%tub%') AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Sweep or vacuum the bathroom floor, getting behind the toilet and in corners. Then mop with a damp mop or wipe the floor with a wet cloth. Let it air dry or dry with a towel.' WHERE LOWER(task_text) LIKE '%floor%' AND zone_key LIKE '%bath%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Hang up any towels that are on the floor or bunched up. Fold hand towels neatly on the rack. If towels are dirty or smell bad, take them to the laundry hamper and put out fresh ones.' WHERE LOWER(task_text) LIKE '%towel%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Wipe down the counter with a damp cloth and cleaner. Put toothbrushes, soap, and other items back where they belong. Throw away empty bottles or trash. Everything should look tidy and organized.' WHERE LOWER(task_text) LIKE '%counter%' AND zone_key LIKE '%bath%' AND instructions IS NULL;

-- Floor tasks
UPDATE zone_task_library SET instructions = 'Get the vacuum from the closet. Plug it in and start at the far corner of the room. Push it in slow, straight lines, overlapping each pass slightly. Move furniture and get under edges. When done, wrap the cord neatly and put it back.' WHERE LOWER(task_text) LIKE '%vacuum%' AND NOT LOWER(task_text) LIKE '%shop%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Fill the bucket with warm water and a small squeeze of floor cleaner. Dip the mop, wring it out well (it should be damp, not dripping). Start at the far wall and mop your way toward the door so you don''t step on wet floor. Let it air dry.' WHERE LOWER(task_text) LIKE '%mop%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Get the broom and dustpan. Start at the far wall and sweep toward the center of the room, then into the dustpan. Check corners and along the baseboards. Dump the dustpan in the trash.' WHERE LOWER(task_text) LIKE '%sweep%' AND NOT LOWER(task_text) LIKE '%kitchen%' AND instructions IS NULL;

-- Hotspot / general cleaning tasks
UPDATE zone_task_library SET instructions = 'Look at the area and pick up anything that doesn''t belong. Put shoes by the door, coats on hooks, papers in the right spot. The goal is to clear the surface so it looks clean and organized. If you don''t know where something goes, ask Mom.' WHERE LOWER(task_text) LIKE '%hotspot%' OR LOWER(task_text) LIKE '%declutter%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Use a dusting cloth or duster. Start at the top of the furniture and work down. Don''t forget shelves, picture frames, lamp bases, and windowsills. Shake out or wash the cloth when you''re done.' WHERE LOWER(task_text) LIKE '%dust%' AND NOT LOWER(task_text) LIKE '%dustpan%' AND instructions IS NULL;

-- Pantry tasks
UPDATE zone_task_library SET instructions = 'Open the pantry and check for anything expired or open that shouldn''t be. Pull items to the front so labels face out. Group similar things together — cans with cans, snacks with snacks. Wipe any crumbs off the shelves with a damp cloth.' WHERE LOWER(task_text) LIKE '%pantry%' AND instructions IS NULL;

-- Pet care: Midnight (bunny)
UPDATE zone_task_library SET instructions = 'Check Midnight''s water bottle — if it''s less than half full, refill it with fresh water. Make sure the spout isn''t clogged by tapping it gently.' WHERE LOWER(task_text) LIKE '%water%' AND zone_key LIKE '%midnight%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Scoop out any wet or soiled bedding from the cage. Add a thin layer of fresh bedding to replace what you removed. The cage should smell clean when you''re done.' WHERE LOWER(task_text) LIKE '%spot clean%' AND zone_key LIKE '%midnight%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Fill Midnight''s food bowl with a small scoop of pellets (about 1/4 cup). Add a handful of fresh hay to the hay rack. If there''s leftover wilted veggies, throw those away first.' WHERE LOWER(task_text) LIKE '%food%' OR LOWER(task_text) LIKE '%feed%' AND zone_key LIKE '%midnight%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Take everything out of the cage — bowls, toys, hideout. Remove all the old bedding and throw it away. Wipe the cage bottom with a damp cloth. Add fresh bedding, put everything back, and refill food and water.' WHERE LOWER(task_text) LIKE '%full%clean%' AND zone_key LIKE '%midnight%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Look at Midnight — are her eyes bright? Is she eating and drinking? Is she moving around normally? Check for any lumps, wet bottom, or overgrown nails. If something looks off, tell Mom right away.' WHERE LOWER(task_text) LIKE '%health%check%' AND zone_key LIKE '%midnight%' AND instructions IS NULL;

-- Pet care: Hades (snake)
UPDATE zone_task_library SET instructions = 'Check that Hades has fresh water in his bowl. If it''s dirty or low, dump it out, rinse the bowl, and refill with clean room-temperature water. Place it back gently so you don''t startle him.' WHERE LOWER(task_text) LIKE '%water%' AND zone_key LIKE '%hades%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Look at the temperature and humidity readings on the tank gauges. Warm side should be 88-92 degrees F, cool side 75-80 degrees F. Humidity should be 50-60%. If something is off, tell Mom or Zoey.' WHERE LOWER(task_text) LIKE '%temp%' OR LOWER(task_text) LIKE '%humidity%' AND zone_key LIKE '%hades%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Look through the glass at Hades. Is he in his hide? Moving normally? Check for stuck shed skin, cloudy eyes, or anything unusual. If he looks sick or hurt, tell Zoey and Mom immediately.' WHERE LOWER(task_text) LIKE '%health%check%' AND zone_key LIKE '%hades%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Use paper towels to spot-clean any waste in the tank. Remove soiled substrate and replace with a small amount of fresh substrate. Be gentle and move slowly so you don''t stress Hades.' WHERE LOWER(task_text) LIKE '%spot clean%' AND zone_key LIKE '%hades%' AND instructions IS NULL;

-- Pet care: Spike (bearded dragon)
UPDATE zone_task_library SET instructions = 'Check Spike''s water dish — dump old water, rinse the dish, and refill with fresh water. You can also mist him lightly with a spray bottle if he looks dry.' WHERE LOWER(task_text) LIKE '%water%' AND zone_key LIKE '%spike%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Offer Spike his salad — dark leafy greens (no iceberg lettuce), with some squash or bell pepper. Put it in his food dish. If it''s a bug day, Amos handles the insects.' WHERE LOWER(task_text) LIKE '%food%' OR LOWER(task_text) LIKE '%feed%' AND zone_key LIKE '%spike%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Check the tank temps — basking spot should be 100-110 degrees F, cool side 80-85 degrees F. Make sure both UVB and heat lights are on during the day. Tell Amos or Mom if a bulb looks dim or burnt out.' WHERE LOWER(task_text) LIKE '%temp%' OR LOWER(task_text) LIKE '%light%' AND zone_key LIKE '%spike%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Look at Spike closely. Are his eyes alert? Is his belly a healthy color? Check for stuck shed, black beard (stress), or unusual marks. If something seems wrong, tell Amos and Mom.' WHERE LOWER(task_text) LIKE '%health%check%' AND zone_key LIKE '%spike%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Remove any poop or soiled spots from the tank with a paper towel. If the substrate looks messy, scoop out the dirty part and add fresh. Quick and easy — just keep it clean.' WHERE LOWER(task_text) LIKE '%spot clean%' AND zone_key LIKE '%spike%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Fill the bath container with about half an inch of warm water (not hot — test with your wrist). Gently place Spike in. Let him soak for 10-15 minutes. Watch him the whole time. Pat dry with a soft towel when done.' WHERE LOWER(task_text) LIKE '%bath%' AND zone_key LIKE '%spike%' AND instructions IS NULL;

-- Pet care: Belle (dog)
UPDATE zone_task_library SET instructions = 'Check Belle''s water bowl — if it''s less than half full or looks dirty, dump it, rinse the bowl, and refill with fresh cold water. She should always have clean water available.' WHERE LOWER(task_text) LIKE '%water%' AND zone_key LIKE '%belle%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Scoop Belle''s food into her bowl — the right amount is marked on the food bag for her weight. Set it down in her feeding spot. Make sure she eats calmly. Pick up the bowl when she''s done.' WHERE LOWER(task_text) LIKE '%food%' OR LOWER(task_text) LIKE '%feed%' AND zone_key LIKE '%belle%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Take Belle outside on her leash. Let her walk, sniff, and do her business. Bring a poop bag. Walk for at least 10-15 minutes. Stay calm and steady — if she pulls, stop and wait until the leash is loose before walking again.' WHERE LOWER(task_text) LIKE '%walk%' AND zone_key LIKE '%belle%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Walk through the yard with a bag and pick up all of Belle''s poop. Check the whole yard, not just the obvious spots. Tie the bag closed and throw it in the outside trash.' WHERE LOWER(task_text) LIKE '%poop%' OR LOWER(task_text) LIKE '%yard%clean%' AND zone_key LIKE '%belle%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Use the brush Mom keeps by Belle''s stuff. Brush her coat gently, following the direction the fur grows. Spend about 5 minutes. This keeps her coat healthy and she loves the attention.' WHERE LOWER(task_text) LIKE '%brush%' AND zone_key LIKE '%belle%' AND instructions IS NULL;

-- Laundry room tasks
UPDATE zone_task_library SET instructions = 'Sort your dirty clothes into lights and darks. Load one pile into the washer — don''t overfill it. Add detergent to the dispenser (one pod or one scoop). Set to the right cycle (normal for most clothes, gentle for delicates). Press start.' WHERE LOWER(task_text) LIKE '%wash%' AND zone_key LIKE '%laundry%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Move the wet clothes from the washer to the dryer. Shake each item out before tossing it in so nothing stays balled up. Clean the lint trap first. Set the dryer to medium heat and press start.' WHERE LOWER(task_text) LIKE '%dryer%' OR LOWER(task_text) LIKE '%dry%clothes%' AND zone_key LIKE '%laundry%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Take the dry clothes out of the dryer. Fold each item neatly — shirts flat then in half, pants in thirds, towels in thirds. Stack by type. Carry them to your room and put them away in the right drawers.' WHERE LOWER(task_text) LIKE '%fold%' AND zone_key LIKE '%laundry%' AND instructions IS NULL;

UPDATE zone_task_library SET instructions = 'Wipe down the top of the washer and dryer with a damp cloth. Sweep the laundry room floor. Check for stray socks or items behind the machines. Make sure detergent bottles are upright and lids are closed.' WHERE LOWER(task_text) LIKE '%clean%laundry%' OR LOWER(task_text) LIKE '%wipe%' AND zone_key LIKE '%laundry%' AND instructions IS NULL;

-- General catch-all for remaining NULL instructions
UPDATE zone_task_library SET instructions = 'Look at this task carefully and do your best. If you''re not sure how, ask Mom or check with a sibling who''s done it before. Take your time and do it right.' WHERE instructions IS NULL AND task_text IS NOT NULL;
