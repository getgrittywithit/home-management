import { db } from '@/lib/database'

export type ToneLevel = 'green' | 'yellow' | 'red'

/**
 * TONE-1: Determine tone context for a kid based on recent data.
 * Returns 'green' (doing well), 'yellow' (needs attention), or 'red' (struggling).
 */
export async function getToneContext(kidName: string): Promise<ToneLevel> {
  const kid = kidName.toLowerCase()
  let score = 0 // Positive = green, negative = red

  try {
    // Recent mood (last 3 days)
    const moods = await db.query(
      `SELECT mood FROM kid_mood_log WHERE child_name = $1 AND log_date >= CURRENT_DATE - INTERVAL '3 days' ORDER BY log_date DESC LIMIT 3`,
      [kid]
    ).catch(() => [])
    if (moods.length > 0) {
      const avg = moods.reduce((s: number, m: any) => s + (m.mood || m.mood_score || 3), 0) / moods.length
      if (avg >= 4) score += 2
      else if (avg >= 3) score += 1
      else if (avg <= 2) score -= 2
      else score -= 1
    }

    // Task completion (today + yesterday)
    const tasks = await db.query(
      `SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE completed = TRUE)::int as done
       FROM kid_daily_checklist
       WHERE child_name = $1 AND event_date >= CURRENT_DATE - INTERVAL '1 day'`,
      [kid]
    ).catch(() => [])
    if (tasks[0] && tasks[0].total > 0) {
      const pct = tasks[0].done / tasks[0].total
      if (pct >= 0.8) score += 1
      else if (pct < 0.4) score -= 2
    }

    // Safety events (last 7 days)
    const safety = await db.query(
      `SELECT COUNT(*)::int as count FROM safety_events WHERE kid_name = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [kid]
    ).catch(() => [])
    if ((safety[0]?.count || 0) > 0) score -= 2

    // Break requests (last 3 days)
    const breaks = await db.query(
      `SELECT COUNT(*)::int as count FROM kid_break_flags WHERE kid_name = $1 AND flagged_at >= CURRENT_DATE - INTERVAL '3 days'`,
      [kid]
    ).catch(() => [])
    if ((breaks[0]?.count || 0) >= 2) score -= 1

  } catch { /* partial data is fine — default to green */ }

  if (score <= -2) return 'red'
  if (score <= 0) return 'yellow'
  return 'green'
}

/**
 * Get tone-appropriate message prefix for notifications and UI.
 */
export function toneMessage(level: ToneLevel, kidName: string): { icon: string; prefix: string } {
  const display = kidName.charAt(0).toUpperCase() + kidName.slice(1)
  switch (level) {
    case 'red': return { icon: '💛', prefix: `${display} could use some support` }
    case 'yellow': return { icon: '📋', prefix: `${display} is working through some things` }
    case 'green': return { icon: '🌟', prefix: `${display} is doing great` }
  }
}
