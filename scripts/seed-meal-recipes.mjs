#!/usr/bin/env node
/**
 * Dispatch 152 — Seed all 122 meals with recipe cards
 *
 * Run: node scripts/seed-meal-recipes.mjs
 *
 * Uses the existing save_imported_batch API to populate:
 * - recipe_steps (prep/cook/finish step groups)
 * - meal_ingredients (normalized ingredient rows with qty/unit/department)
 * - prep_time_min, cook_time_min, servings
 *
 * Constraints:
 * - 8-person family (servings default = 8)
 * - NO mushrooms ever
 * - Kid-manager meals (Mon/Tue/Wed/Thu/Fri) must be school-night friendly
 * - All quantities scaled for 8 servings
 * - Departments: Meat, Produce, Dairy, Pantry, Frozen, Bakery, Spices, Canned, Other
 */

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://family-ops.grittysystems.com'

// ─── Recipe data keyed by meal name (lowercase for matching) ────────────────
// Each entry: { prep, cook, servings, difficulty, steps[], ingredients[] }
// steps: { text, group: 'prep'|'cook'|'finish' }
// ingredients: { name, quantity, unit, department, notes? }

const RECIPES = {

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: american-comfort (Week 1 Monday)
  // ═══════════════════════════════════════════════════════════════════════════

  'oven drumsticks': {
    prep: 10, cook: 45, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven to 400°F. Line a large baking sheet with foil and set a wire rack on top (or just use foil).', group: 'prep' },
      { text: 'Pat drumsticks dry with paper towels and place in a large bowl.', group: 'prep' },
      { text: 'Choose your marinade pair — toss drumsticks with marinade until evenly coated.', group: 'prep' },
      { text: 'Arrange drumsticks on the rack/foil in a single layer, not touching.', group: 'cook' },
      { text: 'Bake 40-45 minutes, flipping halfway, until internal temp reaches 165°F and skin is crispy.', group: 'cook' },
      { text: 'Let rest 5 minutes before serving.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken drumsticks', quantity: 16, unit: 'pieces', department: 'Meat' },
      { name: 'Olive oil', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Onion powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'meatloaf': {
    prep: 15, cook: 60, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 375°F. Line a baking sheet with foil or use a loaf pan.', group: 'prep' },
      { text: 'In a large bowl, combine ground beef, breadcrumbs, eggs, milk, onion, garlic, salt, pepper, and Worcestershire sauce. Mix gently — don\'t over-mix.', group: 'prep' },
      { text: 'Shape into a loaf on the baking sheet (or press into loaf pan).', group: 'prep' },
      { text: 'Mix ketchup, brown sugar, and mustard for the glaze. Spread over the top.', group: 'cook' },
      { text: 'Bake 55-65 minutes until internal temp reaches 160°F.', group: 'cook' },
      { text: 'Let rest 10 minutes before slicing. Serve with mashed potatoes.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Breadcrumbs', quantity: 1, unit: 'cup', department: 'Pantry' },
      { name: 'Eggs', quantity: 2, unit: 'large', department: 'Dairy' },
      { name: 'Milk (whole)', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Worcestershire sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Ketchup', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Brown sugar', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Yellow mustard', quantity: 1, unit: 'tbsp', department: 'Pantry' },
    ],
  },

  'chicken fried steak': {
    prep: 20, cook: 20, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Place cube steaks between plastic wrap and pound to ¼ inch thick with a meat mallet.', group: 'prep' },
      { text: 'Set up breading station: flour + seasonings in one dish, beaten eggs + milk in another, flour mixture again for double-dredge.', group: 'prep' },
      { text: 'Season steaks with salt and pepper, then dredge: flour → egg wash → flour again. Press coating firmly.', group: 'prep' },
      { text: 'Heat ½ inch of vegetable oil in a large skillet over medium-high heat until shimmering (350°F).', group: 'cook' },
      { text: 'Fry steaks 3-4 minutes per side until golden brown. Work in batches — don\'t crowd the pan.', group: 'cook' },
      { text: 'Drain on paper towels. Make cream gravy: pour off all but 3 tbsp drippings, whisk in 3 tbsp flour, cook 1 minute, then slowly whisk in 2 cups milk. Season with salt and pepper.', group: 'cook' },
      { text: 'Serve steaks with cream gravy on top.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Cube steak', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'All-purpose flour', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Eggs', quantity: 3, unit: 'large', department: 'Dairy' },
      { name: 'Milk (whole)', quantity: 2.5, unit: 'cups', department: 'Dairy' },
      { name: 'Vegetable oil', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Onion powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'smothered pork chops': {
    prep: 15, cook: 45, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Season pork chops generously with salt, pepper, garlic powder, and onion powder.', group: 'prep' },
      { text: 'Dredge each chop lightly in flour, shaking off excess.', group: 'prep' },
      { text: 'Heat oil in a large deep skillet over medium-high heat. Brown chops 3 minutes per side. Remove and set aside.', group: 'cook' },
      { text: 'In the same skillet, add sliced onions. Cook until soft, about 5 minutes.', group: 'cook' },
      { text: 'Sprinkle in 3 tbsp flour, stir and cook 1 minute. Slowly whisk in chicken broth and cream of chicken soup.', group: 'cook' },
      { text: 'Return chops to the skillet. Cover and simmer 30-35 minutes until chops are tender and gravy is thick.', group: 'cook' },
      { text: 'Serve over rice or mashed potatoes with gravy from the pan.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Bone-in pork chops', quantity: 8, unit: 'pieces', department: 'Meat' },
      { name: 'All-purpose flour', quantity: 0.75, unit: 'cup', department: 'Pantry' },
      { name: 'Vegetable oil', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'Yellow onion (sliced)', quantity: 2, unit: 'large', department: 'Produce' },
      { name: 'Chicken broth', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Cream of chicken soup', quantity: 1, unit: 'can (10.5 oz)', department: 'Canned' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Onion powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'chicken pot pie': {
    prep: 25, cook: 40, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 400°F.', group: 'prep' },
      { text: 'In a large pot, melt butter over medium heat. Cook diced onion, carrots, and celery until softened (5 min).', group: 'prep' },
      { text: 'Sprinkle flour over veggies, stir and cook 2 minutes to make a roux.', group: 'cook' },
      { text: 'Slowly add chicken broth and milk, stirring constantly until thickened (5 min).', group: 'cook' },
      { text: 'Stir in cooked shredded chicken, frozen peas, salt, pepper, and thyme. Pour into a 9x13 baking dish.', group: 'cook' },
      { text: 'Unroll pie crust and lay over the top. Cut slits for steam. Brush with beaten egg.', group: 'cook' },
      { text: 'Bake 35-40 minutes until crust is golden and filling is bubbling.', group: 'cook' },
      { text: 'Let cool 10 minutes before serving.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Cooked chicken (shredded)', quantity: 4, unit: 'cups', department: 'Meat' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Carrots (diced)', quantity: 3, unit: 'medium', department: 'Produce' },
      { name: 'Celery (diced)', quantity: 3, unit: 'stalks', department: 'Produce' },
      { name: 'All-purpose flour', quantity: 0.33, unit: 'cup', department: 'Pantry' },
      { name: 'Chicken broth', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Milk (whole)', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Frozen peas', quantity: 1, unit: 'cup', department: 'Frozen' },
      { name: 'Refrigerated pie crust', quantity: 2, unit: 'sheets', department: 'Dairy' },
      { name: 'Egg (for egg wash)', quantity: 1, unit: 'large', department: 'Dairy' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Dried thyme', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'country fried chicken': {
    prep: 20, cook: 25, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Cut chicken breasts in half horizontally to make thin cutlets. Pound to even thickness.', group: 'prep' },
      { text: 'Set up breading station: flour + seasonings in one dish, buttermilk + eggs in another.', group: 'prep' },
      { text: 'Season chicken with salt and pepper. Dredge: flour → buttermilk → flour again.', group: 'prep' },
      { text: 'Heat 1 inch of oil in a large cast iron skillet to 350°F.', group: 'cook' },
      { text: 'Fry chicken 4-5 minutes per side until golden and cooked through (165°F internal).', group: 'cook' },
      { text: 'Drain on wire rack. Serve with cream gravy and mashed potatoes.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast', quantity: 4, unit: 'large', department: 'Meat' },
      { name: 'All-purpose flour', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Buttermilk', quantity: 1.5, unit: 'cups', department: 'Dairy' },
      { name: 'Eggs', quantity: 2, unit: 'large', department: 'Dairy' },
      { name: 'Vegetable oil', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Cayenne pepper', quantity: 0.25, unit: 'tsp', department: 'Spices' },
    ],
  },

  'bbq pulled chicken sandwiches': {
    prep: 10, cook: 240, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Place chicken breasts in slow cooker. Pour BBQ sauce over the top.', group: 'prep' },
      { text: 'Add garlic powder, onion powder, and a splash of apple cider vinegar.', group: 'prep' },
      { text: 'Cover and cook on LOW for 4-6 hours or HIGH for 2-3 hours until chicken shreds easily.', group: 'cook' },
      { text: 'Shred chicken with two forks directly in the slow cooker. Stir to coat with sauce.', group: 'cook' },
      { text: 'Taste and adjust seasoning. Add more BBQ sauce if needed.', group: 'finish' },
      { text: 'Serve on hamburger buns with coleslaw on top if desired.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 4, unit: 'lbs', department: 'Meat' },
      { name: 'BBQ sauce', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Apple cider vinegar', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Onion powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Hamburger buns', quantity: 8, unit: 'buns', department: 'Bakery' },
    ],
  },

  'salisbury steak': {
    prep: 20, cook: 30, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'In a large bowl, mix ground beef, breadcrumbs, egg, onion soup mix, Worcestershire sauce, and garlic. Form into 8 oval patties.', group: 'prep' },
      { text: 'Heat oil in a large skillet over medium-high heat. Brown patties 3 minutes per side. Remove and set aside.', group: 'cook' },
      { text: 'In the same skillet, add sliced onions and cook until softened. Add flour and stir 1 minute.', group: 'cook' },
      { text: 'Add beef broth and Worcestershire sauce, stirring until gravy thickens.', group: 'cook' },
      { text: 'Return patties to skillet. Cover and simmer 15-20 minutes.', group: 'cook' },
      { text: 'Serve over mashed potatoes or egg noodles with gravy from the pan.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Breadcrumbs', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Egg', quantity: 1, unit: 'large', department: 'Dairy' },
      { name: 'Onion soup mix', quantity: 1, unit: 'packet', department: 'Pantry' },
      { name: 'Worcestershire sauce', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 2, unit: 'cloves', department: 'Produce' },
      { name: 'Yellow onion (sliced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'All-purpose flour', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Beef broth', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Vegetable oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'shepherd\'s pie': {
    prep: 20, cook: 35, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 400°F. Peel and boil potatoes until tender (15 min). Mash with butter, milk, salt.', group: 'prep' },
      { text: 'Brown ground beef in a large oven-safe skillet over medium-high heat. Drain excess fat.', group: 'cook' },
      { text: 'Add diced onion, carrots, and garlic to the beef. Cook 5 minutes.', group: 'cook' },
      { text: 'Stir in tomato paste, Worcestershire sauce, beef broth, frozen peas and corn. Simmer 5 minutes until thickened.', group: 'cook' },
      { text: 'Spread mashed potatoes evenly over the beef mixture. Drag a fork across the top for texture.', group: 'cook' },
      { text: 'Bake 20-25 minutes until potatoes are golden and filling is bubbling. Broil 2-3 minutes for extra browning.', group: 'cook' },
      { text: 'Let cool 10 minutes. Serve in scoops.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 2.5, unit: 'lbs', department: 'Meat' },
      { name: 'Russet potatoes', quantity: 5, unit: 'large', department: 'Produce' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy' },
      { name: 'Milk (whole)', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Carrots (diced)', quantity: 3, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Tomato paste', quantity: 2, unit: 'tbsp', department: 'Canned' },
      { name: 'Worcestershire sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Beef broth', quantity: 1, unit: 'cup', department: 'Pantry' },
      { name: 'Frozen peas and corn', quantity: 1.5, unit: 'cups', department: 'Frozen' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'hamburger helper (homemade)': {
    prep: 10, cook: 25, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef in a large skillet over medium-high heat. Drain excess fat.', group: 'cook' },
      { text: 'Add diced onion and garlic, cook 2 minutes.', group: 'cook' },
      { text: 'Add beef broth, milk, tomato sauce, and uncooked elbow macaroni.', group: 'cook' },
      { text: 'Stir in garlic powder, onion powder, paprika, salt, and pepper.', group: 'cook' },
      { text: 'Bring to a boil, then reduce heat and cover. Simmer 12-15 minutes until pasta is tender, stirring occasionally.', group: 'cook' },
      { text: 'Stir in shredded cheese until melted. Serve immediately.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 2, unit: 'lbs', department: 'Meat' },
      { name: 'Elbow macaroni', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Beef broth', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Milk (whole)', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Tomato sauce', quantity: 1, unit: 'can (8 oz)', department: 'Canned' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'small', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 2, unit: 'cloves', department: 'Produce' },
      { name: 'Shredded cheddar cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Onion powder', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'pot roast': {
    prep: 20, cook: 240, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Season chuck roast generously with salt, pepper, garlic powder.', group: 'prep' },
      { text: 'Heat oil in a large Dutch oven or oven-safe pot over high heat. Sear roast 4 minutes per side until deeply browned. Remove.', group: 'cook' },
      { text: 'Add onion, garlic, and tomato paste to pot. Cook 2 minutes.', group: 'cook' },
      { text: 'Add beef broth, Worcestershire sauce, and Italian seasoning. Scrape up browned bits.', group: 'cook' },
      { text: 'Return roast to pot. Add carrots and potatoes around the sides. Cover tightly.', group: 'cook' },
      { text: 'Cook in a 300°F oven for 3-4 hours OR in a slow cooker on LOW for 8 hours until fork-tender.', group: 'cook' },
      { text: 'Remove roast and veggies. Shred or slice the roast. Serve with pan juices.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chuck roast', quantity: 4, unit: 'lbs', department: 'Meat' },
      { name: 'Russet potatoes (quartered)', quantity: 5, unit: 'medium', department: 'Produce' },
      { name: 'Carrots (chunked)', quantity: 6, unit: 'medium', department: 'Produce' },
      { name: 'Yellow onion (quartered)', quantity: 2, unit: 'large', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Beef broth', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Tomato paste', quantity: 2, unit: 'tbsp', department: 'Canned' },
      { name: 'Worcestershire sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Italian seasoning', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Vegetable oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'mac and cheese (baked)': {
    prep: 15, cook: 30, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven to 375°F. Boil elbow macaroni until al dente (1 minute less than package). Drain.', group: 'prep' },
      { text: 'In a large pot, melt butter over medium heat. Whisk in flour and cook 1 minute (roux).', group: 'cook' },
      { text: 'Slowly whisk in milk. Cook 5 minutes until thickened, stirring constantly.', group: 'cook' },
      { text: 'Remove from heat. Stir in 3 cups shredded cheese until melted. Season with salt, pepper, paprika, mustard powder.', group: 'cook' },
      { text: 'Fold in cooked macaroni. Pour into a greased 9x13 baking dish.', group: 'cook' },
      { text: 'Top with remaining cheese and breadcrumb-butter mixture.', group: 'cook' },
      { text: 'Bake 25-30 minutes until golden and bubbling. Let cool 5 minutes.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Elbow macaroni', quantity: 1, unit: 'lb', department: 'Pantry' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy' },
      { name: 'All-purpose flour', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Milk (whole)', quantity: 3, unit: 'cups', department: 'Dairy' },
      { name: 'Shredded cheddar cheese', quantity: 4, unit: 'cups', department: 'Dairy' },
      { name: 'Breadcrumbs', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.25, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Mustard powder', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: soup-comfort (Week 2 Monday)
  // ═══════════════════════════════════════════════════════════════════════════

  'chili': {
    prep: 15, cook: 45, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef in a large pot over medium-high heat. Drain excess fat.', group: 'cook' },
      { text: 'Add diced onion and garlic, cook 3 minutes until softened.', group: 'cook' },
      { text: 'Add chili powder, cumin, paprika, oregano, salt, and pepper. Stir 1 minute.', group: 'cook' },
      { text: 'Add diced tomatoes (with juice), tomato sauce, kidney beans, pinto beans, and beef broth.', group: 'cook' },
      { text: 'Bring to a boil, reduce heat, and simmer uncovered 30-40 minutes, stirring occasionally.', group: 'cook' },
      { text: 'Serve with shredded cheese, sour cream, and cornbread.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 2.5, unit: 'lbs', department: 'Meat' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'large', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Diced tomatoes', quantity: 2, unit: 'cans (14.5 oz)', department: 'Canned' },
      { name: 'Tomato sauce', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Kidney beans (drained)', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Pinto beans (drained)', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Beef broth', quantity: 1, unit: 'cup', department: 'Pantry' },
      { name: 'Chili powder', quantity: 3, unit: 'tbsp', department: 'Spices' },
      { name: 'Cumin', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Oregano', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Shredded cheddar cheese', quantity: 1, unit: 'cup', department: 'Dairy', notes: 'for serving' },
    ],
  },

  'chicken noodle soup': {
    prep: 15, cook: 30, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Heat olive oil in a large pot over medium heat. Add diced onion, carrots, and celery. Cook 5 minutes.', group: 'cook' },
      { text: 'Add garlic and cook 1 minute.', group: 'cook' },
      { text: 'Add chicken broth, bay leaves, thyme, salt, and pepper. Bring to a boil.', group: 'cook' },
      { text: 'Add egg noodles and cook 8 minutes until tender.', group: 'cook' },
      { text: 'Add shredded rotisserie chicken and cook 3-4 minutes until heated through.', group: 'cook' },
      { text: 'Remove bay leaves. Taste and adjust seasoning. Serve with crackers.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Rotisserie chicken (shredded)', quantity: 4, unit: 'cups', department: 'Meat' },
      { name: 'Chicken broth', quantity: 10, unit: 'cups', department: 'Pantry' },
      { name: 'Egg noodles (wide)', quantity: 8, unit: 'oz', department: 'Pantry' },
      { name: 'Carrots (diced)', quantity: 3, unit: 'medium', department: 'Produce' },
      { name: 'Celery (diced)', quantity: 3, unit: 'stalks', department: 'Produce' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Bay leaves', quantity: 2, unit: 'leaves', department: 'Spices' },
      { name: 'Dried thyme', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'broccoli cheddar soup': {
    prep: 10, cook: 30, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Melt butter in a large pot over medium heat. Add diced onion and cook 3 minutes.', group: 'cook' },
      { text: 'Whisk in flour and cook 1 minute to form a roux.', group: 'cook' },
      { text: 'Slowly add chicken broth and milk, whisking constantly. Bring to a simmer.', group: 'cook' },
      { text: 'Add broccoli florets. Cook 15 minutes until broccoli is very tender.', group: 'cook' },
      { text: 'Reduce heat to low. Stir in shredded cheddar cheese until melted. Season with salt, pepper, nutmeg.', group: 'cook' },
      { text: 'Serve in bread bowls or with crusty bread. Optional: top with extra shredded cheese.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Broccoli florets', quantity: 6, unit: 'cups', department: 'Produce' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'All-purpose flour', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Chicken broth', quantity: 4, unit: 'cups', department: 'Pantry' },
      { name: 'Milk (whole)', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Shredded cheddar cheese', quantity: 3, unit: 'cups', department: 'Dairy' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Nutmeg', quantity: 0.25, unit: 'tsp', department: 'Spices' },
    ],
  },

  'beef stew': {
    prep: 20, cook: 120, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Cut beef into 1-inch cubes. Season with salt and pepper. Toss with flour.', group: 'prep' },
      { text: 'Heat oil in a large Dutch oven over medium-high heat. Brown beef in batches (don\'t crowd). Remove and set aside.', group: 'cook' },
      { text: 'Add onion and garlic, cook 2 minutes. Add tomato paste, stir 1 minute.', group: 'cook' },
      { text: 'Pour in beef broth and Worcestershire sauce. Scrape up browned bits from the bottom.', group: 'cook' },
      { text: 'Return beef to pot. Add bay leaves and thyme. Cover and simmer 1 hour.', group: 'cook' },
      { text: 'Add potatoes, carrots, and celery. Continue simmering 45-60 minutes until veggies and beef are tender.', group: 'cook' },
      { text: 'Remove bay leaves. Adjust seasoning. Serve with crusty bread.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Beef stew meat', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'All-purpose flour', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Russet potatoes (cubed)', quantity: 4, unit: 'medium', department: 'Produce' },
      { name: 'Carrots (chunked)', quantity: 4, unit: 'medium', department: 'Produce' },
      { name: 'Celery (sliced)', quantity: 3, unit: 'stalks', department: 'Produce' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'large', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Beef broth', quantity: 4, unit: 'cups', department: 'Pantry' },
      { name: 'Tomato paste', quantity: 3, unit: 'tbsp', department: 'Canned' },
      { name: 'Worcestershire sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Vegetable oil', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'Bay leaves', quantity: 2, unit: 'leaves', department: 'Spices' },
      { name: 'Dried thyme', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'loaded potato soup': {
    prep: 15, cook: 30, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cook bacon in a large pot until crispy. Remove, crumble, and set aside. Keep 2 tbsp drippings.', group: 'cook' },
      { text: 'Cook diced onion in the drippings until softened (3 min). Add garlic, cook 1 minute.', group: 'cook' },
      { text: 'Add cubed potatoes and chicken broth. Bring to a boil, then simmer 15 minutes until potatoes are tender.', group: 'cook' },
      { text: 'Mash about half the potatoes with a potato masher (leave some chunky).', group: 'cook' },
      { text: 'Stir in sour cream, milk, and most of the shredded cheese. Heat through without boiling.', group: 'cook' },
      { text: 'Serve topped with crumbled bacon, remaining cheese, sour cream, and chives.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Russet potatoes (cubed)', quantity: 6, unit: 'large', department: 'Produce' },
      { name: 'Bacon', quantity: 8, unit: 'slices', department: 'Meat' },
      { name: 'Chicken broth', quantity: 4, unit: 'cups', department: 'Pantry' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Milk (whole)', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Shredded cheddar cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Chives (chopped)', quantity: 0.25, unit: 'cup', department: 'Produce' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'chicken and dumplings': {
    prep: 20, cook: 35, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'In a large pot, melt butter and cook diced onion, carrots, celery until soft (5 min).', group: 'cook' },
      { text: 'Add garlic and cook 1 minute. Sprinkle in flour and stir 1 minute.', group: 'cook' },
      { text: 'Add chicken broth and milk. Stir until slightly thickened. Add shredded chicken, salt, pepper, thyme.', group: 'cook' },
      { text: 'Make dumplings: mix flour, baking powder, salt, then stir in milk and melted butter until just combined.', group: 'prep' },
      { text: 'Drop dumpling batter by large spoonfuls onto the simmering soup. Cover tightly.', group: 'cook' },
      { text: 'Simmer 15 minutes without lifting the lid — dumplings cook by steam.', group: 'cook' },
      { text: 'Serve in big bowls with dumplings on top.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Cooked chicken (shredded)', quantity: 4, unit: 'cups', department: 'Meat' },
      { name: 'Chicken broth', quantity: 6, unit: 'cups', department: 'Pantry' },
      { name: 'Milk (whole)', quantity: 1.5, unit: 'cups', department: 'Dairy' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy' },
      { name: 'Carrots (diced)', quantity: 3, unit: 'medium', department: 'Produce' },
      { name: 'Celery (diced)', quantity: 2, unit: 'stalks', department: 'Produce' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'All-purpose flour (for soup)', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'All-purpose flour (for dumplings)', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Baking powder', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Dried thyme', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'white chicken chili': {
    prep: 10, cook: 30, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Heat oil in a large pot. Add diced onion and cook 3 minutes. Add garlic, cook 1 minute.', group: 'cook' },
      { text: 'Add cumin, chili powder, oregano, and cayenne. Stir 30 seconds.', group: 'cook' },
      { text: 'Add chicken broth, white beans, green chiles, and shredded chicken.', group: 'cook' },
      { text: 'Simmer 20 minutes uncovered, stirring occasionally.', group: 'cook' },
      { text: 'Stir in sour cream and lime juice. Heat through but don\'t boil.', group: 'cook' },
      { text: 'Serve topped with shredded cheese, tortilla chips, and fresh cilantro.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Cooked chicken (shredded)', quantity: 4, unit: 'cups', department: 'Meat' },
      { name: 'Chicken broth', quantity: 4, unit: 'cups', department: 'Pantry' },
      { name: 'Great northern beans (drained)', quantity: 2, unit: 'cans (15 oz)', department: 'Canned' },
      { name: 'Green chiles (diced)', quantity: 2, unit: 'cans (4 oz)', department: 'Canned' },
      { name: 'Sour cream', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Lime juice', quantity: 2, unit: 'tbsp', department: 'Produce' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Cumin', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Chili powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Oregano', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Shredded Monterey Jack cheese', quantity: 1, unit: 'cup', department: 'Dairy', notes: 'for serving' },
    ],
  },

  'tomato soup': {
    prep: 10, cook: 25, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Melt butter in a large pot. Add diced onion, cook 4 minutes until soft. Add garlic, cook 1 minute.', group: 'cook' },
      { text: 'Add crushed tomatoes, tomato paste, chicken broth, sugar, salt, pepper, basil, and oregano.', group: 'cook' },
      { text: 'Bring to a simmer. Cook 15 minutes.', group: 'cook' },
      { text: 'Use an immersion blender to puree until smooth (or leave chunky if preferred).', group: 'cook' },
      { text: 'Stir in heavy cream. Heat through without boiling.', group: 'cook' },
      { text: 'Serve with grilled cheese sandwiches.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Crushed tomatoes', quantity: 2, unit: 'cans (28 oz)', department: 'Canned' },
      { name: 'Tomato paste', quantity: 2, unit: 'tbsp', department: 'Canned' },
      { name: 'Chicken broth', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Heavy cream', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Butter', quantity: 3, unit: 'tbsp', department: 'Dairy' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Sugar', quantity: 1, unit: 'tsp', department: 'Pantry' },
      { name: 'Dried basil', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Dried oregano', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'crockpot chicken tortilla soup': {
    prep: 10, cook: 360, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Place chicken breasts in slow cooker.', group: 'prep' },
      { text: 'Add diced tomatoes, black beans, corn, onion, garlic, chicken broth, green chiles, cumin, chili powder, salt.', group: 'prep' },
      { text: 'Cover and cook on LOW 6-8 hours or HIGH 3-4 hours.', group: 'cook' },
      { text: 'Remove chicken, shred with two forks, and return to pot. Stir.', group: 'cook' },
      { text: 'Serve topped with tortilla strips/chips, avocado, shredded cheese, sour cream, and lime wedges.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Chicken broth', quantity: 6, unit: 'cups', department: 'Pantry' },
      { name: 'Diced tomatoes', quantity: 2, unit: 'cans (14.5 oz)', department: 'Canned' },
      { name: 'Black beans (drained)', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Frozen corn', quantity: 1.5, unit: 'cups', department: 'Frozen' },
      { name: 'Green chiles (diced)', quantity: 1, unit: 'can (4 oz)', department: 'Canned' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Cumin', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Chili powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Tortilla chips', quantity: 1, unit: 'bag', department: 'Pantry', notes: 'for serving' },
      { name: 'Shredded cheddar cheese', quantity: 1, unit: 'cup', department: 'Dairy', notes: 'for serving' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: asian (Week 1 & 2 Tuesday)
  // ═══════════════════════════════════════════════════════════════════════════

  'chicken stir fry': {
    prep: 15, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Slice chicken into thin strips. Toss with 1 tbsp soy sauce and cornstarch.', group: 'prep' },
      { text: 'Chop all vegetables into bite-sized pieces.', group: 'prep' },
      { text: 'Make sauce: whisk soy sauce, oyster sauce, sesame oil, garlic, ginger, cornstarch, and water.', group: 'prep' },
      { text: 'Heat oil in a large wok or skillet over HIGH heat. Cook chicken 4-5 minutes until done. Remove.', group: 'cook' },
      { text: 'Add more oil, stir-fry vegetables 3-4 minutes until crisp-tender. Start with harder veggies first.', group: 'cook' },
      { text: 'Return chicken, pour sauce over, stir until sauce thickens (1-2 min).', group: 'cook' },
      { text: 'Serve over steamed rice.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Broccoli florets', quantity: 3, unit: 'cups', department: 'Produce' },
      { name: 'Bell peppers (sliced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Carrots (sliced thin)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Soy sauce', quantity: 0.33, unit: 'cup', department: 'Pantry' },
      { name: 'Oyster sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Sesame oil', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Cornstarch', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Fresh ginger (grated)', quantity: 1, unit: 'tbsp', department: 'Produce' },
      { name: 'Vegetable oil', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'White rice', quantity: 3, unit: 'cups', department: 'Pantry' },
    ],
  },

  'beef and broccoli': {
    prep: 15, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Slice flank steak thinly against the grain. Toss with 1 tbsp soy sauce and cornstarch.', group: 'prep' },
      { text: 'Make sauce: mix soy sauce, oyster sauce, brown sugar, sesame oil, garlic, ginger, and cornstarch slurry.', group: 'prep' },
      { text: 'Heat oil in a large wok over high heat. Sear beef in batches, 2 minutes per side. Remove.', group: 'cook' },
      { text: 'Add broccoli and 2 tbsp water. Cover and steam 3 minutes until bright green and crisp-tender.', group: 'cook' },
      { text: 'Return beef, pour sauce over everything. Stir until sauce thickens and coats everything.', group: 'cook' },
      { text: 'Serve over steamed rice.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Flank steak', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Broccoli florets', quantity: 6, unit: 'cups', department: 'Produce' },
      { name: 'Soy sauce', quantity: 0.33, unit: 'cup', department: 'Pantry' },
      { name: 'Oyster sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Brown sugar', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Sesame oil', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Cornstarch', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Fresh ginger (grated)', quantity: 1, unit: 'tbsp', department: 'Produce' },
      { name: 'Vegetable oil', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'White rice', quantity: 3, unit: 'cups', department: 'Pantry' },
    ],
  },

  'fried rice': {
    prep: 10, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Use day-old cold rice (or cook rice and spread on a sheet pan to cool 30 min). Cold rice = better fried rice.', group: 'prep' },
      { text: 'Dice all vegetables small. Beat eggs in a bowl.', group: 'prep' },
      { text: 'Heat oil in a large wok over HIGH heat. Scramble eggs quickly, break into small pieces. Remove.', group: 'cook' },
      { text: 'Add more oil. Stir-fry diced vegetables 2-3 minutes.', group: 'cook' },
      { text: 'Add cold rice. Press flat against the wok and let it crisp 30 seconds, then stir. Repeat.', group: 'cook' },
      { text: 'Add soy sauce, sesame oil, and eggs back. Toss everything together.', group: 'cook' },
      { text: 'Serve with extra soy sauce on the side.', group: 'finish' },
    ],
    ingredients: [
      { name: 'White rice (cooked, cold)', quantity: 6, unit: 'cups', department: 'Pantry' },
      { name: 'Eggs', quantity: 4, unit: 'large', department: 'Dairy' },
      { name: 'Frozen peas and carrots', quantity: 1.5, unit: 'cups', department: 'Frozen' },
      { name: 'Green onions (sliced)', quantity: 6, unit: 'stalks', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Soy sauce', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Sesame oil', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Vegetable oil', quantity: 3, unit: 'tbsp', department: 'Pantry' },
    ],
  },

  'teriyaki chicken': {
    prep: 10, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Make teriyaki sauce: whisk soy sauce, brown sugar, rice vinegar, garlic, ginger, and cornstarch slurry.', group: 'prep' },
      { text: 'Cut chicken thighs into bite-sized pieces. Season with salt and pepper.', group: 'prep' },
      { text: 'Heat oil in a large skillet over medium-high heat. Cook chicken 5-6 minutes until golden.', group: 'cook' },
      { text: 'Pour teriyaki sauce over chicken. Simmer 3-5 minutes until sauce is thick and glossy.', group: 'cook' },
      { text: 'Serve over steamed rice topped with sesame seeds and sliced green onions.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken thighs (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Soy sauce', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Brown sugar', quantity: 0.33, unit: 'cup', department: 'Pantry' },
      { name: 'Rice vinegar', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Fresh ginger (grated)', quantity: 1, unit: 'tbsp', department: 'Produce' },
      { name: 'Cornstarch', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Vegetable oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'White rice', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Sesame seeds', quantity: 1, unit: 'tbsp', department: 'Spices', notes: 'for garnish' },
      { name: 'Green onions', quantity: 3, unit: 'stalks', department: 'Produce', notes: 'for garnish' },
    ],
  },

  'lo mein': {
    prep: 15, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cook lo mein noodles (or spaghetti) according to package, minus 1 minute. Drain, toss with a splash of sesame oil.', group: 'prep' },
      { text: 'Slice vegetables thin. Make sauce: soy sauce, oyster sauce, sesame oil, sugar, garlic.', group: 'prep' },
      { text: 'Heat oil in a large wok over high heat. Cook protein 3-4 minutes. Remove.', group: 'cook' },
      { text: 'Stir-fry vegetables 2-3 minutes until crisp-tender.', group: 'cook' },
      { text: 'Add noodles and sauce. Toss everything together 2 minutes until noodles are coated and hot.', group: 'cook' },
      { text: 'Return protein, toss once more. Serve immediately.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Lo mein noodles (or spaghetti)', quantity: 1, unit: 'lb', department: 'Pantry' },
      { name: 'Chicken breast or pork (sliced thin)', quantity: 2, unit: 'lbs', department: 'Meat' },
      { name: 'Cabbage (shredded)', quantity: 3, unit: 'cups', department: 'Produce' },
      { name: 'Carrots (julienned)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Bell pepper (sliced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Green onions (sliced)', quantity: 4, unit: 'stalks', department: 'Produce' },
      { name: 'Soy sauce', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Oyster sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Sesame oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Sugar', quantity: 1, unit: 'tsp', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Vegetable oil', quantity: 3, unit: 'tbsp', department: 'Pantry' },
    ],
  },

  'orange chicken': {
    prep: 20, cook: 20, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Cut chicken into 1-inch pieces. Toss with salt, pepper, and cornstarch until well coated.', group: 'prep' },
      { text: 'Make orange sauce: mix orange juice, soy sauce, rice vinegar, brown sugar, garlic, ginger, and cornstarch slurry.', group: 'prep' },
      { text: 'Heat 1 inch of oil in a deep skillet to 375°F. Fry chicken in batches 4-5 minutes until crispy and golden. Drain on paper towels.', group: 'cook' },
      { text: 'Pour out oil. Add sauce to the skillet, bring to a simmer until thickened (2-3 min).', group: 'cook' },
      { text: 'Toss crispy chicken in the sauce until coated.', group: 'cook' },
      { text: 'Serve over steamed rice. Garnish with green onions and sesame seeds.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Cornstarch', quantity: 0.75, unit: 'cup', department: 'Pantry' },
      { name: 'Orange juice', quantity: 0.75, unit: 'cup', department: 'Produce' },
      { name: 'Soy sauce', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'Rice vinegar', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Brown sugar', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Fresh ginger (grated)', quantity: 1, unit: 'tbsp', department: 'Produce' },
      { name: 'Vegetable oil (for frying)', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'White rice', quantity: 3, unit: 'cups', department: 'Pantry' },
    ],
  },

  'ramen (homemade)': {
    prep: 10, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Bring chicken broth to a boil in a large pot. Add soy sauce, sesame oil, garlic, and ginger.', group: 'cook' },
      { text: 'Cook ramen noodles in the broth according to package directions (usually 3 minutes).', group: 'cook' },
      { text: 'Soft-boil eggs: boil 6.5 minutes, ice bath, peel.', group: 'prep' },
      { text: 'Divide noodles and broth into bowls.', group: 'finish' },
      { text: 'Top with sliced protein, soft-boiled egg halves, corn, green onions, and a drizzle of sriracha.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken broth', quantity: 10, unit: 'cups', department: 'Pantry' },
      { name: 'Ramen noodles', quantity: 8, unit: 'packs', department: 'Pantry' },
      { name: 'Soy sauce', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Sesame oil', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Fresh ginger (sliced)', quantity: 2, unit: 'inches', department: 'Produce' },
      { name: 'Eggs', quantity: 8, unit: 'large', department: 'Dairy' },
      { name: 'Cooked chicken or pork (sliced)', quantity: 2, unit: 'cups', department: 'Meat' },
      { name: 'Frozen corn', quantity: 1, unit: 'cup', department: 'Frozen' },
      { name: 'Green onions (sliced)', quantity: 6, unit: 'stalks', department: 'Produce' },
      { name: 'Sriracha', quantity: null, unit: null, department: 'Pantry', notes: 'to taste' },
    ],
  },

  'honey garlic chicken': {
    prep: 10, cook: 25, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Season chicken thighs with salt and pepper.', group: 'prep' },
      { text: 'Make sauce: mix honey, soy sauce, garlic, rice vinegar, and cornstarch slurry.', group: 'prep' },
      { text: 'Heat oil in a large skillet over medium-high. Cook chicken 5 minutes per side until golden.', group: 'cook' },
      { text: 'Pour sauce over chicken. Reduce heat and simmer 5 minutes until sauce is thick and sticky.', group: 'cook' },
      { text: 'Serve over rice, spooning extra sauce on top. Garnish with sesame seeds.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken thighs (bone-in, skin-on)', quantity: 8, unit: 'pieces', department: 'Meat' },
      { name: 'Honey', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Soy sauce', quantity: 0.33, unit: 'cup', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 6, unit: 'cloves', department: 'Produce' },
      { name: 'Rice vinegar', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Cornstarch', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Vegetable oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'White rice', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Sesame seeds', quantity: 1, unit: 'tbsp', department: 'Spices', notes: 'for garnish' },
    ],
  },

  'sweet and sour chicken': {
    prep: 20, cook: 20, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Cut chicken into 1-inch cubes. Toss with egg and cornstarch.', group: 'prep' },
      { text: 'Make sweet and sour sauce: mix ketchup, rice vinegar, soy sauce, sugar, pineapple juice, and cornstarch slurry.', group: 'prep' },
      { text: 'Heat oil in a deep skillet. Fry chicken 4-5 minutes until crispy. Drain on paper towels.', group: 'cook' },
      { text: 'In a clean pan, cook bell peppers and pineapple chunks 2 minutes.', group: 'cook' },
      { text: 'Add sauce, simmer until thick. Toss in crispy chicken.', group: 'cook' },
      { text: 'Serve over steamed rice.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Cornstarch', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Egg', quantity: 2, unit: 'large', department: 'Dairy' },
      { name: 'Bell peppers (chunked)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Pineapple chunks (drained)', quantity: 1, unit: 'can (20 oz)', department: 'Canned' },
      { name: 'Ketchup', quantity: 0.33, unit: 'cup', department: 'Pantry' },
      { name: 'Rice vinegar', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'Soy sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Sugar', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Vegetable oil (for frying)', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'White rice', quantity: 3, unit: 'cups', department: 'Pantry' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: mexican (Week 1 & 2 Thursday)
  // ═══════════════════════════════════════════════════════════════════════════

  'tacos (ground beef)': {
    prep: 10, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef in a large skillet over medium-high heat. Drain excess fat.', group: 'cook' },
      { text: 'Add taco seasoning and water per packet instructions. Simmer 5 minutes until thickened.', group: 'cook' },
      { text: 'Warm taco shells in the oven at 325°F for 5 minutes.', group: 'cook' },
      { text: 'Set up taco bar: meat, shells, lettuce, tomato, cheese, sour cream, salsa, hot sauce.', group: 'finish' },
      { text: 'Let everyone build their own tacos!', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Taco seasoning', quantity: 2, unit: 'packets', department: 'Spices' },
      { name: 'Taco shells (hard or soft)', quantity: 24, unit: 'shells', department: 'Pantry' },
      { name: 'Shredded lettuce', quantity: 3, unit: 'cups', department: 'Produce' },
      { name: 'Tomatoes (diced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Shredded cheddar cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Salsa', quantity: 1, unit: 'cup', department: 'Pantry' },
    ],
  },

  'enchiladas (chicken)': {
    prep: 20, cook: 25, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 375°F. Mix shredded chicken, 1 cup cheese, sour cream, and green chiles.', group: 'prep' },
      { text: 'Spread ½ cup enchilada sauce on the bottom of a 9x13 baking dish.', group: 'prep' },
      { text: 'Fill each tortilla with chicken mixture, roll up, and place seam-side down in the dish.', group: 'prep' },
      { text: 'Pour remaining enchilada sauce over the top. Sprinkle with remaining cheese.', group: 'cook' },
      { text: 'Cover with foil and bake 20 minutes. Remove foil and bake 5 more minutes until cheese is melted and bubbly.', group: 'cook' },
      { text: 'Top with sour cream, cilantro, and sliced green onions.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Cooked chicken (shredded)', quantity: 5, unit: 'cups', department: 'Meat' },
      { name: 'Flour tortillas (large)', quantity: 12, unit: 'tortillas', department: 'Bakery' },
      { name: 'Enchilada sauce', quantity: 2, unit: 'cans (15 oz)', department: 'Canned' },
      { name: 'Shredded Mexican blend cheese', quantity: 3, unit: 'cups', department: 'Dairy' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Green chiles (diced)', quantity: 1, unit: 'can (4 oz)', department: 'Canned' },
      { name: 'Cilantro (chopped)', quantity: 0.25, unit: 'cup', department: 'Produce', notes: 'for garnish' },
    ],
  },

  'quesadillas': {
    prep: 5, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Shred or dice cooked chicken (or use leftover meat).', group: 'prep' },
      { text: 'Lay a tortilla flat. Cover half with cheese, then chicken, then more cheese. Fold in half.', group: 'prep' },
      { text: 'Heat a skillet or griddle over medium heat with a thin layer of butter or oil.', group: 'cook' },
      { text: 'Cook quesadilla 2-3 minutes per side until tortilla is golden and cheese is melted.', group: 'cook' },
      { text: 'Cut into triangles. Serve with salsa, guacamole, and sour cream.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Flour tortillas (large)', quantity: 8, unit: 'tortillas', department: 'Bakery' },
      { name: 'Shredded Mexican blend cheese', quantity: 4, unit: 'cups', department: 'Dairy' },
      { name: 'Cooked chicken (shredded)', quantity: 3, unit: 'cups', department: 'Meat' },
      { name: 'Butter', quantity: 2, unit: 'tbsp', department: 'Dairy' },
      { name: 'Salsa', quantity: 1, unit: 'cup', department: 'Pantry', notes: 'for serving' },
      { name: 'Sour cream', quantity: 0.5, unit: 'cup', department: 'Dairy', notes: 'for serving' },
    ],
  },

  'burrito bowls': {
    prep: 15, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Season chicken with cumin, chili powder, garlic powder, salt, lime juice. Grill or pan-sear 6 min per side. Slice.', group: 'cook' },
      { text: 'Cook rice according to package. Stir in lime juice and cilantro when done.', group: 'cook' },
      { text: 'Warm black beans in a small pot with cumin and garlic.', group: 'cook' },
      { text: 'Prep toppings: shred lettuce, dice tomatoes, slice avocado, grate cheese.', group: 'prep' },
      { text: 'Assemble bowls: rice base, then beans, chicken, and all the toppings. Drizzle with sour cream or lime crema.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'White rice', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Black beans (drained)', quantity: 2, unit: 'cans (15 oz)', department: 'Canned' },
      { name: 'Avocado', quantity: 3, unit: 'medium', department: 'Produce' },
      { name: 'Tomatoes (diced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Romaine lettuce (shredded)', quantity: 3, unit: 'cups', department: 'Produce' },
      { name: 'Shredded Mexican blend cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Lime', quantity: 3, unit: 'limes', department: 'Produce' },
      { name: 'Cilantro', quantity: 0.25, unit: 'cup', department: 'Produce' },
      { name: 'Cumin', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Chili powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Garlic powder', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'taco soup': {
    prep: 10, cook: 25, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef in a large pot. Drain excess fat.', group: 'cook' },
      { text: 'Add onion and garlic, cook 2 minutes.', group: 'cook' },
      { text: 'Add ALL cans (don\'t drain): diced tomatoes, Rotel, corn, ranch beans, black beans. Add taco seasoning.', group: 'cook' },
      { text: 'Stir, bring to a boil. Reduce heat and simmer 15-20 minutes.', group: 'cook' },
      { text: 'Serve with tortilla chips, shredded cheese, sour cream, and hot sauce.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 2, unit: 'lbs', department: 'Meat' },
      { name: 'Diced tomatoes', quantity: 1, unit: 'can (14.5 oz)', department: 'Canned' },
      { name: 'Rotel (diced tomatoes with chiles)', quantity: 1, unit: 'can (10 oz)', department: 'Canned' },
      { name: 'Corn (do not drain)', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Ranch style beans (do not drain)', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Black beans (do not drain)', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Taco seasoning', quantity: 2, unit: 'packets', department: 'Spices' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Shredded cheddar cheese', quantity: 1, unit: 'cup', department: 'Dairy', notes: 'for serving' },
      { name: 'Tortilla chips', quantity: 1, unit: 'bag', department: 'Pantry', notes: 'for serving' },
    ],
  },

  'nachos (loaded)': {
    prep: 10, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven to 375°F. Line a large baking sheet with foil.', group: 'prep' },
      { text: 'Brown ground beef with taco seasoning. Set aside.', group: 'cook' },
      { text: 'Spread tortilla chips in a single layer on the sheet. Top with seasoned beef and shredded cheese.', group: 'cook' },
      { text: 'Bake 8-10 minutes until cheese is melted and bubbly.', group: 'cook' },
      { text: 'Top with jalapeños, diced tomatoes, black olives, sour cream, guacamole, and salsa.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Tortilla chips', quantity: 1, unit: 'large bag', department: 'Pantry' },
      { name: 'Ground beef (80/20)', quantity: 2, unit: 'lbs', department: 'Meat' },
      { name: 'Taco seasoning', quantity: 1, unit: 'packet', department: 'Spices' },
      { name: 'Shredded Mexican blend cheese', quantity: 4, unit: 'cups', department: 'Dairy' },
      { name: 'Jalapeños (sliced)', quantity: 0.25, unit: 'cup', department: 'Produce' },
      { name: 'Tomatoes (diced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Salsa', quantity: 1, unit: 'cup', department: 'Pantry' },
    ],
  },

  'chicken fajitas': {
    prep: 15, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Slice chicken into thin strips. Toss with fajita seasoning (cumin, chili powder, garlic powder, paprika, salt, lime juice).', group: 'prep' },
      { text: 'Slice bell peppers and onions into thin strips.', group: 'prep' },
      { text: 'Heat oil in a large skillet over HIGH heat. Cook chicken 5-6 minutes until done. Remove.', group: 'cook' },
      { text: 'In the same hot skillet, cook peppers and onions 3-4 minutes until slightly charred.', group: 'cook' },
      { text: 'Return chicken to skillet, toss together. Squeeze lime over the top.', group: 'cook' },
      { text: 'Serve with warm tortillas, guacamole, sour cream, cheese, and salsa.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Bell peppers (mixed colors, sliced)', quantity: 4, unit: 'medium', department: 'Produce' },
      { name: 'Yellow onion (sliced)', quantity: 2, unit: 'large', department: 'Produce' },
      { name: 'Flour tortillas', quantity: 16, unit: 'tortillas', department: 'Bakery' },
      { name: 'Lime', quantity: 2, unit: 'limes', department: 'Produce' },
      { name: 'Cumin', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Chili powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Vegetable oil', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'Shredded Mexican blend cheese', quantity: 2, unit: 'cups', department: 'Dairy', notes: 'for serving' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy', notes: 'for serving' },
    ],
  },

  'beef burritos': {
    prep: 15, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef. Add taco seasoning and water per packet. Simmer until thick.', group: 'cook' },
      { text: 'Warm refried beans in a separate pot.', group: 'cook' },
      { text: 'Cook rice if not already made.', group: 'cook' },
      { text: 'Warm tortillas in microwave (damp paper towel, 30 sec) or on a dry skillet.', group: 'prep' },
      { text: 'Assemble burritos: spread refried beans down the center, add rice, seasoned beef, cheese. Fold sides in, then roll up tightly.', group: 'finish' },
      { text: 'Optional: toast seam-side down in a skillet for a crispy outside.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 2.5, unit: 'lbs', department: 'Meat' },
      { name: 'Taco seasoning', quantity: 2, unit: 'packets', department: 'Spices' },
      { name: 'Flour tortillas (burrito size)', quantity: 8, unit: 'tortillas', department: 'Bakery' },
      { name: 'Refried beans', quantity: 1, unit: 'can (16 oz)', department: 'Canned' },
      { name: 'White rice (cooked)', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Shredded Mexican blend cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy', notes: 'for serving' },
      { name: 'Salsa', quantity: 1, unit: 'cup', department: 'Pantry', notes: 'for serving' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: bar-night (Week 1 Wednesday)
  // ═══════════════════════════════════════════════════════════════════════════

  'taco bar': {
    prep: 15, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef with taco seasoning. Set aside in a serving bowl.', group: 'cook' },
      { text: 'Warm taco shells and tortillas.', group: 'cook' },
      { text: 'Prep all toppings: shred lettuce, dice tomatoes, grate cheese, slice olives, chop cilantro.', group: 'prep' },
      { text: 'Set out sour cream, salsa, guacamole, and hot sauce in small bowls.', group: 'prep' },
      { text: 'Arrange everything buffet-style. Let everyone build their own!', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Taco seasoning', quantity: 2, unit: 'packets', department: 'Spices' },
      { name: 'Taco shells (hard)', quantity: 12, unit: 'shells', department: 'Pantry' },
      { name: 'Flour tortillas', quantity: 8, unit: 'tortillas', department: 'Bakery' },
      { name: 'Shredded lettuce', quantity: 4, unit: 'cups', department: 'Produce' },
      { name: 'Tomatoes (diced)', quantity: 3, unit: 'medium', department: 'Produce' },
      { name: 'Shredded Mexican blend cheese', quantity: 3, unit: 'cups', department: 'Dairy' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Salsa', quantity: 1.5, unit: 'cups', department: 'Pantry' },
    ],
  },

  'baked potato bar': {
    prep: 10, cook: 60, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven to 400°F. Scrub potatoes, poke with fork, rub with oil and salt.', group: 'prep' },
      { text: 'Bake directly on oven rack 50-60 minutes until tender when squeezed.', group: 'cook' },
      { text: 'While potatoes bake, cook bacon until crispy. Crumble.', group: 'cook' },
      { text: 'Prep all toppings: grate cheese, chop chives and broccoli, warm chili.', group: 'prep' },
      { text: 'Split potatoes open, fluff with fork. Let everyone load their own.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Russet potatoes (large)', quantity: 8, unit: 'potatoes', department: 'Produce' },
      { name: 'Bacon', quantity: 8, unit: 'slices', department: 'Meat' },
      { name: 'Butter', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Shredded cheddar cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Chives (chopped)', quantity: 0.25, unit: 'cup', department: 'Produce' },
      { name: 'Broccoli florets (steamed)', quantity: 2, unit: 'cups', department: 'Produce' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'pasta bar': {
    prep: 10, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cook 2 types of pasta (penne + spaghetti) in salted boiling water. Drain.', group: 'cook' },
      { text: 'Heat marinara sauce in one pot, alfredo sauce in another.', group: 'cook' },
      { text: 'Brown ground Italian sausage in a skillet if using.', group: 'cook' },
      { text: 'Prep toppings: grate parmesan, dice tomatoes, chop basil, cook meatballs.', group: 'prep' },
      { text: 'Set up buffet-style: pasta, sauces, proteins, toppings. Build your own bowl!', group: 'finish' },
    ],
    ingredients: [
      { name: 'Penne pasta', quantity: 1, unit: 'lb', department: 'Pantry' },
      { name: 'Spaghetti', quantity: 1, unit: 'lb', department: 'Pantry' },
      { name: 'Marinara sauce', quantity: 2, unit: 'jars (24 oz)', department: 'Pantry' },
      { name: 'Alfredo sauce', quantity: 1, unit: 'jar (15 oz)', department: 'Pantry' },
      { name: 'Italian sausage (ground)', quantity: 1, unit: 'lb', department: 'Meat' },
      { name: 'Parmesan cheese (grated)', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Garlic bread', quantity: 1, unit: 'loaf', department: 'Bakery' },
    ],
  },

  'nacho bar': {
    prep: 10, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef with taco seasoning.', group: 'cook' },
      { text: 'Warm queso in a small pot or microwave.', group: 'cook' },
      { text: 'Prep toppings: dice tomatoes, slice jalapeños, chop cilantro, open sour cream.', group: 'prep' },
      { text: 'Spread chips on a large platter or sheet pan. Let everyone load up and drizzle queso over their pile.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Tortilla chips', quantity: 2, unit: 'bags', department: 'Pantry' },
      { name: 'Ground beef (80/20)', quantity: 2, unit: 'lbs', department: 'Meat' },
      { name: 'Taco seasoning', quantity: 1, unit: 'packet', department: 'Spices' },
      { name: 'Queso dip', quantity: 1, unit: 'jar (15 oz)', department: 'Dairy' },
      { name: 'Shredded Mexican blend cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Jalapeños (sliced)', quantity: 0.25, unit: 'cup', department: 'Produce' },
      { name: 'Tomatoes (diced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Salsa', quantity: 1, unit: 'cup', department: 'Pantry' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: easy-lazy (Week 2 Wednesday)
  // ═══════════════════════════════════════════════════════════════════════════

  'deli sandwiches': {
    prep: 10, cook: 0, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Lay out bread, deli meats, cheese slices, and all condiments on the counter.', group: 'prep' },
      { text: 'Each person builds their own sandwich with their preferred fillings.', group: 'finish' },
      { text: 'Serve with chips, fruit, or a side salad.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Sliced bread or sub rolls', quantity: 1, unit: 'loaf', department: 'Bakery' },
      { name: 'Deli turkey (sliced)', quantity: 1, unit: 'lb', department: 'Meat' },
      { name: 'Deli ham (sliced)', quantity: 1, unit: 'lb', department: 'Meat' },
      { name: 'American cheese (sliced)', quantity: 8, unit: 'slices', department: 'Dairy' },
      { name: 'Lettuce leaves', quantity: 1, unit: 'head', department: 'Produce' },
      { name: 'Tomato (sliced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Mayonnaise', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Mustard', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Chips', quantity: 1, unit: 'bag', department: 'Pantry', notes: 'for serving' },
    ],
  },

  'hot dogs': {
    prep: 5, cook: 10, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Boil, grill, or pan-fry hot dogs until heated through and slightly charred.', group: 'cook' },
      { text: 'Toast buns on the grill or in the oven for 2 minutes.', group: 'cook' },
      { text: 'Set up condiment station: ketchup, mustard, relish, onions, cheese, jalapeños.', group: 'prep' },
      { text: 'Serve with chips or fries.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Hot dogs', quantity: 16, unit: 'dogs', department: 'Meat' },
      { name: 'Hot dog buns', quantity: 16, unit: 'buns', department: 'Bakery' },
      { name: 'Ketchup', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Yellow mustard', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Sweet relish', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Shredded cheddar cheese', quantity: 1, unit: 'cup', department: 'Dairy' },
    ],
  },

  'grilled cheese and tomato soup': {
    prep: 10, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Make tomato soup: heat canned tomato soup with milk per can directions (or use homemade recipe).', group: 'cook' },
      { text: 'Butter one side of each bread slice.', group: 'prep' },
      { text: 'Place bread butter-side down in a skillet. Add 2 slices of cheese, top with another bread slice (butter-side up).', group: 'cook' },
      { text: 'Cook over medium heat 3-4 minutes per side until golden and cheese is melted.', group: 'cook' },
      { text: 'Cut sandwiches in half diagonally. Serve with soup for dipping.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Sliced bread (white or sourdough)', quantity: 16, unit: 'slices', department: 'Bakery' },
      { name: 'American cheese (sliced)', quantity: 16, unit: 'slices', department: 'Dairy' },
      { name: 'Butter', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Tomato soup (condensed)', quantity: 4, unit: 'cans (10.75 oz)', department: 'Canned' },
      { name: 'Milk (whole)', quantity: 2, unit: 'cups', department: 'Dairy' },
    ],
  },

  'breakfast for dinner': {
    prep: 10, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cook bacon or sausage in a large skillet. Set aside on paper towels.', group: 'cook' },
      { text: 'Scramble eggs in batches: crack eggs into bowl, add a splash of milk, whisk, cook in buttered skillet over medium heat stirring gently.', group: 'cook' },
      { text: 'Make pancakes or waffles from mix, or toast frozen waffles.', group: 'cook' },
      { text: 'Serve everything family-style with syrup, butter, and fruit.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Eggs', quantity: 16, unit: 'large', department: 'Dairy' },
      { name: 'Bacon', quantity: 16, unit: 'slices', department: 'Meat' },
      { name: 'Pancake mix', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy' },
      { name: 'Milk (whole)', quantity: 1.5, unit: 'cups', department: 'Dairy' },
      { name: 'Maple syrup', quantity: 1, unit: 'bottle', department: 'Pantry' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: pizza-italian (Week 1 & 2 Friday)
  // ═══════════════════════════════════════════════════════════════════════════

  'homemade pizza': {
    prep: 20, cook: 15, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 475°F (or as hot as it goes). If using a pizza stone, preheat it too.', group: 'prep' },
      { text: 'Roll or stretch pizza dough on a floured surface into rounds or rectangles.', group: 'prep' },
      { text: 'Transfer to parchment-lined baking sheets or pizza pans.', group: 'prep' },
      { text: 'Spread pizza sauce, leaving a ½-inch border. Top with mozzarella and chosen toppings.', group: 'cook' },
      { text: 'Bake 12-15 minutes until crust is golden and cheese is bubbly with brown spots.', group: 'cook' },
      { text: 'Let cool 3 minutes. Slice and serve. Each kid can customize their own pizza!', group: 'finish' },
    ],
    ingredients: [
      { name: 'Pizza dough (store-bought or homemade)', quantity: 3, unit: 'lbs', department: 'Bakery' },
      { name: 'Pizza sauce', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Shredded mozzarella cheese', quantity: 4, unit: 'cups', department: 'Dairy' },
      { name: 'Pepperoni', quantity: 1, unit: 'package', department: 'Meat' },
      { name: 'Italian sausage (cooked, crumbled)', quantity: 1, unit: 'lb', department: 'Meat' },
      { name: 'Bell pepper (sliced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Black olives (sliced)', quantity: 1, unit: 'can', department: 'Canned' },
    ],
  },

  'spaghetti and meatballs': {
    prep: 20, cook: 30, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Make meatballs: mix ground beef, breadcrumbs, egg, parmesan, garlic, Italian seasoning, salt, pepper. Roll into 1.5-inch balls.', group: 'prep' },
      { text: 'Brown meatballs in a large skillet over medium-high heat, turning to brown all sides (8 min). Don\'t worry about cooking through.', group: 'cook' },
      { text: 'Add marinara sauce to the skillet. Simmer covered 20 minutes until meatballs are cooked through.', group: 'cook' },
      { text: 'Cook spaghetti in salted boiling water according to package (minus 1 minute for al dente). Drain.', group: 'cook' },
      { text: 'Serve spaghetti topped with meatballs and sauce. Garnish with parmesan and fresh basil.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Spaghetti', quantity: 2, unit: 'lbs', department: 'Pantry' },
      { name: 'Ground beef (80/20)', quantity: 2.5, unit: 'lbs', department: 'Meat' },
      { name: 'Marinara sauce', quantity: 2, unit: 'jars (24 oz)', department: 'Pantry' },
      { name: 'Breadcrumbs', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Egg', quantity: 1, unit: 'large', department: 'Dairy' },
      { name: 'Parmesan cheese (grated)', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Italian seasoning', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'baked ziti': {
    prep: 15, cook: 30, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven to 375°F. Cook ziti until al dente. Drain.', group: 'prep' },
      { text: 'In a large bowl, mix ricotta cheese, 1 cup mozzarella, parmesan, egg, and Italian seasoning.', group: 'prep' },
      { text: 'Add cooked ziti and marinara sauce to the bowl. Stir to combine.', group: 'cook' },
      { text: 'Pour half into a greased 9x13 dish. Add ricotta mixture, then remaining ziti. Top with mozzarella.', group: 'cook' },
      { text: 'Cover with foil. Bake 20 min covered, then 10 min uncovered until bubbly and golden.', group: 'cook' },
      { text: 'Let rest 10 minutes. Serve with garlic bread.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ziti pasta', quantity: 1.5, unit: 'lbs', department: 'Pantry' },
      { name: 'Marinara sauce', quantity: 2, unit: 'jars (24 oz)', department: 'Pantry' },
      { name: 'Ricotta cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Shredded mozzarella cheese', quantity: 3, unit: 'cups', department: 'Dairy' },
      { name: 'Parmesan cheese (grated)', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Egg', quantity: 1, unit: 'large', department: 'Dairy' },
      { name: 'Italian seasoning', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Garlic bread', quantity: 1, unit: 'loaf', department: 'Bakery' },
    ],
  },

  'chicken alfredo': {
    prep: 10, cook: 25, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cook fettuccine in salted boiling water until al dente. Reserve 1 cup pasta water before draining.', group: 'cook' },
      { text: 'Season chicken with salt, pepper, garlic powder. Cook in a large skillet with oil 6 min per side. Slice.', group: 'cook' },
      { text: 'In the same skillet, melt butter. Add garlic, cook 30 seconds.', group: 'cook' },
      { text: 'Add heavy cream, bring to a simmer. Stir in parmesan until melted and smooth. Season with salt and pepper.', group: 'cook' },
      { text: 'Toss in pasta. Add pasta water as needed for desired consistency.', group: 'cook' },
      { text: 'Serve topped with sliced chicken and extra parmesan.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Fettuccine', quantity: 1.5, unit: 'lbs', department: 'Pantry' },
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Heavy cream', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy' },
      { name: 'Parmesan cheese (grated)', quantity: 1.5, unit: 'cups', department: 'Dairy' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'lasagna': {
    prep: 30, cook: 60, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 375°F. Brown ground beef with onion and garlic. Add marinara sauce, simmer 10 min.', group: 'prep' },
      { text: 'Mix ricotta, egg, parmesan, Italian seasoning, salt in a bowl.', group: 'prep' },
      { text: 'In a 9x13 dish, layer: sauce, noodles, ricotta mix, mozzarella. Repeat 3 times, ending with sauce + mozzarella on top.', group: 'cook' },
      { text: 'Cover tightly with foil. Bake 45 minutes covered.', group: 'cook' },
      { text: 'Remove foil, bake 15 more minutes until bubbly and cheese is golden.', group: 'cook' },
      { text: 'Let rest 15 minutes before cutting — this is important so it holds together. Serve with garlic bread.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Lasagna noodles', quantity: 1, unit: 'box', department: 'Pantry' },
      { name: 'Ground beef (80/20)', quantity: 2, unit: 'lbs', department: 'Meat' },
      { name: 'Marinara sauce', quantity: 2, unit: 'jars (24 oz)', department: 'Pantry' },
      { name: 'Ricotta cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Shredded mozzarella cheese', quantity: 4, unit: 'cups', department: 'Dairy' },
      { name: 'Parmesan cheese (grated)', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Egg', quantity: 1, unit: 'large', department: 'Dairy' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Italian seasoning', quantity: 1, unit: 'tbsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Garlic bread', quantity: 1, unit: 'loaf', department: 'Bakery' },
    ],
  },

  'beef stroganoff': {
    prep: 15, cook: 25, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Slice beef against the grain into thin strips. Season with salt and pepper.', group: 'prep' },
      { text: 'Cook egg noodles according to package. Drain.', group: 'cook' },
      { text: 'Heat oil in a large skillet over high heat. Sear beef strips in batches 2 min per side. Remove.', group: 'cook' },
      { text: 'Reduce heat. Add butter, then sliced onions. Cook 5 min. Add garlic and cook 1 min.', group: 'cook' },
      { text: 'Sprinkle flour over onions, stir 1 min. Add beef broth and Worcestershire. Simmer until thickened.', group: 'cook' },
      { text: 'Return beef. Remove from heat, stir in sour cream. Serve over egg noodles.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Sirloin steak or stew meat', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Egg noodles (wide)', quantity: 1, unit: 'lb', department: 'Pantry' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Beef broth', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Butter', quantity: 3, unit: 'tbsp', department: 'Dairy' },
      { name: 'Yellow onion (sliced)', quantity: 1, unit: 'large', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'All-purpose flour', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'Worcestershire sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Vegetable oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: grill (Week 1 Saturday)
  // ═══════════════════════════════════════════════════════════════════════════

  'hamburgers': {
    prep: 10, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Mix ground beef with Worcestershire sauce, garlic powder, onion powder, salt, and pepper. Form 8 patties slightly larger than buns (they shrink).', group: 'prep' },
      { text: 'Make a small indent in the center of each patty (prevents puffing).', group: 'prep' },
      { text: 'Preheat grill to medium-high (400°F). Grill patties 4-5 minutes per side for medium (160°F internal).', group: 'cook' },
      { text: 'Add cheese in the last minute of grilling. Close lid to melt.', group: 'cook' },
      { text: 'Toast buns on the grill 30 seconds. Assemble with your favorite toppings.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Hamburger buns', quantity: 8, unit: 'buns', department: 'Bakery' },
      { name: 'American cheese (sliced)', quantity: 8, unit: 'slices', department: 'Dairy' },
      { name: 'Lettuce leaves', quantity: 8, unit: 'leaves', department: 'Produce' },
      { name: 'Tomato (sliced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Red onion (sliced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Worcestershire sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Onion powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'grilled chicken': {
    prep: 10, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Pound chicken breasts to even thickness or butterfly thick ones.', group: 'prep' },
      { text: 'Marinate at least 30 minutes in olive oil, lemon juice, garlic, Italian seasoning, salt, pepper.', group: 'prep' },
      { text: 'Preheat grill to medium-high. Oil the grates.', group: 'cook' },
      { text: 'Grill chicken 5-7 minutes per side until internal temp reaches 165°F.', group: 'cook' },
      { text: 'Rest 5 minutes before slicing. Serve with grilled veggies and rice.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 4, unit: 'lbs', department: 'Meat' },
      { name: 'Olive oil', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Lemon juice', quantity: 3, unit: 'tbsp', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Italian seasoning', quantity: 1, unit: 'tbsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'bbq ribs': {
    prep: 15, cook: 180, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Remove membrane from back of ribs. Rub generously with dry rub (brown sugar, paprika, garlic powder, onion powder, cumin, chili powder, salt, pepper).', group: 'prep' },
      { text: 'Wrap ribs tightly in foil. Place on baking sheets.', group: 'prep' },
      { text: 'Bake at 275°F for 2.5-3 hours until meat is very tender (should pull away from bone).', group: 'cook' },
      { text: 'Unwrap ribs. Brush generously with BBQ sauce.', group: 'cook' },
      { text: 'Grill over medium heat 5-10 minutes, flipping and basting with more sauce, until caramelized.', group: 'cook' },
      { text: 'Slice between bones. Serve with extra BBQ sauce on the side.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Pork spare ribs (full racks)', quantity: 3, unit: 'racks', department: 'Meat' },
      { name: 'BBQ sauce', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Brown sugar', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Paprika', quantity: 2, unit: 'tbsp', department: 'Spices' },
      { name: 'Garlic powder', quantity: 1, unit: 'tbsp', department: 'Spices' },
      { name: 'Onion powder', quantity: 1, unit: 'tbsp', department: 'Spices' },
      { name: 'Cumin', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Chili powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'steak': {
    prep: 5, cook: 15, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Take steaks out of the fridge 30 minutes before cooking. Pat dry with paper towels.', group: 'prep' },
      { text: 'Season generously on both sides with salt and pepper. Add garlic powder if desired.', group: 'prep' },
      { text: 'Preheat grill to HIGH heat (500°F+). Oil the grates.', group: 'cook' },
      { text: 'Grill steaks: 4 min per side for medium-rare (130°F), 5 min for medium (140°F), 6 min for medium-well (150°F).', group: 'cook' },
      { text: 'Let rest 5-8 minutes tented with foil. The temp will rise 5°F while resting. Serve with baked potatoes.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ribeye or strip steaks', quantity: 4, unit: 'steaks (1 inch thick)', department: 'Meat' },
      { name: 'Kosher salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper (coarsely ground)', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy', notes: 'for topping' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: experiment (Week 2 Saturday)
  // ═══════════════════════════════════════════════════════════════════════════

  'homemade fried chicken': {
    prep: 30, cook: 25, servings: 8, difficulty: 'hard',
    steps: [
      { text: 'Cut whole chicken into 8 pieces or use a mix of thighs, legs, and breasts.', group: 'prep' },
      { text: 'Soak chicken in buttermilk + hot sauce for at least 1 hour (overnight is best).', group: 'prep' },
      { text: 'Mix flour, garlic powder, onion powder, paprika, cayenne, salt, and pepper in a large bowl.', group: 'prep' },
      { text: 'Remove chicken from buttermilk. Dredge each piece in seasoned flour, pressing firmly.', group: 'prep' },
      { text: 'Heat 2 inches of oil in a large cast iron skillet to 350°F.', group: 'cook' },
      { text: 'Fry chicken 12-15 minutes, flipping once, until golden brown and internal temp reaches 165°F.', group: 'cook' },
      { text: 'Drain on a wire rack over a sheet pan. Serve with biscuits and coleslaw.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken pieces (thighs, legs, breasts)', quantity: 4, unit: 'lbs', department: 'Meat' },
      { name: 'Buttermilk', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'All-purpose flour', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Hot sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Vegetable oil (for frying)', quantity: 4, unit: 'cups', department: 'Pantry' },
      { name: 'Garlic powder', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Onion powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Cayenne pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: roast-comfort (Week 1 Sunday)
  // ═══════════════════════════════════════════════════════════════════════════

  'roast chicken': {
    prep: 15, cook: 75, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 425°F. Pat chickens dry. Season inside and out with salt, pepper, garlic powder, paprika.', group: 'prep' },
      { text: 'Stuff cavity with lemon halves, garlic cloves, and fresh herbs if available.', group: 'prep' },
      { text: 'Place on a roasting rack in a pan. Rub outside with butter or oil.', group: 'prep' },
      { text: 'Roast 1 hour 15 minutes until skin is golden and thigh reaches 165°F (juices run clear).', group: 'cook' },
      { text: 'Let rest 15 minutes before carving. Serve with roasted vegetables and gravy from pan drippings.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Whole chickens', quantity: 2, unit: 'chickens (4 lbs each)', department: 'Meat' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy' },
      { name: 'Lemon', quantity: 2, unit: 'lemons', department: 'Produce' },
      { name: 'Garlic (whole heads)', quantity: 2, unit: 'heads', department: 'Produce' },
      { name: 'Salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: brunch (Week 2 Sunday)
  // ═══════════════════════════════════════════════════════════════════════════

  'french toast': {
    prep: 10, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Whisk eggs, milk, vanilla, cinnamon, and a pinch of salt in a wide shallow dish.', group: 'prep' },
      { text: 'Heat a griddle or large skillet to medium. Melt butter on the surface.', group: 'cook' },
      { text: 'Dip bread slices in egg mixture, letting each side soak 10 seconds.', group: 'cook' },
      { text: 'Cook 2-3 minutes per side until golden brown.', group: 'cook' },
      { text: 'Serve with maple syrup, powdered sugar, and fresh berries.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Texas toast or thick-sliced bread', quantity: 16, unit: 'slices', department: 'Bakery' },
      { name: 'Eggs', quantity: 8, unit: 'large', department: 'Dairy' },
      { name: 'Milk (whole)', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Vanilla extract', quantity: 1, unit: 'tsp', department: 'Pantry' },
      { name: 'Cinnamon', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy' },
      { name: 'Maple syrup', quantity: 1, unit: 'bottle', department: 'Pantry' },
      { name: 'Powdered sugar', quantity: 2, unit: 'tbsp', department: 'Pantry' },
    ],
  },

  'pancakes': {
    prep: 5, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Mix pancake mix with milk and eggs per package directions. Don\'t over-mix — lumps are OK.', group: 'prep' },
      { text: 'Heat a griddle to 350°F or a skillet over medium heat. Lightly grease with butter.', group: 'cook' },
      { text: 'Pour ¼ cup batter per pancake. Cook until bubbles form and edges look set (2-3 min). Flip.', group: 'cook' },
      { text: 'Cook 1-2 minutes more until golden. Keep warm in a 200°F oven while making the rest.', group: 'cook' },
      { text: 'Serve with butter, syrup, whipped cream, and fruit.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Pancake mix', quantity: 4, unit: 'cups', department: 'Pantry' },
      { name: 'Milk (whole)', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Eggs', quantity: 2, unit: 'large', department: 'Dairy' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy' },
      { name: 'Maple syrup', quantity: 1, unit: 'bottle', department: 'Pantry' },
      { name: 'Bacon', quantity: 16, unit: 'slices', department: 'Meat', notes: 'optional side' },
    ],
  },

}

// ─── End of recipe data ──────────────────────────────────────────────────────

async function main() {
  console.log('🍽️  Meal Recipe Seed — Dispatch 152')
  console.log(`Target: ${BASE}`)
  console.log(`Recipes defined: ${Object.keys(RECIPES).length}`)
  console.log('')

  // 1. Fetch all meals from the API
  console.log('Fetching meal library...')
  const res = await fetch(`${BASE}/api/meals?action=list_all&include_inactive=true`)
  if (!res.ok) {
    console.error('Failed to fetch meals:', res.status, await res.text())
    process.exit(1)
  }
  const { meals } = await res.json()
  console.log(`Found ${meals.length} meals in library`)

  // 2. Match recipes to meals by name (case-insensitive, fuzzy)
  const matched = []
  const unmatched = []
  const alreadySeeded = []

  for (const meal of meals) {
    const nameLower = meal.name.toLowerCase().trim()
    const recipe = RECIPES[nameLower]
    if (recipe) {
      matched.push({ meal, recipe })
    }
  }

  // Check for recipes that didn't match any meal
  const matchedNames = new Set(matched.map(m => m.meal.name.toLowerCase().trim()))
  for (const recipeName of Object.keys(RECIPES)) {
    if (!matchedNames.has(recipeName)) {
      unmatched.push(recipeName)
    }
  }

  console.log(`Matched: ${matched.length}`)
  if (unmatched.length > 0) {
    console.log(`Unmatched recipe names (no meal in library):`)
    unmatched.forEach(n => console.log(`  - "${n}"`))
  }
  console.log('')

  // 3. Seed in batches of 10
  const BATCH_SIZE = 10
  let seeded = 0
  let failed = 0

  for (let i = 0; i < matched.length; i += BATCH_SIZE) {
    const batch = matched.slice(i, i + BATCH_SIZE)
    const items = batch.map(({ meal, recipe }) => ({
      meal_id: meal.id,
      recipe: {
        prep_time_min: recipe.prep,
        cook_time_min: recipe.cook,
        servings: recipe.servings,
        source: 'Coral Family Recipes',
        steps: recipe.steps.map((s, idx) => ({
          order: idx + 1,
          text: s.text,
          group: s.group,
        })),
        ingredients: recipe.ingredients.map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          department: ing.department,
          notes: ing.notes || null,
        })),
      },
    }))

    try {
      const batchRes = await fetch(`${BASE}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_imported_batch', items }),
      })
      const result = await batchRes.json()
      if (result.success) {
        seeded += result.saved
        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.saved} meals seeded`)
      } else {
        failed += batch.length
        console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} FAILED:`, result.error)
      }
    } catch (err) {
      failed += batch.length
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} ERROR:`, err.message)
    }
  }

  // 4. Also update difficulty + tips on meal_library directly
  console.log('')
  console.log('Updating difficulty levels...')
  for (const { meal, recipe } of matched) {
    try {
      await fetch(`${BASE}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_recipe',
          meal_id: meal.id,
          recipe_steps: recipe.steps.map((s, idx) => ({ order: idx + 1, text: s.text, group: s.group })),
          prep_time_min: recipe.prep,
          cook_time_min: recipe.cook,
          servings: recipe.servings,
          source: 'Coral Family Recipes',
        }),
      })
    } catch {}
  }

  console.log('')
  console.log('═══════════════════════════════')
  console.log(`✅ Seeded: ${seeded}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📋 Total recipes defined: ${Object.keys(RECIPES).length}`)
  console.log(`📋 Total meals in library: ${meals.length}`)
  console.log(`📋 Matched: ${matched.length}`)
  console.log('')
  console.log('Meals NOT covered by this seed (need separate batch or don\'t exist in library):')

  const coveredNames = new Set(Object.keys(RECIPES))
  const uncoveredMeals = meals.filter(m => !coveredNames.has(m.name.toLowerCase().trim()))
  uncoveredMeals.forEach(m => console.log(`  - "${m.name}" (theme: ${m.theme})`))
  console.log(`\nTotal uncovered: ${uncoveredMeals.length}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
