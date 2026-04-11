-- task_instructions expansion: pet care, dishes, hygiene, feature help, duty help
-- Date: 2026-04-11

-- Pet Care: Spike (Bearded Dragon)
INSERT INTO task_instructions (task_source, task_key, steps) VALUES
('pet', 'spike_feed', '["Get Spike''s food (crickets or greens) from the container","Put 10-15 crickets in the tank or a small handful of chopped greens","Remove any uneaten food from yesterday"]'),
('pet', 'spike_water', '["Check Spike''s water dish","Dump and refill with fresh water","Dish should be shallow enough for him to soak in"]'),
('pet', 'spike_spot_clean', '["Look for any poop in the tank","Pick it up with a paper towel","Check that the substrate isn''t wet or smelly"]'),
('pet', 'spike_uvb_check', '["Make sure the UVB light is on during the day (8am-8pm)","If the bulb looks dim or is over 6 months old, tell Mom"]'),
('pet', 'spike_bath', '["Fill a shallow container with warm (not hot) water, about 1 inch deep","Put Spike in for 10-15 minutes","Gently pour water over his back","Dry him off and put him back in the tank"]')
ON CONFLICT (task_source, task_key) DO UPDATE SET steps = EXCLUDED.steps;

-- Pet Care: Midnight (Bunny — Lionhead Dwarf)
INSERT INTO task_instructions (task_source, task_key, steps) VALUES
('pet', 'midnight_hay', '["Check Midnight''s hay rack — it should NEVER be empty","If it''s low, fill it up from the hay bag","Hay is his most important food"]'),
('pet', 'midnight_water', '["Check and refill Midnight''s water bottle","Tap the ball to make sure it''s not clogged"]'),
('pet', 'midnight_veggies', '["Give a small portion of fresh veggies (romaine, cilantro, or parsley)","Remove any leftover veggies from yesterday"]'),
('pet', 'midnight_droppings', '["Look at droppings — should be round, dry, normal amount","If they look weird or there aren''t many, tell Mom"]'),
('pet', 'midnight_spot_clean', '["Check cage for wet or soiled bedding","Scoop out dirty spots","Add fresh bedding on top"]'),
('pet', 'midnight_brush', '["Use the small brush to gently brush his fur","Focus on his mane — it tangles easily","Talk to him so he stays calm"]')
ON CONFLICT (task_source, task_key) DO UPDATE SET steps = EXCLUDED.steps;

-- Pet Care: Hades (Snake — Ball Python)
INSERT INTO task_instructions (task_source, task_key, steps) VALUES
('pet', 'hades_water', '["Check Hades'' water dish","If dirty or low, dump it, rinse, and refill with fresh water"]'),
('pet', 'hades_visual_check', '["Look at Hades through the glass","Check for stuck shed, mouth issues, or cloudy eyes","If something looks off, tell Mom"]')
ON CONFLICT (task_source, task_key) DO UPDATE SET steps = EXCLUDED.steps;

-- Dishes
INSERT INTO task_instructions (task_source, task_key, steps) VALUES
('chore', 'dishes_evening', '["Clear the table completely","Scrape food into the trash","Rinse dishes and load the dishwasher","Wipe down the table and counters","Start the dishwasher if it''s full","Wipe down the stovetop if it was used"]'),
('chore', 'dishes_lunch', '["Clear your lunch dishes from the table","Rinse and load into dishwasher","Wipe your spot at the table"]'),
('chore', 'dishes_breakfast', '["Clear your breakfast dishes from the table","Rinse and load into dishwasher","Wipe your spot at the table"]')
ON CONFLICT (task_source, task_key) DO UPDATE SET steps = EXCLUDED.steps;

-- Hygiene / Routines
INSERT INTO task_instructions (task_source, task_key, steps) VALUES
('hygiene', 'shower', '["Get your towel and clean clothes ready first","Use soap on your whole body and shampoo in your hair","Rinse everything completely","Dry off and put dirty clothes in the hamper"]'),
('hygiene', 'deodorant', '["Apply deodorant under both arms","This is daily, not optional"]'),
('hygiene', 'get_dressed', '["Put on clean clothes for the day","Dirty clothes go in the hamper, not the floor"]'),
('routine', 'evening_tidy', '["Pick up anything you left out in common areas today","Put shoes by the door","Backpack and school stuff in your spot","Dirty clothes in hamper, not floor"]'),
('hygiene', 'morning_routine', '["Get out of bed and make your bed","Brush your teeth for 2 minutes","Wash your face","Get dressed in clean clothes","Put dirty clothes in the hamper"]'),
('hygiene', 'bedtime_routine', '["Brush your teeth for 2 minutes","Wash your face","Put on pajamas","Dirty clothes in the hamper","Get in bed — lights out by 9pm"]')
ON CONFLICT (task_source, task_key) DO UPDATE SET steps = EXCLUDED.steps;

-- Belle Care
INSERT INTO task_instructions (task_source, task_key, steps) VALUES
('belle', 'am_feed_walk', '["Get Belle''s food from the container in the laundry room","One scoop in her bowl, fresh water","Take her outside on leash for a walk around the block","Pick up after her with a bag"]'),
('belle', 'pm_feed', '["One scoop of food in her bowl","Check her water — refill if low"]'),
('belle', 'pm_walk', '["Take Belle outside for her evening walk","Same route as morning","Pick up after her with a bag"]'),
('belle', 'brush', '["Use the slicker brush from the basket by the door","Brush her whole body, starting at her back","Be gentle around her belly"]'),
('belle', 'bath', '["Use the dog shampoo under the bathroom sink","Wet her down in the tub, lather up, rinse completely","Towel dry — she doesn''t like the blow dryer"]'),
('belle', 'nail_trim', '["Use the dog nail clippers from the drawer","Only trim the white tips — don''t cut into the pink quick","If you''re not sure, ask Mom or Dad"]')
ON CONFLICT (task_source, task_key) DO UPDATE SET steps = EXCLUDED.steps;

-- Feature Help (how-to-use-this-feature)
INSERT INTO task_instructions (task_source, task_key, steps) VALUES
('feature', 'meal_picker', '["This is YOUR dinner night — you pick what the family eats!","Tap Shuffle for a random idea, or pick from the list","After you pick, Mom gets notified to approve it","Once approved, your meal goes on the calendar and Mom adds it to the grocery list"]'),
('feature', 'homework_turnin', '["When you finish a workbook or assignment, tap the book icon","Enter your page numbers and score if you have one","This logs your work so Mom can see your progress"]')
ON CONFLICT (task_source, task_key) DO UPDATE SET steps = EXCLUDED.steps;

-- Duty-Level Help
INSERT INTO task_instructions (task_source, task_key, steps) VALUES
('duty', 'dinner_manager_help', '["You''re the Dinner Manager tonight — you run the kitchen!","Check the meal plan to see what''s for dinner","Get ingredients out and follow the recipe or Mom''s instructions","Set the table before food is ready","Call everyone when it''s time to eat","Help clean up after"]'),
('duty', 'laundry_help', '["Check the hampers and collect dirty clothes","Sort by color if needed (darks, lights, towels)","Start a load in the washer with one scoop of detergent","When the washer is done, move to the dryer","Fold and put away when dry"]')
ON CONFLICT (task_source, task_key) DO UPDATE SET steps = EXCLUDED.steps;

-- Homeschool Subject Help
INSERT INTO task_instructions (task_source, task_key, steps) VALUES
('subject', 'math_ixl', '["Open IXL on the computer","Go to your grade level","Pick the skill Mom assigned (check your journal or calendar)","Work for the assigned time","Screenshot your score when done"]'),
('subject', 'summer_bridge', '["Get your Summer Bridge workbook from the shelf","Open to the next page you haven''t done","Complete the assigned work","Show Mom when done"]'),
('subject', 'independent_reading', '["Get your current book","Find a quiet spot","Read for the assigned time","When done, you can write about what happened in your reading journal"]'),
('subject', 'word_of_the_day', '["Check the word on the board or in the app","Write the word and the definition","Use it in a sentence","Try to use the word in conversation today!"]'),
('subject', 'science_general', '["Check your assignment board or calendar","Complete the activity or reading for today","If it''s a hands-on project, get your supplies ready first"]'),
('subject', 'social_studies_general', '["Check your assignment board or calendar","Complete the activity or reading for today","If it''s a map or research project, get your materials ready first"]')
ON CONFLICT (task_source, task_key) DO UPDATE SET steps = EXCLUDED.steps;
