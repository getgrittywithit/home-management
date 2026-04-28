import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

/* ────────────────────────────────────────────
   GET  /api/stock?action=...
   ──────────────────────────────────────────── */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // ── Get all stock locations ──
    if (action === 'get_locations') {
      try {
        const rows = await db.query(
          `SELECT * FROM stock_locations ORDER BY sort_order, name`
        )
        return NextResponse.json({ locations: rows })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ locations: [] })
        }
        throw err
      }
    }

    // ── Par Level Board ──
    if (action === 'get_par_board') {
      const department = searchParams.get('department')

      try {
        // 1. Get all stock locations
        const locations = await db.query(
          `SELECT id, name, type FROM stock_locations ORDER BY sort_order, name`
        )

        // 2. Get pantry_stock items that have at least one par level set
        //    OR are in the requested department
        let itemsQuery: string
        let itemsParams: any[]

        if (department) {
          itemsQuery = `
            SELECT DISTINCT ps.id, ps.name, ps.department, ps.preferred_store, ps.unit
            FROM pantry_stock ps
            LEFT JOIN stock_par_levels spl ON spl.stock_item_id = ps.id
            WHERE ps.active = true
              AND (ps.department = $1 OR spl.id IS NOT NULL)
            ORDER BY ps.department, ps.name`
          itemsParams = [department]
        } else {
          itemsQuery = `
            SELECT DISTINCT ps.id, ps.name, ps.department, ps.preferred_store, ps.unit
            FROM pantry_stock ps
            JOIN stock_par_levels spl ON spl.stock_item_id = ps.id
            WHERE ps.active = true
            ORDER BY ps.department, ps.name`
          itemsParams = []
        }

        const stockItems = await db.query(itemsQuery, itemsParams)

        if (stockItems.length === 0) {
          return NextResponse.json({ locations, items: [] })
        }

        // 3. Get all par levels for these items
        const itemIds = stockItems.map((i: any) => i.id)
        const placeholders = itemIds.map((_: any, i: number) => `$${i + 1}`).join(',')

        const parLevels = await db.query(
          `SELECT stock_item_id, location_id, required_quantity, unit
           FROM stock_par_levels
           WHERE stock_item_id IN (${placeholders})`,
          itemIds
        )

        // 4. Get all current quantities for these items
        const quantities = await db.query(
          `SELECT stock_item_id, location_id, current_quantity
           FROM stock_location_quantities
           WHERE stock_item_id IN (${placeholders})`,
          itemIds
        )

        // Build lookup maps
        const parMap = new Map<string, Map<string, number>>()
        for (const pl of parLevels) {
          if (!parMap.has(pl.stock_item_id)) parMap.set(pl.stock_item_id, new Map())
          parMap.get(pl.stock_item_id)!.set(pl.location_id, parseFloat(pl.required_quantity) || 0)
        }

        const qtyMap = new Map<string, Map<string, number>>()
        for (const q of quantities) {
          if (!qtyMap.has(q.stock_item_id)) qtyMap.set(q.stock_item_id, new Map())
          qtyMap.get(q.stock_item_id)!.set(q.location_id, parseFloat(q.current_quantity) || 0)
        }

        // 5. Build result items
        const items = stockItems.map((item: any) => {
          const itemPar = parMap.get(item.id) || new Map()
          const itemQty = qtyMap.get(item.id) || new Map()

          const cells: Record<string, { item_id: string; location_id: string; par_level: number; current_qty: number }> = {}
          let totalPar = 0
          let totalHave = 0

          for (const loc of locations) {
            const req = itemPar.get(loc.id) || 0
            const cur = itemQty.get(loc.id) || 0
            if (req > 0 || cur > 0) {
              cells[loc.id] = { item_id: item.id, location_id: loc.id, par_level: req, current_qty: cur }
            }
            totalPar += req
            totalHave += cur
          }

          return {
            id: item.id,
            name: item.name,
            department: item.department,
            preferred_store: item.preferred_store,
            unit: item.unit ?? null,
            cells,
            total_par: totalPar,
            total_have: totalHave,
            shortfall: Math.max(0, totalPar - totalHave),
          }
        })

        return NextResponse.json({ locations, items })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ locations: [], items: [] })
        }
        throw err
      }
    }

    // ── Pantry items by department ──
    if (action === 'get_pantry_by_department') {
      const department = searchParams.get('department')
      if (!department) return NextResponse.json({ error: 'department required' }, { status: 400 })

      try {
        const rows = await db.query(
          `SELECT * FROM pantry_stock WHERE active = true AND department = $1 ORDER BY name`,
          [department]
        )
        return NextResponse.json({ items: rows })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ items: [] })
        }
        throw err
      }
    }

    // ── Get all scratch recipes (with ingredient counts) ──
    if (action === 'get_scratch_recipes') {
      try {
        const rows = await db.query(
          `SELECT sr.*,
                  COUNT(sri.id)::int as ingredient_count
           FROM scratch_recipes sr
           LEFT JOIN scratch_recipe_ingredients sri ON sri.recipe_id = sr.id
           GROUP BY sr.id
           ORDER BY sr.category, sr.name`
        )
        return NextResponse.json({ recipes: rows })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ recipes: [] })
        }
        throw err
      }
    }

    // ── Get single scratch recipe with ingredients ──
    if (action === 'get_scratch_recipe') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

      try {
        const recipeRows = await db.query(
          `SELECT * FROM scratch_recipes WHERE id = $1`,
          [id]
        )
        if (recipeRows.length === 0) {
          return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
        }

        const ingredients = await db.query(
          `SELECT * FROM scratch_recipe_ingredients WHERE recipe_id = $1 ORDER BY sort_order, name`,
          [id]
        )

        return NextResponse.json({ recipe: recipeRows[0], ingredients })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ recipe: null, ingredients: [] })
        }
        throw err
      }
    }

    // ── Check scratch readiness (ingredient availability) ──
    if (action === 'check_scratch_readiness') {
      try {
        const recipes = await db.query(
          `SELECT sr.id, sr.name, sr.category, sr.yield_amount, sr.yield_unit
           FROM scratch_recipes sr ORDER BY sr.category, sr.name`
        )

        const result = []
        for (const recipe of recipes) {
          const ingredients = await db.query(
            `SELECT sri.name, sri.quantity, sri.unit,
                    ps.id as pantry_id, ps.quantity as pantry_qty,
                    COALESCE(ps.low_stock_threshold, 0) as threshold
             FROM scratch_recipe_ingredients sri
             LEFT JOIN pantry_stock ps
               ON LOWER(ps.name) = LOWER(sri.name) AND ps.active = true
             WHERE sri.recipe_id = $1`,
            [recipe.id]
          )

          const totalIngredients = ingredients.length
          let inStock = 0
          const missing: string[] = []

          for (const ing of ingredients) {
            if (ing.pantry_id && parseFloat(ing.pantry_qty) > parseFloat(ing.threshold)) {
              inStock++
            } else {
              missing.push(ing.name)
            }
          }

          const readinessPct = totalIngredients > 0
            ? Math.round((inStock / totalIngredients) * 100)
            : 0

          result.push({
            id: recipe.id,
            name: recipe.name,
            category: recipe.category,
            yield: recipe.yield_amount ? `${recipe.yield_amount} ${recipe.yield_unit || ''}`.trim() : null,
            total_ingredients: totalIngredients,
            in_stock: inStock,
            readiness_pct: readinessPct,
            missing,
          })
        }

        return NextResponse.json({ recipes: result })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ recipes: [] })
        }
        throw err
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Stock GET error:', error)
    return NextResponse.json({ error: 'Failed to load stock data' }, { status: 500 })
  }
}

/* ────────────────────────────────────────────
   POST  /api/stock
   ──────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      // ── Add stock location ──
      case 'add_location': {
        const { name, type, sort_order } = body
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
        try {
          const rows = await db.query(
            `INSERT INTO stock_locations (name, type, sort_order)
             VALUES ($1, $2, $3) RETURNING *`,
            [name.trim(), type || 'other', sort_order ?? 0]
          )
          return NextResponse.json({ location: rows[0] })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'stock_locations table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      // ── Update stock location ──
      case 'update_location': {
        const { id, name, type, sort_order } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        try {
          const rows = await db.query(
            `UPDATE stock_locations SET
               name = COALESCE($2, name),
               type = COALESCE($3, type),
               sort_order = COALESCE($4, sort_order),
               updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [id, name, type, sort_order]
          )
          return NextResponse.json({ location: rows[0] })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'stock_locations table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      // ── Set par level (upsert) ──
      case 'set_par_level': {
        const { stock_item_id, location_id, required_quantity, unit } = body
        if (!stock_item_id || !location_id) {
          return NextResponse.json({ error: 'stock_item_id and location_id required' }, { status: 400 })
        }
        try {
          const rows = await db.query(
            `INSERT INTO stock_par_levels (stock_item_id, location_id, required_quantity, unit)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (stock_item_id, location_id) DO UPDATE SET
               required_quantity = $3,
               unit = $4,
               updated_at = NOW()
             RETURNING *`,
            [stock_item_id, location_id, required_quantity ?? 0, unit || null]
          )
          return NextResponse.json({ par_level: rows[0] })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'stock_par_levels table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      // ── Set current quantity at a location (upsert) ──
      case 'set_quantity': {
        const { stock_item_id, location_id, current_quantity } = body
        if (!stock_item_id || !location_id) {
          return NextResponse.json({ error: 'stock_item_id and location_id required' }, { status: 400 })
        }
        try {
          const rows = await db.query(
            `INSERT INTO stock_location_quantities (stock_item_id, location_id, current_quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (stock_item_id, location_id) DO UPDATE SET
               current_quantity = $3,
               updated_at = NOW()
             RETURNING *`,
            [stock_item_id, location_id, current_quantity ?? 0]
          )
          return NextResponse.json({ quantity: rows[0] })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'stock_location_quantities table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      // ── Adjust quantity (add/subtract delta) ──
      case 'adjust_quantity': {
        const { stock_item_id, location_id, delta, reason } = body
        if (!stock_item_id || !location_id || delta === undefined) {
          return NextResponse.json({ error: 'stock_item_id, location_id, and delta required' }, { status: 400 })
        }
        try {
          // Upsert current quantity with delta
          const rows = await db.query(
            `INSERT INTO stock_location_quantities (stock_item_id, location_id, current_quantity)
             VALUES ($1, $2, GREATEST($3, 0))
             ON CONFLICT (stock_item_id, location_id) DO UPDATE SET
               current_quantity = GREATEST(stock_location_quantities.current_quantity + $3, 0),
               updated_at = NOW()
             RETURNING *`,
            [stock_item_id, location_id, delta]
          )
          return NextResponse.json({ quantity: rows[0] })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'stock_location_quantities table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      // ── Add a new stock / pantry item ──
      case 'add_stock_item': {
        const { name, canonical_name, department, storage_location, preferred_store, unit, quantity, low_stock_threshold } = body
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
        try {
          const rows = await db.query(
            `INSERT INTO pantry_stock (name, canonical_name, department, storage_location, preferred_store, unit, quantity, low_stock_threshold, active, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW()) RETURNING *`,
            [
              name.trim(),
              canonical_name || name.toLowerCase().trim(),
              department || 'Other',
              storage_location || null,
              preferred_store || 'walmart',
              unit || null,
              quantity ?? 0,
              low_stock_threshold ?? null,
            ]
          )
          return NextResponse.json({ item: rows[0] })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'pantry_stock table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      // ── Update stock / pantry item ──
      case 'update_stock_item': {
        const { id, name, department, storage_location, preferred_store, unit, quantity, low_stock_threshold } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        try {
          const rows = await db.query(
            `UPDATE pantry_stock SET
               name = COALESCE($2, name),
               department = COALESCE($3, department),
               storage_location = COALESCE($4, storage_location),
               preferred_store = COALESCE($5, preferred_store),
               unit = COALESCE($6, unit),
               quantity = COALESCE($7, quantity),
               low_stock_threshold = COALESCE($8, low_stock_threshold),
               updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [id, name, department, storage_location, preferred_store, unit, quantity, low_stock_threshold]
          )
          return NextResponse.json({ item: rows[0] })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'pantry_stock table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      // ── Add scratch recipe ──
      case 'add_scratch_recipe': {
        const { name, category, description, yield_amount, yield_unit, prep_time_min, instructions } = body
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
        try {
          const rows = await db.query(
            `INSERT INTO scratch_recipes (name, category, description, yield_amount, yield_unit, prep_time_min, instructions)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name.trim(), category || 'Other', description || null, yield_amount || null, yield_unit || null, prep_time_min || null, instructions || null]
          )
          return NextResponse.json({ recipe: rows[0] })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'scratch_recipes table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      // ── Update scratch recipe ──
      case 'update_scratch_recipe': {
        const { id, name, category, description, yield_amount, yield_unit, prep_time_min, instructions } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        try {
          const rows = await db.query(
            `UPDATE scratch_recipes SET
               name = COALESCE($2, name),
               category = COALESCE($3, category),
               description = COALESCE($4, description),
               yield_amount = COALESCE($5, yield_amount),
               yield_unit = COALESCE($6, yield_unit),
               prep_time_min = COALESCE($7, prep_time_min),
               instructions = COALESCE($8, instructions),
               updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [id, name, category, description, yield_amount, yield_unit, prep_time_min, instructions]
          )
          return NextResponse.json({ recipe: rows[0] })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'scratch_recipes table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      // ── Add scratch recipe ingredient ──
      case 'add_scratch_ingredient': {
        const { recipe_id, name, quantity, unit, sort_order, notes } = body
        if (!recipe_id || !name) {
          return NextResponse.json({ error: 'recipe_id and name required' }, { status: 400 })
        }
        try {
          const rows = await db.query(
            `INSERT INTO scratch_recipe_ingredients (recipe_id, name, quantity, unit, sort_order, notes)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [recipe_id, name.trim(), quantity || null, unit || null, sort_order ?? 0, notes || null]
          )
          return NextResponse.json({ ingredient: rows[0] })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'scratch_recipe_ingredients table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      // ── Delete scratch recipe ingredient ──
      case 'delete_scratch_ingredient': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        try {
          await db.query(`DELETE FROM scratch_recipe_ingredients WHERE id = $1`, [id])
          return NextResponse.json({ success: true })
        } catch (err: any) {
          if (err?.message?.includes('does not exist') || err?.code === '42P01') {
            return NextResponse.json({ error: 'scratch_recipe_ingredients table does not exist' }, { status: 500 })
          }
          throw err
        }
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Stock POST error:', error)
    return NextResponse.json({ error: 'Failed to process stock action' }, { status: 500 })
  }
}
