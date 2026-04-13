-- D59 INV-6: Pantry Staples Gap Fill — International & From-Scratch
-- Idempotent via canonical_name uniqueness check.

INSERT INTO inventory_items (name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
SELECT * FROM (VALUES
  -- International Grains & Noodles
  ('Basmati Rice',                    'basmati rice',              'Pantry', 'Pasta & Grains',     'Walmart', ARRAY['Walmart','HEB'], 1, 'bag',       0, 'Indian curries, biryani — fragrant long grain'),
  ('Jasmine Rice',                    'jasmine rice',              'Pantry', 'Pasta & Grains',     'Walmart', ARRAY['Walmart','HEB'], 1, 'bag',       0, 'Thai, Asian — fragrant, slightly sticky'),
  ('Lo Mein / Chow Mein Noodles',     'lo mein noodles',           'Pantry', 'Pasta & Grains',     'HEB',     ARRAY['HEB','Walmart'], 1, 'pack',      0, 'Lo mein, chow mein — dried or fresh'),
  ('Rice Noodles (Pad Thai)',         'rice noodles pad thai',     'Pantry', 'Pasta & Grains',     'HEB',     ARRAY['HEB','Walmart'], 1, 'pack',      0, 'Thai peanut noodles, pad thai'),
  ('Glass Noodles (Sweet Potato)',    'glass noodles',             'Pantry', 'Pasta & Grains',     'HEB',     ARRAY['HEB'],           1, 'pack',      0, 'Korean japchae'),
  ('Couscous',                        'couscous',                  'Pantry', 'Pasta & Grains',     'Walmart', ARRAY['Walmart','HEB'], 1, 'box',       0, 'Mediterranean side — cooks in 5 min'),

  -- Beans & Legumes
  ('Canned Chickpeas',                'canned chickpeas',          'Pantry', 'Canned Goods',       'Walmart', ARRAY['Walmart','HEB'], 2, 'cans',      1, 'Hummus, falafel, Mediterranean salads, chana masala'),
  ('Dried Red Lentils',               'dried red lentils',         'Pantry', 'Canned Goods',       'Walmart', ARRAY['Walmart','HEB'], 1, 'bag',       0, 'Indian dal — cheapest protein, incredibly flavorful'),
  ('Canned Coconut Cream',            'canned coconut cream',      'Pantry', 'Canned Goods',       'HEB',     ARRAY['HEB'],           1, 'can',       0, 'Richer than coconut milk — Caribbean sauces, desserts'),

  -- Breading & Bread
  ('Italian Bread Crumbs',            'italian bread crumbs',      'Pantry', 'Bread & Bakery',     'Walmart', ARRAY['Walmart'],       1, 'container', 0, 'Meatballs, breading, stuffed shells topping'),
  ('Pita Bread',                      'pita bread',                'Pantry', 'Bread & Bakery',     'Walmart', ARRAY['Walmart','HEB'], 1, 'pack',      0, 'Gyros, shawarma wraps, hummus dipping'),
  ('Naan Bread (frozen or shelf)',    'naan bread',                'Pantry', 'Bread & Bakery',     'Walmart', ARRAY['Walmart','HEB'], 1, 'pack',      0, 'Indian curries, pizza base, garlic naan'),

  -- Frozen (International)
  ('Edamame (Frozen)',                'edamame frozen',            'Freezer', 'Frozen Vegetables',  'Walmart', ARRAY['Walmart','HEB'], 1, 'bag',       0, 'Teriyaki bowls, rice bowls, snacking'),
  ('Plantains (Frozen)',              'plantains frozen',          'Freezer', 'Frozen Vegetables',  'HEB',     ARRAY['HEB','Walmart'], 1, 'bag',       0, 'Caribbean maduros (sweet) or tostones (savory)'),

  -- Miscellaneous
  ('Kimchi (jarred)',                 'kimchi jarred',             'Fridge', 'International',      'HEB',     ARRAY['HEB'],           1, 'jar',       0, 'Korean side dish, fried rice, stew')
) AS v(name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.canonical_name = v.canonical_name);
