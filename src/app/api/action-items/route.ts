import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS action_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    source_type TEXT DEFAULT 'manual',
    source_id TEXT,
    source_preview TEXT,
    category TEXT,
    assigned_to TEXT DEFAULT 'lola',
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'inbox',
    due_date DATE,
    due_time TIME,
    board TEXT DEFAULT 'personal',
    column_name TEXT DEFAULT 'inbox',
    position INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  )`)
}

let ready = false

export async function GET(req: NextRequest) {
  if (!ready) { await ensureTables(); ready = true }
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list'

  try {
    switch (action) {
      case 'list': {
        const board = searchParams.get('board')
        const status = searchParams.get('status')
        const category = searchParams.get('category')
        const assigned = searchParams.get('assigned_to')
        const limit = parseInt(searchParams.get('limit') || '100')

        let sql = `SELECT * FROM action_items`
        const params: any[] = []
        const conditions: string[] = []

        if (board) { params.push(board); conditions.push(`board = $${params.length}`) }
        if (status) { params.push(status); conditions.push(`status = $${params.length}`) }
        if (category) { params.push(category); conditions.push(`category = $${params.length}`) }
        if (assigned) { params.push(assigned); conditions.push(`assigned_to = $${params.length}`) }

        // Default: exclude dismissed
        conditions.push(`status != 'dismissed'`)

        if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`
        sql += ` ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END, position, created_at DESC`
        sql += ` LIMIT $${params.length + 1}`
        params.push(limit)

        const items = await db.query(sql, params)
        return NextResponse.json({ items })
      }

      case 'get': {
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(`SELECT * FROM action_items WHERE id = $1`, [id])
        if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json({ item: rows[0] })
      }

      case 'counts': {
        const counts = await db.query(
          `SELECT board, column_name, COUNT(*)::int as count FROM action_items
           WHERE status != 'dismissed' GROUP BY board, column_name`
        ).catch(() => [])
        const totalActive = await db.query(
          `SELECT COUNT(*)::int as c FROM action_items WHERE status NOT IN ('done', 'dismissed')`
        ).catch(() => [{ c: 0 }])
        return NextResponse.json({ counts, total_active: totalActive[0]?.c || 0 })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Action items GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!ready) { await ensureTables(); ready = true }
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'create': {
        const { title, description, source_type, source_id, source_preview, category, assigned_to, priority, due_date, due_time, board, column_name, notes } = body
        if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

        // Get next position in column
        const targetBoard = board || 'personal'
        const targetCol = column_name || 'inbox'
        const maxPos = await db.query(
          `SELECT COALESCE(MAX(position), 0) + 1 as p FROM action_items WHERE board = $1 AND column_name = $2`,
          [targetBoard, targetCol]
        ).catch(() => [{ p: 0 }])

        const rows = await db.query(
          `INSERT INTO action_items (title, description, source_type, source_id, source_preview, category, assigned_to, priority, due_date, due_time, board, column_name, position, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
          [title, description || null, source_type || 'manual', source_id || null, source_preview || null,
           category || null, assigned_to || 'lola', priority || 'normal',
           due_date || null, due_time || null, targetBoard, targetCol,
           maxPos[0]?.p || 0, notes || null]
        )
        return NextResponse.json({ success: true, item: rows[0] })
      }

      case 'update': {
        const { id, title, description, category, assigned_to, priority, due_date, due_time, board, column_name, notes, status: newStatus } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        const sets: string[] = ['updated_at = NOW()']
        const params: any[] = []
        let paramIdx = 1

        const fields: Record<string, any> = { title, description, category, assigned_to, priority, due_date, due_time, board, column_name, notes }
        for (const [key, val] of Object.entries(fields)) {
          if (val !== undefined) {
            params.push(val)
            sets.push(`${key} = $${paramIdx++}`)
          }
        }

        if (newStatus !== undefined) {
          params.push(newStatus)
          sets.push(`status = $${paramIdx++}`)
          if (newStatus === 'done') {
            sets.push('completed_at = NOW()')
          }
        }

        params.push(id)
        await db.query(`UPDATE action_items SET ${sets.join(', ')} WHERE id = $${paramIdx}`, params)
        return NextResponse.json({ success: true })
      }

      case 'move': {
        const { id, column_name, position } = body
        if (!id || !column_name) return NextResponse.json({ error: 'id and column_name required' }, { status: 400 })

        // Map column names to status values
        const statusMap: Record<string, string> = {
          inbox: 'inbox', todo: 'todo', in_progress: 'in_progress', waiting: 'waiting', done: 'done',
          leads: 'inbox', estimate_sent: 'todo', scheduled: 'in_progress', invoiced: 'waiting', paid: 'done',
          need_to_respond: 'todo', waiting_on_school: 'waiting', waiting_on_results: 'waiting',
        }
        const newStatus = statusMap[column_name] || column_name

        await db.query(
          `UPDATE action_items SET column_name = $1, status = $2, position = $3, updated_at = NOW()
           ${newStatus === 'done' ? ', completed_at = NOW()' : ''} WHERE id = $4`,
          [column_name, newStatus, position ?? 0, id]
        )
        return NextResponse.json({ success: true })
      }

      case 'complete': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE action_items SET status = 'done', column_name = 'done', completed_at = NOW(), updated_at = NOW() WHERE id = $1`, [id]
        )
        return NextResponse.json({ success: true })
      }

      case 'dismiss': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE action_items SET status = 'dismissed', updated_at = NOW() WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'delete': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM action_items WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Action items POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
