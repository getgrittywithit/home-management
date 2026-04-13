import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// D56: Household inventory API. Backed by the inventory_items table
// (seeded from Walmart + HEB + Amazon purchase history on 2026-04-12).

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'

    if (action === 'list') {
      const category = searchParams.get('category')
      const subCategory = searchParams.get('sub_category')
      const store = searchParams.get('store')
      const lowStockOnly = searchParams.get('low_stock') === 'true'
      const search = searchParams.get('search')?.trim().toLowerCase()

      const where: string[] = ['active = TRUE']
      const params: any[] = []
      if (category) { params.push(category); where.push(`category = $${params.length}`) }
      if (subCategory) { params.push(subCategory); where.push(`sub_category = $${params.length}`) }
      if (store) { params.push(store); where.push(`preferred_store = $${params.length}`) }
      if (lowStockOnly) { where.push('current_stock < par_level') }
      if (search) {
        params.push(`%${search}%`)
        where.push(`(LOWER(name) LIKE $${params.length} OR canonical_name LIKE $${params.length})`)
      }

      const rows = await db.query(
        `SELECT id, name, canonical_name, category, sub_category, preferred_store, available_stores,
                par_level, par_unit, reorder_threshold, current_stock, location,
                last_purchased, avg_price, notes
         FROM inventory_items
         WHERE ${where.join(' AND ')}
         ORDER BY sub_category ASC, name ASC`,
        params
      )
      return NextResponse.json({ items: rows })
    }

    if (action === 'get') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const rows = await db.query(`SELECT * FROM inventory_items WHERE id = $1`, [id])
      if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ item: rows[0] })
    }

    if (action === 'category_counts') {
      const rows = await db.query(
        `SELECT category,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE current_stock < par_level)::int AS low_stock
         FROM inventory_items
         WHERE active = TRUE
         GROUP BY category
         ORDER BY category`
      )
      return NextResponse.json({ counts: rows })
    }

    if (action === 'low_stock') {
      const rows = await db.query(
        `SELECT id, name, category, sub_category, preferred_store, par_level, current_stock,
                par_level - current_stock AS deficit
         FROM inventory_items
         WHERE active = TRUE AND current_stock <= reorder_threshold
         ORDER BY deficit DESC, category, name`
      )
      return NextResponse.json({ items: rows })
    }

    if (action === 'shopping_needs') {
      // Items below par, ordered by critical categories first
      const rows = await db.query(
        `SELECT id, name, category, sub_category, preferred_store, available_stores,
                par_level, current_stock, (par_level - current_stock) AS deficit, par_unit
         FROM inventory_items
         WHERE active = TRUE AND current_stock < par_level
         ORDER BY
           CASE category
             WHEN 'Medicine Cabinet' THEN 1
             WHEN 'Household'        THEN 2
             WHEN 'Fridge'           THEN 3
             WHEN 'Pantry'           THEN 4
             WHEN 'Freezer'          THEN 5
             ELSE 6
           END,
           preferred_store NULLS LAST,
           sub_category,
           name`
      )
      return NextResponse.json({ items: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('Inventory GET error:', e)
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'update_stock': {
        const { id, delta, absolute } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        if (absolute != null) {
          const rows = await db.query(
            `UPDATE inventory_items
               SET current_stock = GREATEST($1, 0),
                   updated_at = NOW()
             WHERE id = $2
             RETURNING id, current_stock`,
            [Math.max(0, parseInt(absolute) || 0), id]
          )
          return NextResponse.json({ item: rows[0] })
        }
        const change = parseInt(delta) || 0
        const rows = await db.query(
          `UPDATE inventory_items
             SET current_stock = GREATEST(current_stock + $1, 0),
                 updated_at = NOW()
           WHERE id = $2
           RETURNING id, current_stock`,
          [change, id]
        )
        return NextResponse.json({ item: rows[0] })
      }

      case 'update_par': {
        const { id, par_level, par_unit, reorder_threshold } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE inventory_items
             SET par_level = COALESCE($1, par_level),
                 par_unit = COALESCE($2, par_unit),
                 reorder_threshold = COALESCE($3, reorder_threshold),
                 updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [par_level ?? null, par_unit ?? null, reorder_threshold ?? null, id]
        )
        return NextResponse.json({ item: rows[0] })
      }

      case 'add_item': {
        const { name, category, sub_category, preferred_store, par_level, par_unit, location, current_stock, notes } = body
        if (!name || !category || !sub_category) {
          return NextResponse.json({ error: 'name, category, sub_category required' }, { status: 400 })
        }
        const canonical = String(name).toLowerCase().trim()
        const rows = await db.query(
          `INSERT INTO inventory_items
             (name, canonical_name, category, sub_category, preferred_store, available_stores,
              par_level, par_unit, current_stock, location, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            name.trim(), canonical, category, sub_category,
            preferred_store || null,
            preferred_store ? [preferred_store] : [],
            par_level ?? 1,
            par_unit || 'item',
            current_stock ?? 0,
            location || null,
            notes || null,
          ]
        )
        return NextResponse.json({ item: rows[0] })
      }

      case 'bulk_update': {
        const { items } = body as { items: Array<{ id: number; delta?: number; absolute?: number; mark_purchased?: boolean }> }
        if (!Array.isArray(items) || items.length === 0) {
          return NextResponse.json({ error: 'items array required' }, { status: 400 })
        }
        let updated = 0
        for (const item of items) {
          if (!item.id) continue
          if (item.absolute != null) {
            await db.query(
              `UPDATE inventory_items
                 SET current_stock = GREATEST($1, 0),
                     ${item.mark_purchased ? 'last_purchased = NOW(),' : ''}
                     updated_at = NOW()
               WHERE id = $2`,
              [Math.max(0, item.absolute), item.id]
            )
          } else if (item.delta != null) {
            await db.query(
              `UPDATE inventory_items
                 SET current_stock = GREATEST(current_stock + $1, 0),
                     ${item.mark_purchased ? 'last_purchased = NOW(),' : ''}
                     updated_at = NOW()
               WHERE id = $2`,
              [item.delta, item.id]
            )
          }
          updated++
        }
        return NextResponse.json({ updated })
      }

      case 'deactivate': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE inventory_items SET active = FALSE, updated_at = NOW() WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e) {
    console.error('Inventory POST error:', e)
    return NextResponse.json({ error: 'Failed to process inventory action' }, { status: 500 })
  }
}
