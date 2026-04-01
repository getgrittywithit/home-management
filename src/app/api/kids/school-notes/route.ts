import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kid = searchParams.get('kid')?.toLowerCase()
    const action = searchParams.get('action')

    if (action === 'get_all_notes') {
      const rows = await db.query(
        `SELECT id, kid_name, category, note, created_at, read_at, resolved, resolved_at
         FROM kid_school_notes
         ORDER BY resolved ASC, read_at IS NOT NULL ASC, created_at DESC`
      )
      const unreadCount = rows.filter((r: any) => !r.read_at && !r.resolved).length
      return NextResponse.json({ notes: rows, unreadCount })
    }

    if (action === 'get_shopping_list') {
      const rows = await db.query(
        `SELECT id, kid_name, category, note, created_at, read_at, resolved, resolved_at
         FROM kid_school_notes
         WHERE category IN ('supply_needed', 'ran_out_of')
         ORDER BY resolved ASC, read_at IS NOT NULL ASC, created_at DESC`
      )
      return NextResponse.json({ items: rows })
    }

    if (action === 'get_unread_count') {
      const rows = await db.query(
        `SELECT COUNT(*)::int as count FROM kid_school_notes WHERE read_at IS NULL AND resolved = FALSE`
      )
      return NextResponse.json({ count: rows[0]?.count || 0 })
    }

    // Default: get notes for a specific kid
    if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
    const rows = await db.query(
      `SELECT id, category, note, created_at
       FROM kid_school_notes WHERE kid_name = $1 AND resolved = FALSE
       ORDER BY created_at DESC LIMIT 20`,
      [kid]
    )
    return NextResponse.json({ notes: rows })
  } catch (error) {
    console.error('School notes GET error:', error)
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'add_note': {
        const { kid_name, category, note } = body
        if (!kid_name || !category || !note?.trim()) {
          return NextResponse.json({ error: 'kid_name, category, note required' }, { status: 400 })
        }
        await db.query(
          `INSERT INTO kid_school_notes (kid_name, category, note) VALUES ($1, $2, $3)`,
          [kid_name.toLowerCase(), category, note.trim().substring(0, 200)]
        )
        const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1).toLowerCase()
        await createNotification({
          title: `School note from ${kidDisplay}`,
          message: `${category.replace(/_/g, ' ')}: ${note.length > 60 ? note.slice(0, 60) + '...' : note}`,
          source_type: 'school_note', source_ref: `note-${kid_name.toLowerCase()}`,
          link_tab: 'messages-alerts', icon: '📝',
        })
        return NextResponse.json({ success: true })
      }

      case 'mark_read': {
        const { ids } = body
        if (!ids || !Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids array required' }, { status: 400 })
        await db.query(
          `UPDATE kid_school_notes SET read_at = NOW() WHERE id = ANY($1) AND read_at IS NULL`,
          [ids]
        )
        return NextResponse.json({ success: true })
      }

      case 'resolve_note': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE kid_school_notes SET resolved = TRUE, resolved_at = NOW(), read_at = COALESCE(read_at, NOW()) WHERE id = $1`,
          [id]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('School notes POST error:', error)
    return NextResponse.json({ error: 'Failed to process note' }, { status: 500 })
  }
}
