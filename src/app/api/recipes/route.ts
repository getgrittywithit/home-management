import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id query param required' }, { status: 400 })
    }

    const rows = await db.query('SELECT * FROM recipes WHERE id = $1', [id])
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, ingredients, steps, plan_date, notes } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 })
    }

    // Check if this meal already has a recipe
    let existingRecipeId = null
    if (plan_date) {
      try {
        const existing = await db.query('SELECT recipe_id FROM meal_plans WHERE date = $1 LIMIT 1', [plan_date])
        existingRecipeId = existing[0]?.recipe_id
      } catch { /* silent */ }
    }

    let recipeId: number

    if (existingRecipeId) {
      await db.query(
        `UPDATE recipes SET title = $1, ingredients = $2, steps = $3, notes = $4, updated_at = NOW() WHERE id = $5`,
        [title, JSON.stringify(ingredients || []), JSON.stringify(steps || []), notes || null, existingRecipeId]
      )
      recipeId = existingRecipeId
    } else {
      const result = await db.query(
        `INSERT INTO recipes (title, ingredients, steps, notes) VALUES ($1, $2, $3, $4) RETURNING id`,
        [title, JSON.stringify(ingredients || []), JSON.stringify(steps || []), notes || null]
      )
      recipeId = result[0].id

      if (plan_date) {
        await db.query(`UPDATE meal_plans SET recipe_id = $1, updated_at = NOW() WHERE date = $2`, [recipeId, plan_date])
      }
    }

    return NextResponse.json({ success: true, recipe_id: recipeId })
  } catch (error) {
    console.error('Error saving recipe:', error)
    return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 })
  }
}
