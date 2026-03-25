import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const kid = searchParams.get('kid')?.toLowerCase()

    switch (action) {
      case 'get_messages': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const rows = await db.query(
          `SELECT id, message, created_at, read_by_parent, parent_reply, reply_at
           FROM family_messages WHERE from_kid = $1
           ORDER BY created_at DESC LIMIT 20`,
          [kid]
        )
        return NextResponse.json({ messages: rows })
      }

      case 'get_all_messages': {
        const rows = await db.query(
          `SELECT id, from_kid, message, created_at, read_by_parent, parent_reply, reply_at
           FROM family_messages
           ORDER BY read_by_parent ASC, created_at DESC LIMIT 50`
        )
        const unreadCount = rows.filter((r: any) => !r.read_by_parent).length
        return NextResponse.json({ messages: rows, unreadCount })
      }

      case 'get_announcements': {
        const rows = await db.query(
          `SELECT id, message, created_at, created_by
           FROM family_announcements WHERE active = TRUE
           ORDER BY created_at DESC`
        )
        return NextResponse.json({ announcements: rows })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'send_message': {
        const { kid, message } = body
        if (!kid || !message?.trim()) return NextResponse.json({ error: 'kid and message required' }, { status: 400 })
        await db.query(
          `INSERT INTO family_messages (from_kid, message) VALUES ($1, $2)`,
          [kid.toLowerCase(), message.trim().substring(0, 300)]
        )
        return NextResponse.json({ success: true })
      }

      case 'mark_read': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE family_messages SET read_by_parent = TRUE WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'reply_to_message': {
        const { id, reply } = body
        if (!id || !reply?.trim()) return NextResponse.json({ error: 'id and reply required' }, { status: 400 })
        await db.query(
          `UPDATE family_messages SET parent_reply = $2, reply_at = NOW(), read_by_parent = TRUE WHERE id = $1`,
          [id, reply.trim()]
        )
        return NextResponse.json({ success: true })
      }

      case 'create_announcement': {
        const { message } = body
        if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })
        await db.query(
          `INSERT INTO family_announcements (message) VALUES ($1)`,
          [message.trim()]
        )
        return NextResponse.json({ success: true })
      }

      case 'deactivate_announcement': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE family_announcements SET active = FALSE WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: 'Failed to process message action' }, { status: 500 })
  }
}
