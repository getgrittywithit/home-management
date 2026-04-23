import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'list_assets') {
      const search = searchParams.get('search')?.trim()
      const assetType = searchParams.get('asset_type')
      const condition = searchParams.get('condition')
      const status = searchParams.get('status') || 'in_use,storage'
      const source = searchParams.get('source')
      const kid = searchParams.get('kid')
      const limit = parseInt(searchParams.get('limit') || '100')
      const offset = parseInt(searchParams.get('offset') || '0')

      const where: string[] = []
      const params: any[] = []
      let pIdx = 0

      // Status filter (comma-separated allowed)
      if (status && status !== 'all') {
        const statuses = status.split(',').map(s => s.trim())
        pIdx++
        where.push(`a.status = ANY($${pIdx})`)
        params.push(statuses)
      }

      if (assetType) { pIdx++; where.push(`a.asset_type = $${pIdx}`); params.push(assetType) }
      if (condition) { pIdx++; where.push(`a.condition = $${pIdx}`); params.push(condition) }
      if (source) { pIdx++; where.push(`a.source = $${pIdx}`); params.push(source) }

      if (search) {
        pIdx++
        where.push(`(a.asset_name ILIKE $${pIdx} OR a.description ILIKE $${pIdx} OR $${pIdx + 1} <@ a.topic_tags)`)
        params.push(`%${search}%`)
        pIdx++
        params.push([search.toLowerCase()])
      }

      // Kid affinity filter
      if (kid) {
        pIdx++
        where.push(`EXISTS (SELECT 1 FROM family_asset_kid_affinity ka WHERE ka.asset_id = a.id AND ka.kid_name = $${pIdx})`)
        params.push(kid)
      }

      const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : ''
      pIdx++
      const limitParam = pIdx
      pIdx++
      const offsetParam = pIdx
      params.push(limit, offset)

      const rows = await db.query(
        `SELECT a.*,
                (SELECT COUNT(*)::int FROM family_asset_unit_links ul WHERE ul.asset_id = a.id) AS unit_link_count,
                (SELECT array_agg(DISTINCT ka.kid_name) FROM family_asset_kid_affinity ka WHERE ka.asset_id = a.id) AS kids_used
         FROM family_assets a
         ${whereClause}
         ORDER BY a.updated_at DESC
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
        params
      )

      const countRows = await db.query(
        `SELECT COUNT(*)::int AS total FROM family_assets a ${whereClause}`,
        params.slice(0, params.length - 2) // without limit/offset
      )

      return NextResponse.json({ assets: rows, total: countRows[0]?.total || 0 })
    }

    if (action === 'get_asset') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

      const assetRows = await db.query(`SELECT * FROM family_assets WHERE id = $1`, [id])
      if (assetRows.length === 0) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

      // Usage history: linked units with year/kid context
      const unitLinks = await db.query(
        `SELECT ul.*, co.kid_name, co.school_year, co.month, co.subject, co.unit_title
         FROM family_asset_unit_links ul
         JOIN curriculum_year_outline co ON co.id = ul.outline_id
         WHERE ul.asset_id = $1
         ORDER BY co.school_year DESC, co.month`,
        [id]
      ).catch(() => [])

      // Kid affinity
      const affinity = await db.query(
        `SELECT * FROM family_asset_kid_affinity WHERE asset_id = $1 ORDER BY recorded_at DESC`,
        [id]
      ).catch(() => [])

      // Linked purchases
      const purchases = await db.query(
        `SELECT p.id, p.item_name, p.tefa_category, p.actual_cost, p.estimated_cost, p.purchased_date, p.kid_name
         FROM tefa_purchases p WHERE p.id = $1`,
        [assetRows[0].source_purchase_id]
      ).catch(() => [])

      return NextResponse.json({
        asset: assetRows[0],
        unit_links: unitLinks,
        kid_affinity: affinity,
        purchases,
      })
    }

    if (action === 'search_for_linking') {
      const q = searchParams.get('q')?.trim()
      if (!q) return NextResponse.json({ results: [] })
      const rows = await db.query(
        `SELECT id, asset_name, asset_type, condition, status
         FROM family_assets
         WHERE (asset_name ILIKE $1 OR description ILIKE $1)
           AND status NOT IN ('trashed', 'donated', 'sold')
         ORDER BY asset_name LIMIT 20`,
        [`%${q}%`]
      )
      return NextResponse.json({ results: rows })
    }

    if (action === 'stats') {
      const stats = await db.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'in_use')::int AS in_use,
           COUNT(*) FILTER (WHERE status = 'storage')::int AS in_storage,
           COUNT(*) FILTER (WHERE source = 'tefa_purchase')::int AS from_tefa,
           COUNT(DISTINCT asset_type)::int AS type_count
         FROM family_assets
         WHERE status NOT IN ('trashed', 'donated', 'sold')`
      )
      return NextResponse.json({ stats: stats[0] || {} })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Family Library GET error:', error)
    return NextResponse.json({ error: 'Failed to load library' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create_asset': {
        const {
          asset_name, asset_type, description, category_tags, topic_tags, pedagogy_tags,
          age_range_low, age_range_high, condition, status, is_consumable, quantity_on_hand,
          reorder_threshold, unit_of_measure, home_location, photo_url, notes,
          source, source_purchase_id, first_acquired_date,
        } = body
        if (!asset_name?.trim()) return NextResponse.json({ error: 'asset_name required' }, { status: 400 })

        const rows = await db.query(
          `INSERT INTO family_assets (
             asset_name, asset_type, description, category_tags, topic_tags, pedagogy_tags,
             age_range_low, age_range_high, condition, status, is_consumable, quantity_on_hand,
             reorder_threshold, unit_of_measure, home_location, photo_url, notes,
             source, source_purchase_id, first_acquired_date
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
           RETURNING *`,
          [
            asset_name.trim(), asset_type || 'other', description || null,
            category_tags || [], topic_tags || [], pedagogy_tags || [],
            age_range_low ?? null, age_range_high ?? null,
            condition || 'good', status || 'in_use',
            is_consumable || false, quantity_on_hand ?? 1,
            reorder_threshold ?? null, unit_of_measure || null,
            home_location || null, photo_url || null, notes || null,
            source || 'other', source_purchase_id || null,
            first_acquired_date || null,
          ]
        )
        return NextResponse.json({ asset: rows[0] }, { status: 201 })
      }

      case 'update_asset': {
        const { id, ...fields } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        const sets: string[] = []
        const params: any[] = [id]
        let pIdx = 1

        const allowed = [
          'asset_name', 'asset_type', 'description', 'category_tags', 'topic_tags',
          'pedagogy_tags', 'age_range_low', 'age_range_high', 'condition', 'status',
          'is_consumable', 'quantity_on_hand', 'reorder_threshold', 'unit_of_measure',
          'home_location', 'photo_url', 'notes', 'source', 'first_acquired_date',
        ]
        for (const key of allowed) {
          if (fields[key] !== undefined) {
            pIdx++
            sets.push(`${key} = $${pIdx}`)
            params.push(fields[key])
          }
        }
        if (sets.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

        const rows = await db.query(
          `UPDATE family_assets SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
          params
        )
        return NextResponse.json({ asset: rows[0] })
      }

      case 'delete_asset': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        // Soft delete — mark as trashed
        await db.query(`UPDATE family_assets SET status = 'trashed' WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'link_to_unit': {
        const { asset_id, outline_id } = body
        if (!asset_id || !outline_id) return NextResponse.json({ error: 'asset_id + outline_id required' }, { status: 400 })
        await db.query(
          `INSERT INTO family_asset_unit_links (asset_id, outline_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [asset_id, outline_id]
        )
        return NextResponse.json({ success: true })
      }

      case 'unlink_from_unit': {
        const { asset_id, outline_id } = body
        if (!asset_id || !outline_id) return NextResponse.json({ error: 'asset_id + outline_id required' }, { status: 400 })
        await db.query(
          `DELETE FROM family_asset_unit_links WHERE asset_id = $1 AND outline_id = $2`,
          [asset_id, outline_id]
        )
        return NextResponse.json({ success: true })
      }

      case 'record_affinity': {
        const { asset_id, kid_name, affinity_type, notes } = body
        if (!asset_id || !kid_name) return NextResponse.json({ error: 'asset_id + kid_name required' }, { status: 400 })
        await db.query(
          `INSERT INTO family_asset_kid_affinity (asset_id, kid_name, affinity_type, notes) VALUES ($1, $2, $3, $4)`,
          [asset_id, kid_name, affinity_type || 'used', notes || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'bulk_import': {
        const { items } = body
        if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'items array required' }, { status: 400 })
        if (items.length > 500) return NextResponse.json({ error: 'Max 500 items per import' }, { status: 400 })

        let imported = 0
        const errors: { row: number; error: string }[] = []

        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (!item.asset_name?.trim()) {
            errors.push({ row: i + 1, error: 'Missing asset_name' })
            continue
          }
          try {
            await db.query(
              `INSERT INTO family_assets (asset_name, asset_type, description, condition, home_location, topic_tags, source, first_acquired_date)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                item.asset_name.trim(),
                item.asset_type || 'other',
                item.description || null,
                item.condition || 'good',
                item.home_location || null,
                item.topic_tags || [],
                item.source || 'pre_tefa_owned',
                item.first_acquired_date || null,
              ]
            )
            imported++
          } catch (err: any) {
            errors.push({ row: i + 1, error: err.message || 'Insert failed' })
          }
        }
        return NextResponse.json({ success: true, imported, errors, total: items.length })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Family Library POST error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
