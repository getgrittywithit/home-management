-- D59 INV-4: Baking Cabinet Expansion — From-Scratch Staples
-- Idempotent via canonical_name uniqueness check.

INSERT INTO inventory_items (name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
SELECT * FROM (VALUES
  -- Flours
  ('Bread Flour',               'bread flour',               'Baking Cabinet', 'Flours',           'Walmart', ARRAY['Walmart','HEB'], 1, 'bag',       0, 'Homemade bread, pizza dough — higher gluten than AP'),
  ('Whole Wheat Flour',         'whole wheat flour',         'Baking Cabinet', 'Flours',           'Walmart', ARRAY['Walmart','HEB'], 1, 'bag',       0, 'Irish soda bread, wheat bread, healthier baking'),
  ('Self-Rising Flour',         'self rising flour',         'Baking Cabinet', 'Flours',           'Walmart', ARRAY['Walmart'],       1, 'bag',       0, 'Biscuits, quick breads, pancakes'),
  ('Cake Flour',                'cake flour',                'Baking Cabinet', 'Flours',           'Walmart', ARRAY['Walmart'],       1, 'box',       0, 'From-scratch cakes — lighter, finer texture'),
  ('Cornmeal (Yellow)',         'cornmeal yellow',           'Baking Cabinet', 'Flours',           'Walmart', ARRAY['Walmart','HEB'], 1, 'bag',       0, 'Cornbread from scratch, breading, hush puppies'),
  ('Masa Harina',               'masa harina',               'Baking Cabinet', 'Flours',           'HEB',     ARRAY['HEB','Walmart'], 1, 'bag',       0, 'Homemade tortillas, tamales'),

  -- Fats & Dairy (Baking)
  ('Shortening (Crisco)',       'shortening crisco',         'Baking Cabinet', 'Baking Fats',      'Walmart', ARRAY['Walmart'],       1, 'can',       0, 'Pie crust, biscuits, frying, frosting'),
  ('Buttermilk (shelf-stable or powder)', 'buttermilk',      'Baking Cabinet', 'Baking Essentials', 'Walmart', ARRAY['Walmart'],      1, 'container', 0, 'Soda bread, scones, biscuits, pancakes, fried chicken'),

  -- Extracts & Flavoring
  ('Almond Extract',            'almond extract',            'Baking Cabinet', 'Extracts',         'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Cookies, cakes, frostings — pairs with vanilla'),
  ('Lemon Extract',             'lemon extract',             'Baking Cabinet', 'Extracts',         'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Lemon cakes, glazes, cookies'),
  ('Instant Espresso Powder',   'espresso powder',           'Baking Cabinet', 'Extracts',         'Walmart', ARRAY['Walmart','HEB'], 1, 'jar',       0, 'Deepens chocolate flavor in cakes, brownies'),
  ('Molasses',                  'molasses',                  'Baking Cabinet', 'Sweeteners',       'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Gingerbread, brown bread, BBQ sauces, baked beans from scratch'),

  -- Chocolate & Chips
  ('Dark Cocoa Powder (Dutch Process)', 'dutch process cocoa', 'Baking Cabinet', 'Chocolate',      'Walmart', ARRAY['Walmart','HEB'], 1, 'container', 0, 'Richer chocolate for from-scratch cakes and brownies'),
  ('Milk Chocolate Chips',      'milk chocolate chips',      'Baking Cabinet', 'Chocolate',        'Walmart', ARRAY['Walmart'],       1, 'bag',       0, 'Cookies, trail mix, decorating'),
  ('White Chocolate Chips',     'white chocolate chips',     'Baking Cabinet', 'Chocolate',        'Walmart', ARRAY['Walmart'],       1, 'bag',       0, 'Cookies, bark, drizzle, macadamia nut cookies'),

  -- Decorating & Frosting
  ('Sprinkles (Assorted)',      'sprinkles assorted',        'Baking Cabinet', 'Decorating',       'Walmart', ARRAY['Walmart'],       1, 'set',       0, 'Cake decorating, cookies, fun baking with kids'),
  ('Food Coloring (Gel Set)',   'food coloring gel set',     'Baking Cabinet', 'Decorating',       'Walmart', ARRAY['Walmart'],       1, 'set',       0, 'Frosting tinting, decorating, fun baking'),
  ('Meringue Powder',           'meringue powder',           'Baking Cabinet', 'Decorating',       'Walmart', ARRAY['Walmart','Amazon'], 1, 'container', 0, 'Royal icing for cookies, stabilized meringue'),
  ('Caramel Sauce',             'caramel sauce',             'Baking Cabinet', 'Toppings',         'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Drizzle, dipping, apple desserts'),
  ('Chocolate Syrup (Hersheys)','chocolate syrup hersheys',  'Baking Cabinet', 'Toppings',         'Walmart', ARRAY['Walmart'],       1, 'bottle',    0, 'Ice cream, drizzle, mocha, chocolate milk'),

  -- Nuts & Dried Fruit
  ('Pecans',                    'pecans',                    'Baking Cabinet', 'Nuts & Dried Fruit','Walmart', ARRAY['Walmart','HEB'], 1, 'bag',       0, 'Texas staple — pie, cookies, pralines, salads'),
  ('Walnuts',                   'walnuts',                   'Baking Cabinet', 'Nuts & Dried Fruit','Walmart', ARRAY['Walmart'],       1, 'bag',       0, 'Banana bread, brownies, salads'),
  ('Sliced Almonds',            'sliced almonds',            'Baking Cabinet', 'Nuts & Dried Fruit','Walmart', ARRAY['Walmart'],       1, 'bag',       0, 'Granola, salads, green beans almondine'),
  ('Dried Cranberries',         'dried cranberries',         'Baking Cabinet', 'Nuts & Dried Fruit','Walmart', ARRAY['Walmart'],       1, 'bag',       0, 'Salads, trail mix, cookies, Irish soda bread'),
  ('Raisins',                   'raisins',                   'Baking Cabinet', 'Nuts & Dried Fruit','Walmart', ARRAY['Walmart'],       1, 'box',       0, 'Irish soda bread, oatmeal cookies, trail mix, oatmeal')
) AS v(name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.canonical_name = v.canonical_name);
