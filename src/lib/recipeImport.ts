// Shared recipe-import helpers used by /api/meals actions.
// Parsers are intentionally forgiving — the user edits everything
// in the review screen before anything hits the database.

export interface ParsedIngredient {
  quantity: number | null
  unit: string | null
  name: string
  department: string
  notes: string | null
}

export interface ParsedStep {
  order: number
  text: string
  group: 'prep' | 'cook' | 'finish'
}

export interface ParsedRecipe {
  name: string | null
  ingredients: ParsedIngredient[]
  steps: ParsedStep[]
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number | null
  source: string | null
}

const FRAC_MAP: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6,
}

const UNIT_WORDS = new Set([
  'cup', 'cups', 'c',
  'tsp', 'teaspoon', 'teaspoons',
  'tbsp', 'tablespoon', 'tablespoons',
  'oz', 'ounce', 'ounces',
  'lb', 'lbs', 'pound', 'pounds',
  'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms',
  'ml', 'milliliter', 'milliliters',
  'l', 'liter', 'liters',
  'pkt', 'packet', 'packets', 'pkg', 'package', 'packages',
  'can', 'cans',
  'bag', 'bags',
  'box', 'boxes',
  'pinch', 'dash',
  'clove', 'cloves',
  'slice', 'slices',
  'stick', 'sticks',
  'ct', 'count', 'pcs', 'pieces',
  'head', 'heads',
  'bunch', 'bunches',
  'jar', 'jars',
  'quart', 'quarts', 'qt',
  'pint', 'pints', 'pt',
  'gallon', 'gallons', 'gal',
])

// Order matters: first match wins. Put more-specific patterns (Spices,
// Canned) above the generic Pantry sweep so "chili powder" lands in Spices,
// not Pantry.
const DEPT_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(beef|chicken|pork|turkey|lamb|sausage|bacon|ham|ground|steak|brisket|shrimp|fish|salmon|tuna)\b/i, 'Meat'],
  [/\b(shredded cheese|cream cheese|sour cream|heavy cream|half[- ]and[- ]half|cheese|butter|yogurt|milk|parmesan|mozzarella|cheddar|feta|egg|eggs)\b/i, 'Dairy'],
  // Spices / seasonings — must come before Pantry's generic 'salt|seasoning' catch
  [/\b(chili powder|cumin|paprika|oregano|basil|thyme|rosemary|garlic powder|onion powder|cayenne|cinnamon|nutmeg|bay leaf|bay leaves|italian seasoning|taco seasoning|ranch seasoning|red pepper flakes|black pepper|white pepper|turmeric|coriander|ginger powder|dried\s+\w+|ground\s+(?:cumin|coriander|cinnamon|nutmeg|pepper))\b/i, 'Spices'],
  // Canned goods — before Pantry so "diced tomatoes" doesn't fall through
  [/\b(diced tomatoes|crushed tomatoes|tomato sauce|tomato paste|canned\s+\w+|coconut milk|chicken broth|beef broth|vegetable broth|broth|stock|enchilada sauce|refried beans|black beans|pinto beans|kidney beans|green chiles|chipotle)\b/i, 'Canned'],
  // Fresh produce
  [/\b(yellow onion|red onion|green onion|onion|garlic|bell pepper|jalape[ñn]o|jalapeno|cilantro|parsley|lime|lemon|lettuce|romaine|spinach|kale|avocado|potato|potatoes|sweet potato|carrot|celery|broccoli|cucumber|tomato|tomatoes|mushroom|zucchini|squash|corn on the cob|fresh\s+\w+)\b/i, 'Produce'],
  [/\b(bread|bun|buns|tortilla|tortillas|taco shell|taco shells|shells|pita|biscuit|roll|rolls|bagel)\b/i, 'Bakery'],
  [/\b(frozen|ice cream)\b/i, 'Frozen'],
  // Pantry catch-all — goes last
  [/\b(rice|pasta|flour|sugar|salt|oil|olive oil|vinegar|sauce|seasoning|beans|broth|stock|soy sauce|ketchup|mustard|mayo|peanut butter|jam|jelly|cereal)\b/i, 'Pantry'],
]

function guessDepartment(name: string): string {
  for (const [re, dept] of DEPT_KEYWORDS) {
    if (re.test(name)) return dept
  }
  return 'Other'
}

function parseFraction(str: string): number | null {
  if (!str) return null
  const trimmed = str.trim()
  // Unicode fraction char (alone or with whole number)
  const unicodeMatch = trimmed.match(/^(\d+\s+)?([½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])$/)
  if (unicodeMatch) {
    const whole = unicodeMatch[1] ? parseInt(unicodeMatch[1]) : 0
    return whole + (FRAC_MAP[unicodeMatch[2]] || 0)
  }
  // "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3])
  }
  // "1/2"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/)
  if (fracMatch) return parseInt(fracMatch[1]) / parseInt(fracMatch[2])
  // Plain decimal
  const num = parseFloat(trimmed)
  return isNaN(num) ? null : num
}

// Parse a single ingredient line like "1.5 lb ground beef, drained"
export function parseIngredientLine(raw: string): ParsedIngredient {
  const clean = raw.replace(/^[•\-*]\s*/, '').trim()
  if (!clean) return { quantity: null, unit: null, name: '', department: 'Other', notes: null }

  // Split off notes after a comma
  const [main, ...noteParts] = clean.split(/,\s*/)
  const notes = noteParts.length > 0 ? noteParts.join(', ') : null

  // Pull quantity + unit from the start
  const qtyMatch = main.match(/^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?|[½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚]|\d+\s+[½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])\s+(.*)$/)
  let quantity: number | null = null
  let unit: string | null = null
  let name = main

  if (qtyMatch) {
    quantity = parseFraction(qtyMatch[1])
    const rest = qtyMatch[2]
    const wordMatch = rest.match(/^(\S+)\s+(.*)$/)
    if (wordMatch && UNIT_WORDS.has(wordMatch[1].toLowerCase().replace(/\.$/, ''))) {
      unit = wordMatch[1].toLowerCase().replace(/\.$/, '')
      name = wordMatch[2]
    } else {
      name = rest
    }
  }

  name = name.trim()
  return { quantity, unit, name, department: guessDepartment(name), notes }
}

function detectStepGroup(text: string, order: number, total: number): 'prep' | 'cook' | 'finish' {
  const lower = text.toLowerCase()
  if (/^prep|chop|dice|mince|slice|peel|measure|preheat|wash|drain|rinse|combine in a bowl/i.test(lower)) return 'prep'
  if (/serve|plate|garnish|top with|sprinkle|finish|build your own|set out/i.test(lower)) return 'finish'
  if (/^(cook|bake|fry|saute|sauté|simmer|boil|roast|grill|heat|brown|stir|add|pour|mix)/i.test(lower)) return 'cook'
  // Positional fallback
  if (order === 1) return 'prep'
  if (order === total) return 'finish'
  return 'cook'
}

export function parseRecipeText(raw: string): ParsedRecipe {
  if (!raw?.trim()) {
    return { name: null, ingredients: [], steps: [], prep_time_min: null, cook_time_min: null, servings: null, source: null }
  }

  const lines = raw.split(/\r?\n/).map(l => l.trim())
  const nonEmpty = lines.filter(Boolean)

  // Name: first non-empty line (unless it looks like a URL or ingredient)
  const name = nonEmpty.find(l => !/^https?:\/\//.test(l) && !/^\d/.test(l)) || null

  // Prep / cook / servings
  const prepMatch = raw.match(/prep(?:\s*time)?[:\s]+(\d+)\s*(?:min|m)\b/i)
  const cookMatch = raw.match(/cook(?:\s*time)?[:\s]+(\d+)\s*(?:min|m)\b/i)
  const servMatch = raw.match(/(?:serves?|servings?|yield)[:\s]+(\d+)/i)

  // Ingredients: lines starting with a number/fraction/bullet before the first "step"-like line
  const ingredients: ParsedIngredient[] = []
  const steps: ParsedStep[] = []
  let inSteps = false

  for (const line of nonEmpty) {
    if (line === name) continue

    // Numbered step — check FIRST so "5. Serve with toppings" isn't swallowed
    // by the metadata filter (which matches "serves?")
    const numMatch = line.match(/^(\d+)[.)]\s+(.+)$/)
    if (numMatch) {
      inSteps = true
      steps.push({ order: parseInt(numMatch[1]), text: numMatch[2], group: 'cook' })
      continue
    }

    // Metadata lines we skip (prep time, cook time, servings, yield).
    // Anchor at start so "Serve with toppings" in a non-numbered line
    // isn't falsely caught.
    if (/^(prep\s*time|cook\s*time|serves|servings|yield)\b[:\s]/i.test(line) && line.length < 40) continue

    // Section headings
    if (/^ingredient/i.test(line)) { inSteps = false; continue }
    if (/^(step|instruction|direction|method)/i.test(line)) { inSteps = true; continue }

    if (!inSteps) {
      // Treat as ingredient if it has a quantity pattern OR starts with a bullet
      if (/^[•\-*]/.test(line) || /^\d|^[½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚]/.test(line)) {
        const parsed = parseIngredientLine(line)
        if (parsed.name) ingredients.push(parsed)
        continue
      }
      // Could still be a free-form ingredient
      if (line.length < 80 && !/[.!?]$/.test(line)) {
        const parsed = parseIngredientLine(line)
        if (parsed.name) ingredients.push(parsed)
        continue
      }
    }
    // Otherwise treat as step text
    if (line.length > 10) {
      steps.push({ order: steps.length + 1, text: line.replace(/^[•\-*]\s*/, ''), group: 'cook' })
    }
  }

  // Renumber + classify steps by position
  steps.forEach((s, i) => {
    s.order = i + 1
    s.group = detectStepGroup(s.text, i + 1, steps.length)
  })

  return {
    name,
    ingredients,
    steps,
    prep_time_min: prepMatch ? parseInt(prepMatch[1]) : null,
    cook_time_min: cookMatch ? parseInt(cookMatch[1]) : null,
    servings: servMatch ? parseInt(servMatch[1]) : null,
    source: null,
  }
}

// Convert ISO 8601 duration (PT20M, PT1H15M) to total minutes
function isoDurationToMinutes(iso: string | number | null | undefined): number | null {
  if (iso == null) return null
  if (typeof iso === 'number') return iso
  const match = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) {
    const n = parseInt(String(iso))
    return isNaN(n) ? null : n
  }
  const hours = match[1] ? parseInt(match[1]) : 0
  const mins = match[2] ? parseInt(match[2]) : 0
  const total = hours * 60 + mins
  return total > 0 ? total : null
}

function extractServings(yield_: any): number | null {
  if (yield_ == null) return null
  if (typeof yield_ === 'number') return yield_
  if (Array.isArray(yield_)) return extractServings(yield_[0])
  const match = String(yield_).match(/(\d+)/)
  return match ? parseInt(match[1]) : null
}

function asStringArray(val: any): string[] {
  if (val == null) return []
  if (typeof val === 'string') return [val]
  if (Array.isArray(val)) {
    return val
      .map((v: any) => {
        if (typeof v === 'string') return v
        if (v && typeof v === 'object') return v.text || v.name || ''
        return ''
      })
      .filter(Boolean)
  }
  return []
}

// Walk a JSON-LD blob looking for a Recipe node. Handles:
// - top-level { "@type": "Recipe", ... }
// - top-level { "@type": ["Recipe", ...], ... }
// - { "@graph": [ ... ] }
// - arrays of nodes
// - nested objects where Recipe is buried a few levels deep
function findRecipeNode(node: any, depth = 0): any {
  if (!node || depth > 6) return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof node !== 'object') return null
  const type = node['@type']
  if (type === 'Recipe') return node
  if (Array.isArray(type) && type.includes('Recipe')) return node
  if (node['@graph']) {
    const found = findRecipeNode(node['@graph'], depth + 1)
    if (found) return found
  }
  // Some sites nest under mainEntity or itemListElement
  for (const key of ['mainEntity', 'mainEntityOfPage', 'itemListElement']) {
    if (node[key]) {
      const found = findRecipeNode(node[key], depth + 1)
      if (found) return found
    }
  }
  return null
}

// Decode common HTML entities that leak into JSON-LD blocks on some sites.
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

export interface FetchRecipeResult {
  recipe: ParsedRecipe
  error: string | null
}

export async function fetchRecipeUrl(url: string): Promise<FetchRecipeResult> {
  const empty: ParsedRecipe = { name: null, ingredients: [], steps: [], prep_time_min: null, cook_time_min: null, servings: null, source: url }
  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        // Browser-like UA so allrecipes and friends don't block the request.
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
  } catch (e: any) {
    return { recipe: empty, error: `Couldn't reach that URL — ${e?.message || 'network error'}` }
  }

  if (!res.ok) {
    if (res.status === 403 || res.status === 401 || res.status === 429) {
      return { recipe: empty, error: 'This site blocked automated access — try Paste Recipe instead.' }
    }
    return { recipe: empty, error: `Couldn't load that page (HTTP ${res.status}).` }
  }

  const rawHtml = await res.text()
  const html = decodeHtmlEntities(rawHtml)

  // Extract JSON-LD script blocks
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  let recipe: any = null
  while ((match = scriptRegex.exec(html)) !== null) {
    const jsonStr = match[1].trim()
    try {
      const parsed = JSON.parse(jsonStr)
      recipe = findRecipeNode(parsed)
      if (recipe) break
    } catch {
      // Some sites concatenate multiple JSON objects or leak HTML comments.
      // Try to recover by stripping HTML comments and retrying.
      try {
        const cleaned = jsonStr.replace(/<!--[\s\S]*?-->/g, '').trim()
        const parsed = JSON.parse(cleaned)
        recipe = findRecipeNode(parsed)
        if (recipe) break
      } catch {
        // Skip invalid block
      }
    }
  }

  if (!recipe) {
    return { recipe: empty, error: "Couldn't find a recipe on that page — try Paste Recipe instead." }
  }

  const ingredients: ParsedIngredient[] = asStringArray(recipe.recipeIngredient).map(parseIngredientLine)

  const stepTexts = asStringArray(recipe.recipeInstructions)
  const steps: ParsedStep[] = stepTexts.map((text, i) => ({
    order: i + 1,
    text: text.trim(),
    group: detectStepGroup(text, i + 1, stepTexts.length),
  }))

  return {
    recipe: {
      name: recipe.name || null,
      ingredients,
      steps,
      prep_time_min: isoDurationToMinutes(recipe.prepTime),
      cook_time_min: isoDurationToMinutes(recipe.cookTime),
      servings: extractServings(recipe.recipeYield),
      source: url,
    },
    error: null,
  }
}

// Very small CSV parser — handles quoted fields and embedded commas.
function parseCsvRow(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else cur += ch
    } else {
      if (ch === ',') { out.push(cur); cur = '' }
      else if (ch === '"') inQuotes = true
      else cur += ch
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

export function parseCsvBatch(csv: string): Array<{ meal_name: string; recipe: ParsedRecipe }> {
  const lines = csv.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCsvRow(lines[0]).map(h => h.toLowerCase())
  const idx = (name: string) => headers.indexOf(name)

  const iName = idx('meal_name')
  const iStepOrder = idx('step_order')
  const iStepText = idx('step_text')
  const iStepGroup = idx('step_group')
  const iPrep = idx('prep_time')
  const iCook = idx('cook_time')
  const iServ = idx('servings')
  const iSource = idx('source')

  if (iName === -1) return []

  const grouped = new Map<string, { recipe: ParsedRecipe }>()
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i])
    const mealName = row[iName]
    if (!mealName) continue
    if (!grouped.has(mealName)) {
      grouped.set(mealName, {
        recipe: {
          name: mealName,
          ingredients: [],
          steps: [],
          prep_time_min: iPrep >= 0 ? (parseInt(row[iPrep]) || null) : null,
          cook_time_min: iCook >= 0 ? (parseInt(row[iCook]) || null) : null,
          servings: iServ >= 0 ? (parseInt(row[iServ]) || null) : null,
          source: iSource >= 0 ? (row[iSource] || null) : null,
        },
      })
    }
    const entry = grouped.get(mealName)!
    if (iStepText >= 0 && row[iStepText]) {
      const order = iStepOrder >= 0 ? (parseInt(row[iStepOrder]) || entry.recipe.steps.length + 1) : entry.recipe.steps.length + 1
      const group = (iStepGroup >= 0 ? (row[iStepGroup] as 'prep' | 'cook' | 'finish') : 'cook') || 'cook'
      entry.recipe.steps.push({ order, text: row[iStepText], group })
    }
  }

  return Array.from(grouped.entries()).map(([meal_name, { recipe }]) => ({
    meal_name,
    recipe: { ...recipe, steps: recipe.steps.sort((a, b) => a.order - b.order) },
  }))
}
