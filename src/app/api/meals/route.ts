import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { parseRecipeText, fetchRecipeUrl, parseCsvBatch, extractRecipeFromFrames, ParsedRecipe } from '@/lib/recipeImport'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'list_all') {
      const theme = searchParams.get('theme')
      const includeInactive = searchParams.get('include_inactive') === 'true'

      let q = 'SELECT id, name, theme, season, description, sides, sides_starch_options, sides_veggie_options, notes, active, created_at FROM meal_library'
      const params: any[] = []
      const where: string[] = []

      if (theme) { params.push(theme); where.push(`theme = $${params.length}`) }
      if (!includeInactive) { where.push('active = true') }

      if (where.length > 0) q += ' WHERE ' + where.join(' AND ')
      q += ' ORDER BY theme, name'

      const rows = await db.query(q, params)
      return NextResponse.json({ meals: rows })
    }

    if (action === 'get_themes') {
      const rows = await db.query(
        `SELECT theme, COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE active = true)::int as active_count
         FROM meal_library GROUP BY theme ORDER BY theme`
      )
      return NextResponse.json({ themes: rows })
    }

    if (action === 'get_sub_options') {
      const mealId = searchParams.get('meal_id')
      if (!mealId) return NextResponse.json({ error: 'meal_id required' }, { status: 400 })
      const includeInactive = searchParams.get('include_inactive') === 'true'
      const activeFilter = includeInactive ? '' : ' AND active = true'
      const rows = await db.query(
        `SELECT id, label, category, heat_level, display_type, is_favorite, active, sort_order
         FROM meal_sub_options WHERE meal_id = $1${activeFilter} ORDER BY sort_order`,
        [mealId]
      )
      return NextResponse.json({ options: rows })
    }

    if (action === 'get_ingredients') {
      const mealId = searchParams.get('meal_id')
      if (!mealId) return NextResponse.json({ error: 'meal_id required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM meal_ingredients WHERE meal_id = $1 ORDER BY department, name`,
        [mealId]
      )
      return NextResponse.json({ ingredients: rows })
    }

    if (action === 'get_recipe') {
      const mealId = searchParams.get('meal_id')
      if (!mealId) return NextResponse.json({ error: 'meal_id required' }, { status: 400 })
      const mealRows = await db.query(
        `SELECT id, name, theme, description, prep_time_min, cook_time_min, servings, source,
                recipe_steps, sides, notes, difficulty, tips,
                kid_friendly_directions, adult_directions
         FROM meal_library WHERE id = $1`,
        [mealId]
      )
      if (mealRows.length === 0) return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
      const ingredients = await db.query(
        `SELECT id, name, quantity, unit, department, preferred_store, notes
         FROM meal_ingredients WHERE meal_id = $1 ORDER BY department, name`,
        [mealId]
      )
      return NextResponse.json({ meal: mealRows[0], ingredients })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Meals GET error:', error)
    return NextResponse.json({ error: 'Failed to load meals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'upsert': {
        const { id, name, theme, season, description, sides, sides_starch_options, sides_veggie_options, notes, active } = body
        if (!name || !theme || !season) {
          return NextResponse.json({ error: 'name, theme, and season required' }, { status: 400 })
        }
        const dbSeason = season === 'both' ? 'year-round' : season

        if (id) {
          const rows = await db.query(
            `UPDATE meal_library SET name=$1, theme=$2, season=$3, description=$4, sides=$5, notes=$6, active=COALESCE($7, active),
             sides_starch_options=$9, sides_veggie_options=$10
             WHERE id=$8 RETURNING *`,
            [name, theme, dbSeason, description || null, sides || null, notes || null, active ?? null, id,
             sides_starch_options || null, sides_veggie_options || null]
          )
          return NextResponse.json({ meal: rows[0] })
        } else {
          const rows = await db.query(
            `INSERT INTO meal_library (name, theme, season, description, sides, notes, active, sides_starch_options, sides_veggie_options)
             VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, true), $8, $9) RETURNING *`,
            [name, theme, dbSeason, description || null, sides || null, notes || null, active ?? true,
             sides_starch_options || null, sides_veggie_options || null]
          )
          return NextResponse.json({ meal: rows[0] })
        }
      }

      case 'toggle_active': {
        const { id, active } = body
        if (!id || active === undefined) return NextResponse.json({ error: 'id and active required' }, { status: 400 })
        await db.query('UPDATE meal_library SET active = $1 WHERE id = $2', [active, id])
        return NextResponse.json({ id, active })
      }

      case 'move_theme': {
        const { id, theme } = body
        if (!id || !theme) return NextResponse.json({ error: 'id and theme required' }, { status: 400 })
        await db.query('UPDATE meal_library SET theme = $1 WHERE id = $2', [theme, id])
        return NextResponse.json({ id, theme })
      }

      case 'bulk_add': {
        const { theme, season, meals } = body
        if (!theme || !season || !Array.isArray(meals) || meals.length === 0) {
          return NextResponse.json({ error: 'theme, season, and meals array required' }, { status: 400 })
        }
        const dbSeason = season === 'both' ? 'year-round' : season
        const inserted: any[] = []
        for (const m of meals) {
          if (!m.name?.trim()) continue
          const rows = await db.query(
            `INSERT INTO meal_library (name, theme, season, sides, description) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [m.name.trim(), theme, dbSeason, m.sides || null, m.description || null]
          )
          if (rows[0]) inserted.push(rows[0])
        }
        return NextResponse.json({ inserted: inserted.length, meals: inserted })
      }

      case 'sub_option_upsert': {
        const { id, meal_id, label, category, heat_level, display_type, is_favorite, sort_order, active } = body
        if (!label || !meal_id) return NextResponse.json({ error: 'label and meal_id required' }, { status: 400 })

        if (id) {
          const rows = await db.query(
            `UPDATE meal_sub_options SET label=$1, category=$2, heat_level=$3, display_type=$4, is_favorite=COALESCE($5,is_favorite), sort_order=COALESCE($6,sort_order), active=COALESCE($7,active)
             WHERE id=$8 RETURNING *`,
            [label, category || null, heat_level || null, display_type || 'show-all', is_favorite ?? null, sort_order ?? null, active ?? null, id]
          )
          return NextResponse.json({ sub_option: rows[0] })
        } else {
          // Get next sort_order
          const maxSort = await db.query(
            'SELECT COALESCE(MAX(sort_order), 0)::int + 1 as next FROM meal_sub_options WHERE meal_id = $1',
            [meal_id]
          )
          const rows = await db.query(
            `INSERT INTO meal_sub_options (meal_id, label, category, heat_level, display_type, is_favorite, sort_order, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true)) RETURNING *`,
            [meal_id, label, category || null, heat_level || null, display_type || 'show-all', is_favorite || false, sort_order ?? maxSort[0]?.next ?? 0, active ?? true]
          )
          return NextResponse.json({ sub_option: rows[0] })
        }
      }

      case 'sub_option_toggle_favorite': {
        const { id, is_favorite } = body
        if (!id || is_favorite === undefined) return NextResponse.json({ error: 'id and is_favorite required' }, { status: 400 })
        await db.query('UPDATE meal_sub_options SET is_favorite = $1 WHERE id = $2', [is_favorite, id])
        return NextResponse.json({ id, is_favorite })
      }

      case 'sub_option_toggle_active': {
        const { id, active } = body
        if (!id || active === undefined) return NextResponse.json({ error: 'id and active required' }, { status: 400 })
        await db.query('UPDATE meal_sub_options SET active = $1 WHERE id = $2', [active, id])
        return NextResponse.json({ id, active })
      }

      case 'add_ingredient': {
        const { meal_id, name, quantity, unit, department, preferred_store, notes } = body
        if (!meal_id || !name) return NextResponse.json({ error: 'meal_id and name required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO meal_ingredients (meal_id, name, quantity, unit, department, preferred_store, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [meal_id, name.trim(), quantity || null, unit || null, department || 'Other', preferred_store || 'either', notes || null]
        )
        return NextResponse.json({ ingredient: rows[0] })
      }

      case 'update_ingredient': {
        const { id, name, quantity, unit, department, preferred_store, notes } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE meal_ingredients SET name=COALESCE($1,name), quantity=$2, unit=$3, department=COALESCE($4,department),
           preferred_store=COALESCE($5,preferred_store), notes=$6, updated_at=NOW()
           WHERE id=$7 RETURNING *`,
          [name?.trim() || null, quantity || null, unit || null, department || null, preferred_store || null, notes || null, id]
        )
        return NextResponse.json({ ingredient: rows[0] })
      }

      case 'delete_ingredient': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query('DELETE FROM meal_ingredients WHERE id = $1', [id])
        return NextResponse.json({ success: true })
      }

      case 'parse_recipe_text': {
        const { text } = body
        if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })
        const parsed = parseRecipeText(text)
        return NextResponse.json({ recipe: parsed })
      }

      case 'fetch_recipe_url': {
        const { url } = body
        if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
        try {
          new URL(url)
        } catch {
          return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
        }
        const { recipe, error: fetchErr } = await fetchRecipeUrl(url)
        if (fetchErr) {
          return NextResponse.json({ recipe, error: fetchErr }, { status: 200 })
        }
        return NextResponse.json({ recipe })
      }

      case 'extract_from_video': {
        const { frames, source } = body as { frames: string[]; source?: string }
        if (!Array.isArray(frames) || frames.length === 0) {
          return NextResponse.json({ error: 'frames array required' }, { status: 400 })
        }
        if (frames.length > 8) {
          return NextResponse.json({ error: 'Max 8 frames per request' }, { status: 400 })
        }
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return NextResponse.json({
            error: 'Video import needs ANTHROPIC_API_KEY set in the server environment.',
          }, { status: 500 })
        }
        try {
          const result = await extractRecipeFromFrames(apiKey, frames, source)
          if (!result.recipe.name && result.recipe.ingredients.length === 0 && result.recipe.steps.length === 0) {
            return NextResponse.json({
              error: "Couldn't find any recipe content in the video. Try a reel with on-screen ingredient text or a clear title card.",
            }, { status: 200 })
          }
          return NextResponse.json(result)
        } catch (e: any) {
          console.error('extract_from_video failed:', e)
          return NextResponse.json({
            error: e?.message || 'Video extraction failed — try uploading a shorter clip.',
          }, { status: 500 })
        }
      }

      case 'import_recipe_csv': {
        const { csv } = body
        if (!csv) return NextResponse.json({ error: 'csv required' }, { status: 400 })
        const batch = parseCsvBatch(csv)
        // Match each meal_name to existing meal_library entries
        const allMeals = await db.query(`SELECT id, name, theme FROM meal_library WHERE active = true`)
        const matched = batch.map(entry => {
          const lower = entry.meal_name.toLowerCase().trim()
          const exact = allMeals.find((m: any) => m.name.toLowerCase().trim() === lower)
          const partial = exact || allMeals.find((m: any) =>
            m.name.toLowerCase().includes(lower) || lower.includes(m.name.toLowerCase())
          )
          return {
            meal_name: entry.meal_name,
            matched_meal_id: partial?.id || null,
            matched_meal_name: partial?.name || null,
            recipe: entry.recipe,
          }
        })
        return NextResponse.json({ matches: matched, all_meals: allMeals })
      }

      case 'save_imported_recipe': {
        const { meal_id, recipe } = body as { meal_id: string; recipe: ParsedRecipe }
        if (!meal_id || !recipe) return NextResponse.json({ error: 'meal_id and recipe required' }, { status: 400 })

        const steps = (recipe.steps || [])
          .filter(s => s.text?.trim())
          .map((s, i) => ({ order: i + 1, text: s.text.trim(), group: s.group || 'cook' }))

        await db.query(
          `UPDATE meal_library
              SET recipe_steps = $1::jsonb,
                  prep_time_min = COALESCE($2, prep_time_min),
                  cook_time_min = COALESCE($3, cook_time_min),
                  servings = COALESCE($4, servings),
                  source = COALESCE($5, source)
            WHERE id = $6`,
          [JSON.stringify(steps), recipe.prep_time_min ?? null, recipe.cook_time_min ?? null, recipe.servings ?? null, recipe.source || null, meal_id]
        )

        // Replace ingredients entirely
        await db.query(`DELETE FROM meal_ingredients WHERE meal_id = $1`, [meal_id])
        for (const ing of (recipe.ingredients || [])) {
          if (!ing.name?.trim()) continue
          await db.query(
            `INSERT INTO meal_ingredients (meal_id, name, quantity, unit, department, preferred_store, notes)
             VALUES ($1, $2, $3, $4, $5, 'either', $6)`,
            [meal_id, ing.name.trim(), ing.quantity ?? null, ing.unit || null, ing.department || 'Other', ing.notes || null]
          )
        }
        return NextResponse.json({ success: true, meal_id })
      }

      case 'save_imported_batch': {
        const { items } = body as { items: Array<{ meal_id: string; recipe: ParsedRecipe }> }
        if (!Array.isArray(items) || items.length === 0) {
          return NextResponse.json({ error: 'items array required' }, { status: 400 })
        }
        let saved = 0
        for (const item of items) {
          if (!item.meal_id || !item.recipe) continue
          const steps = (item.recipe.steps || [])
            .filter(s => s.text?.trim())
            .map((s, i) => ({ order: i + 1, text: s.text.trim(), group: s.group || 'cook' }))
          await db.query(
            `UPDATE meal_library
                SET recipe_steps = $1::jsonb,
                    prep_time_min = COALESCE($2, prep_time_min),
                    cook_time_min = COALESCE($3, cook_time_min),
                    servings = COALESCE($4, servings),
                    source = COALESCE($5, source)
              WHERE id = $6`,
            [JSON.stringify(steps), item.recipe.prep_time_min ?? null, item.recipe.cook_time_min ?? null, item.recipe.servings ?? null, item.recipe.source || null, item.meal_id]
          )
          await db.query(`DELETE FROM meal_ingredients WHERE meal_id = $1`, [item.meal_id])
          for (const ing of (item.recipe.ingredients || [])) {
            if (!ing.name?.trim()) continue
            await db.query(
              `INSERT INTO meal_ingredients (meal_id, name, quantity, unit, department, preferred_store, notes)
               VALUES ($1, $2, $3, $4, $5, 'either', $6)`,
              [item.meal_id, ing.name.trim(), ing.quantity ?? null, ing.unit || null, ing.department || 'Other', ing.notes || null]
            )
          }
          saved++
        }
        return NextResponse.json({ success: true, saved })
      }

      case 'update_recipe': {
        const { meal_id, recipe_steps, prep_time_min, cook_time_min, servings, source } = body
        if (!meal_id) return NextResponse.json({ error: 'meal_id required' }, { status: 400 })
        const steps = Array.isArray(recipe_steps) ? recipe_steps : []
        const rows = await db.query(
          `UPDATE meal_library
             SET recipe_steps = $1::jsonb,
                 prep_time_min = $2,
                 cook_time_min = $3,
                 servings = COALESCE($4, servings),
                 source = $5
           WHERE id = $6
           RETURNING id, recipe_steps, prep_time_min, cook_time_min, servings, source`,
          [JSON.stringify(steps), prep_time_min ?? null, cook_time_min ?? null, servings ?? null, source || null, meal_id]
        )
        if (rows.length === 0) return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
        return NextResponse.json({ meal: rows[0] })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Meals POST error:', error)
    return NextResponse.json({ error: 'Failed to process meal action' }, { status: 500 })
  }
}
