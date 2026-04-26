import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { parseDateLocal } from '@/lib/date-local'

// ── Shopping list dedup helpers (T-FOOD-1) ───────────────────────────────

// Normalize an ingredient name to a dedup key when no alias hit:
// lowercase, strip "(modifier)", collapse whitespace, crude plural→singular.
function normalizeForDedup(name: string): string {
  let s = name.toLowerCase().replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  if (s.endsWith('ies') && s.length > 4) s = s.slice(0, -3) + 'y'        // berries → berry
  else if (s.endsWith('ves') && s.length > 4) s = s.slice(0, -3) + 'f'   // leaves → leaf
  else if (s.endsWith('es') && s.length > 4) s = s.slice(0, -2)          // tomatoes → tomato
  else if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) s = s.slice(0, -1) // avocados → avocado
  return s
}

// Resolve "Ground beef or chicken" → pick the option that's in stock.
// Falls back to the first option if neither is in stock.
function resolveEitherOr(
  name: string,
  aliasToItem: Map<string, number>,
  inStockIds: Set<number>,
  inStockNames: Set<string>,
): string {
  if (!/\bor\b/i.test(name)) return name
  const options = name.split(/\s+or\s+/i).map(s => s.trim()).filter(Boolean)
  if (options.length < 2) return name
  for (const opt of options) {
    const lower = opt.toLowerCase()
    const itemId = aliasToItem.get(lower)
    if (itemId != null && inStockIds.has(itemId)) return opt
    if (inStockNames.has(lower)) return opt
  }
  return options[0]
}

// Combine quantities across meals: same unit sums; mixed units render as "2 lb + 1 cup".
function combineQuantities(byUnit: Map<string, number>): string | null {
  const entries = Array.from(byUnit.entries()).filter(([, n]) => n > 0)
  if (entries.length === 0) return null
  return entries
    .map(([unit, total]) => {
      const display = Number.isInteger(total) ? String(total) : total.toFixed(2).replace(/\.?0+$/, '')
      return unit ? `${display} ${unit}` : display
    })
    .join(' + ')
}

export async function GET() {
  try {
    const rows = await db.query(
      `SELECT id, item_name, quantity, category, checked, source, added_date
       FROM shopping_list ORDER BY checked ASC, created_at DESC`
    )
    return NextResponse.json({ items: rows })
  } catch (error) {
    console.error('Shopping list GET error:', error)
    return NextResponse.json({ items: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'add_item': {
        const { item_name, quantity, category } = body
        if (!item_name) return NextResponse.json({ error: 'item_name required' }, { status: 400 })
        await db.query(
          `INSERT INTO shopping_list (item_name, quantity, category, source) VALUES ($1, $2, $3, 'manual')`,
          [item_name.trim(), quantity || null, category || 'other']
        )
        return NextResponse.json({ success: true })
      }

      case 'toggle_item': {
        const { id, checked } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE shopping_list SET checked = $2 WHERE id = $1`, [id, !!checked])
        return NextResponse.json({ success: true })
      }

      case 'clear_checked': {
        await db.query(`DELETE FROM shopping_list WHERE checked = TRUE`)
        return NextResponse.json({ success: true })
      }

      case 'delete_item': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM shopping_list WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'generate_from_meals': {
        // Get this week's meal plans from the LIVE meal_week_plan table
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const d = parseDateLocal(today)
        const dow = d.getDay()
        const monday = new Date(d)
        monday.setDate(d.getDate() - ((dow + 6) % 7))
        const weekStart = monday.toLocaleDateString('en-CA')

        const meals = await db.query(
          `SELECT DISTINCT mwp.meal_id, ml.name AS meal_name, ml.ingredients AS jsonb_ingredients
           FROM meal_week_plan mwp
           JOIN meal_library ml ON mwp.meal_id = ml.id
           WHERE mwp.week_start = $1 AND mwp.meal_id IS NOT NULL`,
          [weekStart]
        )

        // Pre-load aliases (ingredient_term → inventory_item_id) for canonical dedup
        const aliasRows = await db.query(
          `SELECT LOWER(ingredient_term) AS term, inventory_item_id
             FROM ingredient_aliases WHERE is_primary_match = TRUE`
        ).catch(() => [])
        const aliasToItem = new Map<string, number>()
        for (const r of aliasRows) aliasToItem.set(r.term, r.inventory_item_id)

        // Pre-load in-stock inventory for either/or resolution
        const stockRows = await db.query(
          `SELECT id, LOWER(name) AS name FROM inventory_items WHERE current_stock > 0`
        ).catch(() => [])
        const inStockIds = new Set<number>(stockRows.map((r: any) => r.id))
        const inStockNames = new Set<string>(stockRows.map((r: any) => r.name))

        // Aggregator: dedupKey → { canonicalName, category, quantitiesByUnit }
        type Agg = { name: string; category: string; byUnit: Map<string, number> }
        const aggregated = new Map<string, Agg>()

        for (const meal of meals) {
          let ings: any[] = []
          try {
            ings = await db.query(
              `SELECT name, quantity, unit, department FROM meal_ingredients WHERE meal_id = $1`,
              [meal.meal_id]
            )
          } catch {}

          if (ings.length === 0 && meal.jsonb_ingredients) {
            const parsed = Array.isArray(meal.jsonb_ingredients) ? meal.jsonb_ingredients : []
            ings = parsed.filter((i: any) => i.name?.trim()).map((i: any) => ({
              name: i.name, quantity: i.quantity, unit: i.unit, department: i.department || 'Other',
            }))
          }

          for (const ing of ings) {
            const rawName = String(ing.name || '').trim()
            if (!rawName) continue

            // 1. Resolve "X or Y" by stock check
            const resolvedName = resolveEitherOr(rawName, aliasToItem, inStockIds, inStockNames)

            // 2. Pick a dedup key — prefer canonical inventory_item_id from aliases
            const itemId = aliasToItem.get(resolvedName.toLowerCase())
            const dedupKey = itemId != null ? `item:${itemId}` : `name:${normalizeForDedup(resolvedName)}`

            const unit = String(ing.unit || '').trim().toLowerCase()
            const qtyNum = Number(ing.quantity) || 0

            const existing = aggregated.get(dedupKey)
            if (existing) {
              existing.byUnit.set(unit, (existing.byUnit.get(unit) || 0) + qtyNum)
            } else {
              const byUnit = new Map<string, number>()
              if (qtyNum > 0) byUnit.set(unit, qtyNum)
              aggregated.set(dedupKey, {
                name: resolvedName,
                category: String(ing.department || 'other').toLowerCase(),
                byUnit,
              })
            }
          }
        }

        const items = Array.from(aggregated.values()).map(agg => ({
          name: agg.name,
          category: agg.category,
          quantity: combineQuantities(agg.byUnit),
        }))

        // Item 1.4: refresh the meal_plan-sourced rows but preserve user
        // checkmarks. Old approach was DELETE + INSERT, which nuked rows
        // Lola had already checked off and let the same item land twice
        // when it also matched a low_supply or manual entry. New approach:
        // - drop only unchecked meal_plan rows (stale week's auto-pulls)
        // - skip inserts where the item already exists in any unchecked row
        //   (so a low_supply entry for "milk" doesn't get a duplicate
        //   meal_plan entry for "milk")
        await db.query(`DELETE FROM shopping_list WHERE source = 'meal_plan' AND checked = FALSE`)

        const existingRows = await db.query(
          `SELECT LOWER(item_name) AS name FROM shopping_list WHERE checked = FALSE`
        ).catch(() => [])
        const existingNames = new Set<string>(existingRows.map((r: any) => r.name))

        let added = 0
        let skipped = 0
        for (const item of items) {
          const key = item.name.toLowerCase()
          if (existingNames.has(key)) { skipped++; continue }
          await db.query(
            `INSERT INTO shopping_list (item_name, quantity, category, source) VALUES ($1, $2, $3, 'meal_plan')`,
            [item.name, item.quantity, item.category]
          )
          existingNames.add(key)
          added++
        }

        return NextResponse.json({ success: true, added, skipped, meal_count: meals.length })
      }

      case 'add_low_supply': {
        // Add low-supply items from inventory_items (the live source).
        // Returns skipped count so the toast can read "Added 3, skipped 2".
        const low = await db.query(
          `SELECT name, category FROM inventory_items
           WHERE par_level IS NOT NULL AND current_stock <= par_level`
        ).catch(() => [])
        let added = 0
        let skipped = 0
        for (const item of low) {
          const exists = await db.query(
            `SELECT 1 FROM shopping_list WHERE LOWER(item_name) = LOWER($1) AND checked = FALSE LIMIT 1`,
            [item.name]
          ).catch(() => [])
          if (exists.length > 0) { skipped++; continue }
          await db.query(
            `INSERT INTO shopping_list (item_name, category, source) VALUES ($1, $2, 'low_supply')`,
            [item.name, (item.category || 'other').toLowerCase()]
          )
          added++
        }
        return NextResponse.json({ success: true, added, skipped })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Shopping list POST error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
