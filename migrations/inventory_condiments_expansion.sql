-- D59 INV-2: Condiments & Sauces Expansion — Meal Library Coverage
-- Idempotent via canonical_name uniqueness check.
-- Note: balsamic vinegar lives in inventory_oils_expansion.sql (Oils & Vinegars), not here.

INSERT INTO inventory_items (name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
SELECT * FROM (VALUES
  -- Asian Sauces
  ('Soy Sauce (Large)',               'soy sauce large',              'Pantry', 'Asian Sauces',       'Walmart', ARRAY['Walmart','HEB'], 1, 'bottle',    0, 'Foundation — fried rice, lo mein, teriyaki, stir fry'),
  ('Teriyaki Sauce',                  'teriyaki sauce',               'Pantry', 'Asian Sauces',       'Walmart', ARRAY['Walmart','HEB'], 1, 'bottle',    0, 'Teriyaki chicken bowls, skewers, glaze'),
  ('Hoisin Sauce',                    'hoisin sauce',                 'Pantry', 'Asian Sauces',       'HEB',     ARRAY['HEB','Walmart'], 1, 'bottle',    0, 'Lo mein, chow mein, stir fry glaze, spring roll dip'),
  ('Oyster Sauce',                    'oyster sauce',                 'Pantry', 'Asian Sauces',       'HEB',     ARRAY['HEB'],           1, 'bottle',    0, 'Beef & broccoli, stir fry — deep umami'),
  ('Sriracha',                        'sriracha',                     'Pantry', 'Asian Sauces',       'Walmart', ARRAY['Walmart','HEB'], 1, 'bottle',    0, 'Asian night, ramen, honey sriracha drumsticks'),
  ('Chili Garlic Sauce (Sambal)',     'chili garlic sambal',          'Pantry', 'Asian Sauces',       'HEB',     ARRAY['HEB','Walmart'], 1, 'jar',       0, 'Stir fry, dipping, Korean/Thai crossover'),
  ('Fish Sauce',                      'fish sauce',                   'Pantry', 'Asian Sauces',       'HEB',     ARRAY['HEB'],           1, 'bottle',    0, 'Thai peanut noodles, pad thai, fried rice depth'),
  ('Sweet Chili Sauce',               'sweet chili sauce',            'Pantry', 'Asian Sauces',       'Walmart', ARRAY['Walmart','HEB'], 1, 'bottle',    0, 'Dipping, glaze, spring rolls, chicken'),
  ('Gochujang (Korean Chili Paste)',  'gochujang paste',              'Pantry', 'Asian Sauces',       'HEB',     ARRAY['HEB'],           1, 'tub',       0, 'Korean BBQ bowls, gochujang drumstick marinade'),
  ('Mirin (Sweet Rice Wine)',         'mirin',                        'Pantry', 'Asian Sauces',       'HEB',     ARRAY['HEB'],           1, 'bottle',    0, 'Teriyaki glaze, Japanese sauces, bulgogi'),

  -- Mexican / Latin Sauces
  ('Hot Sauce (Cholula)',             'hot sauce cholula',            'Pantry', 'Mexican Sauces',     'Walmart', ARRAY['Walmart','HEB'], 1, 'bottle',    0, 'Table sauce for everything Mexican'),
  ('Enchilada Sauce Red (canned)',    'enchilada sauce red',          'Pantry', 'Mexican Sauces',     'Walmart', ARRAY['Walmart','HEB'], 2, 'cans',      1, 'Red enchiladas — keep 2 cans'),
  ('Enchilada Sauce Green (canned)',  'enchilada sauce green',        'Pantry', 'Mexican Sauces',     'Walmart', ARRAY['Walmart','HEB'], 2, 'cans',      1, 'Green enchiladas, salsa chicken variation'),
  ('Chipotle Peppers in Adobo',       'chipotle peppers adobo',       'Pantry', 'Mexican Sauces',     'Walmart', ARRAY['Walmart','HEB'], 2, 'cans',      1, 'Birria, adobo chicken, chipotle mayo — small can goes far'),

  -- BBQ & American Sauces
  ('BBQ Sauce',                       'bbq sauce',                    'Pantry', 'BBQ & American',     'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'BBQ chicken, ribs, grill night, sheet pan'),
  ('Chipotle BBQ Sauce',              'chipotle bbq sauce',           'Pantry', 'BBQ & American',     'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Chipotle Smoky BBQ drumstick marinade'),
  ('Buffalo Sauce (Medium)',          'buffalo sauce medium',         'Pantry', 'BBQ & American',     'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Garlic Buffalo drumsticks, wings, pizza bar sauce'),
  ('Hot Sauce (Franks RedHot)',       'hot sauce franks',             'Pantry', 'BBQ & American',     'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Buffalo wings/drumsticks, mac & cheese, general heat'),
  ('Worcestershire Sauce',            'worcestershire sauce',         'Pantry', 'BBQ & American',     'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Burgers, meatloaf, shepherds pie, Irish stew, gravy'),
  ('Steak Sauce (A1)',                'steak sauce a1',               'Pantry', 'BBQ & American',     'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Grill night, burgers, steak'),

  -- Italian Sauces
  ('Marinara Sauce (jarred)',         'marinara sauce jar',           'Pantry', 'Italian Sauces',     'Walmart', ARRAY['Walmart','HEB'], 2, 'jars',      1, 'Pizza, dipping, pasta, dunkers — always have 2-3'),
  ('Alfredo Sauce (jarred)',          'alfredo sauce jar',            'Pantry', 'Italian Sauces',     'Walmart', ARRAY['Walmart','HEB'], 1, 'jar',       0, 'Fettuccine Alfredo, white pizza sauce'),

  -- Caribbean
  ('Jerk Sauce / Marinade',           'jerk sauce marinade',          'Pantry', 'Caribbean Sauces',   'HEB',     ARRAY['HEB','Amazon'],  1, 'bottle',    0, 'Jerk chicken nights — Walkerswood brand is gold standard'),

  -- Dressings
  ('Ranch Dressing',                  'ranch dressing',               'Fridge', 'Dressings',          'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Salad bar, dipping, Classic Ranch drumstick marinade'),
  ('Italian Dressing',                'italian dressing',             'Fridge', 'Dressings',          'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Cold pasta salad, salad bar, quick marinade'),
  ('Caesar Dressing',                 'caesar dressing',              'Fridge', 'Dressings',          'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Salad bar'),
  ('Thousand Island Dressing',        'thousand island dressing',     'Fridge', 'Dressings',          'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Salad bar, Reuben-style'),

  -- General Condiments
  ('Dijon Mustard',                   'dijon mustard',                'Fridge', 'Condiments',         'Walmart', ARRAY['Walmart','HEB'], 1, 'jar',       0, 'Vinaigrettes, rubs, Irish mustard cream, sauces'),
  ('Honey Mustard',                   'honey mustard',                'Fridge', 'Condiments',         'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Dipping sauce, chicken marinade'),
  ('Mayonnaise',                      'mayonnaise',                   'Fridge', 'Condiments',         'Walmart', ARRAY['Walmart'],       1, 'jar',       0, 'Coleslaw, sandwiches, chipotle mayo, lime crema base'),
  ('Relish (Dill)',                   'relish dill',                  'Fridge', 'Condiments',         'Walmart', ARRAY['Walmart'],       1, 'jar',       0, 'Hot dogs, potato salad, burger topping'),
  ('Tahini',                          'tahini',                       'Pantry', 'Mediterranean',      'HEB',     ARRAY['HEB'],           1, 'jar',       0, 'Hummus, shawarma sauce, Mediterranean dressing'),

  -- Curry Pastes
  ('Red Curry Paste',                 'red curry paste',              'Pantry', 'Asian Sauces',       'HEB',     ARRAY['HEB'],           1, 'jar',       0, 'Thai red curry — one jar makes multiple meals'),
  ('Green Curry Paste',               'green curry paste',            'Pantry', 'Asian Sauces',       'HEB',     ARRAY['HEB'],           1, 'jar',       0, 'Thai green curry')
) AS v(name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.canonical_name = v.canonical_name);
