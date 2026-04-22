import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'
import { KID_DISPLAY } from '@/lib/constants'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const days = parseInt(searchParams.get('days') || '30')

  try {
    let sql = `SELECT * FROM behavior_events WHERE created_at >= CURRENT_DATE - $1`
    const params: any[] = [days]
    if (kid) { params.push(kid); sql += ` AND (reporter_kid = $2 OR involved_kids @> $3::jsonb)` ; params.push(JSON.stringify([kid])) }
    sql += ` ORDER BY created_at DESC LIMIT 50`
    const rows = await db.query(sql, params).catch(() => [])
    return NextResponse.json({ events: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'report') {
      const { reporter_kid, involved_kids, description, severity_tier } = body
      if (!reporter_kid || !description) return NextResponse.json({ error: 'reporter_kid + description required' }, { status: 400 })

      const rows = await db.query(
        `INSERT INTO behavior_events (reporter_kid, involved_kids, description, severity_tier, behavior_type, created_by)
         VALUES ($1, $2, $3, $4, 'kid_report', $1) RETURNING *`,
        [reporter_kid.toLowerCase(), involved_kids ? JSON.stringify(involved_kids) : null, description, severity_tier || 1]
      )

      await createNotification({
        title: `${cap(reporter_kid)} reported something`,
        message: description.substring(0, 100),
        source_type: 'behavior_event', source_ref: `behavior-${rows[0]?.id}`,
        icon: '📋', link_tab: 'kids-checklist',
      }).catch(() => {})

      return NextResponse.json({ event: rows[0] }, { status: 201 })
    }

    if (action === 'add_parent_note') {
      const { event_id, parent_note, star_deduction, resolution_note } = body
      if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })
      await db.query(
        `UPDATE behavior_events SET parent_note = COALESCE($2, parent_note),
         star_deduction = COALESCE($3, star_deduction),
         resolved_at = CASE WHEN $4 IS NOT NULL THEN NOW() ELSE resolved_at END,
         resolution_note = COALESCE($4, resolution_note)
         WHERE id = $1`,
        [event_id, parent_note || null, star_deduction || null, resolution_note || null]
      )

      if (star_deduction && star_deduction > 0) {
        const event = await db.query(`SELECT involved_kids FROM behavior_events WHERE id = $1`, [event_id]).catch(() => [])
        const kids = event[0]?.involved_kids || []
        for (const kid of kids) {
          await db.query(
            `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'deducted', $2, $3)`,
            [kid, star_deduction, `Behavior: ${parent_note || 'see behavior log'}`]
          ).catch(() => {})
        }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
