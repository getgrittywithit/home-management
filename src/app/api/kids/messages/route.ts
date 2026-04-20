import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const kid = searchParams.get('kid')?.toLowerCase()

    switch (action) {
      case 'get_messages': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const rows = await db.query(
          `SELECT id, message, created_at, read_by_parent, read_at, parent_reply, reply_at, resolved, resolved_at
           FROM family_messages WHERE from_kid = $1
           ORDER BY created_at DESC LIMIT 20`,
          [kid]
        )
        return NextResponse.json({ messages: rows })
      }

      case 'get_all_messages': {
        const includeArchived = searchParams.get('include_archived') === '1'
        const rows = await db.query(
          `SELECT id, from_kid, message, created_at, read_by_parent, read_at, parent_reply, reply_at, resolved, resolved_at, archived_at
           FROM family_messages
           ${includeArchived ? '' : 'WHERE archived_at IS NULL'}
           ORDER BY resolved ASC, read_at IS NOT NULL ASC, created_at DESC LIMIT 50`
        )
        const unreadCount = rows.filter((r: any) => !r.read_at).length
        return NextResponse.json({ messages: rows, unreadCount })
      }

      case 'get_unread_count': {
        const rows = await db.query(
          `SELECT COUNT(*)::int as count FROM family_messages WHERE read_at IS NULL`
        )
        return NextResponse.json({ count: rows[0]?.count || 0 })
      }

      case 'get_announcements': {
        const rows = await db.query(
          `SELECT id, message, created_at, created_by
           FROM family_announcements WHERE active = TRUE
           ORDER BY created_at DESC`
        )
        return NextResponse.json({ announcements: rows })
      }

      case 'get_active_greenlight': {
        const rows = await db.query(
          `SELECT id, message, created_at FROM family_announcements
           WHERE active = TRUE AND announcement_type = 'greenlight'
           ORDER BY created_at DESC LIMIT 1`
        )
        return NextResponse.json({ greenlight: rows[0] || null })
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
        const { kid, kid_name, message } = body
        const senderName = kid || kid_name
        if (!senderName || !message?.trim()) return NextResponse.json({ error: 'kid and message required' }, { status: 400 })
        await db.query(
          `INSERT INTO family_messages (from_kid, message) VALUES ($1, $2)`,
          [senderName.toLowerCase(), message.trim().substring(0, 300)]
        )
        const kidDisplay = senderName.charAt(0).toUpperCase() + senderName.slice(1).toLowerCase()
        await createNotification({
          title: `New message from ${kidDisplay}`,
          message: message.length > 80 ? message.slice(0, 80) + '...' : message,
          source_type: 'message', source_ref: `msg-${senderName.toLowerCase()}`,
          link_tab: 'messages-alerts', icon: '💬',
        })
        return NextResponse.json({ success: true })
      }

      case 'mark_read': {
        const { ids } = body
        if (!ids || !Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids array required' }, { status: 400 })
        await db.query(
          `UPDATE family_messages SET read_by_parent = TRUE, read_at = NOW() WHERE id = ANY($1) AND read_at IS NULL`,
          [ids]
        )
        return NextResponse.json({ success: true })
      }

      case 'mark_resolved': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE family_messages SET resolved = TRUE, resolved_at = NOW(), read_by_parent = TRUE, read_at = COALESCE(read_at, NOW()) WHERE id = $1`,
          [id]
        )
        return NextResponse.json({ success: true })
      }

      case 'reply_to_message': {
        const { id, reply } = body
        if (!id || !reply?.trim()) return NextResponse.json({ error: 'id and reply required' }, { status: 400 })
        // Get the original message to find kid name
        const origMsg = await db.query(`SELECT from_kid FROM family_messages WHERE id = $1`, [id]).catch(() => [])
        await db.query(
          `UPDATE family_messages SET parent_reply = $2, reply_at = NOW(), read_by_parent = TRUE, read_at = COALESCE(read_at, NOW()) WHERE id = $1`,
          [id, reply.trim()]
        )
        // Notify kid of reply
        if (origMsg[0]?.from_kid) {
          await createNotification({
            title: 'New message from Mom',
            message: reply.length > 80 ? reply.slice(0, 80) + '...' : reply,
            source_type: 'message_reply', source_ref: `msg-reply-${id}`,
            link_tab: 'requests', icon: '💬',
            target_role: 'kid', kid_name: origMsg[0].from_kid,
          }).catch(() => {})
        }
        return NextResponse.json({ success: true })
      }

      case 'create_announcement': {
        const { message, type, target_kid } = body
        if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })
        await db.query(
          `INSERT INTO family_announcements (message, announcement_type, target_kid) VALUES ($1, $2, $3)`,
          [message.trim(), type || 'general', target_kid || 'all']
        )
        return NextResponse.json({ success: true })
      }

      case 'deactivate_announcement': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE family_announcements SET active = FALSE WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'post_greenlight': {
        const { message } = body
        if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })
        // Deactivate any existing greenlight first
        await db.query(`UPDATE family_announcements SET active = FALSE WHERE announcement_type = 'greenlight' AND active = TRUE`)
        // Insert new greenlight
        await db.query(
          `INSERT INTO family_announcements (message, announcement_type, target_kid, active) VALUES ($1, 'greenlight', 'all', TRUE)`,
          [message.trim().substring(0, 200)]
        )
        return NextResponse.json({ success: true })
      }

      case 'deactivate_greenlight': {
        await db.query(`UPDATE family_announcements SET active = FALSE WHERE announcement_type = 'greenlight' AND active = TRUE`)
        return NextResponse.json({ success: true })
      }

      // D92 Part F: Archive resolved messages
      case 'archive_message': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE family_messages SET archived_at = NOW() WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'archive_all_resolved': {
        await db.query(`UPDATE family_messages SET archived_at = NOW() WHERE resolved = TRUE AND archived_at IS NULL`)
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
