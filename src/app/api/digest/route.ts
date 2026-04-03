import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    case 'get_latest': {
      const rows = await db.query(
        `SELECT * FROM weekly_digests ORDER BY generated_at DESC LIMIT 1`
      ).catch(() => [])
      return NextResponse.json({ digest: rows[0] || null })
    }

    case 'get_history': {
      const rows = await db.query(
        `SELECT id, week_start, week_end, generated_at FROM weekly_digests ORDER BY generated_at DESC LIMIT 12`
      ).catch(() => [])
      return NextResponse.json({ digests: rows })
    }

    case 'generate': {
      // Collect data for the past 7 days
      const weekEnd = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const weekStartDate = new Date()
      weekStartDate.setDate(weekStartDate.getDate() - 6)
      const weekStart = weekStartDate.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      const digestData: any = { kids: {}, family: {} }

      for (const kid of KIDS) {
        const kidData: any = {}

        // Mood average
        const moods = await db.query(
          `SELECT AVG(COALESCE(mood_score, mood))::numeric(3,1) as avg_mood, COUNT(*)::int as count
           FROM kid_mood_log WHERE child_name = $1 AND log_date BETWEEN $2 AND $3`,
          [kid, weekStart, weekEnd]
        ).catch(() => [])
        kidData.mood_avg = moods[0]?.avg_mood ? parseFloat(moods[0].avg_mood) : null
        kidData.mood_count = moods[0]?.count || 0

        // Task completion
        const tasks = await db.query(
          `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE completed = TRUE)::int as done
           FROM kid_daily_checklist WHERE child_name = $1 AND event_date BETWEEN $2 AND $3`,
          [kid, weekStart, weekEnd]
        ).catch(() => [])
        kidData.tasks_total = tasks[0]?.total || 0
        kidData.tasks_done = tasks[0]?.done || 0
        kidData.completion_pct = kidData.tasks_total > 0 ? Math.round((kidData.tasks_done / kidData.tasks_total) * 100) : 0

        // Break requests
        const breaks = await db.query(
          `SELECT COUNT(*)::int as count FROM kid_break_flags WHERE kid_name = $1 AND flagged_at::date BETWEEN $2 AND $3`,
          [kid, weekStart, weekEnd]
        ).catch(() => [])
        kidData.break_count = breaks[0]?.count || 0

        // Skip count
        const skips = await db.query(
          `SELECT COUNT(*)::int as count FROM kid_daily_checklist WHERE child_name = $1 AND event_date BETWEEN $2 AND $3 AND status = 'skipped'`,
          [kid, weekStart, weekEnd]
        ).catch(() => [])
        kidData.skip_count = skips[0]?.count || 0

        // Safety events
        const safety = await db.query(
          `SELECT COUNT(*)::int as count FROM safety_events WHERE kid_name = $1 AND created_at::date BETWEEN $2 AND $3`,
          [kid, weekStart, weekEnd]
        ).catch(() => [])
        kidData.safety_count = safety[0]?.count || 0

        // Zone streaks
        const streak = await db.query(
          `SELECT streak_type, current_count FROM kid_chore_streaks WHERE kid_name = $1 AND current_count > 0 ORDER BY current_count DESC LIMIT 1`,
          [kid]
        ).catch(() => [])
        kidData.best_streak = streak[0] || null

        // Med adherence
        const meds = await db.query(
          `SELECT COUNT(*)::int as taken FROM medication_adherence_log WHERE LOWER(person_name) = $1 AND log_date BETWEEN $2 AND $3 AND status = 'taken'`,
          [kid, weekStart, weekEnd]
        ).catch(() => [])
        kidData.meds_taken = meds[0]?.taken || 0

        digestData.kids[kid] = kidData
      }

      // Family-level stats
      const allKids = Object.values(digestData.kids) as any[]
      const moodAvgs = allKids.filter(k => k.mood_avg !== null).map(k => k.mood_avg)
      digestData.family.avg_mood = moodAvgs.length > 0 ? (moodAvgs.reduce((a: number, b: number) => a + b, 0) / moodAvgs.length).toFixed(1) : 'N/A'
      digestData.family.avg_completion = allKids.length > 0 ? Math.round(allKids.reduce((a, b) => a + b.completion_pct, 0) / allKids.length) : 0
      digestData.family.total_breaks = allKids.reduce((a, b) => a + b.break_count, 0)
      digestData.family.total_safety = allKids.reduce((a, b) => a + b.safety_count, 0)

      // Generate text digest
      const wins: string[] = []
      const concerns: string[] = []

      for (const [kid, d] of Object.entries(digestData.kids) as [string, any][]) {
        const display = kid.charAt(0).toUpperCase() + kid.slice(1)
        if (d.completion_pct >= 90) wins.push(`${display}: ${d.completion_pct}% task completion`)
        if (d.best_streak?.current_count >= 5) wins.push(`${display}: ${d.best_streak.current_count}-day ${d.best_streak.streak_type} streak`)
        if (d.mood_avg && d.mood_avg <= 2.5) concerns.push(`${display}: mood averaged ${d.mood_avg}/5 — check in`)
        if (d.break_count >= 2) concerns.push(`${display}: ${d.break_count} break requests this week`)
        if (d.safety_count > 0) concerns.push(`${display}: ${d.safety_count} safety event(s) detected`)
        if (d.skip_count >= 3) concerns.push(`${display}: skipped ${d.skip_count} tasks this week`)
      }

      const digestText = [
        `Moses Family — Week of ${weekStart}`,
        '',
        'WINS',
        ...(wins.length > 0 ? wins.map(w => `  ${w}`) : ['  Great week overall!']),
        '',
        ...(concerns.length > 0 ? [
          'NEEDS ATTENTION',
          ...concerns.map(c => `  ${c}`),
          '',
        ] : []),
        'QUICK STATS',
        `  Tasks: ${digestData.family.avg_completion}% family average`,
        `  Mood: ${digestData.family.avg_mood}/5 family average`,
        `  Safety events: ${digestData.family.total_safety}`,
        `  Break requests: ${digestData.family.total_breaks}`,
      ].join('\n')

      // Save
      await db.query(
        `INSERT INTO weekly_digests (week_start, week_end, digest_data, digest_text)
         VALUES ($1, $2, $3, $4)`,
        [weekStart, weekEnd, JSON.stringify(digestData), digestText]
      ).catch(e => console.error('Failed to save digest:', e.message))

      return NextResponse.json({ digest: { week_start: weekStart, week_end: weekEnd, digest_data: digestData, digest_text: digestText } })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
