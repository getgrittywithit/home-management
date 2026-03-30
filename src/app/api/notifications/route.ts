import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      target_role TEXT NOT NULL DEFAULT 'parent',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      icon TEXT DEFAULT NULL,
      source_type TEXT DEFAULT NULL,
      source_ref TEXT DEFAULT NULL,
      link_tab TEXT DEFAULT NULL,
      read_at TIMESTAMPTZ DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

export async function GET(request: NextRequest) {
  try {
    await ensureTable()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || ''

    if (action === 'get_unread_count') {
      const rows = await db.query(
        `SELECT COUNT(*)::int as count FROM notifications WHERE read_at IS NULL AND target_role = 'parent'`
      )
      return NextResponse.json({ count: rows[0]?.count || 0 })
    }

    if (action === 'get_recent') {
      const limit = parseInt(searchParams.get('limit') || '20')
      const includeOld = searchParams.get('include_old') === 'true'
      const cutoff = includeOld ? '1970-01-01' : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
      const rows = await db.query(
        `SELECT * FROM notifications
         WHERE target_role = 'parent' AND created_at >= $1
         ORDER BY created_at DESC LIMIT $2`,
        [cutoff, limit]
      )
      return NextResponse.json({ notifications: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable()
    const body = await request.json()
    const { action } = body

    if (action === 'create') {
      const { title, message, icon, source_type, source_ref, link_tab } = body
      if (!title || !message) return NextResponse.json({ error: 'title and message required' }, { status: 400 })
      const rows = await db.query(
        `INSERT INTO notifications (title, message, icon, source_type, source_ref, link_tab)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [title, message, icon || null, source_type || null, source_ref || null, link_tab || null]
      )
      return NextResponse.json({ success: true, notification: rows[0] })
    }

    if (action === 'mark_read') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`UPDATE notifications SET read_at = NOW() WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    if (action === 'mark_all_read') {
      await db.query(`UPDATE notifications SET read_at = NOW() WHERE read_at IS NULL AND target_role = 'parent'`)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
