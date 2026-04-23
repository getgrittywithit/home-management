#!/usr/bin/env node
/**
 * Dispatch 152 — Seed remaining meals with recipe cards (Part 2)
 * Run AFTER seed-meal-recipes.mjs
 *
 * Run: node scripts/seed-meal-recipes-part2.mjs
 */

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://family-ops.grittysystems.com'

const RECIPES = {

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: american-comfort (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'chicken tenders (homemade)': {
    prep: 15, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cut chicken breasts into strips (about 1 inch wide).', group: 'prep' },
      { text: 'Set up breading station: flour in one dish, beaten eggs in second, panko + seasonings in third.', group: 'prep' },
      { text: 'Dredge each strip: flour → egg → panko. Press coating firmly.', group: 'prep' },
      { text: 'Bake at 425°F on a wire rack over a sheet pan for 15-18 minutes, flipping once. OR fry in 1 inch oil at 350°F for 4-5 min.', group: 'cook' },
      { text: 'Serve with ranch, honey mustard, or BBQ sauce for dipping.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Panko breadcrumbs', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'All-purpose flour', quantity: 1, unit: 'cup', department: 'Pantry' },
      { name: 'Eggs', quantity: 3, unit: 'large', department: 'Dairy' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Ranch dressing', quantity: 1, unit: 'bottle', department: 'Pantry', notes: 'for dipping' },
    ],
  },

  'sloppy joes': {
    prep: 10, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef in a large skillet. Drain excess fat.', group: 'cook' },
      { text: 'Add diced onion and green pepper. Cook 3-4 minutes until softened.', group: 'cook' },
      { text: 'Add tomato sauce, ketchup, brown sugar, mustard, Worcestershire sauce, garlic powder, and vinegar.', group: 'cook' },
      { text: 'Simmer 10-15 minutes until thick and saucy.', group: 'cook' },
      { text: 'Spoon onto toasted hamburger buns. Serve with chips or fries.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 2.5, unit: 'lbs', department: 'Meat' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Green bell pepper (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Tomato sauce', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Ketchup', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Brown sugar', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Worcestershire sauce', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Yellow mustard', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Hamburger buns', quantity: 8, unit: 'buns', department: 'Bakery' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'chicken and rice casserole': {
    prep: 15, cook: 50, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven to 375°F. Mix cream of chicken soup, milk, sour cream, and seasonings.', group: 'prep' },
      { text: 'Spread uncooked rice in a greased 9x13 dish. Pour soup mixture over rice.', group: 'prep' },
      { text: 'Place seasoned chicken breasts on top. Cover tightly with foil.', group: 'cook' },
      { text: 'Bake 45-50 minutes until rice is tender and chicken reaches 165°F.', group: 'cook' },
      { text: 'Remove foil, top with cheese. Bake 5 more minutes until melted. Let rest 5 min.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Long grain white rice', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Cream of chicken soup', quantity: 2, unit: 'cans (10.5 oz)', department: 'Canned' },
      { name: 'Milk (whole)', quantity: 1.5, unit: 'cups', department: 'Dairy' },
      { name: 'Sour cream', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Shredded cheddar cheese', quantity: 1.5, unit: 'cups', department: 'Dairy' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Onion powder', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'chicken parmesan': {
    prep: 20, cook: 25, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 400°F. Pound chicken breasts to even thickness.', group: 'prep' },
      { text: 'Set up breading: flour, beaten eggs, panko + parmesan + Italian seasoning.', group: 'prep' },
      { text: 'Dredge chicken: flour → egg → panko mixture.', group: 'prep' },
      { text: 'Pan-fry in oil 3-4 minutes per side until golden. Transfer to a baking sheet.', group: 'cook' },
      { text: 'Top each piece with marinara sauce and mozzarella. Bake 15 minutes until cheese is bubbly.', group: 'cook' },
      { text: 'Serve over spaghetti with extra sauce and garlic bread.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 4, unit: 'large', department: 'Meat' },
      { name: 'Panko breadcrumbs', quantity: 1.5, unit: 'cups', department: 'Pantry' },
      { name: 'Parmesan cheese (grated)', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Eggs', quantity: 2, unit: 'large', department: 'Dairy' },
      { name: 'All-purpose flour', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Marinara sauce', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Shredded mozzarella cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Spaghetti', quantity: 1, unit: 'lb', department: 'Pantry' },
      { name: 'Olive oil', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Italian seasoning', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'pork tenderloin': {
    prep: 10, cook: 25, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 400°F. Pat tenderloins dry. Season generously with rub (brown sugar, garlic powder, paprika, cumin, salt, pepper).', group: 'prep' },
      { text: 'Heat oil in a large oven-safe skillet over high heat. Sear tenderloins 2-3 min per side until browned.', group: 'cook' },
      { text: 'Transfer skillet to oven. Roast 15-20 minutes until internal temp reaches 145°F.', group: 'cook' },
      { text: 'Let rest 10 minutes (temp will rise to 150°F). Slice into ½-inch medallions.', group: 'finish' },
      { text: 'Serve with roasted vegetables or mashed potatoes.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Pork tenderloin', quantity: 3, unit: 'lbs (2 pieces)', department: 'Meat' },
      { name: 'Brown sugar', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Cumin', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
    ],
  },

  'baked chicken thighs': {
    prep: 10, cook: 40, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven to 425°F. Pat chicken thighs dry with paper towels.', group: 'prep' },
      { text: 'Season both sides with garlic powder, paprika, Italian seasoning, salt, and pepper. Drizzle with oil.', group: 'prep' },
      { text: 'Arrange skin-side up on a baking sheet (don\'t crowd).', group: 'cook' },
      { text: 'Bake 35-40 minutes until skin is crispy and internal temp reaches 165°F.', group: 'cook' },
      { text: 'Let rest 5 minutes before serving.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken thighs (bone-in, skin-on)', quantity: 12, unit: 'pieces', department: 'Meat' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Italian seasoning', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: soup-comfort (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'minestrone soup': {
    prep: 15, cook: 35, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Heat olive oil in a large pot. Cook diced onion, carrots, celery, and garlic 5 minutes.', group: 'cook' },
      { text: 'Add diced tomatoes, broth, kidney beans, Italian seasoning, and bay leaf. Bring to a boil.', group: 'cook' },
      { text: 'Add diced zucchini and small pasta. Simmer 15 minutes until pasta is tender.', group: 'cook' },
      { text: 'Add fresh spinach in the last 2 minutes. Remove bay leaf.', group: 'cook' },
      { text: 'Serve with parmesan and crusty bread.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken or vegetable broth', quantity: 6, unit: 'cups', department: 'Pantry' },
      { name: 'Diced tomatoes', quantity: 1, unit: 'can (14.5 oz)', department: 'Canned' },
      { name: 'Kidney beans (drained)', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Small pasta (ditalini or elbow)', quantity: 1, unit: 'cup', department: 'Pantry' },
      { name: 'Carrots (diced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Celery (diced)', quantity: 2, unit: 'stalks', department: 'Produce' },
      { name: 'Zucchini (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Fresh spinach', quantity: 2, unit: 'cups', department: 'Produce' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Italian seasoning', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Parmesan cheese (grated)', quantity: 0.5, unit: 'cup', department: 'Dairy', notes: 'for serving' },
    ],
  },

  'corn chowder': {
    prep: 10, cook: 30, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cook bacon until crispy. Remove, crumble. Keep 2 tbsp drippings.', group: 'cook' },
      { text: 'Cook diced onion, celery, and potatoes in drippings 5 minutes.', group: 'cook' },
      { text: 'Add broth, bring to a boil. Simmer 15 minutes until potatoes are tender.', group: 'cook' },
      { text: 'Add corn and cream. Simmer 5 more minutes.', group: 'cook' },
      { text: 'Serve topped with crumbled bacon and chives.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Frozen corn', quantity: 4, unit: 'cups', department: 'Frozen' },
      { name: 'Bacon', quantity: 6, unit: 'slices', department: 'Meat' },
      { name: 'Russet potatoes (diced)', quantity: 3, unit: 'medium', department: 'Produce' },
      { name: 'Chicken broth', quantity: 4, unit: 'cups', department: 'Pantry' },
      { name: 'Heavy cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Celery (diced)', quantity: 2, unit: 'stalks', department: 'Produce' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'crockpot beef chili': {
    prep: 10, cook: 480, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef in a skillet. Drain fat. Transfer to slow cooker.', group: 'prep' },
      { text: 'Add all remaining ingredients to slow cooker. Stir.', group: 'prep' },
      { text: 'Cook on LOW 6-8 hours or HIGH 3-4 hours.', group: 'cook' },
      { text: 'Taste and adjust seasoning before serving.', group: 'cook' },
      { text: 'Serve with cornbread, shredded cheese, and sour cream.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 2.5, unit: 'lbs', department: 'Meat' },
      { name: 'Diced tomatoes', quantity: 2, unit: 'cans (14.5 oz)', department: 'Canned' },
      { name: 'Kidney beans (drained)', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Pinto beans (drained)', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Tomato sauce', quantity: 1, unit: 'can (8 oz)', department: 'Canned' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'large', department: 'Produce' },
      { name: 'Chili powder', quantity: 3, unit: 'tbsp', department: 'Spices' },
      { name: 'Cumin', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: asian (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'korean beef bowls': {
    prep: 10, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef in a large skillet. Drain.', group: 'cook' },
      { text: 'Add soy sauce, brown sugar, sesame oil, garlic, ginger, and red pepper flakes. Cook 3 minutes.', group: 'cook' },
      { text: 'Serve over steamed rice.', group: 'finish' },
      { text: 'Top with sliced green onions, sesame seeds, and a fried egg if desired.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Soy sauce', quantity: 0.33, unit: 'cup', department: 'Pantry' },
      { name: 'Brown sugar', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'Sesame oil', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 5, unit: 'cloves', department: 'Produce' },
      { name: 'Fresh ginger (grated)', quantity: 1, unit: 'tsp', department: 'Produce' },
      { name: 'Red pepper flakes', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'White rice', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Green onions', quantity: 4, unit: 'stalks', department: 'Produce' },
      { name: 'Sesame seeds', quantity: 1, unit: 'tbsp', department: 'Spices' },
    ],
  },

  'egg drop soup': {
    prep: 5, cook: 10, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Bring chicken broth to a boil. Add soy sauce, sesame oil, ginger, and white pepper.', group: 'cook' },
      { text: 'Mix cornstarch with cold water to make a slurry. Stir into boiling broth to thicken slightly.', group: 'cook' },
      { text: 'Beat eggs in a bowl. Slowly drizzle into simmering broth while stirring gently in one direction.', group: 'cook' },
      { text: 'Remove from heat immediately. The eggs will cook in ribbons.', group: 'cook' },
      { text: 'Garnish with sliced green onions.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken broth', quantity: 8, unit: 'cups', department: 'Pantry' },
      { name: 'Eggs', quantity: 6, unit: 'large', department: 'Dairy' },
      { name: 'Soy sauce', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Sesame oil', quantity: 1, unit: 'tsp', department: 'Pantry' },
      { name: 'Cornstarch', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Fresh ginger (grated)', quantity: 1, unit: 'tsp', department: 'Produce' },
      { name: 'Green onions', quantity: 3, unit: 'stalks', department: 'Produce' },
    ],
  },

  'chicken lettuce wraps': {
    prep: 10, cook: 10, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cook ground chicken in a skillet over medium-high heat until browned.', group: 'cook' },
      { text: 'Add garlic, ginger, and diced water chestnuts. Cook 2 minutes.', group: 'cook' },
      { text: 'Add soy sauce, hoisin sauce, rice vinegar, and sesame oil. Stir 2 minutes.', group: 'cook' },
      { text: 'Wash and separate butter lettuce leaves into cups.', group: 'prep' },
      { text: 'Spoon chicken mixture into lettuce cups. Top with green onions and sriracha.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground chicken', quantity: 2.5, unit: 'lbs', department: 'Meat' },
      { name: 'Butter lettuce', quantity: 2, unit: 'heads', department: 'Produce' },
      { name: 'Water chestnuts (diced)', quantity: 1, unit: 'can (8 oz)', department: 'Canned' },
      { name: 'Soy sauce', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'Hoisin sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Rice vinegar', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Sesame oil', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Fresh ginger (grated)', quantity: 1, unit: 'tsp', department: 'Produce' },
      { name: 'Green onions', quantity: 4, unit: 'stalks', department: 'Produce' },
    ],
  },

  'kung pao chicken': {
    prep: 15, cook: 15, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Cut chicken into 1-inch cubes. Toss with soy sauce and cornstarch.', group: 'prep' },
      { text: 'Make sauce: mix soy sauce, rice vinegar, sugar, sesame oil, and cornstarch slurry.', group: 'prep' },
      { text: 'Heat oil in a wok over high heat. Stir-fry chicken 4-5 minutes until golden. Remove.', group: 'cook' },
      { text: 'Add dried chili peppers and peanuts. Stir 30 seconds until fragrant.', group: 'cook' },
      { text: 'Return chicken, pour sauce over, stir-fry 2 minutes until glossy. Add green onions.', group: 'cook' },
      { text: 'Serve over steamed rice.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Roasted peanuts', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Dried red chili peppers', quantity: 8, unit: 'peppers', department: 'Spices' },
      { name: 'Soy sauce', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Rice vinegar', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Sugar', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Sesame oil', quantity: 1, unit: 'tbsp', department: 'Pantry' },
      { name: 'Cornstarch', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Green onions', quantity: 4, unit: 'stalks', department: 'Produce' },
      { name: 'Vegetable oil', quantity: 3, unit: 'tbsp', department: 'Pantry' },
      { name: 'White rice', quantity: 3, unit: 'cups', department: 'Pantry' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: mexican (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'tamale pie': {
    prep: 15, cook: 30, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 400°F. Brown ground beef with onion and garlic. Drain.', group: 'prep' },
      { text: 'Add diced tomatoes, corn, chili powder, cumin, and salt. Simmer 10 minutes.', group: 'cook' },
      { text: 'Pour meat mixture into a greased 9x13 dish.', group: 'cook' },
      { text: 'Mix cornbread batter per package. Spread evenly over the meat layer.', group: 'cook' },
      { text: 'Bake 20-25 minutes until cornbread topping is golden. Top with cheese last 5 minutes.', group: 'cook' },
      { text: 'Let cool 10 minutes. Serve with sour cream and salsa.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 2, unit: 'lbs', department: 'Meat' },
      { name: 'Cornbread mix', quantity: 2, unit: 'boxes', department: 'Pantry' },
      { name: 'Diced tomatoes', quantity: 1, unit: 'can (14.5 oz)', department: 'Canned' },
      { name: 'Frozen corn', quantity: 1.5, unit: 'cups', department: 'Frozen' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 3, unit: 'cloves', department: 'Produce' },
      { name: 'Shredded cheddar cheese', quantity: 1.5, unit: 'cups', department: 'Dairy' },
      { name: 'Chili powder', quantity: 2, unit: 'tbsp', department: 'Spices' },
      { name: 'Cumin', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'mexican rice bowls': {
    prep: 10, cook: 25, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cook rice in chicken broth with tomato sauce, cumin, and garlic for extra flavor.', group: 'cook' },
      { text: 'Season and cook your protein (chicken, beef, or pork) in a separate skillet.', group: 'cook' },
      { text: 'Warm beans with cumin and garlic.', group: 'cook' },
      { text: 'Set up bowl assembly line: rice, beans, protein, then toppings.', group: 'prep' },
      { text: 'Top with cheese, pico de gallo, avocado, sour cream, and hot sauce.', group: 'finish' },
    ],
    ingredients: [
      { name: 'White rice', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Chicken broth', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Chicken breast or ground beef', quantity: 2.5, unit: 'lbs', department: 'Meat' },
      { name: 'Black beans (drained)', quantity: 2, unit: 'cans (15 oz)', department: 'Canned' },
      { name: 'Tomato sauce', quantity: 0.5, unit: 'cup', department: 'Canned' },
      { name: 'Shredded Mexican blend cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Avocado', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Cumin', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Garlic powder', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'tostadas': {
    prep: 10, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Brown ground beef with taco seasoning. Or heat refried beans.', group: 'cook' },
      { text: 'If using corn tortillas, bake at 400°F 5-7 min per side until crispy (or use store-bought tostada shells).', group: 'cook' },
      { text: 'Spread refried beans on each tostada shell.', group: 'finish' },
      { text: 'Top with meat, lettuce, cheese, tomato, sour cream, and hot sauce.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Tostada shells', quantity: 16, unit: 'shells', department: 'Pantry' },
      { name: 'Ground beef (80/20)', quantity: 2, unit: 'lbs', department: 'Meat' },
      { name: 'Refried beans', quantity: 1, unit: 'can (16 oz)', department: 'Canned' },
      { name: 'Taco seasoning', quantity: 1, unit: 'packet', department: 'Spices' },
      { name: 'Shredded lettuce', quantity: 3, unit: 'cups', department: 'Produce' },
      { name: 'Tomatoes (diced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Shredded Mexican blend cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', department: 'Dairy' },
    ],
  },

  'carnitas': {
    prep: 15, cook: 480, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cut pork shoulder into 3-4 large chunks. Season with cumin, chili powder, oregano, salt, pepper.', group: 'prep' },
      { text: 'Place in slow cooker with diced onion, garlic, orange juice, and lime juice.', group: 'prep' },
      { text: 'Cook on LOW 8-10 hours until pork shreds easily with a fork.', group: 'cook' },
      { text: 'Shred pork. For crispy edges: spread on a sheet pan, broil 3-5 minutes.', group: 'cook' },
      { text: 'Serve in warm tortillas with onion, cilantro, salsa verde, and lime wedges.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Pork shoulder (bone-in)', quantity: 4, unit: 'lbs', department: 'Meat' },
      { name: 'Orange juice', quantity: 0.5, unit: 'cup', department: 'Produce' },
      { name: 'Lime juice', quantity: 3, unit: 'tbsp', department: 'Produce' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'large', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 6, unit: 'cloves', department: 'Produce' },
      { name: 'Cumin', quantity: 1, unit: 'tbsp', department: 'Spices' },
      { name: 'Chili powder', quantity: 1, unit: 'tbsp', department: 'Spices' },
      { name: 'Oregano', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Corn or flour tortillas', quantity: 16, unit: 'tortillas', department: 'Bakery' },
      { name: 'Cilantro', quantity: 0.5, unit: 'cup', department: 'Produce' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: bar-night (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'salad bar': {
    prep: 15, cook: 0, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Wash and chop all greens. Place in a large bowl.', group: 'prep' },
      { text: 'Prep all toppings: dice tomatoes, cucumber, onion; shred carrots and cheese; crumble bacon; slice eggs.', group: 'prep' },
      { text: 'Set up dressings: ranch, Italian, vinaigrette.', group: 'prep' },
      { text: 'Arrange everything in bowls. Let everyone build their own salad.', group: 'finish' },
      { text: 'Optional: add grilled chicken strips or canned tuna for protein.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Romaine lettuce (chopped)', quantity: 2, unit: 'heads', department: 'Produce' },
      { name: 'Tomatoes', quantity: 3, unit: 'medium', department: 'Produce' },
      { name: 'Cucumber', quantity: 1, unit: 'large', department: 'Produce' },
      { name: 'Carrots (shredded)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Red onion (sliced)', quantity: 0.5, unit: 'medium', department: 'Produce' },
      { name: 'Hard-boiled eggs', quantity: 4, unit: 'large', department: 'Dairy' },
      { name: 'Shredded cheddar cheese', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Bacon bits', quantity: 0.5, unit: 'cup', department: 'Meat' },
      { name: 'Croutons', quantity: 1, unit: 'cup', department: 'Pantry' },
      { name: 'Ranch dressing', quantity: 1, unit: 'bottle', department: 'Pantry' },
      { name: 'Italian dressing', quantity: 1, unit: 'bottle', department: 'Pantry' },
    ],
  },

  'burger bar': {
    prep: 15, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Form ground beef into 8 patties. Season with salt and pepper. Make indent in center.', group: 'prep' },
      { text: 'Prep all toppings and set on the table: lettuce, tomato, onion, pickles, cheese, bacon, sauces.', group: 'prep' },
      { text: 'Grill or pan-fry patties 4-5 minutes per side for medium.', group: 'cook' },
      { text: 'Toast buns. Let everyone build their dream burger.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Hamburger buns', quantity: 8, unit: 'buns', department: 'Bakery' },
      { name: 'American cheese (sliced)', quantity: 8, unit: 'slices', department: 'Dairy' },
      { name: 'Lettuce leaves', quantity: 8, unit: 'leaves', department: 'Produce' },
      { name: 'Tomato (sliced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Red onion (sliced)', quantity: 1, unit: 'medium', department: 'Produce' },
      { name: 'Pickles (sliced)', quantity: 1, unit: 'jar', department: 'Pantry' },
      { name: 'Bacon', quantity: 8, unit: 'slices', department: 'Meat' },
      { name: 'Ketchup', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Mustard', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Salt', quantity: 1.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: easy-lazy (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'frozen pizza night': {
    prep: 2, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven per pizza package directions (usually 400-425°F).', group: 'prep' },
      { text: 'Place pizzas directly on oven rack or a baking sheet.', group: 'cook' },
      { text: 'Bake per package directions until cheese is melted and crust is golden.', group: 'cook' },
      { text: 'Let cool 3-5 minutes. Slice and serve with a side salad or fruit.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Frozen pizzas (large)', quantity: 3, unit: 'pizzas', department: 'Frozen' },
      { name: 'Bagged salad mix', quantity: 1, unit: 'bag', department: 'Produce', notes: 'optional side' },
      { name: 'Ranch dressing', quantity: null, unit: null, department: 'Pantry', notes: 'optional' },
    ],
  },

  'chicken nuggets': {
    prep: 5, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven per package directions (usually 400°F).', group: 'prep' },
      { text: 'Spread nuggets in a single layer on a baking sheet.', group: 'cook' },
      { text: 'Bake 15-20 minutes, flipping halfway, until golden and crispy.', group: 'cook' },
      { text: 'Serve with dipping sauces: ketchup, ranch, honey mustard, BBQ.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Frozen chicken nuggets', quantity: 3, unit: 'lbs', department: 'Frozen' },
      { name: 'Ketchup', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Ranch dressing', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Honey mustard', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Frozen fries', quantity: 1, unit: 'bag', department: 'Frozen', notes: 'optional side' },
    ],
  },

  'corn dogs': {
    prep: 2, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven to 375°F.', group: 'prep' },
      { text: 'Place frozen corn dogs on a baking sheet.', group: 'cook' },
      { text: 'Bake 15-18 minutes until golden.', group: 'cook' },
      { text: 'Serve with ketchup and mustard.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Frozen corn dogs', quantity: 16, unit: 'corn dogs', department: 'Frozen' },
      { name: 'Ketchup', quantity: null, unit: null, department: 'Pantry' },
      { name: 'Yellow mustard', quantity: null, unit: null, department: 'Pantry' },
      { name: 'French fries (frozen)', quantity: 1, unit: 'bag', department: 'Frozen', notes: 'optional side' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: pizza-italian (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'calzones': {
    prep: 20, cook: 20, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Preheat oven to 425°F. Divide pizza dough into 8 portions. Roll each into a circle.', group: 'prep' },
      { text: 'Fill one half of each circle with ricotta, mozzarella, and chosen fillings (pepperoni, sausage, peppers, etc.).', group: 'prep' },
      { text: 'Fold dough over filling, press edges together, and crimp with a fork to seal.', group: 'prep' },
      { text: 'Place on parchment-lined baking sheet. Brush with egg wash. Cut 2-3 small slits on top.', group: 'cook' },
      { text: 'Bake 18-22 minutes until golden brown. Serve with warm marinara for dipping.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Pizza dough', quantity: 3, unit: 'lbs', department: 'Bakery' },
      { name: 'Ricotta cheese', quantity: 1.5, unit: 'cups', department: 'Dairy' },
      { name: 'Shredded mozzarella cheese', quantity: 3, unit: 'cups', department: 'Dairy' },
      { name: 'Pepperoni', quantity: 1, unit: 'package', department: 'Meat' },
      { name: 'Italian sausage (cooked)', quantity: 1, unit: 'lb', department: 'Meat' },
      { name: 'Marinara sauce', quantity: 2, unit: 'cups', department: 'Pantry', notes: 'for dipping' },
      { name: 'Egg (for egg wash)', quantity: 1, unit: 'large', department: 'Dairy' },
    ],
  },

  'chicken pesto pasta': {
    prep: 10, cook: 20, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Cook penne pasta until al dente. Reserve 1 cup pasta water before draining.', group: 'cook' },
      { text: 'Season chicken with salt and pepper. Cook in a skillet with oil 6 min per side. Slice.', group: 'cook' },
      { text: 'In the same skillet, add pesto, heavy cream, and ½ cup pasta water. Stir until combined.', group: 'cook' },
      { text: 'Add pasta and toss to coat. Add more pasta water if needed.', group: 'cook' },
      { text: 'Top with sliced chicken, cherry tomatoes, and parmesan.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Penne pasta', quantity: 1.5, unit: 'lbs', department: 'Pantry' },
      { name: 'Chicken breast (boneless, skinless)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Basil pesto', quantity: 1, unit: 'cup', department: 'Pantry' },
      { name: 'Heavy cream', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Cherry tomatoes (halved)', quantity: 1, unit: 'pint', department: 'Produce' },
      { name: 'Parmesan cheese (grated)', quantity: 0.5, unit: 'cup', department: 'Dairy' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: grill (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'grilled sausages': {
    prep: 5, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat grill to medium heat.', group: 'prep' },
      { text: 'Grill sausages 12-15 minutes, turning occasionally, until browned and cooked through (160°F internal).', group: 'cook' },
      { text: 'Toast hoagie rolls on the grill in the last 2 minutes.', group: 'cook' },
      { text: 'Serve in rolls with sautéed peppers and onions, mustard, and sauerkraut.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Italian sausage links or brats', quantity: 16, unit: 'links', department: 'Meat' },
      { name: 'Hoagie rolls', quantity: 8, unit: 'rolls', department: 'Bakery' },
      { name: 'Bell peppers (sliced)', quantity: 3, unit: 'medium', department: 'Produce' },
      { name: 'Yellow onion (sliced)', quantity: 2, unit: 'large', department: 'Produce' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Yellow mustard', quantity: null, unit: null, department: 'Pantry' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: experiment (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'chicken tikka masala': {
    prep: 20, cook: 30, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Marinate chicken cubes in yogurt, garam masala, cumin, turmeric, salt, and lime juice for 30 min (or overnight).', group: 'prep' },
      { text: 'Cook marinated chicken in a hot skillet with oil until browned. Remove.', group: 'cook' },
      { text: 'In the same pan, cook onion, garlic, and ginger. Add tomato puree, garam masala, cumin, paprika, cayenne.', group: 'cook' },
      { text: 'Simmer sauce 10 minutes. Stir in heavy cream and sugar.', group: 'cook' },
      { text: 'Return chicken to sauce. Simmer 10 minutes until chicken is cooked through and sauce is thick.', group: 'cook' },
      { text: 'Serve over basmati rice with naan bread. Garnish with cilantro.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chicken breast (boneless, skinless, cubed)', quantity: 3, unit: 'lbs', department: 'Meat' },
      { name: 'Plain yogurt', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Tomato puree', quantity: 1, unit: 'can (15 oz)', department: 'Canned' },
      { name: 'Heavy cream', quantity: 1, unit: 'cup', department: 'Dairy' },
      { name: 'Yellow onion (diced)', quantity: 2, unit: 'medium', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 5, unit: 'cloves', department: 'Produce' },
      { name: 'Fresh ginger (grated)', quantity: 1, unit: 'tbsp', department: 'Produce' },
      { name: 'Garam masala', quantity: 2, unit: 'tbsp', department: 'Spices' },
      { name: 'Cumin', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Turmeric', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Paprika', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Basmati rice', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Naan bread', quantity: 8, unit: 'pieces', department: 'Bakery' },
    ],
  },

  'jambalaya': {
    prep: 15, cook: 40, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Slice sausage into rounds. Season chicken with Cajun seasoning.', group: 'prep' },
      { text: 'Brown sausage in a large pot. Remove. Brown chicken pieces. Remove.', group: 'cook' },
      { text: 'Cook the "holy trinity" (onion, celery, bell pepper) in the pot 5 minutes. Add garlic.', group: 'cook' },
      { text: 'Add diced tomatoes, broth, Cajun seasoning, thyme, and rice. Return sausage and chicken.', group: 'cook' },
      { text: 'Bring to a boil, reduce heat, cover tightly. Simmer 25-30 minutes until rice is tender.', group: 'cook' },
      { text: 'Fluff with a fork. Serve with hot sauce on the side.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Andouille sausage', quantity: 1, unit: 'lb', department: 'Meat' },
      { name: 'Chicken thighs (boneless, cubed)', quantity: 2, unit: 'lbs', department: 'Meat' },
      { name: 'Long grain white rice', quantity: 2.5, unit: 'cups', department: 'Pantry' },
      { name: 'Chicken broth', quantity: 3, unit: 'cups', department: 'Pantry' },
      { name: 'Diced tomatoes', quantity: 1, unit: 'can (14.5 oz)', department: 'Canned' },
      { name: 'Yellow onion (diced)', quantity: 1, unit: 'large', department: 'Produce' },
      { name: 'Celery (diced)', quantity: 3, unit: 'stalks', department: 'Produce' },
      { name: 'Green bell pepper (diced)', quantity: 1, unit: 'large', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Cajun seasoning', quantity: 2, unit: 'tbsp', department: 'Spices' },
      { name: 'Dried thyme', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: roast-comfort (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'sunday pot roast': {
    prep: 15, cook: 300, servings: 8, difficulty: 'medium',
    steps: [
      { text: 'Season chuck roast with salt and pepper. Sear in a hot Dutch oven 4 min per side.', group: 'cook' },
      { text: 'Remove roast. Sauté onion, garlic, carrots, celery in the pot.', group: 'cook' },
      { text: 'Add beef broth, Worcestershire, tomato paste. Return roast.', group: 'cook' },
      { text: 'Cover and cook at 300°F for 3-4 hours, adding potatoes in the last hour.', group: 'cook' },
      { text: 'Slice or shred roast. Serve with vegetables and pan gravy.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Chuck roast', quantity: 4, unit: 'lbs', department: 'Meat' },
      { name: 'Russet potatoes (quartered)', quantity: 5, unit: 'medium', department: 'Produce' },
      { name: 'Carrots (chunked)', quantity: 5, unit: 'medium', department: 'Produce' },
      { name: 'Yellow onion (quartered)', quantity: 2, unit: 'large', department: 'Produce' },
      { name: 'Celery (chunked)', quantity: 3, unit: 'stalks', department: 'Produce' },
      { name: 'Garlic (minced)', quantity: 4, unit: 'cloves', department: 'Produce' },
      { name: 'Beef broth', quantity: 2, unit: 'cups', department: 'Pantry' },
      { name: 'Tomato paste', quantity: 2, unit: 'tbsp', department: 'Canned' },
      { name: 'Worcestershire sauce', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Salt', quantity: 2, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 1, unit: 'tsp', department: 'Spices' },
    ],
  },

  'baked ham': {
    prep: 10, cook: 120, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven to 325°F. Place ham cut-side down in a roasting pan.', group: 'prep' },
      { text: 'Score the top in a diamond pattern with a sharp knife.', group: 'prep' },
      { text: 'Mix brown sugar, honey, mustard, and cloves for glaze.', group: 'prep' },
      { text: 'Brush ham with glaze. Cover with foil. Bake 15 min per pound.', group: 'cook' },
      { text: 'Remove foil in last 30 minutes. Brush with more glaze every 10 min.', group: 'cook' },
      { text: 'Let rest 15 minutes before carving. Serve with pan juices.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Bone-in spiral-cut ham', quantity: 8, unit: 'lbs', department: 'Meat' },
      { name: 'Brown sugar', quantity: 0.5, unit: 'cup', department: 'Pantry' },
      { name: 'Honey', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Dijon mustard', quantity: 2, unit: 'tbsp', department: 'Pantry' },
      { name: 'Ground cloves', quantity: 0.25, unit: 'tsp', department: 'Spices' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME: brunch (more)
  // ═══════════════════════════════════════════════════════════════════════════

  'waffles': {
    prep: 10, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat waffle iron. Mix waffle batter per package or recipe.', group: 'prep' },
      { text: 'Spray waffle iron with cooking spray. Pour batter to fill iron.', group: 'cook' },
      { text: 'Cook 3-5 minutes until golden and steam stops coming out.', group: 'cook' },
      { text: 'Keep waffles warm in a 200°F oven while making the rest.', group: 'cook' },
      { text: 'Serve with butter, syrup, whipped cream, fruit, or chocolate chips.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Waffle/pancake mix', quantity: 4, unit: 'cups', department: 'Pantry' },
      { name: 'Eggs', quantity: 3, unit: 'large', department: 'Dairy' },
      { name: 'Milk (whole)', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Vegetable oil', quantity: 0.25, unit: 'cup', department: 'Pantry' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', department: 'Dairy', notes: 'for serving' },
      { name: 'Maple syrup', quantity: 1, unit: 'bottle', department: 'Pantry' },
      { name: 'Bacon or sausage', quantity: 16, unit: 'slices/links', department: 'Meat', notes: 'optional side' },
    ],
  },

  'egg casserole': {
    prep: 15, cook: 45, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Preheat oven to 350°F. Grease a 9x13 baking dish.', group: 'prep' },
      { text: 'Layer cubed bread in the dish. Top with cooked sausage/bacon and cheese.', group: 'prep' },
      { text: 'Whisk eggs, milk, salt, pepper, and dry mustard. Pour over bread layers.', group: 'prep' },
      { text: 'Bake 40-45 minutes until set in the center and golden on top.', group: 'cook' },
      { text: 'Let rest 10 minutes before cutting into squares.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Bread (cubed)', quantity: 6, unit: 'cups', department: 'Bakery' },
      { name: 'Eggs', quantity: 12, unit: 'large', department: 'Dairy' },
      { name: 'Milk (whole)', quantity: 1.5, unit: 'cups', department: 'Dairy' },
      { name: 'Breakfast sausage (cooked, crumbled)', quantity: 1, unit: 'lb', department: 'Meat' },
      { name: 'Shredded cheddar cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Salt', quantity: 1, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Dry mustard', quantity: 0.5, unit: 'tsp', department: 'Spices' },
    ],
  },

  'breakfast burritos': {
    prep: 10, cook: 15, servings: 8, difficulty: 'easy',
    steps: [
      { text: 'Scramble eggs in a large skillet with salt and pepper.', group: 'cook' },
      { text: 'Cook bacon or sausage in a separate pan. Chop into bits.', group: 'cook' },
      { text: 'Warm flour tortillas in the microwave (damp paper towel, 30 seconds).', group: 'prep' },
      { text: 'Fill each tortilla with eggs, meat, cheese, and optional salsa, peppers, or sour cream.', group: 'finish' },
      { text: 'Roll up tightly. Cut in half to serve. Optional: toast seam-side down in a skillet.', group: 'finish' },
    ],
    ingredients: [
      { name: 'Eggs', quantity: 12, unit: 'large', department: 'Dairy' },
      { name: 'Bacon or sausage', quantity: 12, unit: 'slices/links', department: 'Meat' },
      { name: 'Flour tortillas (burrito size)', quantity: 8, unit: 'tortillas', department: 'Bakery' },
      { name: 'Shredded Mexican blend cheese', quantity: 2, unit: 'cups', department: 'Dairy' },
      { name: 'Salsa', quantity: 1, unit: 'cup', department: 'Pantry' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', department: 'Spices' },
      { name: 'Black pepper', quantity: 0.25, unit: 'tsp', department: 'Spices' },
    ],
  },

}

// ─── Runner (identical to Part 1) ────────────────────────────────────────────

async function main() {
  console.log('🍽️  Meal Recipe Seed — Dispatch 152 (Part 2)')
  console.log(`Target: ${BASE}`)
  console.log(`Recipes defined: ${Object.keys(RECIPES).length}`)
  console.log('')

  console.log('Fetching meal library...')
  const res = await fetch(`${BASE}/api/meals?action=list_all&include_inactive=true`)
  if (!res.ok) {
    console.error('Failed to fetch meals:', res.status, await res.text())
    process.exit(1)
  }
  const { meals } = await res.json()
  console.log(`Found ${meals.length} meals in library`)

  const matched = []
  for (const meal of meals) {
    const nameLower = meal.name.toLowerCase().trim()
    const recipe = RECIPES[nameLower]
    if (recipe) matched.push({ meal, recipe })
  }

  const matchedNames = new Set(matched.map(m => m.meal.name.toLowerCase().trim()))
  const unmatched = Object.keys(RECIPES).filter(n => !matchedNames.has(n))

  console.log(`Matched: ${matched.length}`)
  if (unmatched.length > 0) {
    console.log('Unmatched recipe names:')
    unmatched.forEach(n => console.log(`  - "${n}"`))
  }
  console.log('')

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
        steps: recipe.steps.map((s, idx) => ({ order: idx + 1, text: s.text, group: s.group })),
        ingredients: recipe.ingredients.map(ing => ({
          name: ing.name, quantity: ing.quantity, unit: ing.unit,
          department: ing.department, notes: ing.notes || null,
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

  for (const { meal, recipe } of matched) {
    try {
      await fetch(`${BASE}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_recipe',
          meal_id: meal.id,
          recipe_steps: recipe.steps.map((s, idx) => ({ order: idx + 1, text: s.text, group: s.group })),
          prep_time_min: recipe.prep, cook_time_min: recipe.cook,
          servings: recipe.servings, source: 'Coral Family Recipes',
        }),
      })
    } catch {}
  }

  console.log('')
  console.log('═══════════════════════════════')
  console.log(`✅ Seeded: ${seeded}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📋 Total Part 2 recipes: ${Object.keys(RECIPES).length}`)

  const coveredNames = new Set(Object.keys(RECIPES))
  const uncoveredMeals = meals.filter(m => !coveredNames.has(m.name.toLowerCase().trim()))
  console.log(`\nMeals still uncovered after Part 1 + Part 2: ${uncoveredMeals.length}`)
  uncoveredMeals.forEach(m => console.log(`  - "${m.name}" (theme: ${m.theme})`))
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1) })
