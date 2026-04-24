import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { KID_DISPLAY } from '@/lib/constants'
import { parseDateLocal } from '@/lib/date-local'

function getMonday(dateStr?: string): string {
  const d = dateStr ? parseDateLocal(dateStr) : new Date()
  const dow = d.getDay()
  if (dow === 0) d.setDate(d.getDate() + 1)
  else if (dow === 6) d.setDate(d.getDate() + 2)
  else d.setDate(d.getDate() - ((dow + 6) % 7))
  return d.toLocaleDateString('en-CA')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('week_start') || getMonday()
  const sunday = new Date(parseDateLocal(weekStart).getTime() + 6 * 86400000).toLocaleDateString('en-CA')

  try {
    // Get assignments
    const assignments = await db.query(
      `SELECT DISTINCT ztr.kid_name, ztr.zone_key, zd.display_name AS zone_name
       FROM zone_task_rotation ztr
       JOIN zone_definitions zd ON zd.zone_key = ztr.zone_key
       WHERE ztr.assigned_date >= $1 AND ztr.assigned_date <= $2
       ORDER BY ztr.kid_name, zd.display_name`,
      [weekStart, sunday]
    ).catch(() => [])

    // Get tasks per zone
    const tasks = await db.query(
      `SELECT ztl.zone_key, ztl.task_text, ztl.task_type, ztl.duration_mins, ztl.health_priority, ztl.sort_order
       FROM zone_task_library ztl
       WHERE ztl.zone_key IN (SELECT DISTINCT zone_key FROM zone_task_rotation WHERE assigned_date >= $1 AND assigned_date <= $2)
       ORDER BY ztl.zone_key, ztl.sort_order`,
      [weekStart, sunday]
    ).catch(() => [])

    // Group tasks by zone
    const tasksByZone: Record<string, any[]> = {}
    for (const t of tasks) {
      if (!tasksByZone[t.zone_key]) tasksByZone[t.zone_key] = []
      tasksByZone[t.zone_key].push({
        text: t.task_text,
        type: t.task_type,
        duration: t.duration_mins,
        health_priority: t.health_priority,
        sort_order: t.sort_order,
      })
    }

    // Build per-kid checklist
    const checklist = assignments.map((a: any) => ({
      kid_name: a.kid_name,
      kid_display: KID_DISPLAY[a.kid_name] || a.kid_name,
      zone_key: a.zone_key,
      zone_name: (a.zone_name || '').split('—')[0].trim(),
      zone_full_name: a.zone_name,
      tasks: tasksByZone[a.zone_key] || [],
    }))

    // Zone cycle week
    const zoneEpoch = new Date(2026, 2, 16).getTime()
    const mondayMs = parseDateLocal(weekStart).getTime()
    const zoneCycleWeek = (Math.floor((mondayMs - zoneEpoch) / (7 * 86400000)) % 6) + 1

    const weekNum = Math.ceil((mondayMs - new Date(2026, 0, 1).getTime()) / (7 * 86400000))

    return NextResponse.json({
      week_start: weekStart,
      week_end: sunday,
      week_number: weekNum,
      zone_cycle_week: zoneCycleWeek,
      checklist,
    })
  } catch (error: any) {
    console.error('[zone-checklist] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
