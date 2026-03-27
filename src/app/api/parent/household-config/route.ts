import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'get_zones'

    if (action === 'get_zones') {
      try {
        const zones = await db.query(`SELECT * FROM zone_definitions WHERE active = TRUE ORDER BY display_name`)
        return NextResponse.json({ zones })
      } catch {
        return NextResponse.json({ zones: [] })
      }
    }

    if (action === 'get_zone_tasks') {
      const zoneKey = searchParams.get('zone')
      if (!zoneKey) return NextResponse.json({ error: 'zone required' }, { status: 400 })
      try {
        const tasks = await db.query(
          `SELECT * FROM zone_task_library WHERE zone_key = $1 ORDER BY task_type, sort_order, id`,
          [zoneKey]
        )
        return NextResponse.json({ tasks })
      } catch {
        return NextResponse.json({ tasks: [] })
      }
    }

    if (action === 'get_rotation_overview') {
      const zoneKey = searchParams.get('zone')
      if (!zoneKey) return NextResponse.json({ error: 'zone required' }, { status: 400 })
      try {
        const tasks = await db.query(
          `SELECT t.id, t.task_text, t.task_type, t.health_priority, t.active,
            (SELECT MAX(r.assigned_date) FROM zone_task_rotation r
             WHERE r.task_id = t.id AND r.completed = TRUE) as last_completed
           FROM zone_task_library t
           WHERE t.zone_key = $1
           ORDER BY t.task_type, t.sort_order, t.id`,
          [zoneKey]
        )
        return NextResponse.json({ tasks })
      } catch {
        return NextResponse.json({ tasks: [] })
      }
    }

    if (action === 'get_routine_flags') {
      try {
        const flags = await db.query(`SELECT * FROM kid_routine_flags ORDER BY kid_name, flag_key`)
        return NextResponse.json({ flags })
      } catch {
        return NextResponse.json({ flags: [] })
      }
    }

    if (action === 'get_bonus_log') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const dow = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dow + 6) % 7))
      const weekStart = monday.toLocaleDateString('en-CA')
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const weekEnd = sunday.toLocaleDateString('en-CA')
      try {
        const rows = await db.query(
          `SELECT * FROM zone_task_rotation WHERE bonus_task = TRUE AND assigned_date >= $1 AND assigned_date <= $2 ORDER BY completed_at DESC`,
          [weekStart, weekEnd]
        )
        return NextResponse.json({ bonusTasks: rows })
      } catch {
        return NextResponse.json({ bonusTasks: [] })
      }
    }

    if (action === 'get_morning_weekly') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const dow = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dow + 6) % 7))
      const weekStart = monday.toLocaleDateString('en-CA')
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const weekEnd = sunday.toLocaleDateString('en-CA')
      try {
        const rows = await db.query(
          `SELECT * FROM kid_morning_checkins WHERE kid_name IN ('zoey','kaylee') AND checkin_date >= $1 AND checkin_date <= $2 ORDER BY checkin_date`,
          [weekStart, weekEnd]
        )
        return NextResponse.json({ weekStart, weekEnd, checkins: rows })
      } catch {
        return NextResponse.json({ weekStart, weekEnd, checkins: [] })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Household config GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'toggle_task_active': {
        await db.query(`UPDATE zone_task_library SET active = NOT active WHERE id = $1`, [body.task_id])
        return NextResponse.json({ success: true })
      }

      case 'add_task': {
        const { zone_key, task_text, task_type, health_priority, equipment, duration_mins } = body
        await db.query(
          `INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, equipment, duration_mins) VALUES ($1, $2, $3, $4, $5, $6)`,
          [zone_key, task_text, task_type || 'rotating', health_priority || false, equipment || null, duration_mins || 5]
        )
        return NextResponse.json({ success: true })
      }

      case 'update_task': {
        const { task_id, task_text, task_type, health_priority, duration_mins } = body
        await db.query(
          `UPDATE zone_task_library SET task_text = COALESCE($2, task_text), task_type = COALESCE($3, task_type), health_priority = COALESCE($4, health_priority), duration_mins = COALESCE($5, duration_mins) WHERE id = $1`,
          [task_id, task_text, task_type, health_priority, duration_mins]
        )
        return NextResponse.json({ success: true })
      }

      case 'update_zone_config': {
        const { zone_key, rotating_count, anchor_count } = body
        await db.query(
          `UPDATE zone_definitions SET rotating_count = COALESCE($2, rotating_count), anchor_count = COALESCE($3, anchor_count) WHERE zone_key = $1`,
          [zone_key, rotating_count, anchor_count]
        )
        return NextResponse.json({ success: true })
      }

      case 'toggle_routine_flag': {
        const { kid, flag_key } = body
        await db.query(
          `INSERT INTO kid_routine_flags (kid_name, flag_key, active, updated_at) VALUES ($1, $2, TRUE, NOW())
           ON CONFLICT (kid_name, flag_key) DO UPDATE SET active = NOT kid_routine_flags.active, updated_at = NOW()`,
          [kid.toLowerCase(), flag_key]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Household config POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
