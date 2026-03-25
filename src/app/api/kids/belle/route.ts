import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const DAILY_TASKS = [
  { time: 'Morning', task: 'Fill water bowl' },
  { time: 'Morning', task: 'Morning walk' },
  { time: 'Morning', task: 'Check food bowl' },
  { time: 'Afternoon', task: 'Afternoon walk or backyard time' },
  { time: 'Evening', task: 'Evening walk' },
  { time: 'Evening', task: 'Check food bowl (evening)' },
]

// Get the kid assigned for a given week
async function getAssigneeForDate(date: string): Promise<string | null> {
  // Find the Monday of the week containing `date`
  const d = new Date(date + 'T12:00:00')
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7)) // shift to Monday
  const weekStart = monday.toLocaleDateString('en-CA')

  const rows = await db.query(
    `SELECT kid_name FROM belle_care_schedule WHERE week_start <= $1 ORDER BY week_start DESC LIMIT 1`,
    [weekStart]
  )
  if (rows.length > 0) return rows[0].kid_name

  // Fallback: 6-kid rotation from anchor date March 15, 2026
  const kids = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
  const anchor = new Date('2026-03-15T12:00:00')
  const weeks = Math.floor((monday.getTime() - anchor.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return kids[((weeks % 6) + 6) % 6]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const kid = searchParams.get('kid')?.toLowerCase()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    switch (action) {
      case 'get_todays_tasks': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const assignee = await getAssigneeForDate(today)
        const isAssigned = assignee === kid

        const logs = await db.query(
          `SELECT task, completed, completed_at, notes FROM belle_care_log WHERE kid_name = $1 AND care_date = $2`,
          [kid, today]
        )
        const completionMap: Record<string, { completed: boolean; completed_at: string | null; notes: string | null }> = {}
        logs.forEach((r: any) => { completionMap[r.task] = { completed: r.completed, completed_at: r.completed_at, notes: r.notes } })

        const tasks = DAILY_TASKS.map(t => ({
          ...t,
          completed: completionMap[t.task]?.completed || false,
          completed_at: completionMap[t.task]?.completed_at || null,
          notes: completionMap[t.task]?.notes || null,
        }))

        return NextResponse.json({ tasks, isAssigned, assignee, date: today })
      }

      case 'get_current_assignee': {
        const assignee = await getAssigneeForDate(today)
        return NextResponse.json({ assignee, date: today })
      }

      case 'get_weekly_assignment': {
        const assignee = await getAssigneeForDate(today)
        // Next week
        const nextWeek = new Date(today + 'T12:00:00')
        nextWeek.setDate(nextWeek.getDate() + 7)
        const nextAssignee = await getAssigneeForDate(nextWeek.toLocaleDateString('en-CA'))
        return NextResponse.json({ thisWeek: assignee, nextWeek: nextAssignee })
      }

      case 'get_weekly_grid': {
        const weeks = parseInt(searchParams.get('weeks') || '4')
        // Get schedule for last N weeks
        const rows = await db.query(
          `SELECT kid_name, week_start FROM belle_care_schedule
           WHERE week_start <= $1 ORDER BY week_start DESC LIMIT $2`,
          [today, weeks]
        )
        // Get care logs for the period
        const startDate = new Date(today + 'T12:00:00')
        startDate.setDate(startDate.getDate() - weeks * 7)
        const logs = await db.query(
          `SELECT kid_name, care_date, task, completed FROM belle_care_log
           WHERE care_date >= $1 ORDER BY care_date`,
          [startDate.toLocaleDateString('en-CA')]
        )
        return NextResponse.json({ schedule: rows, logs, totalTasks: DAILY_TASKS.length })
      }

      case 'get_schedule': {
        // Next 6 weeks of rotation
        const rows = await db.query(
          `SELECT kid_name, week_start FROM belle_care_schedule
           WHERE week_start >= $1 ORDER BY week_start LIMIT 12`,
          [today]
        )
        // If not enough seeded, generate from rotation
        if (rows.length < 6) {
          const kids = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
          const anchor = new Date('2026-03-15T12:00:00')
          const d = new Date(today + 'T12:00:00')
          const day = d.getDay()
          const monday = new Date(d)
          monday.setDate(d.getDate() - ((day + 6) % 7))
          const generated = []
          for (let i = 0; i < 12; i++) {
            const ws = new Date(monday)
            ws.setDate(monday.getDate() + i * 7)
            const weeks = Math.floor((ws.getTime() - anchor.getTime()) / (7 * 24 * 60 * 60 * 1000))
            generated.push({ kid_name: kids[((weeks % 6) + 6) % 6], week_start: ws.toLocaleDateString('en-CA') })
          }
          return NextResponse.json({ schedule: generated })
        }
        return NextResponse.json({ schedule: rows })
      }

      case 'get_history': {
        const filterKid = searchParams.get('filter_kid')?.toLowerCase()
        let query = `SELECT kid_name, care_date, task, completed, completed_at FROM belle_care_log WHERE care_date >= CURRENT_DATE - INTERVAL '30 days'`
        const params: any[] = []
        if (filterKid) {
          query += ` AND kid_name = $1`
          params.push(filterKid)
        }
        query += ` ORDER BY care_date DESC, task`
        const logs = await db.query(query, params)
        return NextResponse.json({ logs, totalTasks: DAILY_TASKS.length })
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
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    switch (action) {
      case 'complete_task': {
        const { kid_name, task, notes } = body
        if (!kid_name || !task) return NextResponse.json({ error: 'kid_name and task required' }, { status: 400 })
        await db.query(
          `INSERT INTO belle_care_log (kid_name, care_date, task, completed, completed_at, notes)
           VALUES ($1, $2, $3, TRUE, NOW(), $4)
           ON CONFLICT (kid_name, care_date, task)
           DO UPDATE SET completed = TRUE, completed_at = NOW(), notes = $4`,
          [kid_name.toLowerCase(), today, task, notes || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'uncomplete_task': {
        const { kid_name, task } = body
        if (!kid_name || !task) return NextResponse.json({ error: 'kid_name and task required' }, { status: 400 })
        await db.query(
          `UPDATE belle_care_log SET completed = FALSE, completed_at = NULL
           WHERE kid_name = $1 AND care_date = $2 AND task = $3`,
          [kid_name.toLowerCase(), today, task]
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
