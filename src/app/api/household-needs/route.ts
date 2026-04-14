import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

// ============================================================================
// Household Needs List — single-family registry of durable goods / wish items
// ============================================================================

const ITEM_FIELDS = [
  'category', 'name', 'brand', 'model', 'price_min', 'price_max',
  'notes', 'photo_url', 'is_starred', 'status', 'for_person',
  'requested_by', 'approved_by', 'denied_reason',
]

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

// ----------------------------------------------------------------------------
// GET
// ----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list'

  try {
    switch (action) {
      case 'list': {
        const includeHistory = searchParams.get('include_history') === '1'
        const rows = await db.query(
          `SELECT * FROM household_needs
           WHERE status IN ('active','pending'${includeHistory ? `,'purchased','denied','cancelled'` : ''})
           ORDER BY is_starred DESC, created_at DESC`
        )
        const counts = {
          total: rows.filter((r: any) => r.status === 'active').length,
          pending: rows.filter((r: any) => r.status === 'pending').length,
          starred: rows.filter((r: any) => r.is_starred && r.status === 'active').length,
        }
        return NextResponse.json({ items: rows, counts })
      }

      case 'get': {
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(`SELECT * FROM household_needs WHERE id = $1`, [id])
        if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
        return NextResponse.json({ item: rows[0] })
      }

      case 'categories': {
        const rows = await db.query(
          `SELECT * FROM household_need_categories WHERE is_archived = FALSE ORDER BY sort_order, name`
        )
        return NextResponse.json({ categories: rows })
      }

      case 'my_requests': {
        const kidName = searchParams.get('kid_name')?.toLowerCase()
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const rows = await db.query(
          `SELECT id, name, category, status, denied_reason, created_at, approved_at
           FROM household_needs
           WHERE LOWER(requested_by) = $1
           ORDER BY created_at DESC
           LIMIT 30`,
          [kidName]
        )
        return NextResponse.json({ items: rows })
      }

      case 'export_apple_notes': {
        const rows = await db.query(
          `SELECT * FROM household_needs WHERE status = 'active' ORDER BY is_starred DESC, category, name`
        )

        const fmtPrice = (min: any, max: any) => {
          if (min != null && max != null) return `$${Number(min)}\u2013$${Number(max)}`
          if (max != null) return `under $${Number(max)}`
          if (min != null) return `from $${Number(min)}`
          return ''
        }

        const lines: string[] = []
        lines.push('🛒 HOUSEHOLD NEEDS LIST')
        const d = new Date()
        lines.push(`Updated: ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
        lines.push('')

        // Starred first
        const starred = rows.filter((r: any) => r.is_starred)
        if (starred.length > 0) {
          lines.push('⭐ PRIORITY')
          for (const r of starred) {
            const price = fmtPrice(r.price_min, r.price_max)
            const title = [r.brand, r.name].filter(Boolean).join(' ')
            lines.push(`• ${title}${price ? ' — ' + price : ''}`)
            if (r.model) lines.push(`  Model: ${r.model}`)
            if (r.notes) lines.push(`  Notes: ${r.notes}`)
          }
          lines.push('')
        }

        // Group remaining by category
        const byCategory: Record<string, any[]> = {}
        for (const r of rows) {
          if (r.is_starred) continue
          if (!byCategory[r.category]) byCategory[r.category] = []
          byCategory[r.category].push(r)
        }

        // Fetch categories for icons + ordering
        const cats = await db.query(
          `SELECT name, icon, sort_order FROM household_need_categories WHERE is_archived = FALSE ORDER BY sort_order`
        )
        const catOrder: { name: string; icon: string }[] = cats.map((c: any) => ({ name: c.name, icon: c.icon }))
        // Include categories that exist in data but aren't in the category table (tail)
        for (const c of Object.keys(byCategory)) {
          if (!catOrder.find((x) => x.name === c)) catOrder.push({ name: c, icon: '📦' })
        }

        for (const c of catOrder) {
          const items = byCategory[c.name]
          if (!items || items.length === 0) continue
          lines.push(`${c.icon} ${c.name.toUpperCase()}`)
          for (const r of items) {
            const price = fmtPrice(r.price_min, r.price_max)
            const title = [r.brand, r.name].filter(Boolean).join(' ')
            const forPerson = r.for_person && r.for_person !== 'Family' ? ` (${r.for_person})` : ''
            lines.push(`• ${title}${price ? ' — ' + price : ''}${forPerson}`)
            if (r.notes) lines.push(`  ${r.notes}`)
          }
          lines.push('')
        }

        return NextResponse.json({ text: lines.join('\n').trim() })
      }

      default:
        return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('household-needs GET error:', err)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

// ----------------------------------------------------------------------------
// POST
// ----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { action, ...data } = body

  try {
    switch (action) {
      case 'create': {
        const {
          category, name, brand, model, price_min, price_max, notes,
          photo_url, for_person, requested_by, is_starred,
        } = data
        if (!category || !name) {
          return NextResponse.json({ error: 'category and name required' }, { status: 400 })
        }

        const requester = (requested_by || 'parent').toLowerCase()
        const isKidRequest = requester !== 'parent'
        const status = isKidRequest ? 'pending' : 'active'

        const rows = await db.query(
          `INSERT INTO household_needs (
             category, name, brand, model, price_min, price_max, notes,
             photo_url, for_person, requested_by, is_starred, status
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING *`,
          [
            category, name, brand || null, model || null,
            price_min ?? null, price_max ?? null, notes || null,
            photo_url || null, for_person || null, requester,
            !!is_starred, status,
          ]
        )

        // Fire notification to parent for kid requests
        if (isKidRequest) {
          await createNotification({
            title: `${titleCase(requester)} needs something`,
            message: `${titleCase(requester)} added "${name}" to the ${category} needs list`,
            source_type: 'needs_request',
            source_ref: `needs:${rows[0].id}`,
            link_tab: 'needs-list',
            icon: '🛒',
            target_role: 'parent',
          }).catch(() => {})
        }

        return NextResponse.json({ item: rows[0] }, { status: 201 })
      }

      case 'update': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        const set: string[] = []
        const params: any[] = [id]
        for (const [k, v] of Object.entries(updates)) {
          if (ITEM_FIELDS.includes(k)) {
            params.push(v === '' ? null : v)
            set.push(`${k} = $${params.length}`)
          }
        }
        if (set.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
        set.push(`updated_at = NOW()`)

        const rows = await db.query(
          `UPDATE household_needs SET ${set.join(', ')} WHERE id = $1 RETURNING *`,
          params
        )
        if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
        return NextResponse.json({ item: rows[0] })
      }

      case 'star': {
        const { id, is_starred } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE household_needs SET is_starred = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [id, !!is_starred]
        )
        return NextResponse.json({ item: rows[0] })
      }

      case 'approve': {
        const { id, approved_by, for_person } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE household_needs
           SET status = 'active',
               approved_by = COALESCE($2, 'parent'),
               approved_at = NOW(),
               for_person = COALESCE($3, for_person),
               updated_at = NOW()
           WHERE id = $1 AND status = 'pending'
           RETURNING *`,
          [id, approved_by || null, for_person || null]
        )
        if (!rows[0]) return NextResponse.json({ error: 'not found or not pending' }, { status: 404 })
        // Notify kid that their request was approved
        if (rows[0].requested_by && rows[0].requested_by !== 'parent') {
          await createNotification({
            title: 'Your request was approved!',
            message: `"${rows[0].name}" is now on the household needs list.`,
            source_type: 'needs_approved',
            source_ref: `needs:${rows[0].id}`,
            link_tab: 'requests',
            icon: '✅',
            target_role: 'kid',
            kid_name: rows[0].requested_by,
          }).catch(() => {})
        }
        return NextResponse.json({ item: rows[0] })
      }

      case 'deny': {
        const { id, denied_reason } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE household_needs
           SET status = 'denied',
               denied_reason = $2,
               updated_at = NOW()
           WHERE id = $1 AND status = 'pending'
           RETURNING *`,
          [id, denied_reason || null]
        )
        if (!rows[0]) return NextResponse.json({ error: 'not found or not pending' }, { status: 404 })
        if (rows[0].requested_by && rows[0].requested_by !== 'parent') {
          await createNotification({
            title: 'Mom/Dad replied to your request',
            message: denied_reason ? `"${rows[0].name}": ${denied_reason}` : `"${rows[0].name}" was not approved`,
            source_type: 'needs_denied',
            source_ref: `needs:${rows[0].id}`,
            link_tab: 'requests',
            icon: '💬',
            target_role: 'kid',
            kid_name: rows[0].requested_by,
          }).catch(() => {})
        }
        return NextResponse.json({ item: rows[0] })
      }

      case 'mark_purchased': {
        const { id, purchased_price, purchased_where } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE household_needs
           SET status = 'purchased',
               purchased_at = NOW(),
               purchased_price = $2,
               purchased_where = $3,
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id, purchased_price ?? null, purchased_where || null]
        )
        return NextResponse.json({ item: rows[0] })
      }

      case 'delete': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE household_needs SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING id`,
          [id]
        )
        return NextResponse.json({ ok: true, deleted: rows.length })
      }

      case 'create_category': {
        const { name, icon, sort_order } = data
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO household_need_categories (name, icon, sort_order)
           VALUES ($1, $2, COALESCE($3, 50))
           ON CONFLICT (name) DO UPDATE SET is_archived = FALSE, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order
           RETURNING *`,
          [name, icon || '📦', sort_order ?? null]
        )
        return NextResponse.json({ category: rows[0] }, { status: 201 })
      }

      case 'update_category': {
        const { id, name, icon, sort_order, is_archived } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const set: string[] = []
        const params: any[] = [id]
        if (name != null) { params.push(name); set.push(`name = $${params.length}`) }
        if (icon != null) { params.push(icon); set.push(`icon = $${params.length}`) }
        if (sort_order != null) { params.push(sort_order); set.push(`sort_order = $${params.length}`) }
        if (is_archived != null) { params.push(!!is_archived); set.push(`is_archived = $${params.length}`) }
        if (set.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
        const rows = await db.query(
          `UPDATE household_need_categories SET ${set.join(', ')} WHERE id = $1 RETURNING *`,
          params
        )
        return NextResponse.json({ category: rows[0] })
      }

      default:
        return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('household-needs POST error:', err)
    return NextResponse.json({ error: 'Request failed', detail: String(err) }, { status: 500 })
  }
}
