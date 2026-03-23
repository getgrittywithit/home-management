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
    const { title, ingredients, steps, plan_date } = await request.json()

    if (!title || !plan_date) {
      return NextResponse.json({ error: 'title and plan_date required' }, { status: 400 })
    }

    // Check if this meal already has a recipe
    const existing = await db.query(
      'SELECT recipe_id FROM meal_plan WHERE plan_date = $1',
      [plan_date]
    )

    const existingRecipeId = existing[0]?.recipe_id

    let recipeId: string

    if (existingRecipeId) {
      // Update existing recipe
      await db.query(
        `UPDATE recipes SET title = $1, ingredients = $2, steps = $3, updated_at = NOW() WHERE id = $4`,
        [title, JSON.stringify(ingredients || []), JSON.stringify(steps || []), existingRecipeId]
      )
      recipeId = existingRecipeId
    } else {
      // Create new recipe
      const result = await db.query(
        `INSERT INTO recipes (title, ingredients, steps) VALUES ($1, $2, $3) RETURNING id`,
        [title, JSON.stringify(ingredients || []), JSON.stringify(steps || [])]
      )
      recipeId = result[0].id

      // Link to meal_plan
      await db.query(
        `UPDATE meal_plan SET recipe_id = $1, updated_at = NOW() WHERE plan_date = $2`,
        [recipeId, plan_date]
      )
    }

    return NextResponse.json({ success: true, recipe_id: recipeId })
  } catch (error) {
    console.error('Error saving recipe:', error)
    return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 })
  }
}
