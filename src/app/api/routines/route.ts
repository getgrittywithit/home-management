import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_routine'
  const kidName = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_routine') {
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const routines = await db.query(
        `SELECT * FROM daily_routines WHERE kid_name = $1 ORDER BY routine_type`, [kidName]
      ).catch(() => [])
      const today = new Date().toLocaleDateString('en-CA')
      const completions = await db.query(
        `SELECT * FROM routine_completions WHERE kid_name = $1 AND completion_date = $2`, [kidName, today]
      ).catch(() => [])
      const streaks = await db.query(
        `SELECT * FROM routine_streaks WHERE kid_name = $1`, [kidName]
      ).catch(() => [])
      return NextResponse.json({ routines, completions, streaks })
    }

    if (action === 'get_activities') {
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const now = new Date()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
      const weekStart = monday.toLocaleDateString('en-CA')

      const logs = await db.query(
        `SELECT * FROM activity_logs WHERE kid_name = $1 AND logged_at >= $2 ORDER BY logged_at DESC`,
        [kidName, weekStart]
      ).catch(() => [])
      const goal = await db.query(
        `SELECT * FROM activity_goals WHERE kid_name = $1`, [kidName]
      ).catch(() => [])
      return NextResponse.json({ logs, goal: goal[0] || { weekly_goal: 3, min_duration: 10 }, week_start: weekStart })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Routines GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'toggle_routine_item': {
        const { kid_name, routine_type, item_name } = body
        if (!kid_name || !routine_type || !item_name) return NextResponse.json({ error: 'kid_name, routine_type, item_name required' }, { status: 400 })
        const kid = kid_name.toLowerCase()
        const today = new Date().toLocaleDateString('en-CA')

        const existing = await db.query(
          `SELECT * FROM routine_completions WHERE kid_name = $1 AND routine_type = $2 AND completion_date = $3`,
          [kid, routine_type, today]
        ).catch(() => [])

        let items: any[] = existing[0]?.items_completed || []
        const idx = items.findIndex((i: any) => i.name === item_name)
        if (idx >= 0) {
          items = items.filter((_: any, i: number) => i !== idx)
        } else {
          items.push({ name: item_name, completed_at: new Date().toISOString() })
        }

        const routine = await db.query(
          `SELECT items FROM daily_routines WHERE kid_name = $1 AND routine_type = $2`, [kid, routine_type]
        ).catch(() => [])
        const totalItems = (routine[0]?.items || []).length
        const allComplete = items.length >= totalItems && totalItems > 0

        await db.query(
          `INSERT INTO routine_completions (kid_name, routine_type, completion_date, items_completed, all_complete)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (kid_name, routine_type, completion_date) DO UPDATE SET
             items_completed = $4, all_complete = $5`,
          [kid, routine_type, today, JSON.stringify(items), allComplete]
        )

        // Update streak if all complete
        if (allComplete) {
          await db.query(
            `INSERT INTO routine_streaks (kid_name, routine_type, current_streak, best_streak, last_completed_date)
             VALUES ($1, $2, 1, 1, $3)
             ON CONFLICT (kid_name, routine_type) DO UPDATE SET
               current_streak = CASE
                 WHEN routine_streaks.last_completed_date = ($3::date - 1) THEN routine_streaks.current_streak + 1
                 WHEN routine_streaks.last_completed_date = $3::date THEN routine_streaks.current_streak
                 ELSE 1
               END,
               best_streak = GREATEST(routine_streaks.best_streak,
                 CASE WHEN routine_streaks.last_completed_date = ($3::date - 1) THEN routine_streaks.current_streak + 1 ELSE 1 END),
               last_completed_date = $3`,
            [kid, routine_type, today]
          )
        }

        return NextResponse.json({ success: true, items_completed: items, all_complete: allComplete })
      }

      case 'update_routine': {
        const { kid_name, routine_type, items } = body
        if (!kid_name || !routine_type || !items) return NextResponse.json({ error: 'kid_name, routine_type, items required' }, { status: 400 })
        await db.query(
          `UPDATE daily_routines SET items = $3, updated_at = NOW() WHERE kid_name = $1 AND routine_type = $2`,
          [kid_name.toLowerCase(), routine_type, JSON.stringify(items)]
        )
        return NextResponse.json({ success: true })
      }

      case 'log_activity': {
        const { kid_name, activity_type, duration_minutes, notes } = body
        if (!kid_name || !activity_type) return NextResponse.json({ error: 'kid_name + activity_type required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO activity_logs (kid_name, activity_type, duration_minutes, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
          [kid_name.toLowerCase(), activity_type, duration_minutes || null, notes || null]
        )
        return NextResponse.json({ log: rows[0] }, { status: 201 })
      }

      case 'update_activity_goal': {
        const { kid_name, weekly_goal, min_duration } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        await db.query(
          `UPDATE activity_goals SET weekly_goal = COALESCE($2, weekly_goal), min_duration = COALESCE($3, min_duration), updated_at = NOW() WHERE kid_name = $1`,
          [kid_name.toLowerCase(), weekly_goal ?? null, min_duration ?? null]
        )
        return NextResponse.json({ success: true })
      }

      case 'toggle_med_pause': {
        const { medication_id, paused, pause_reason } = body
        if (!medication_id) return NextResponse.json({ error: 'medication_id required' }, { status: 400 })
        await db.query(
          `UPDATE medications SET paused = $2, paused_at = CASE WHEN $2 THEN NOW() ELSE NULL END, pause_reason = CASE WHEN $2 THEN $3 ELSE NULL END WHERE id = $1`,
          [medication_id, paused ?? false, pause_reason || null]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Routines POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
