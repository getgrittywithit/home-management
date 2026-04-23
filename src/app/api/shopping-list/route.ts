import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

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
        const d = new Date(today + 'T12:00:00')
        const dow = d.getDay()
        const monday = new Date(d)
        monday.setDate(d.getDate() - ((dow + 6) % 7))
        const weekStart = monday.toLocaleDateString('en-CA')

        // Pull planned meals + their ingredients (normalized OR jsonb fallback)
        const meals = await db.query(
          `SELECT DISTINCT mwp.meal_id, ml.name AS meal_name, ml.ingredients AS jsonb_ingredients
           FROM meal_week_plan mwp
           JOIN meal_library ml ON mwp.meal_id = ml.id
           WHERE mwp.week_start = $1 AND mwp.meal_id IS NOT NULL`,
          [weekStart]
        )

        const itemSet = new Set<string>()
        const items: { name: string; category: string; quantity: string | null }[] = []

        for (const meal of meals) {
          // Try normalized meal_ingredients first
          let ings: any[] = []
          try {
            ings = await db.query(
              `SELECT name, quantity, unit, department FROM meal_ingredients WHERE meal_id = $1`,
              [meal.meal_id]
            )
          } catch {}

          // Fallback to meal_library.ingredients jsonb
          if (ings.length === 0 && meal.jsonb_ingredients) {
            const parsed = Array.isArray(meal.jsonb_ingredients) ? meal.jsonb_ingredients : []
            ings = parsed.filter((i: any) => i.name?.trim()).map((i: any) => ({
              name: i.name, quantity: i.quantity, unit: i.unit, department: i.department || 'Other',
            }))
          }

          for (const ing of ings) {
            const name = (ing.name || '').trim()
            if (!name) continue
            const key = name.toLowerCase()
            if (itemSet.has(key)) continue
            itemSet.add(key)
            const qtyStr = ing.quantity && ing.unit
              ? `${ing.quantity} ${ing.unit}`
              : ing.quantity ? String(ing.quantity) : null
            items.push({
              name,
              category: (ing.department || 'other').toLowerCase(),
              quantity: qtyStr,
            })
          }
        }

        // Clear old meal_plan-generated items before inserting fresh
        await db.query(`DELETE FROM shopping_list WHERE source = 'meal_plan'`)

        // Bulk insert
        for (const item of items) {
          await db.query(
            `INSERT INTO shopping_list (item_name, quantity, category, source) VALUES ($1, $2, $3, 'meal_plan')`,
            [item.name, item.quantity, item.category]
          )
        }

        return NextResponse.json({ success: true, added: items.length, meal_count: meals.length })
      }

      case 'add_low_supply': {
        // Add low-supply items from inventory_items (the live source)
        const low = await db.query(
          `SELECT name, unit, category FROM inventory_items
           WHERE par_level IS NOT NULL AND current_stock <= par_level`
        ).catch(() => [])
        let added = 0
        for (const item of low) {
          const exists = await db.query(
            `SELECT 1 FROM shopping_list WHERE LOWER(item_name) = LOWER($1) AND checked = FALSE LIMIT 1`,
            [item.name]
          ).catch(() => [])
          if (exists.length > 0) continue // don't double-add
          await db.query(
            `INSERT INTO shopping_list (item_name, category, source) VALUES ($1, $2, 'low_supply')`,
            [item.name, (item.category || 'other').toLowerCase()]
          )
          added++
        }
        return NextResponse.json({ success: true, added })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Shopping list POST error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
