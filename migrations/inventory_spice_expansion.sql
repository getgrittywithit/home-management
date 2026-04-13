-- D59 INV-1: Spice Cabinet Expansion — World Pantry
-- Idempotent via canonical_name uniqueness check.

INSERT INTO inventory_items (name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
SELECT * FROM (VALUES
  -- Everyday Essentials
  ('Kosher Salt',               'kosher salt',              'Spice Cabinet', 'Everyday',       'Walmart', ARRAY['Walmart','HEB'], 1, 'box',       0, 'Rubs, finishing, brining — better than iodized for cooking'),
  ('Sea Salt (Flaky)',          'sea salt flaky',           'Spice Cabinet', 'Everyday',       'HEB',     ARRAY['HEB','Walmart'], 1, 'container', 0, 'Finishing salt for steaks, baked goods'),
  ('Black Peppercorns (Whole)', 'black peppercorns whole',  'Spice Cabinet', 'Everyday',       'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Fresh-ground — night and day difference'),
  ('Seasoned Salt (Lawrys)',    'seasoned salt lawrys',     'Spice Cabinet', 'Everyday',       'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'American comfort staple — fried chicken, fries, burgers'),
  ('Lemon Pepper',              'lemon pepper',             'Spice Cabinet', 'Everyday',       'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Chicken, fish, drumstick marinade'),

  -- Mexican Expansion
  ('Chipotle Powder',           'chipotle powder',          'Spice Cabinet', 'Mexican',        'HEB',     ARRAY['HEB','Walmart'], 1, 'container', 0, 'Smoky heat — birria, adobo, chipotle BBQ marinade'),
  ('Ancho Chili Powder',        'ancho chili powder',       'Spice Cabinet', 'Mexican',        'HEB',     ARRAY['HEB'],           1, 'container', 0, 'Mild, sweet, deep — enchilada sauce, birria, mole'),
  ('Mexican Oregano',           'mexican oregano',          'Spice Cabinet', 'Mexican',        'HEB',     ARRAY['HEB'],           1, 'container', 0, 'Different from Italian — earthier, essential for authentic Mexican'),
  ('Coriander (Ground)',        'coriander ground',         'Spice Cabinet', 'Mexican',        'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Pairs with cumin — Mexican, Indian, Thai, Middle Eastern crossover'),
  ('Tajin Chile-Lime',          'tajin chile lime',         'Spice Cabinet', 'Mexican',        'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Fruit, corn, elote, rim seasoning'),

  -- Asian Expansion
  ('Chinese Five Spice',        'chinese five spice',       'Spice Cabinet', 'Asian',          'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Egg roll bowls, stir fry, chow mein — defining blend'),
  ('White Pepper',              'white pepper',             'Spice Cabinet', 'Asian',          'HEB',     ARRAY['HEB','Walmart'], 1, 'container', 0, 'Fried rice, Asian + Irish soups, cream sauces'),
  ('Toasted Sesame Seeds',      'toasted sesame seeds',     'Spice Cabinet', 'Asian',          'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Garnish for teriyaki, rice bowls, noodles, Korean'),

  -- Korean
  ('Gochugaru (Korean Red Pepper Flakes)', 'gochugaru',    'Spice Cabinet', 'Korean',         'HEB',     ARRAY['HEB'],           1, 'bag',       0, 'Korean BBQ, kimchi — fruity heat, not just hot'),

  -- Caribbean / Jamaican
  ('Scotch Bonnet Powder',      'scotch bonnet powder',     'Spice Cabinet', 'Caribbean',      'HEB',     ARRAY['HEB','Amazon'],  1, 'container', 0, 'Jerk seasoning heat — can sub habanero powder'),
  ('Cloves (Ground)',           'cloves ground',            'Spice Cabinet', 'Caribbean',      'HEB',     ARRAY['HEB','Walmart'], 1, 'container', 0, 'Jerk seasoning, Caribbean desserts, ham glaze, gingerbread'),
  ('Curry Powder (Jamaican)',   'curry powder jamaican',    'Spice Cabinet', 'Caribbean',      'HEB',     ARRAY['HEB'],           1, 'container', 0, 'Jamaican curry chicken — different from Indian curry'),

  -- Indian / Middle Eastern
  ('Turmeric (Ground)',         'turmeric ground',          'Spice Cabinet', 'Indian',         'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Tikka masala, curry, rice — anti-inflammatory'),
  ('Garam Masala',              'garam masala',             'Spice Cabinet', 'Indian',         'HEB',     ARRAY['HEB','Walmart'], 1, 'container', 0, 'THE Indian spice blend — tikka masala, all curries'),
  ('Curry Powder (Yellow)',     'curry powder yellow',      'Spice Cabinet', 'Indian',         'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Tikka masala shortcut, general curry, shawarma'),
  ('Cardamom (Ground)',         'cardamom ground',          'Spice Cabinet', 'Indian',         'HEB',     ARRAY['HEB'],           1, 'container', 0, 'Indian chai, rice, desserts, shawarma spice'),
  ('Cumin Seeds (Whole)',       'cumin seeds whole',        'Spice Cabinet', 'Indian',         'HEB',     ARRAY['HEB'],           1, 'container', 0, 'Toast in oil to start Indian curries — blooms flavor'),
  ('Cinnamon Sticks',           'cinnamon sticks',          'Spice Cabinet', 'Indian',         'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Birria broth, biryani, chai, mulled cider'),

  -- Irish
  ('Caraway Seeds',             'caraway seeds',            'Spice Cabinet', 'Irish',          'HEB',     ARRAY['HEB'],           1, 'container', 0, 'Irish soda bread, colcannon, corned beef — Irish signature'),
  ('Mustard Powder (Dry)',      'mustard powder dry',       'Spice Cabinet', 'Irish',          'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Irish mustard sauce, rubs, Carolina BBQ, homemade condiments'),

  -- BBQ & Grill Expansion
  ('Celery Salt',               'celery salt',              'Spice Cabinet', 'BBQ & Grill',    'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Memphis rubs, Old Bay-style, coleslaw dressing'),
  ('Granulated Garlic',         'granulated garlic',        'Spice Cabinet', 'BBQ & Grill',    'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Better texture in rubs than garlic powder'),
  ('Dried Onion Flakes',        'dried onion flakes',       'Spice Cabinet', 'BBQ & Grill',    'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Rub mixes, burger seasoning, French onion dip'),

  -- Herbs Expansion
  ('Rosemary (Dried)',          'rosemary dried',           'Spice Cabinet', 'Herbs',          'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Roast chicken, pot roast, lamb, focaccia, bread'),
  ('Sage (Dried)',              'sage dried',               'Spice Cabinet', 'Herbs',          'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Sausage gravy, stuffing, pork, bangers'),
  ('Dill Weed (Dried)',         'dill weed dried',          'Spice Cabinet', 'Herbs',          'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Tzatziki, ranch dip, fish, pickles, potato salad'),
  ('Dried Chives',              'dried chives',             'Spice Cabinet', 'Herbs',          'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Baked potatoes, sour cream dip, ranch seasoning'),
  ('Dried Cilantro',            'dried cilantro',           'Spice Cabinet', 'Herbs',          'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Quick-add for Mexican/Asian when no fresh on hand'),

  -- Baking Spice Expansion
  ('Pumpkin Pie Spice',         'pumpkin pie spice',        'Spice Cabinet', 'Baking',         'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Pumpkin pancakes, fall baking — or DIY from cinnamon/nutmeg/cloves'),
  ('Cream of Tartar',           'cream of tartar',          'Spice Cabinet', 'Baking',         'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Snickerdoodles, stabilize whipped cream, meringue')
) AS v(name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.canonical_name = v.canonical_name);
