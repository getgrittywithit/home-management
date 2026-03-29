import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'list_all') {
      const theme = searchParams.get('theme')
      const includeInactive = searchParams.get('include_inactive') === 'true'

      let q = 'SELECT id, name, theme, season, description, sides, notes, active, created_at FROM meal_library'
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
        const { id, name, theme, season, description, sides, notes, active } = body
        if (!name || !theme || !season) {
          return NextResponse.json({ error: 'name, theme, and season required' }, { status: 400 })
        }
        const dbSeason = season === 'both' ? 'year-round' : season

        if (id) {
          const rows = await db.query(
            `UPDATE meal_library SET name=$1, theme=$2, season=$3, description=$4, sides=$5, notes=$6, active=COALESCE($7, active)
             WHERE id=$8 RETURNING *`,
            [name, theme, dbSeason, description || null, sides || null, notes || null, active ?? null, id]
          )
          return NextResponse.json({ meal: rows[0] })
        } else {
          const rows = await db.query(
            `INSERT INTO meal_library (name, theme, season, description, sides, notes, active)
             VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, true)) RETURNING *`,
            [name, theme, dbSeason, description || null, sides || null, notes || null, active ?? true]
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

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Meals POST error:', error)
    return NextResponse.json({ error: 'Failed to process meal action' }, { status: 500 })
  }
}
