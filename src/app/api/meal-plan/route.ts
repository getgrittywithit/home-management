import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end query params required' }, { status: 400 })
    }

    const rows = await db.query(
      `SELECT id, date, meal_type, dish_name, ingredients, servings, notes, recipe_id
       FROM meal_plans WHERE date >= $1 AND date <= $2 ORDER BY date`,
      [start, end]
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching meal plan:', error)
    return NextResponse.json({ error: 'Failed to fetch meal plan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, date, meal_type, dish_name, ingredients, servings, notes } = body

    // Action-based routing
    if (action === 'get_week_plan') {
      const weekOffset = body.week_offset || 0
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const startDate = new Date(today + 'T12:00:00')
      startDate.setDate(startDate.getDate() - startDate.getDay() + 1 + (weekOffset * 7))
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      const start = startDate.toLocaleDateString('en-CA')
      const end = endDate.toLocaleDateString('en-CA')
      const rows = await db.query(
        `SELECT id, date, meal_type, dish_name, ingredients, servings, notes, recipe_id FROM meal_plans WHERE date >= $1 AND date <= $2 ORDER BY date`,
        [start, end]
      )
      return NextResponse.json({ plans: rows, start, end, week_offset: weekOffset })
    }

    // Default: upsert meal plan entry
    if (!date || !dish_name) {
      return NextResponse.json({ error: 'date and dish_name required' }, { status: 400 })
    }

    await db.query(
      `INSERT INTO meal_plans (date, meal_type, dish_name, ingredients, servings, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (date, meal_type) DO UPDATE SET dish_name = $3, ingredients = $4, servings = $5, notes = $6, updated_at = NOW()`,
      [date, meal_type || 'dinner', dish_name, ingredients || null, servings || null, notes || null]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving meal plan:', error)
    return NextResponse.json({ error: 'Failed to save meal plan' }, { status: 500 })
  }
}
