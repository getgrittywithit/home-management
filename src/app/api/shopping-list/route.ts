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
        // Get this week's meal plans with linked recipes
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const d = new Date(today + 'T12:00:00')
        const dow = d.getDay()
        const monday = new Date(d)
        monday.setDate(d.getDate() - ((dow + 6) % 7))
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        const weekStart = monday.toLocaleDateString('en-CA')
        const weekEnd = sunday.toLocaleDateString('en-CA')

        const meals = await db.query(
          `SELECT m.dish_name, m.ingredients, r.ingredients as recipe_ingredients
           FROM meal_plans m LEFT JOIN recipes r ON m.recipe_id = r.id
           WHERE m.date >= $1 AND m.date <= $2`,
          [weekStart, weekEnd]
        )

        const itemSet = new Set<string>()
        const items: { name: string; category: string }[] = []

        for (const meal of meals) {
          // From recipe ingredients (JSONB array)
          if (meal.recipe_ingredients) {
            try {
              const parsed = typeof meal.recipe_ingredients === 'string' ? JSON.parse(meal.recipe_ingredients) : meal.recipe_ingredients
              for (const ing of parsed) {
                const name = ing.item || ing.name || String(ing)
                if (name && !itemSet.has(name.toLowerCase())) {
                  itemSet.add(name.toLowerCase())
                  items.push({ name, category: 'other' })
                }
              }
            } catch { /* skip */ }
          }
          // From meal plan ingredients array
          if (meal.ingredients && Array.isArray(meal.ingredients)) {
            for (const ing of meal.ingredients) {
              if (ing && !itemSet.has(String(ing).toLowerCase())) {
                itemSet.add(String(ing).toLowerCase())
                items.push({ name: String(ing), category: 'other' })
              }
            }
          }
        }

        // Bulk insert
        for (const item of items) {
          await db.query(
            `INSERT INTO shopping_list (item_name, category, source) VALUES ($1, $2, 'meal_plan')`,
            [item.name, item.category]
          )
        }

        return NextResponse.json({ success: true, added: items.length })
      }

      case 'add_low_supply': {
        // Add all low-supply inventory items to shopping list
        const low = await db.query(
          `SELECT name, unit FROM food_inventory WHERE min_quantity IS NOT NULL AND quantity <= min_quantity`
        )
        let added = 0
        for (const item of low) {
          await db.query(
            `INSERT INTO shopping_list (item_name, quantity, category, source) VALUES ($1, $2, 'other', 'manual')`,
            [item.name, item.unit || null]
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
