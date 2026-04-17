import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    // D98: Get recipe from meal_library (with ingredients + directions)
    if (action === 'get_meal_recipe') {
      const mealId = searchParams.get('meal_id')
      if (!mealId) return NextResponse.json({ error: 'meal_id required' }, { status: 400 })
      const rows = await db.query(
        `SELECT id, name, theme, sides, description, servings_default, prep_time_min, cook_time_min,
                difficulty, ingredients, directions, tips, image_url
           FROM meal_library WHERE id = $1`, [mealId]
      ).catch(() => [])
      if (!rows[0]) return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
      const subOptions = await db.query(
        `SELECT id, label, ingredients_add FROM meal_sub_options WHERE meal_id = $1`, [mealId]
      ).catch(() => [])
      return NextResponse.json({ recipe: rows[0], sub_options: subOptions })
    }

    if (action === 'get_session') {
      const kidName = searchParams.get('kid_name')?.toLowerCase()
      const mealId = searchParams.get('meal_id')
      if (!kidName || !mealId) return NextResponse.json({ error: 'kid_name + meal_id required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM meal_cooking_sessions WHERE kid_name = $1 AND meal_id::text = $2 AND completed_at IS NULL ORDER BY created_at DESC LIMIT 1`,
        [kidName, mealId]
      ).catch(() => [])
      return NextResponse.json({ session: rows[0] || null })
    }

    if (action === 'cook_history') {
      const kidName = searchParams.get('kid_name')?.toLowerCase()
      const rows = await db.query(
        `SELECT mcs.*, ml.name AS meal_name FROM meal_cooking_sessions mcs
           LEFT JOIN meal_library ml ON ml.id::text = mcs.meal_id::text
          WHERE mcs.kid_name = $1 AND mcs.completed_at IS NOT NULL
          ORDER BY mcs.completed_at DESC LIMIT 20`,
        [kidName || '']
      ).catch(() => [])
      return NextResponse.json({ history: rows })
    }

    // Legacy: get recipe by ID from recipes table
    if (!id) {
      return NextResponse.json({ error: 'id or action required' }, { status: 400 })
    }
    const rows = await db.query('SELECT * FROM recipes WHERE id = $1', [id])
    if (rows.length === 0) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // D98: Cooking session management
    if (action === 'start_cooking') {
      const { kid_name, meal_id, servings_multiplier, sub_option_id } = body
      if (!kid_name || !meal_id) return NextResponse.json({ error: 'kid_name + meal_id required' }, { status: 400 })
      const rows = await db.query(
        `INSERT INTO meal_cooking_sessions (kid_name, meal_id, servings_multiplier, sub_option_id, started_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [kid_name.toLowerCase(), meal_id, servings_multiplier || 1.0, sub_option_id || null]
      )
      return NextResponse.json({ session: rows[0] }, { status: 201 })
    }

    if (action === 'update_progress') {
      const { session_id, ingredient_checks, step_checks } = body
      if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })
      const sets: string[] = []
      const params: any[] = [session_id]
      if (ingredient_checks) { params.push(JSON.stringify(ingredient_checks)); sets.push(`ingredient_checks = $${params.length}`) }
      if (step_checks) { params.push(JSON.stringify(step_checks)); sets.push(`step_checks = $${params.length}`) }
      if (sets.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
      await db.query(`UPDATE meal_cooking_sessions SET ${sets.join(', ')} WHERE id = $1`, params)
      return NextResponse.json({ success: true })
    }

    if (action === 'complete_cooking') {
      const { session_id, rating } = body
      if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })
      const session = await db.query(`SELECT * FROM meal_cooking_sessions WHERE id = $1`, [session_id])
      if (!session[0]) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      const meal = await db.query(`SELECT name, difficulty FROM meal_library WHERE id::text = $1`, [String(session[0].meal_id)]).catch(() => [])
      const stars = meal[0]?.difficulty === 'chef' ? 5 : meal[0]?.difficulty === 'medium' ? 4 : 3
      await db.query(`UPDATE meal_cooking_sessions SET completed_at = NOW(), stars_awarded = $2, rating = $3 WHERE id = $1`, [session_id, stars, rating || null])
      const kid = session[0].kid_name
      await db.query(`UPDATE digi_pets SET stars_balance = stars_balance + $1 WHERE kid_name = $2`, [stars, kid]).catch(() => {})
      await db.query(`INSERT INTO digi_pet_star_log (kid_name, amount, source, note) VALUES ($1, $2, 'cooking', $3)`, [kid, stars, `Cooked ${meal[0]?.name || 'a meal'}`]).catch(() => {})
      await createNotification({
        title: `🍳 ${cap(kid)} finished cooking!`,
        message: `${meal[0]?.name || 'Dinner'} is ready! +${stars} stars`,
        source_type: 'cooking_complete', icon: '🍳', link_tab: 'food-inventory',
      }).catch(() => {})
      return NextResponse.json({ success: true, stars })
    }

    // Legacy recipe save
    const { title, ingredients, steps, plan_date, notes } = body

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
