-- D56 INVENTORY-5 + INVENTORY-7: Prescriptions + spice cabinet pre-seed
-- Idempotent via canonical_name uniqueness check.

-- Prescriptions + allergy regimen + first aid (from CLAUDE.md)
INSERT INTO inventory_items (name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
SELECT * FROM (VALUES
  ('Focalin (Amos)',          'focalin amos',          'Medicine Cabinet', 'Prescription',   'CVS',     ARRAY['CVS'],    1, 'month supply', 0, 'AM ADHD med - Amos'),
  ('Focalin (Wyatt)',         'focalin wyatt',         'Medicine Cabinet', 'Prescription',   'CVS',     ARRAY['CVS'],    1, 'month supply', 0, 'AM ADHD med - Wyatt'),
  ('Clonidine (Amos)',        'clonidine amos',        'Medicine Cabinet', 'Prescription',   'CVS',     ARRAY['CVS'],    1, 'month supply', 0, 'PM sleep med - Amos'),
  ('Clonidine (Wyatt)',       'clonidine wyatt',       'Medicine Cabinet', 'Prescription',   'CVS',     ARRAY['CVS'],    1, 'month supply', 0, 'PM sleep med - Wyatt'),
  ('Adderall XR (Lola)',      'adderall xr lola',      'Medicine Cabinet', 'Prescription',   'CVS',     ARRAY['CVS'],    1, 'month supply', 0, 'AM ADHD med - Lola'),
  ('Lexapro (Lola)',          'lexapro lola',          'Medicine Cabinet', 'Prescription',   'CVS',     ARRAY['CVS'],    1, 'month supply', 0, 'Depression/Anxiety - Lola, 5mg→10mg'),
  ('Hydroxyzine (Lola)',      'hydroxyzine lola',      'Medicine Cabinet', 'Prescription',   'CVS',     ARRAY['CVS'],    1, 'bottle',       0, 'PRN anxiety/panic - Lola'),
  ('Escitalopram (Zoey)',     'escitalopram zoey',     'Medicine Cabinet', 'Prescription',   'CVS',     ARRAY['CVS'],    1, 'month supply', 0, 'Zoey 20mg daily'),
  ('Hydroxyzine (Zoey)',      'hydroxyzine zoey',      'Medicine Cabinet', 'Prescription',   'CVS',     ARRAY['CVS'],    1, 'bottle',       0, 'Zoey 10mg PRN'),
  ('Quetiapine (Zoey)',       'quetiapine zoey',       'Medicine Cabinet', 'Prescription',   'CVS',     ARRAY['CVS'],    1, 'month supply', 0, 'Zoey 25mg'),
  ('Fexofenadine 180mg (Lola)','fexofenadine lola',    'Medicine Cabinet', 'OTC - Allergy',  'Walmart', ARRAY['Walmart'],1, 'box',          0, 'Lola daily allergy - started Apr 8 2026'),
  ('Mucinex Plain (Lola)',    'mucinex lola',          'Medicine Cabinet', 'OTC - Allergy',  'Walmart', ARRAY['Walmart'],1, 'box',          0, 'Guaifenesin only, NOT DM'),
  ('Saline Nasal Rinse',      'saline nasal rinse',    'Medicine Cabinet', 'OTC - Allergy',  'Walmart', ARRAY['Walmart'],1, 'kit',          0, 'Daily — before bed ideal'),
  ('Band-Aids (assorted)',    'band-aids',             'Medicine Cabinet', 'First Aid',      'Walmart', ARRAY['Walmart'],2, 'boxes',        1, '6 kids = lots of scrapes'),
  ('Neosporin',               'neosporin',             'Medicine Cabinet', 'First Aid',      'Walmart', ARRAY['Walmart'],1, 'tube',         0, 'Antibiotic ointment'),
  ('Hydrogen Peroxide',       'hydrogen peroxide',     'Medicine Cabinet', 'First Aid',      'Walmart', ARRAY['Walmart'],1, 'bottle',       0, 'Wound cleaning'),
  ('Magna Calm Patch (Levi)', 'magna calm patch',      'Supplements',      'Daily Supplements','Amazon',ARRAY['Amazon'], 1, 'box',          0, 'Levi daily'),
  ('Focus Patch (Levi)',      'focus patch',           'Supplements',      'Daily Supplements','Amazon',ARRAY['Amazon'], 1, 'box',          0, 'Levi daily'),
  ('Vitamin B Complex (Levi)','vitamin b complex',     'Supplements',      'Daily Supplements','Amazon',ARRAY['Amazon'], 1, 'bottle',       0, 'Levi daily')
) AS v(name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.canonical_name = v.canonical_name);

-- Spice Cabinet — everyday, Mexican, Asian, BBQ, Baking, Herbs
INSERT INTO inventory_items (name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
SELECT * FROM (VALUES
  ('Salt (Iodized)',          'salt iodized',          'Spice Cabinet', 'Everyday',     'Walmart', ARRAY['Walmart'], 1, 'container', 0, 'Always have on hand'),
  ('Black Pepper (Ground)',   'black pepper ground',   'Spice Cabinet', 'Everyday',     'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Garlic Powder',           'garlic powder',         'Spice Cabinet', 'Everyday',     'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Onion Powder',            'onion powder',          'Spice Cabinet', 'Everyday',     'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Paprika',                 'paprika',               'Spice Cabinet', 'Everyday',     'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Italian Seasoning',       'italian seasoning',     'Spice Cabinet', 'Everyday',     'Walmart', ARRAY['Walmart'], 1, 'container', 0, 'Pizza & Italian nights'),
  ('Red Pepper Flakes',       'red pepper flakes',     'Spice Cabinet', 'Everyday',     'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Cumin (Ground)',          'cumin ground',          'Spice Cabinet', 'Mexican',      'Walmart', ARRAY['Walmart'], 1, 'container', 0, 'Mexican Night essential'),
  ('Chili Powder',            'chili powder',          'Spice Cabinet', 'Mexican',      'Walmart', ARRAY['Walmart'], 1, 'container', 0, 'Mexican Night + chili'),
  ('Cayenne Pepper',          'cayenne pepper',        'Spice Cabinet', 'Mexican',      'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Taco Seasoning',          'taco seasoning',        'Spice Cabinet', 'Mexican',      'Walmart', ARRAY['Walmart'], 2, 'packets',   1, 'Mexican Night — go fast'),
  ('Ground Ginger',           'ground ginger',         'Spice Cabinet', 'Asian',        'Walmart', ARRAY['Walmart'], 1, 'container', 0, 'Asian Night + baking'),
  ('Soy Sauce',               'soy sauce',             'Spice Cabinet', 'Asian',        'Walmart', ARRAY['Walmart'], 1, 'bottle',    0, 'Asian Night essential'),
  ('Sesame Oil',              'sesame oil',            'Spice Cabinet', 'Asian',        'HEB',     ARRAY['HEB'],     1, 'bottle',    0, ''),
  ('Rice Vinegar',            'rice vinegar',          'Spice Cabinet', 'Asian',        'HEB',     ARRAY['HEB'],     1, 'bottle',    0, ''),
  ('Smoked Paprika',          'smoked paprika',        'Spice Cabinet', 'BBQ & Grill',  'Walmart', ARRAY['Walmart'], 1, 'container', 0, 'Grill Night rubs'),
  ('Cinnamon (Ground)',       'cinnamon ground',       'Spice Cabinet', 'Baking',       'Walmart', ARRAY['Walmart'], 1, 'container', 0, 'Baking + oatmeal'),
  ('Nutmeg (Ground)',         'nutmeg ground',         'Spice Cabinet', 'Baking',       'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Allspice',                'allspice',              'Spice Cabinet', 'Baking',       'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Bay Leaves',               'bay leaves',           'Spice Cabinet', 'Herbs',        'Walmart', ARRAY['Walmart'], 1, 'container', 0, 'Soups + roasts'),
  ('Dried Oregano',           'dried oregano',         'Spice Cabinet', 'Herbs',        'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Dried Basil',             'dried basil',           'Spice Cabinet', 'Herbs',        'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Dried Thyme',             'dried thyme',           'Spice Cabinet', 'Herbs',        'Walmart', ARRAY['Walmart'], 1, 'container', 0, ''),
  ('Dried Parsley',           'dried parsley',         'Spice Cabinet', 'Herbs',        'Walmart', ARRAY['Walmart'], 1, 'container', 0, '')
) AS v(name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.canonical_name = v.canonical_name);
