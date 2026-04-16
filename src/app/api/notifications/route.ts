import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      target_role TEXT NOT NULL DEFAULT 'parent',
      kid_name TEXT DEFAULT NULL,
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
  // Ensure kid_name column exists on existing tables
  await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS kid_name TEXT DEFAULT NULL`).catch(() => {})
}

export async function GET(request: NextRequest) {
  try {
    await ensureTable()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || ''

    if (action === 'get_unread_count') {
      const role = searchParams.get('role') || 'parent'
      const kidName = searchParams.get('kid_name')
      let rows
      if (role === 'kid' && kidName) {
        rows = await db.query(
          `SELECT COUNT(*)::int as count FROM notifications WHERE read_at IS NULL AND target_role = 'kid' AND kid_name = $1`,
          [kidName.toLowerCase()]
        )
      } else {
        rows = await db.query(
          `SELECT COUNT(*)::int as count FROM notifications WHERE read_at IS NULL AND target_role = 'parent'`
        )
      }
      return NextResponse.json({ count: rows[0]?.count || 0 })
    }

    if (action === 'get_recent') {
      const role = searchParams.get('role') || 'parent'
      const kidName = searchParams.get('kid_name')
      const limit = parseInt(searchParams.get('limit') || '20') || 20
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
      let rows
      if (role === 'kid' && kidName) {
        rows = await db.query(
          `SELECT * FROM notifications WHERE target_role = 'kid' AND kid_name = $1 AND created_at >= $2 ORDER BY created_at DESC LIMIT $3`,
          [kidName.toLowerCase(), cutoff, limit]
        )
      } else {
        rows = await db.query(
          `SELECT * FROM notifications WHERE target_role = 'parent' AND created_at >= $1 ORDER BY created_at DESC LIMIT $2`,
          [cutoff, limit]
        )
      }
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
      const { role, kid_name } = body
      if (role === 'kid' && kid_name) {
        await db.query(`UPDATE notifications SET read_at = NOW() WHERE read_at IS NULL AND target_role = 'kid' AND kid_name = $1`, [kid_name.toLowerCase()])
      } else {
        await db.query(`UPDATE notifications SET read_at = NOW() WHERE read_at IS NULL AND target_role = 'parent'`)
      }
      return NextResponse.json({ success: true })
    }

    // HEART-1: Quick praise (parent → kid)
    if (action === 'send_praise') {
      const { kid_name, message: praiseMsg } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      await createNotification({
        title: '❤️ Mom saw that!',
        message: praiseMsg || 'Great job today!',
        source_type: 'parent_praise',
        source_ref: `praise-${kid_name.toLowerCase()}-${Date.now()}`,
        link_tab: 'my-day', icon: '❤️',
        target_role: 'kid', kid_name: kid_name.toLowerCase(),
      })
      return NextResponse.json({ success: true })
    }

    // ────────────────────────────────────────────────────────────────────
    // D87: Reminder management
    // ────────────────────────────────────────────────────────────────────
    if (action === 'list_reminders') {
      const rows = await db.query(
        `SELECT * FROM reminder_schedules ORDER BY schedule_time`
      ).catch(() => [])
      return NextResponse.json({ reminders: rows })
    }

    if (action === 'create_reminder') {
      const { reminder_type, title, message, schedule_time, days_of_week, target_role, kid_name } = body
      if (!title || !schedule_time) return NextResponse.json({ error: 'title + schedule_time required' }, { status: 400 })
      const rows = await db.query(
        `INSERT INTO reminder_schedules (reminder_type, title, message, schedule_time, days_of_week, target_role, kid_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [reminder_type || 'custom', title, message || null, schedule_time,
         days_of_week || [0,1,2,3,4,5,6], target_role || 'parent', kid_name || null]
      )
      return NextResponse.json({ reminder: rows[0] }, { status: 201 })
    }

    if (action === 'update_reminder') {
      const { id, active, title, message, schedule_time, days_of_week } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const sets: string[] = []
      const params: any[] = [id]
      if (active !== undefined) { params.push(active); sets.push(`active = $${params.length}`) }
      if (title) { params.push(title); sets.push(`title = $${params.length}`) }
      if (message !== undefined) { params.push(message || null); sets.push(`message = $${params.length}`) }
      if (schedule_time) { params.push(schedule_time); sets.push(`schedule_time = $${params.length}`) }
      if (days_of_week) { params.push(days_of_week); sets.push(`days_of_week = $${params.length}`) }
      if (sets.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
      const rows = await db.query(`UPDATE reminder_schedules SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params)
      return NextResponse.json({ reminder: rows[0] })
    }

    if (action === 'delete_reminder') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM reminder_schedules WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    // Fire pending reminders (called manually or from cron/edge)
    if (action === 'check_reminders') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const dayOfWeek = now.getDay()

      const due = await db.query(
        `SELECT * FROM reminder_schedules
          WHERE active = TRUE
            AND $1 = ANY(days_of_week)
            AND schedule_time BETWEEN ($2::time - INTERVAL '5 minutes') AND ($2::time + INTERVAL '2 minutes')
            AND (last_fired_at IS NULL OR last_fired_at < NOW() - INTERVAL '30 minutes')`,
        [dayOfWeek, currentTime]
      ).catch(() => [])

      let fired = 0
      for (const r of due) {
        await createNotification({
          title: r.title,
          message: r.message || '',
          source_type: `reminder_${r.reminder_type}`,
          source_ref: `reminder:${r.id}`,
          icon: r.title.match(/💊/) ? '💊' : r.title.match(/🐕/) ? '🐕' : r.title.match(/🌙/) ? '🌙' : '⏰',
          target_role: r.target_role || 'parent',
          kid_name: r.kid_name || undefined,
        }).catch(() => {})
        await db.query(`UPDATE reminder_schedules SET last_fired_at = NOW() WHERE id = $1`, [r.id]).catch(() => {})
        fired++
      }
      return NextResponse.json({ success: true, fired })
    }

    // Quiet hours + preferences
    if (action === 'get_preferences') {
      const { role, kid_name } = body
      const rows = await db.query(
        `SELECT * FROM notification_preferences WHERE target_role = $1 AND (CASE WHEN $2 IS NULL THEN TRUE ELSE source_type = $2 END) LIMIT 50`,
        [role || 'parent', kid_name || null]
      ).catch(() => [])
      return NextResponse.json({ preferences: rows })
    }

    if (action === 'update_quiet_hours') {
      const { role, quiet_start, quiet_end, quiet_enabled } = body
      await db.query(
        `INSERT INTO notification_preferences (target_role, source_type, enabled, quiet_start, quiet_end, quiet_enabled)
         VALUES ($1, 'global', TRUE, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [role || 'parent', quiet_start || null, quiet_end || null, quiet_enabled ?? false]
      ).catch(() => {})
      // Update all existing prefs with quiet hours
      await db.query(
        `UPDATE notification_preferences SET quiet_start = $1, quiet_end = $2, quiet_enabled = $3 WHERE target_role = $4`,
        [quiet_start || null, quiet_end || null, quiet_enabled ?? false, role || 'parent']
      ).catch(() => {})
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
