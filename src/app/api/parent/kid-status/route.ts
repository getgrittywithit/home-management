import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const kid = searchParams.get('kid')?.toLowerCase()
  const date = searchParams.get('date')
  if (!kid || !date) return NextResponse.json({ error: 'kid + date required' }, { status: 400 })

  try {
    const tasks = await db.query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE completed = TRUE)::int AS done
       FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2`,
      [kid, date]
    ).catch(() => [{ total: 0, done: 0 }])

    const mood = await db.query(
      `SELECT mood_emoji, TO_CHAR(created_at AT TIME ZONE 'America/Chicago', 'h:MI AM') AS mood_time
       FROM mood_log WHERE kid_name = $1 AND DATE(created_at AT TIME ZONE 'America/Chicago') = $2::date
       ORDER BY created_at DESC LIMIT 1`,
      [kid, date]
    ).catch(() => [])

    const sick = await db.query(
      `SELECT 1 FROM sick_days WHERE kid_name = $1 AND sick_date = $2`,
      [kid, date]
    ).catch(() => [])

    const pets = await db.query(
      `SELECT stars_balance, weekly_stars FROM digi_pets WHERE kid_name = $1`,
      [kid]
    ).catch(() => [])

    const streak = await db.query(
      `SELECT streak_days FROM kid_points_balance WHERE kid_name = $1`,
      [kid]
    ).catch(() => [])

    return NextResponse.json({
      tasks_total: tasks[0]?.total ?? 0,
      tasks_done: tasks[0]?.done ?? 0,
      latest_mood: mood[0]?.mood_emoji ?? null,
      mood_time: mood[0]?.mood_time ?? null,
      is_sick: sick.length > 0,
      streak_days: streak[0]?.streak_days ?? 0,
      stars_balance: pets[0]?.stars_balance ?? 0,
    })
  } catch (e: any) {
    console.error('[kid-status]', e.message)
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }
}
