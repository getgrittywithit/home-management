-- Phase N: Kid Pet Care Zones (Hades, Spike, Midnight)
-- Created: 2026-03-27

-- ══════════════════════════════════════════════
-- 1. PET FEEDING LOG TABLE
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pet_feeding_log (
  id SERIAL PRIMARY KEY,
  pet_key TEXT NOT NULL,           -- 'hades' | 'spike' | etc.
  fed_date DATE NOT NULL,
  fed_by TEXT NOT NULL,            -- kid_name
  quantity INT,                    -- number of mice/insects
  notes TEXT,                      -- 'refused', 'slow strike', 'ate immediately', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 2. ZONE DEFINITIONS — Pet Zones
-- ══════════════════════════════════════════════

INSERT INTO zone_definitions (zone_key, display_name, zone_type, assigned_to, done_means, anchor_count, rotating_count, supplies, zone_principle) VALUES

('pet_hades', 'Hades', 'duty',
 '{zoey}',
 'Fresh water in bowl, temperature verified on both sides, tank spot-checked, Hades visually healthy',
 3, 3,
 '[{"item":"digital thermometer","emoji":"🌡️"},{"item":"water bowl","emoji":"💧"},{"item":"paper towels","emoji":"🧻"},{"item":"reptile spot-clean spray","emoji":"🧴"}]',
 'Hades depends entirely on you. He can''t ask for what he needs — you have to notice.'),

('pet_spike', 'Spike', 'duty',
 '{amos}',
 'UVB light on, fresh greens in bowl, water available, temps checked, tank spot-cleaned, Spike handled or checked on',
 4, 3,
 '[{"item":"calcium dust supplement","emoji":"🫙"},{"item":"multivitamin supplement","emoji":"💊"},{"item":"feeder insect container","emoji":"🦟"},{"item":"digital thermometer","emoji":"🌡️"},{"item":"paper towels","emoji":"🧻"}]',
 'Spike relies on you to regulate everything he can''t do for himself — heat, light, food, hydration. Daily attention keeps him healthy.'),

('pet_midnight', 'Midnight', 'duty',
 '{ellie,hannah}',
 'Hay rack full, fresh water, fresh veggies given, old food removed, cage spot-cleaned, Midnight visually healthy',
 4, 3,
 '[{"item":"fresh hay","emoji":"🌾"},{"item":"pellet food","emoji":"🫙"},{"item":"slicker brush","emoji":"🐰"},{"item":"cage spray cleaner","emoji":"🧴"},{"item":"paper towels","emoji":"🧻"}]',
 'Midnight is counting on both of you. Split the work, check in with each other, make sure nothing gets missed.')

ON CONFLICT (zone_key) DO NOTHING;

-- ══════════════════════════════════════════════
-- 3. TASK LIBRARY — Hades (Zoey only)
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES

-- Daily anchors
('pet_hades', 'Check water bowl — clean, full, and large enough for soaking', 'anchor', true, 2, '{zoey}',
 '["Hades needs fresh water available at all times.", "The bowl should be large enough for him to fully coil and soak in — especially important before and during a shed.", "If the water looks cloudy, has debris, or he has soaked and dirtied it — dump it, rinse the bowl, refill with fresh dechlorinated or filtered water.", "Never use tap water with heavy chlorine. Let it sit 24hrs or use a reptile water conditioner."]'),

('pet_hades', 'Verify temperatures — warm side and cool side', 'anchor', true, 3, '{zoey}',
 '["Use the digital thermometer. Check both sides every day.", "Warm side (hide side): 88–92°F. This is where he digests and thermoregulates.", "Cool side: 76–80°F. He needs this to cool down when needed.", "Ambient room temp should stay above 72°F — if it drops below that at night, check with Mom about a ceramic heat emitter.", "If temps are off — check that the heat mat or heat tape is functioning and that the thermostat is set correctly. Do not leave him in a tank with wrong temps."]'),

('pet_hades', 'Visual health check — observe Hades for 1–2 minutes', 'anchor', true, 2, '{zoey}',
 '["You do not need to handle him for this. Just observe.", "Healthy signs: alert and responsive when disturbed, smooth muscle movement, clear eyes (unless in shed), no wheezing or clicking sounds.", "Warning signs to report to Mom immediately: wheezing or gurgling sound (respiratory infection), open-mouth breathing, mites (tiny dark moving dots on scales or in the tank), unusual lumps, loss of muscle tone, refusal to move over multiple days.", "If his eyes look blue, cloudy, or dull and his skin looks dull overall — he is entering a shed. This is normal. Do not handle during active shed."]'),

-- Rotating tasks
('pet_hades', 'Full water bowl clean — scrub and refill', 'rotating', true, 5, '{zoey}',
 '["Remove the water bowl completely.", "Scrub inside and out with a clean brush and reptile-safe disinfectant or white vinegar rinse.", "Rinse thoroughly — no soap residue.", "Refill with fresh water.", "Do this weekly minimum — more often if he soaks frequently or the bowl gets soiled."]'),

('pet_hades', 'Check humidity levels', 'rotating', true, 3, '{zoey}',
 '["Ball pythons need 60–80% humidity at all times.", "Higher humidity (75–80%) is especially important during shed — if it drops too low he can get stuck shed which is painful and dangerous.", "If humidity is low: lightly mist the inside walls of the tank (not directly on him), add a damp hide, or cover part of the screen top with foil.", "If you see him spending a lot of time in the water bowl — humidity is probably too low. He is trying to help himself shed."]'),

('pet_hades', 'Spot clean tank — remove any waste or shed skin', 'rotating', true, 5, '{zoey}',
 '["Check the tank for any waste (snakes poop infrequently but it is significant when they do).", "Remove waste immediately using paper towels and reptile-safe cleaner.", "If he has shed — collect and remove all shed skin. Check that the shed came off in one complete piece, including the eye caps (the clear scale over each eye).", "If shed is in pieces or eye caps are missing — soak him in warm (not hot) shallow water for 20–30 minutes and gently assist. Tell Mom if you are unsure.", "Full tank deep clean: monthly — remove everything, disinfect all surfaces, replace substrate if needed."]'),

('pet_hades', 'Log feeding — record date, number of mice, and Hades'' response', 'rotating', false, 5, '{zoey}',
 '["After each feeding, log it in the app: date, how many mice (2–3), and how he responded (struck immediately, slow strike, refused).", "A refused meal is not automatically a problem — snakes sometimes refuse before a shed or if stressed. Log it and monitor.", "If he refuses 3+ consecutive meals and is not in shed — tell Mom.", "Never handle Hades within 48 hours of a feeding. He needs time to digest undisturbed. Handling too soon can cause regurgitation which is dangerous for him."]');

-- ══════════════════════════════════════════════
-- 4. TASK LIBRARY — Spike (Amos primary)
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES

-- Daily anchors (Amos)
('pet_spike', 'Turn UVB light on (on timer or manual) — 12–14 hours per day', 'anchor', true, 1, '{amos}',
 '["UVB light is not optional. Bearded dragons need UVB rays to produce Vitamin D3 and absorb calcium.", "Without proper UVB, Spike will develop metabolic bone disease — his bones soften and deform. It is painful and irreversible if caught late.", "The light should run 12–14 hours during the day, then off at night.", "If you are using a timer, check that it is working correctly.", "UVB bulbs stop producing UV rays before they stop glowing — replace every 6 months even if the light still looks on. Write the replacement date on the box with a marker when you install it."]'),

('pet_spike', 'Fresh greens in the food bowl — dust with calcium', 'anchor', true, 5, '{amos}',
 '["Spike needs leafy greens daily — collard greens, mustard greens, dandelion greens, or arugula. No iceberg lettuce (zero nutrition).", "Remove yesterday''s greens before adding fresh ones.", "Lightly dust greens with calcium powder every day. Dust with multivitamin powder 2–3 times per week instead of calcium on those days.", "The calcium-to-multivitamin rotation matters — too much vitamin A from the multi daily can actually be harmful.", "Chop greens into small pieces so Spike can eat them easily."]'),

('pet_spike', 'Check temperatures — basking spot, cool side, and night temp', 'anchor', true, 3, '{amos}',
 '["Basking spot: 100–110°F. Spike needs this to digest food and regulate his body temperature.", "Cool side: 80–85°F.", "Night temperature: minimum 65°F. If the house drops below this, a ceramic heat emitter (no light) can run at night.", "Use the digital thermometer — place it directly on the basking surface, not in the air.", "If the basking spot is too cool, Spike will not be able to digest his food properly. Impaction is a serious risk."]'),

('pet_spike', 'Spot clean tank — remove waste and uneaten food', 'anchor', true, 3, '{amos}',
 '["Check for and remove any droppings. Healthy Spike poop: brown solid log + white chalky urates.", "If urates are yellow or orange, he may be dehydrated — offer a warm bath and increase water.", "Remove any uneaten feeder insects from yesterday — live insects left overnight can stress or bite Spike.", "Remove old uneaten greens.", "Spot clean the surface where waste was found with paper towels and reptile-safe cleaner."]'),

-- Rotating tasks (Amos)
('pet_spike', 'Feeder insects — dust and feed', 'rotating', false, 10, '{amos}',
 '["Spike gets feeder insects (dubia roaches or crickets) every other day. Juveniles need them daily.", "Dust insects with calcium powder by putting them in a bag or cup with a pinch of powder and shaking gently.", "Feed in the morning — Spike is more active and digestion works better with the basking light on.", "Only feed insects no larger than the space between Spike''s eyes — larger insects are a choking and impaction risk.", "Remove any uneaten insects after 15–20 minutes. Live insects left in the tank stress Spike and can bite him while he sleeps."]'),

('pet_spike', 'Warm bath — 15–30 minutes', 'rotating', true, 30, '{amos}',
 '["Give Spike a warm bath 2–3 times per week. This helps with hydration, digestion, and shedding.", "Use lukewarm water — test on your wrist like a baby''s bath. Never hot.", "Fill just deep enough that he can stand and his head is well above water. He should never have to swim or struggle.", "Let him soak for 15–30 minutes. He may poop in the bath — that is normal and healthy.", "After the bath, dry him gently with a soft towel and put him back under his basking light to warm up.", "Never leave him unattended in the bath."]'),

('pet_spike', 'Handling and socialization session', 'rotating', false, 15, '{amos}',
 '["Daily handling is encouraged for bearded dragons — it keeps Spike tame and socialized.", "Handle him gently, supporting his full body and all four legs. Never grab by the tail.", "Watch for stress signs: beard turning black, mouth gaping, flattening his body. If these happen, put him back calmly.", "Do not handle within 1 hour of feeding — give him time to digest under his basking light.", "A relaxed Spike will close his eyes, sit calmly on your hand or shoulder, and may bob his head slowly."]'),

('pet_spike', 'Full tank clean', 'monthly', true, 30, '{amos}',
 '["Remove Spike and place him somewhere safe and warm (a temporary container under a heat lamp).", "Remove all decor, hides, and the food/water bowl.", "Remove all substrate.", "Disinfect the tank walls, floor, and all decor with reptile-safe cleaner. Rinse everything thoroughly.", "Add fresh substrate (reptile carpet, tile, or paper towels — avoid loose sand for juveniles, impaction risk).", "Replace everything and return Spike once the tank is fully dry and temps are back up to range."]'),

('pet_spike', 'Check UVB bulb age — replace every 6 months', 'monthly', true, 5, '{amos}',
 '["UVB bulbs degrade over time. After 6 months they stop producing UV even if they still light up.", "Check the replacement date you wrote on the box. If it''s been 6 months — replace the bulb.", "After replacing, write the new date on the new box.", "This is one of the most commonly skipped tasks in bearded dragon care and one of the most dangerous to skip."]');

-- ══════════════════════════════════════════════
-- 5. TASK LIBRARY — Spike Helper Tasks (Kaylee + Wyatt)
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES

('pet_spike', 'Helper check: verify Spike''s water and food bowl', 'rotating', false, 3, '{kaylee,wyatt}',
 '["Check that Spike''s water dish has fresh water — top off or replace if low or dirty.", "Check that his greens bowl has food in it. If it''s empty and Amos hasn''t refilled it yet — let Amos know.", "You are not responsible for dusting supplements or preparing food — that''s Amos''s job. Just do a quick check and flag anything that looks off."]'),

('pet_spike', 'Helper: quick visual health check on Spike', 'rotating', true, 2, '{kaylee,wyatt}',
 '["You don''t need to handle him for this. Just look.", "Is he in his normal spots — basking area or hide? Is he responsive when you approach?", "Anything look off? Sunken eyes, unusual lumps, beard very dark, laying flat and not moving for an extended period?", "If something looks wrong — tell Amos and Mom right away. You are an extra set of eyes."]'),

('pet_spike', 'Helper: handling and playtime with Spike', 'rotating', false, 15, '{kaylee,wyatt}',
 '["Ask Amos first before taking Spike out — make sure he has not just eaten.", "Support Spike''s full body when you pick him up. All four legs should have something to rest on.", "He can sit on your arm, shoulder, or chest — he often likes warmth.", "Watch for stress signs: beard going black, mouth open, body flattening. If that happens, calmly return him to his tank.", "This earns you bonus points — log it as a bonus action when you''re done."]'),

('pet_spike', 'Helper: assist Amos with tank spot clean', 'rotating', false, 5, '{kaylee,wyatt}',
 '["Offer to help Amos with his daily spot clean.", "Your job: hand him paper towels, hold the cleaner, or remove the food bowl and rinse it while he handles Spike.", "This counts as a bonus task — log it."]');

-- ══════════════════════════════════════════════
-- 6. TASK LIBRARY — Midnight (Ellie + Hannah shared)
-- ══════════════════════════════════════════════

INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, duration_mins, kid_filter, instructions) VALUES

-- Daily anchors
('pet_midnight', 'Fill hay rack — should never be empty', 'anchor', true, 3, '{ellie,hannah}',
 '["Fresh hay should be available 24 hours a day, 7 days a week — no exceptions.", "Hay makes up 70–80% of Midnight''s diet. Without it his gut slows down which is life-threatening for rabbits.", "Timothy hay is the standard daily hay. Orchard grass is also fine.", "This is especially important for Midnight as a lionhead — he grooms his own mane and ingests a lot of fur. Constant hay keeps his gut moving and reduces the risk of wool block.", "If the hay looks dusty, damp, or moldy — throw it out and replace with fresh."]'),

('pet_midnight', 'Fresh water — check and refill', 'anchor', true, 2, '{ellie,hannah}',
 '["Check his water bottle or bowl and refill with fresh water daily.", "If using a water bottle — check that the ball bearing is not stuck (press it to make sure water flows).", "If using a bowl — rinse and refill. Bowls get dirty faster than bottles.", "Dehydration in rabbits is serious. If Midnight''s water has been empty — watch him for the rest of the day and offer extra greens."]'),

('pet_midnight', 'Fresh veggies — give portion, remove yesterday''s', 'anchor', false, 3, '{ellie,hannah}',
 '["Remove any uneaten vegetables from yesterday before adding new ones.", "Midnight is a dwarf breed — his portions are smaller than a standard rabbit. About 1 packed cup of leafy greens per day total.", "Safe greens: romaine lettuce, cilantro, parsley, kale (small amounts), basil, dill.", "Avoid: iceberg lettuce (causes digestive upset), spinach daily (high oxalic acid), cabbage or broccoli regularly (gas).", "Introduce any new vegetable slowly over several days — rabbits have sensitive digestive systems."]'),

('pet_midnight', 'Check droppings — normal amount and shape', 'anchor', true, 2, '{ellie,hannah}',
 '["Rabbit droppings are one of the best health indicators you have.", "Normal: round, firm, dark brown pellets. Lots of them — rabbits poop constantly and that is healthy.", "Warning — tell Mom if you see: soft or mushy droppings, droppings strung together with fur (means he is ingesting too much fur — increase brushing and hay), very few or no droppings for more than a few hours (gut slowdown — emergency), or cecotropes left uneaten (the soft grape-like clusters he usually eats directly — if he is leaving these, something is wrong).", "A rabbit that has stopped pooping for more than 4–6 hours needs a vet. This is an emergency."]'),

-- Rotating tasks
('pet_midnight', 'Spot clean cage — remove soiled bedding', 'rotating', true, 5, '{ellie,hannah}',
 '["Remove any visibly soiled or wet bedding and replace with fresh.", "Clean out the litter box area completely — dump, wipe, and refill.", "Spot cleaning daily keeps the cage from building up ammonia which is bad for Midnight''s respiratory system.", "A clean cage also keeps his paws and fur clean — important for preventing sores and infection."]'),

('pet_midnight', 'Full cage clean — replace all bedding', 'rotating', true, 20, '{ellie,hannah}',
 '["Remove Midnight and put him in a safe enclosed area while you clean.", "Remove all bedding completely.", "Wipe down the cage bottom and sides with rabbit-safe cleaner or diluted white vinegar.", "Rinse and let dry before adding fresh bedding.", "Wash his food bowl, hay rack, and water bottle/bowl.", "Do this twice a week as per his care schedule."]'),

('pet_midnight', 'Brush Midnight — pay extra attention to his mane', 'rotating', true, 15, '{ellie,hannah}',
 '["Use the slicker brush. Brush gently in the direction of fur growth.", "Midnight is a lionhead — his mane around his head and neck mats much more easily than his body fur.", "Check and brush his mane area first — any tangles should be worked out gently with your fingers before the brush. Do not pull.", "Check around his eyes — lionhead fur can fall over the eyes and cause irritation or blockage. If fur is covering his eyes, carefully trim with small blunt scissors or ask Mom to help.", "Brush his entire body — sides, belly (very gently), and hindquarters.", "Collect all loose fur and throw it away immediately. Loose fur in the cage = Midnight ingests it = wool block risk.", "Brush at minimum twice a week. Daily during shedding season."]'),

('pet_midnight', 'Enrichment — tunnels, toys, foraging, or free roam time', 'rotating', false, 20, '{ellie,hannah}',
 '["Rabbits need mental stimulation and movement. Midnight should have at least one enrichment activity daily.", "Options: set up a cardboard tunnel or box for him to explore and hide in, scatter a few pellets or herb leaves in hay for foraging, give him safe toys to toss (untreated wood blocks, hard plastic baby toys), supervised free roam time in a bunny-proofed area.", "During free roam: watch for chewing on cords, baseboards, or anything not his. This is normal — just redirect him.", "Enrichment time is also bonding time. Sit on the floor at his level — let him come to you."]'),

('pet_midnight', 'Weekly grooming and nail check', 'weekly', true, 20, '{ellie,hannah}',
 '["Full grooming session: brush entire body thoroughly including mane, check for any matting, skin irritation, or bald patches.", "Check his nails — they should not be curling or looking very long. Overgrown nails snag on bedding and can break painfully.", "Nail trimming: every 2–4 weeks. If you are not comfortable doing this, ask Mom. Clip just the tip — avoid the pink quick (blood vessel) inside the nail.", "Check his eyes: clear, no crust or discharge. Lionheads are prone to eye issues from fur — wipe gently with a damp cotton ball if there is any crust.", "Check his ears: clean and odor-free inside. Some wax is normal. Dark debris or head shaking indicates ear mites — tell Mom.", "Check his teeth: the front teeth should be even and not overgrown. If they look long or misaligned, tell Mom."]'),

('pet_midnight', 'Monthly health checks — weight and full assessment', 'monthly', true, 15, '{ellie,hannah}',
 '["Weigh Midnight once a month and log it. Significant weight loss or gain can indicate illness.", "Full check: eyes, nose, ears, teeth, nails, fur condition, skin, belly (gently feel — should not be hard or bloated), feet (check for sores or redness on the underside of hind feet — called sore hocks).", "Note any changes from last month.", "If anything feels off or different — tell Mom. You know Midnight best."]');
