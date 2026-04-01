-- ============================================================================
-- Migration: Task instructions + privacy flag + financial literacy level fix
-- ============================================================================

-- Task instructions lookup
CREATE TABLE IF NOT EXISTS task_instructions (
  id SERIAL PRIMARY KEY,
  task_source TEXT NOT NULL,
  task_key TEXT NOT NULL,
  steps TEXT[] NOT NULL,
  UNIQUE(task_source, task_key)
);

-- Seed common task instructions
INSERT INTO task_instructions (task_source, task_key, steps) VALUES
  -- Morning habits
  ('habit', 'make_bed', ARRAY['Pull up sheets and straighten them','Straighten comforter or blanket','Arrange pillows at the top']),
  ('habit', 'morning_focalin', ARRAY['Take with breakfast, not on empty stomach','One pill with a full glass of water']),
  ('habit', 'evening_clonidine', ARRAY['Take at bedtime with water','Already in your pill organizer']),
  ('habit', 'brush_teeth_am', ARRAY['2 minutes — all 4 quadrants','Don''t forget your tongue','Rinse and put toothbrush away']),
  ('habit', 'brush_teeth_pm', ARRAY['2 minutes — all 4 quadrants','Floss between all teeth','Rinse and put toothbrush away']),
  -- Belle care
  ('belle', 'am_feed_walk', ARRAY['Fresh water in bowl','1 scoop food in bowl','Walk around the block — leash + poop bags']),
  ('belle', 'pm_feed', ARRAY['1 scoop food at 5pm','Check water bowl — refill if low']),
  ('belle', 'pm_walk', ARRAY['Walk at 6:30pm','Leash + poop bags','Pick up after her']),
  -- Dishes
  ('dishes', 'morning_dishes', ARRAY['Clear breakfast dishes to sink','Wipe table and counters','Load dishwasher or handwash']),
  ('dishes', 'lunch_dishes', ARRAY['Wash 5 items','Dry and put away','Wipe counters','Check if dishwasher needs running']),
  -- Evening
  ('habit', 'evening_tidy', ARRAY['Pick up items that aren''t in their place','Shoes by the door','Backpack or bag ready for tomorrow']),
  ('habit', 'school_room_clean', ARRAY['Put away all school materials','Wipe down desk or table','Push in chairs','Pick up any trash or scraps']),
  -- Zone general
  ('zone', 'hotspot', ARRAY['Clear clutter from surfaces','Organize items into their homes','Wipe down the area','Take anything that doesn''t belong to lost-and-found bin']),
  ('zone', 'kitchen', ARRAY['Wipe all counters','Clean stovetop','Sweep floor','Check trash — take out if full','Wipe cabinet fronts if needed']),
  ('zone', 'guest_bath', ARRAY['Wipe sink and faucet','Wipe toilet seat, handle, and base','Clean mirror','Sweep floor','Freshen towels and restock supplies']),
  ('zone', 'kids_bath', ARRAY['Wipe sink and faucet','Wipe toilet seat, handle, and base','Clean mirror','Sweep or mop floor','Put away any items left on counter']),
  ('zone', 'pantry', ARRAY['Check for expired items','Straighten shelves','Wipe any spills','Make sure labels face forward','Report anything running low to Mom']),
  ('zone', 'floors', ARRAY['Sweep all hard floors','Spot-mop any spills or sticky spots','Shake out entry rugs','Empty dustpan into trash'])
ON CONFLICT (task_source, task_key) DO NOTHING;

-- Privacy flag on messages/requests
ALTER TABLE family_messages ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- Fix financial literacy starting levels
UPDATE financial_literacy_progress SET current_level = 1 WHERE kid_name = 'hannah';
UPDATE financial_literacy_progress SET current_level = 2 WHERE kid_name = 'wyatt';
UPDATE financial_literacy_progress SET current_level = 2 WHERE kid_name = 'kaylee';
UPDATE financial_literacy_progress SET current_level = 3 WHERE kid_name = 'ellie';
UPDATE financial_literacy_progress SET current_level = 4 WHERE kid_name = 'zoey';
UPDATE financial_literacy_progress SET current_level = 4 WHERE kid_name = 'amos';
