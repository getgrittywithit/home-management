-- ============================================================================
-- Dispatch 97 — Kid Engagement Fixes
-- Achievement dedup, pet shop seed, calendar dedup, meal reminders,
-- mood prompt, pet decay initialization.
-- ============================================================================

-- D-1: Clean duplicate achievement notifications (keep first per kid+title)
DELETE FROM notifications WHERE source_type IN ('achievement_earned', 'achievement_parent')
  AND id NOT IN (
    SELECT MIN(id) FROM notifications
    WHERE source_type IN ('achievement_earned', 'achievement_parent')
    GROUP BY kid_name, title
  );

-- D-1: kid_achievements uses UUID child_id — skip auto-populate from text kid_name.
-- Achievements are now tracked by deduped notifications until the ID mapping is built.

-- F-1: Initialize pet decay timestamps
UPDATE digi_pets SET last_decay_at = last_activity_at WHERE last_decay_at IS NULL;

-- G-1: Deduplicate calendar_connections — standardize to lowercase
-- Delete uppercase duplicates (keep the lowercase row)
DELETE FROM calendar_connections WHERE id IN (
  SELECT cc.id FROM calendar_connections cc
  WHERE EXISTS (
    SELECT 1 FROM calendar_connections other
    WHERE LOWER(other.member_name) = LOWER(cc.member_name)
      AND other.id < cc.id
      AND cc.member_name IS NOT NULL
  )
);
-- Standardize remaining to lowercase
UPDATE calendar_connections SET member_name = LOWER(member_name) WHERE member_name IS NOT NULL;
UPDATE calendar_connections SET category = 'kid' WHERE category = 'kids';

-- H-1: Meal pick reminders
INSERT INTO reminder_schedules (target_role, kid_name, reminder_type, title, message, schedule_time, days_of_week)
SELECT * FROM (VALUES
  ('parent', NULL::text,  'meal_pick_sunday', '🍽️ Meal pick reminder', 'Remind kids to pick their meals for this week', '18:00'::time, '{0}'::int[]),
  ('kid',    'amos',      'meal_pick_day',    '🍽️ Pick your meal!', 'You cook tomorrow — pick your dinner!', '17:00'::time, '{3}'::int[]),
  ('kid',    'zoey',      'meal_pick_day',    '🍽️ Pick your meal!', 'You cook tomorrow — pick your dinner!', '17:00'::time, '{1}'::int[]),
  ('kid',    'wyatt',     'meal_pick_day',    '🍽️ Pick your meal!', 'You cook tomorrow — pick your dinner!', '17:00'::time, '{2}'::int[]),
  ('kid',    'kaylee',    'meal_pick_day',    '🍽️ Pick your meal!', 'You cook tomorrow — pick your dinner!', '17:00'::time, '{0}'::int[]),
  ('kid',    'ellie',     'meal_pick_day',    '🍽️ Pick your meal!', 'You cook tomorrow — pick your dinner!', '17:00'::time, '{4}'::int[]),
  ('kid',    'hannah',    'meal_pick_day',    '🍽️ Pick your meal!', 'You cook tomorrow — pick your dinner!', '17:00'::time, '{4}'::int[])
) AS v(target_role, kid_name, reminder_type, title, message, schedule_time, days_of_week)
WHERE NOT EXISTS (SELECT 1 FROM reminder_schedules rs WHERE rs.reminder_type = v.reminder_type AND COALESCE(rs.kid_name, '') = COALESCE(v.kid_name, ''));

-- E-2: Nightly mood prompt for all kids
INSERT INTO reminder_schedules (target_role, kid_name, reminder_type, title, message, schedule_time)
SELECT 'kid', kid, 'mood_prompt', '🌙 How was your day?', 'Log your mood before bed — tap to check in', '20:30'::time
FROM UNNEST(ARRAY['amos','zoey','kaylee','ellie','wyatt','hannah']) AS kid
WHERE NOT EXISTS (SELECT 1 FROM reminder_schedules WHERE kid_name = kid AND reminder_type = 'mood_prompt');

-- I-1: Seed digi-pet shop accessories
CREATE TABLE IF NOT EXISTS digi_pet_shop_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  cost_stars INTEGER NOT NULL,
  description TEXT,
  emoji TEXT,
  rarity TEXT DEFAULT 'common',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO digi_pet_shop_items (name, category, cost_stars, description, emoji, rarity)
SELECT * FROM (VALUES
  ('Baseball Cap',       'hat',        5,  'A classic cap for your pet',              '🧢', 'common'),
  ('Party Hat',          'hat',        8,  'Time to celebrate!',                       '🎉', 'common'),
  ('Crown',             'hat',        20, 'Royal headwear for a royal pet',           '👑', 'rare'),
  ('Wizard Hat',         'hat',        30, 'Magical powers included',                 '🧙', 'epic'),
  ('Tropical Beach',    'habitat',    15, 'Sandy shores and palm trees',             '🏖️', 'common'),
  ('Space Station',     'habitat',    25, 'Orbit the Earth with your pet',           '🚀', 'rare'),
  ('Enchanted Forest',  'habitat',    20, 'Magical mushrooms and fireflies',         '🌲', 'rare'),
  ('Underwater Palace', 'habitat',    35, 'Deep sea castle with coral gardens',      '🏰', 'epic'),
  ('Tennis Ball',       'toy',        3,  'Fetch! Restores +5 happiness',            '🎾', 'common'),
  ('Frisbee',           'toy',        5,  'Flying fun! Restores +8 happiness',       '🥏', 'common'),
  ('Skateboard',        'toy',        12, 'Radical! Restores +15 happiness',         '🛹', 'rare'),
  ('Fish Treat',        'food',       2,  'Yummy! Restores +10 happiness',           '🐟', 'common'),
  ('Golden Fish',       'food',       5,  'Premium snack! Restores +20 happiness',   '✨', 'rare'),
  ('Cookie',            'food',       3,  'Sweet treat! Restores +12 happiness',     '🍪', 'common'),
  ('Sunglasses',        'accessory',  8,  'Cool shades for a cool pet',              '😎', 'common'),
  ('Bow Tie',           'accessory',  6,  'Fancy and dapper',                        '🎀', 'common'),
  ('Cape',              'accessory',  15, 'Superhero mode activated',                '🦸', 'rare'),
  ('Rainbow Trail',     'accessory',  25, 'Leave a rainbow wherever you go',         '🌈', 'epic'),
  ('Pirate Costume',    'costume',    30, 'Arrr! Full pirate outfit',                '🏴‍☠️', 'epic'),
  ('Astronaut Suit',    'costume',    40, 'Ready for space exploration',             '👨‍🚀', 'legendary')
) AS v(name, category, cost_stars, description, emoji, rarity)
WHERE NOT EXISTS (SELECT 1 FROM digi_pet_shop_items WHERE name = v.name);
