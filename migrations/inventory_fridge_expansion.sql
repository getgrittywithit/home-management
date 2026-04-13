-- D59 INV-5: Fridge Fresh Staples — Cooking & Baking Essentials
-- Idempotent via canonical_name uniqueness check.

INSERT INTO inventory_items (name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
SELECT * FROM (VALUES
  -- Dairy (Cooking & Baking)
  ('Butter (Unsalted)',               'butter unsalted',           'Fridge', 'Dairy - Cooking',    'Walmart', ARRAY['Walmart','HEB'], 2, 'sticks',    1, 'ALL from-scratch baking, frostings, sauces, Irish cooking'),
  ('Heavy Whipping Cream',            'heavy whipping cream',      'Fridge', 'Dairy - Cooking',    'Walmart', ARRAY['Walmart','HEB'], 1, 'pint',      0, 'Whipped cream, ganache, cream sauces, frostings, Irish chowder'),
  ('Sour Cream',                      'sour cream',                'Fridge', 'Dairy - Cooking',    'Walmart', ARRAY['Walmart'],       1, 'tub',       0, 'Taco bar, potato bar, dips, baking'),
  ('Cream Cheese',                    'cream cheese',              'Fridge', 'Dairy - Cooking',    'Walmart', ARRAY['Walmart'],       2, 'blocks',    1, 'Frostings, dips, cheesecake, jalapeno poppers'),
  ('Greek Yogurt (Plain)',            'greek yogurt plain',        'Fridge', 'Dairy - Cooking',    'Walmart', ARRAY['Walmart','HEB'], 1, 'tub',       0, 'Tikka marinade, tzatziki, ranch dip, baking sub'),
  ('Parmesan Cheese (Grated)',        'parmesan cheese grated',    'Fridge', 'Cheese',             'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Every Italian dish — pasta, pizza, garlic bread, Caesar'),
  ('Ricotta Cheese',                  'ricotta cheese',            'Fridge', 'Cheese',             'Walmart', ARRAY['Walmart'],       1, 'tub',       0, 'Lasagna, stuffed shells, calzones'),
  ('Feta Cheese',                     'feta cheese',               'Fridge', 'Cheese',             'HEB',     ARRAY['HEB','Walmart'], 1, 'container', 0, 'Mediterranean salads, wraps, pizza'),

  -- Fresh Produce (Track for weekly shopping)
  ('Fresh Garlic (Heads)',            'fresh garlic heads',        'Fridge', 'Fresh Produce',      'Walmart', ARRAY['Walmart','HEB'], 2, 'heads',     1, 'Foundation of nearly every meal — all cuisines'),
  ('Fresh Ginger Root',               'fresh ginger root',         'Fridge', 'Fresh Produce',      'HEB',     ARRAY['HEB','Walmart'], 1, 'piece',     0, 'Asian, Indian, Caribbean, Thai — way better than powder'),
  ('Fresh Limes',                     'fresh limes',               'Fridge', 'Fresh Produce',      'Walmart', ARRAY['Walmart','HEB'], 4, 'limes',     2, 'Mexican, Asian, Thai, Caribbean — always have on hand'),
  ('Fresh Lemons',                    'fresh lemons',              'Fridge', 'Fresh Produce',      'Walmart', ARRAY['Walmart','HEB'], 3, 'lemons',    1, 'Lemon herb drumsticks, Mediterranean, baking, dressings'),
  ('Fresh Cilantro',                  'fresh cilantro',            'Fridge', 'Fresh Produce',      'HEB',     ARRAY['HEB','Walmart'], 1, 'bunch',     0, 'Mexican, Asian, Thai, Indian, Caribbean — buy weekly'),
  ('Fresh Jalapenos',                 'fresh jalapenos',           'Fridge', 'Fresh Produce',      'HEB',     ARRAY['HEB','Walmart'], 4, 'peppers',   2, 'Salsas, pickled, poppers, nachos'),
  ('Green Onions / Scallions',        'green onions scallions',    'Fridge', 'Fresh Produce',      'Walmart', ARRAY['Walmart','HEB'], 2, 'bunches',   1, 'Asian, Korean, Caribbean, baked potatoes, garnish')
) AS v(name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.canonical_name = v.canonical_name);
