-- Dispatch 136 — Pet Supply Tracker

-- Fix Midnight caretaker (remove Wyatt if present)
UPDATE pets SET helpers = array_remove(helpers, 'wyatt') WHERE name = 'midnight' AND 'wyatt' = ANY(helpers);

CREATE TABLE IF NOT EXISTS pet_supply_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  item_category TEXT,
  typical_qty NUMERIC,
  typical_unit TEXT,
  typical_interval_days INTEGER,
  preferred_shop TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pet_supplies_purchased (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL,
  supply_type_id UUID,
  item_name TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  cost_cents INTEGER,
  shop TEXT,
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  purchased_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplies_pet_date ON pet_supplies_purchased(pet_id, purchased_at DESC);

-- Seed supply types
INSERT INTO pet_supply_types (pet_id, item_name, item_category, typical_qty, typical_unit, typical_interval_days) VALUES
  ((SELECT id FROM pets WHERE name='hades'), 'Live mice', 'food', 2.5, 'mice', 10),
  ((SELECT id FROM pets WHERE name='spike'), 'Live crickets', 'food', 50, 'count', 14),
  ((SELECT id FROM pets WHERE name='spike'), 'Dubia roaches', 'food', 25, 'count', 21),
  ((SELECT id FROM pets WHERE name='spike'), 'UVB bulb', 'equipment', 1, 'bulb', 180),
  ((SELECT id FROM pets WHERE name='spike'), 'Calcium dust', 'health', 1, 'container', 60),
  ((SELECT id FROM pets WHERE name='midnight'), 'Rabbit food pellets', 'food', 1, 'bag', 42),
  ((SELECT id FROM pets WHERE name='midnight'), 'Timothy hay', 'food', 1, 'box', 21),
  ((SELECT id FROM pets WHERE name='midnight'), 'Bedding / litter pellets', 'bedding', 1, 'bag', 28),
  ((SELECT id FROM pets WHERE name='belle'), 'Dog food', 'food', 1, 'bag', 30)
ON CONFLICT DO NOTHING;

-- Seed April 21 purchases
INSERT INTO pet_supplies_purchased (pet_id, item_name, qty, unit, purchased_at, purchased_by, notes) VALUES
  ((SELECT id FROM pets WHERE name='hades'), 'Live mice', 3, 'mice', '2026-04-21', 'lola', 'First logged purchase'),
  ((SELECT id FROM pets WHERE name='spike'), 'Live crickets', 1, 'bag', '2026-04-21', 'lola', 'Protein rotation'),
  ((SELECT id FROM pets WHERE name='spike'), 'Dubia roaches', 1, 'container', '2026-04-21', 'lola', 'Protein rotation'),
  ((SELECT id FROM pets WHERE name='midnight'), 'Rabbit food', 1, 'bag', '2026-04-21', 'lola', 'Brand TBD'),
  ((SELECT id FROM pets WHERE name='midnight'), 'Bedding / litter pellets', 1, 'bag', '2026-04-21', 'lola', 'Brand TBD')
ON CONFLICT DO NOTHING;
