import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_feed'

  try {
    if (action === 'get_feed') {
      const category = searchParams.get('category')
      const status = searchParams.get('status') || 'active'
      const cost = searchParams.get('cost')

      let sql = `SELECT ae.*,
        (SELECT COUNT(*)::int FROM adventure_interests ai WHERE ai.event_id = ae.id AND ai.interest_level != 'pass') AS interest_count,
        (SELECT array_agg(ai.person) FROM adventure_interests ai WHERE ai.event_id = ae.id AND ai.interest_level != 'pass') AS interested_people,
        (SELECT COUNT(*)::int FROM adventure_messages am WHERE am.event_id = ae.id) AS message_count,
        (SELECT ad.decision FROM adventure_decisions ad WHERE ad.event_id = ae.id ORDER BY ad.created_at DESC LIMIT 1) AS latest_decision
        FROM adventure_events ae WHERE ae.status = $1`
      const params: any[] = [status]
      if (category) { params.push(category); sql += ` AND ae.category = $${params.length}` }
      if (cost) { params.push(cost); sql += ` AND ae.cost = $${params.length}` }
      sql += ` ORDER BY CASE WHEN ae.event_date >= CURRENT_DATE THEN 0 ELSE 1 END, ae.event_date ASC NULLS LAST LIMIT 50`

      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ events: rows })
    }

    if (action === 'get_event') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const event = await db.query(`SELECT * FROM adventure_events WHERE id = $1`, [id])
      const interests = await db.query(`SELECT * FROM adventure_interests WHERE event_id = $1 ORDER BY created_at`, [id]).catch(() => [])
      const messages = await db.query(`SELECT * FROM adventure_messages WHERE event_id = $1 ORDER BY created_at`, [id]).catch(() => [])
      const decision = await db.query(`SELECT * FROM adventure_decisions WHERE event_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]).catch(() => [])
      return NextResponse.json({ event: event[0] || null, interests, messages, decision: decision[0] || null })
    }

    if (action === 'get_board_summary') {
      const hot = await db.query(
        `SELECT ae.id, ae.title, ae.event_date, ae.category, ae.cost,
                (SELECT COUNT(*)::int FROM adventure_interests ai WHERE ai.event_id = ae.id AND ai.interest_level != 'pass') AS votes
           FROM adventure_events ae WHERE ae.status = 'active' AND ae.event_date >= CURRENT_DATE
           ORDER BY votes DESC LIMIT 5`
      ).catch(() => [])
      const pending = await db.query(
        `SELECT ae.id, ae.title, ae.event_date FROM adventure_events ae
          WHERE ae.status = 'active' AND NOT EXISTS (SELECT 1 FROM adventure_decisions ad WHERE ad.event_id = ae.id)
          AND (SELECT COUNT(*) FROM adventure_interests ai WHERE ai.event_id = ae.id AND ai.interest_level != 'pass') > 0
          ORDER BY ae.event_date LIMIT 5`
      ).catch(() => [])
      const approved = await db.query(
        `SELECT ae.id, ae.title, ae.event_date, ad.planned_date FROM adventure_events ae
          JOIN adventure_decisions ad ON ad.event_id = ae.id AND ad.decision = 'approved'
          WHERE ae.event_date >= CURRENT_DATE ORDER BY COALESCE(ad.planned_date, ae.event_date) LIMIT 5`
      ).catch(() => [])
      return NextResponse.json({ hot, pending, approved })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Adventures GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'submit_event': {
        const { title, description, event_date, event_time, location, category, cost, submitted_by } = body
        if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO adventure_events (title, description, event_date, event_time, location, category, cost, source, submitted_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'kid_submitted',$8) RETURNING *`,
          [title, description || null, event_date || null, event_time || null, location || null, category || null, cost || 'free', submitted_by || null]
        )
        if (submitted_by) {
          await createNotification({
            title: `🗺️ ${cap(submitted_by)} found an adventure!`,
            message: `"${title}"${event_date ? ` on ${new Date(event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`,
            source_type: 'adventure_submitted', icon: '🗺️', link_tab: 'calendar',
          }).catch(() => {})
        }
        return NextResponse.json({ event: rows[0] }, { status: 201 })
      }

      case 'express_interest': {
        const { event_id, person, interest_level, comment } = body
        if (!event_id || !person) return NextResponse.json({ error: 'event_id + person required' }, { status: 400 })
        await db.query(
          `INSERT INTO adventure_interests (event_id, person, interest_level, comment)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (event_id, person) DO UPDATE SET interest_level = $3, comment = COALESCE($4, adventure_interests.comment)`,
          [event_id, person.toLowerCase(), interest_level || 'interested', comment || null]
        )
        // Get event title + count for notification
        const event = await db.query(`SELECT title FROM adventure_events WHERE id = $1`, [event_id]).catch(() => [])
        const count = await db.query(`SELECT COUNT(*)::int AS c FROM adventure_interests WHERE event_id = $1 AND interest_level != 'pass'`, [event_id]).catch(() => [{ c: 0 }])
        if (interest_level !== 'pass') {
          await createNotification({
            title: `🙋 ${cap(person)} wants to go!`,
            message: `"${event[0]?.title || 'an adventure'}" — ${count[0]?.c || 1} interested`,
            source_type: 'adventure_interest', icon: '🙋',
          }).catch(() => {})
        }
        return NextResponse.json({ success: true, count: count[0]?.c || 0 })
      }

      case 'add_comment': {
        const { event_id, person, message } = body
        if (!event_id || !person || !message) return NextResponse.json({ error: 'event_id + person + message required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO adventure_messages (event_id, person, message) VALUES ($1, $2, $3) RETURNING *`,
          [event_id, person.toLowerCase(), message]
        )
        return NextResponse.json({ message: rows[0] }, { status: 201 })
      }

      case 'decide': {
        const { event_id, decision, decided_by, planned_date, notes } = body
        if (!event_id || !decision) return NextResponse.json({ error: 'event_id + decision required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO adventure_decisions (event_id, decision, decided_by, planned_date, notes)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [event_id, decision, decided_by || 'parent', planned_date || null, notes || null]
        )
        if (decision === 'approved') {
          await db.query(`UPDATE adventure_events SET status = 'approved' WHERE id = $1`, [event_id])
        }
        // Notify interested kids
        const event = await db.query(`SELECT title FROM adventure_events WHERE id = $1`, [event_id]).catch(() => [])
        const interested = await db.query(`SELECT person FROM adventure_interests WHERE event_id = $1 AND interest_level != 'pass'`, [event_id]).catch(() => [])
        const msgs: Record<string, { title: string; icon: string }> = {
          approved: { title: `✅ "${event[0]?.title}" is approved!`, icon: '✅' },
          maybe: { title: `🤔 "${event[0]?.title}" — maybe!`, icon: '🤔' },
          not_this_time: { title: `"${event[0]?.title}" — not this time`, icon: '❌' },
        }
        const m = msgs[decision]
        if (m) {
          for (const i of interested) {
            await createNotification({
              title: m.title, message: notes || '', source_type: 'adventure_decision',
              icon: m.icon, target_role: 'kid', kid_name: i.person,
            }).catch(() => {})
          }
        }
        return NextResponse.json({ decision: rows[0] })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Adventures POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
