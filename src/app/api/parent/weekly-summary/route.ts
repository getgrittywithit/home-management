import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { ALL_KIDS, KID_DISPLAY as DISPLAY_NAMES } from '@/lib/constants'
const CYCLE_KIDS = ['ellie', 'hannah', 'kaylee', 'zoey']
const MOOD_EMOJIS: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '😊', 5: '😄' }

function getWeekRange(): { weekStart: string; weekEnd: string; weekOf: string } {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dow + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    weekStart: monday.toLocaleDateString('en-CA'),
    weekEnd: sunday.toLocaleDateString('en-CA'),
    weekOf: monday.toLocaleDateString('en-CA'),
  }
}

export async function GET() {
  try {
    const { weekStart, weekEnd, weekOf } = getWeekRange()
    const lastWeekStart = new Date(weekStart + 'T12:00:00')
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekStartStr = lastWeekStart.toLocaleDateString('en-CA')
    const lastWeekEndStr = new Date(lastWeekStart.getTime() + 6 * 86400000).toLocaleDateString('en-CA')

    // 6 queries via Promise.all, each with try/catch
    const [choresRes, moodRes, lastMoodRes, pointsRes, healthRes, familyGoalsRes] = await Promise.all([
      // 1. Chores: all kids' checklist completions this week
      db.query(
        `SELECT child_name, event_id, completed FROM kid_daily_checklist
         WHERE event_date >= $1 AND event_date <= $2`,
        [weekStart, weekEnd]
      ).catch(() => []),

      // 2. Mood: this week's entries + break flags
      db.query(
        `SELECT kid_name, log_date, mood_score FROM kid_mood_log
         WHERE log_date >= $1 AND log_date <= $2 ORDER BY log_date`,
        [weekStart, weekEnd]
      ).catch(() => []),

      // 3. Last week's mood (for trend)
      db.query(
        `SELECT kid_name, AVG(mood_score)::numeric(3,1) as avg_score FROM kid_mood_log
         WHERE log_date >= $1 AND log_date <= $2 GROUP BY kid_name`,
        [lastWeekStartStr, lastWeekEndStr]
      ).catch(() => []),

      // 4. Points: earned + deducted this week, plus current balance
      db.query(
        `SELECT b.kid_name, b.current_points,
           COALESCE(SUM(CASE WHEN l.transaction_type = 'earned' THEN l.points ELSE 0 END), 0)::int as earned,
           COALESCE(SUM(CASE WHEN l.transaction_type = 'deducted' THEN l.points ELSE 0 END), 0)::int as deducted
         FROM kid_points_balance b
         LEFT JOIN kid_points_log l ON l.kid_name = b.kid_name AND l.logged_date >= $1 AND l.logged_date <= $2
         GROUP BY b.kid_name, b.current_points`,
        [weekStart, weekEnd]
      ).catch(() => []),

      // 5. Health: open requests, sick days, break flags, dental (combined query approach)
      db.query(
        `SELECT
           'sick' as type, kid_name, sick_date::text as detail FROM kid_sick_days WHERE sick_date >= $1 AND sick_date <= $2
         UNION ALL
           SELECT 'break' as type, kid_name, flagged_at::text FROM kid_break_flags WHERE acknowledged = FALSE AND flagged_at >= ($1 || ' 00:00:00')::timestamptz
         UNION ALL
           SELECT 'dental' as type, kid_name, session_date::text FROM kid_reading_sessions WHERE FALSE`,
        [weekStart, weekEnd]
      ).catch(() => []),

      // 6. Family goals
      db.query(
        `SELECT goal_name as title, current_points as current, target_points as target FROM family_goals WHERE completed = FALSE`
      ).catch(() => []),
    ])

    // Process per-kid data
    const chores = choresRes as any[]
    const moods = moodRes as any[]
    const lastMoods = lastMoodRes as any[]
    const points = pointsRes as any[]
    const health = healthRes as any[]
    const familyGoals = (familyGoalsRes as any[]).map((g: any) => ({
      title: g.title, current: g.current || 0, target: g.target || 0,
      pct: g.target > 0 ? Math.round(((g.current || 0) / g.target) * 100) : 0,
    }))

    const lastMoodMap: Record<string, number> = {}
    lastMoods.forEach((r: any) => { lastMoodMap[r.kid_name] = parseFloat(r.avg_score) })

    const kids = ALL_KIDS.map(kid => {
      // Chores
      const kidChores = chores.filter((c: any) => c.child_name === kid)
      const required = kidChores.filter((c: any) => !c.event_id.startsWith('hygiene-') && !c.event_id.startsWith('earn-'))
      const requiredDone = required.filter((c: any) => c.completed).length
      const requiredTotal = required.length || 1
      const choresPct = Math.round((requiredDone / requiredTotal) * 100)

      // Count unique days with incomplete tasks
      const dayMap: Record<string, boolean> = {}
      required.forEach((c: any) => {
        const date = c.event_date || ''
        if (!c.completed) dayMap[date] = true
      })
      const missedDays = Object.keys(dayMap).length

      // Mood
      const kidMoods = moods.filter((m: any) => m.kid_name === kid)
      const moodScores = kidMoods.map((m: any) => m.mood_score)
      const avgMood = moodScores.length > 0 ? Math.round((moodScores.reduce((a: number, b: number) => a + b, 0) / moodScores.length) * 10) / 10 : null
      const lastAvg = lastMoodMap[kid]
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (avgMood !== null && lastAvg !== undefined) {
        if (avgMood - lastAvg > 0.5) trend = 'up'
        else if (lastAvg - avgMood > 0.5) trend = 'down'
      }

      // Build Mon-Sun mood array
      const weekStartDate = new Date(weekStart + 'T12:00:00')
      const scores: (number | null)[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartDate.getTime() + i * 86400000).toLocaleDateString('en-CA')
        const entry = kidMoods.find((m: any) => {
          const mDate = m.log_date?.toISOString?.()?.slice(0, 10) || String(m.log_date).slice(0, 10)
          return mDate === d
        })
        scores.push(entry ? entry.mood_score : null)
      }

      // Points
      const kidPts = points.find((p: any) => p.kid_name === kid)

      // Health flags
      const sickDays = health.filter((h: any) => h.type === 'sick' && h.kid_name === kid).length
      const breakFlag = health.some((h: any) => h.type === 'break' && h.kid_name === kid)

      // Build flags
      const flags: string[] = []
      if (avgMood !== null && avgMood < 2.5) flags.push('mood_low')
      if (breakFlag) flags.push('break_flag')
      if (choresPct < 50 && requiredTotal > 1) flags.push('chores_low')
      if (sickDays > 0) flags.push('sick')

      return {
        name: kid,
        displayName: DISPLAY_NAMES[kid],
        flags,
        chores: { requiredDone, requiredTotal, pct: choresPct, missedDays },
        mood: { avg: avgMood, trend, scores, breakFlagThisWeek: breakFlag },
        points: {
          earnedThisWeek: kidPts?.earned || 0,
          deductedThisWeek: kidPts?.deducted || 0,
          currentBalance: kidPts?.current_points || 0,
        },
        dental: { streak: 0, completedThisWeek: 0, totalThisWeek: 7 },
        health: { openRequests: 0, sickDaysThisWeek: sickDays },
        cycle: CYCLE_KIDS.includes(kid) ? { note: null } : null,
      }
    })

    const flaggedKids = kids.filter(k => k.flags.length > 0).map(k => k.name)

    return NextResponse.json({ weekOf, kids, flaggedKids, familyGoalProgress: familyGoals })
  } catch (error) {
    console.error('Weekly summary error:', error)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
