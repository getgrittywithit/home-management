import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// Extra task rotation by day of week (1=Mon..7=Sun)
const EXTRA_TASK: Record<number, { task: string; label: string; emoji: string } | null> = {
  1: { task: 'poop_patrol', label: 'Poop Patrol', emoji: '💩' },
  2: { task: 'brush_fur', label: 'Brush Fur', emoji: '🐕' },
  3: { task: 'brush_teeth', label: 'Brush Teeth', emoji: '🦷' },
  4: { task: 'poop_patrol', label: 'Poop Patrol', emoji: '💩' },
  5: { task: 'brush_fur', label: 'Brush Fur', emoji: '🐕' },
  6: null, // Saturday
  0: null, // Sunday
}

const TASK_INFO: Record<string, { label: string; emoji: string; time: string }> = {
  am_feed_walk: { label: 'AM Feed + Walk', emoji: '🐾', time: '7:00 AM' },
  poop_patrol: { label: 'Poop Patrol', emoji: '💩', time: '' },
  brush_fur: { label: 'Brush Fur', emoji: '🐕', time: '' },
  brush_teeth: { label: 'Brush Teeth', emoji: '🦷', time: '' },
  pm_feed: { label: 'PM Feed', emoji: '🍽️', time: '5:00 PM' },
  pm_walk: { label: 'PM Walk', emoji: '🌙', time: '7:00 PM' },
}

const WEEKEND_ANCHOR = new Date('2026-03-28T12:00:00') // Week 1 starts here

function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay() // 0=Sun..6=Sat
}

// Returns 1-based JS day (1=Mon..5=Fri) or 0 for weekend
function getISODay(dateStr: string): number {
  const d = getDayOfWeek(dateStr)
  if (d === 0) return 0 // Sunday
  if (d === 6) return 0 // Saturday
  return d // 1=Mon..5=Fri
}

function getWeekendRotationWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  // Find the Saturday of this weekend
  const dow = d.getDay()
  const sat = new Date(d)
  if (dow === 0) sat.setDate(d.getDate() - 1) // Sunday -> go back to Saturday
  // else it's Saturday already
  const weeksSince = Math.floor((sat.getTime() - WEEKEND_ANCHOR.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return ((weeksSince % 5) + 5) % 5 + 1 // 1-based, 1..5
}

async function getAssigneeForDate(dateStr: string): Promise<string | null> {
  const dow = getDayOfWeek(dateStr)
  if (dow >= 1 && dow <= 5) {
    // Weekday
    const rows = await db.query(`SELECT kid_name FROM belle_weekday_assignments WHERE day_of_week = $1`, [dow])
    return rows[0]?.kid_name || null
  }
  // Weekend
  const rotWeek = getWeekendRotationWeek(dateStr)
  const rows = await db.query(`SELECT kid_name FROM belle_weekend_rotation WHERE week_number = $1`, [rotWeek])
  return rows[0]?.kid_name || null
}

function getTasksForDate(dateStr: string): string[] {
  const dow = getDayOfWeek(dateStr)
  const tasks = ['am_feed_walk']
  const extra = EXTRA_TASK[dow]
  if (extra) tasks.push(extra.task)
  tasks.push('pm_feed', 'pm_walk')
  return tasks
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const kid = searchParams.get('kid')?.toLowerCase()
    const today = getToday()

    switch (action) {
      case 'get_my_tasks_today': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const assignee = await getAssigneeForDate(today)
        if (assignee !== kid) {
          return NextResponse.json({ assigned: false, assignee })
        }
        const taskKeys = getTasksForDate(today)
        const logs = await db.query(
          `SELECT task, completed, completed_at FROM belle_care_log WHERE care_date = $1`,
          [today]
        )
        const completionMap: Record<string, boolean> = {}
        logs.forEach((r: any) => { completionMap[r.task] = r.completed })

        const tasks = taskKeys.map(key => ({
          key,
          ...(TASK_INFO[key] || { label: key, emoji: '', time: '' }),
          completed: !!completionMap[key],
        }))

        return NextResponse.json({ assigned: true, assignee, tasks, date: today })
      }

      case 'get_todays_assignee': {
        const assignee = await getAssigneeForDate(today)
        const taskKeys = getTasksForDate(today)
        const logs = await db.query(
          `SELECT task, completed FROM belle_care_log WHERE care_date = $1`,
          [today]
        )
        const completionMap: Record<string, boolean> = {}
        logs.forEach((r: any) => { completionMap[r.task] = r.completed })
        const tasks = taskKeys.map(key => ({
          key,
          ...(TASK_INFO[key] || { label: key, emoji: '', time: '' }),
          completed: !!completionMap[key],
        }))
        return NextResponse.json({ assignee, tasks, date: today })
      }

      case 'get_weekly_overview': {
        // Find Monday of current week
        const d = new Date(today + 'T12:00:00')
        const dow = d.getDay()
        const monday = new Date(d)
        monday.setDate(d.getDate() - ((dow + 6) % 7))

        const days = []
        for (let i = 0; i < 7; i++) {
          const dd = new Date(monday)
          dd.setDate(monday.getDate() + i)
          const dateStr = dd.toLocaleDateString('en-CA')
          const assignee = await getAssigneeForDate(dateStr)
          const taskKeys = getTasksForDate(dateStr)

          const logs = await db.query(
            `SELECT task, completed FROM belle_care_log WHERE care_date = $1`,
            [dateStr]
          )
          const done = logs.filter((r: any) => r.completed).length

          days.push({
            date: dateStr,
            dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dd.getDay()],
            assignee,
            totalTasks: taskKeys.length,
            completedTasks: done,
          })
        }
        return NextResponse.json({ days })
      }

      case 'get_weekend_schedule': {
        // Next 5 weekends
        const d = new Date(today + 'T12:00:00')
        // Find next Saturday
        const dow = d.getDay()
        const nextSat = new Date(d)
        nextSat.setDate(d.getDate() + (6 - dow + 7) % 7)
        if (dow === 6) nextSat.setDate(d.getDate()) // today is Saturday

        const weekends = []
        for (let i = 0; i < 5; i++) {
          const sat = new Date(nextSat)
          sat.setDate(nextSat.getDate() + i * 7)
          const satStr = sat.toLocaleDateString('en-CA')
          const rotWeek = getWeekendRotationWeek(satStr)
          const rows = await db.query(`SELECT kid_name FROM belle_weekend_rotation WHERE week_number = $1`, [rotWeek])
          weekends.push({
            saturday: satStr,
            kid_name: rows[0]?.kid_name || 'unknown',
            label: sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          })
        }
        return NextResponse.json({ weekends })
      }

      case 'get_history': {
        const filterKid = searchParams.get('filter_kid')?.toLowerCase()
        let query = `SELECT kid_name, care_date, task, completed FROM belle_care_log WHERE care_date >= CURRENT_DATE - INTERVAL '30 days'`
        const params: any[] = []
        if (filterKid) {
          query += ` AND kid_name = $1`
          params.push(filterKid)
        }
        query += ` ORDER BY care_date DESC, task`
        const logs = await db.query(query, params)
        return NextResponse.json({ logs })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Belle GET error:', error)
    return NextResponse.json({ error: 'Failed to load belle data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    const today = getToday()

    switch (action) {
      case 'complete_task': {
        const { kid_name, task } = body
        if (!kid_name || !task) return NextResponse.json({ error: 'kid_name and task required' }, { status: 400 })
        await db.query(
          `INSERT INTO belle_care_log (kid_name, care_date, task, completed, completed_at)
           VALUES ($1, $2, $3, TRUE, NOW())
           ON CONFLICT (care_date, task)
           DO UPDATE SET completed = TRUE, completed_at = NOW(), kid_name = $1`,
          [kid_name.toLowerCase(), today, task]
        )
        return NextResponse.json({ success: true })
      }

      case 'uncomplete_task': {
        const { task } = body
        if (!task) return NextResponse.json({ error: 'task required' }, { status: 400 })
        await db.query(
          `UPDATE belle_care_log SET completed = FALSE, completed_at = NULL WHERE care_date = $1 AND task = $2`,
          [today, task]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Belle POST error:', error)
    return NextResponse.json({ error: 'Failed to process belle action' }, { status: 500 })
  }
}
