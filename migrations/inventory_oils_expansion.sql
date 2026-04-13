-- D59 INV-3: Oils & Vinegars Expansion
-- Idempotent via canonical_name uniqueness check.
-- Balsamic vinegar lives here (not in Italian Sauces).

INSERT INTO inventory_items (name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
SELECT * FROM (VALUES
  ('Extra Virgin Olive Oil',    'extra virgin olive oil',    'Pantry', 'Oils & Vinegars', 'Walmart', ARRAY['Walmart','HEB'], 1, 'bottle', 0, 'Finishing, dressings, bruschetta, bread dipping — better quality than pure'),
  ('Avocado Oil',               'avocado oil',               'Pantry', 'Oils & Vinegars', 'HEB',     ARRAY['HEB','Walmart'], 1, 'bottle', 0, 'High heat cooking, grill, healthier option'),
  ('Coconut Oil',               'coconut oil',               'Pantry', 'Oils & Vinegars', 'Walmart', ARRAY['Walmart','HEB'], 1, 'jar',    0, 'Baking, Caribbean, plantains, popcorn'),
  ('Apple Cider Vinegar',       'apple cider vinegar',       'Pantry', 'Oils & Vinegars', 'Walmart', ARRAY['Walmart'],       1, 'bottle', 0, 'BBQ sauces, salsas, marinades, baking, Carolina mop sauce'),
  ('Red Wine Vinegar',          'red wine vinegar',          'Pantry', 'Oils & Vinegars', 'Walmart', ARRAY['Walmart','HEB'], 1, 'bottle', 0, 'Vinaigrettes, marinades, Mediterranean'),
  ('Balsamic Vinegar',          'balsamic vinegar',          'Pantry', 'Oils & Vinegars', 'Walmart', ARRAY['Walmart','HEB'], 1, 'bottle', 0, 'Bruschetta, caprese, glazes, salad dressing')
) AS v(name, canonical_name, category, sub_category, preferred_store, available_stores, par_level, par_unit, reorder_threshold, notes)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.canonical_name = v.canonical_name);
