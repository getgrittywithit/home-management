import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

/**
 * Check daily patterns for a kid — called on checklist load, runs once per day per kid.
 * Detects: broken streaks, zone neglect, low mood patterns, break spikes, task completion cliffs.
 */
export async function checkDailyPatterns(kidName: string) {
  const kid = kidName.toLowerCase()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  // Debounce: only run once per kid per day
  try {
    const already = await db.query(
      `SELECT 1 FROM completion_velocity_log WHERE kid_name = $1 AND log_date = $2`,
      [kid, today]
    )
    if (already.length > 0) return // Already checked today
  } catch {}

  const kidDisplay = kid.charAt(0).toUpperCase() + kid.slice(1)

  // STREAK-1: Zone chores incomplete 3+ consecutive days
  try {
    const zoneMisses = await db.query(
      `SELECT COUNT(*)::int as count FROM kid_daily_checklist
       WHERE child_name = $1 AND event_id LIKE 'zone-%' AND completed = FALSE
       AND event_date >= CURRENT_DATE - INTERVAL '3 days'`,
      [kid]
    )
    if ((zoneMisses[0]?.count || 0) >= 3) {
      await createNotification({
        title: `${kidDisplay} zone chores`,
        message: 'Zone chores incomplete for 3+ days',
        source_type: 'pattern_alert', source_ref: `streak-zone-${kid}`,
        link_tab: 'kids-checklist', icon: '⚠️',
      })
    }
  } catch {}

  // SAFETY-1: 3-day low mood (≤2)
  try {
    const moods = await db.query(
      `SELECT mood FROM kid_mood_log WHERE child_name = $1 AND log_date >= CURRENT_DATE - INTERVAL '3 days' ORDER BY log_date DESC LIMIT 3`,
      [kid]
    )
    if (moods.length >= 3 && moods.every((m: any) => (m.mood || m.mood_score || 5) <= 2)) {
      await createNotification({
        title: `Check on ${kidDisplay}`,
        message: 'Low mood for 3+ consecutive days',
        source_type: 'crisis_detection', source_ref: `safety-mood-${kid}`,
        link_tab: 'health', icon: '💛',
      })
    }
  } catch {}

  // SAFETY-1: Break request spike (3+ in a week)
  try {
    const breaks = await db.query(
      `SELECT COUNT(*)::int as count FROM kid_break_flags WHERE kid_name = $1 AND flagged_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [kid]
    )
    if ((breaks[0]?.count || 0) >= 3) {
      await createNotification({
        title: `${kidDisplay} break requests`,
        message: `${breaks[0].count} break requests this week`,
        source_type: 'break_spike', source_ref: `safety-break-${kid}`,
        link_tab: 'health', icon: '🌿',
      })
    }
  } catch {}

  // SAFETY-1: Task completion cliff (50%+ drop from 7-day average)
  try {
    const recent = await db.query(
      `SELECT COUNT(*) FILTER (WHERE completed)::int as done, COUNT(*)::int as total
       FROM kid_daily_checklist WHERE child_name = $1 AND event_date >= CURRENT_DATE - INTERVAL '3 days'`,
      [kid]
    )
    const prior = await db.query(
      `SELECT COUNT(*) FILTER (WHERE completed)::int as done, COUNT(*)::int as total
       FROM kid_daily_checklist WHERE child_name = $1 AND event_date BETWEEN CURRENT_DATE - INTERVAL '10 days' AND CURRENT_DATE - INTERVAL '4 days'`,
      [kid]
    )
    const recentPct = (recent[0]?.total || 0) > 0 ? recent[0].done / recent[0].total : 1
    const priorPct = (prior[0]?.total || 0) > 0 ? prior[0].done / prior[0].total : 1
    if (priorPct > 0.5 && recentPct < priorPct * 0.5) {
      await createNotification({
        title: `${kidDisplay}'s tasks dropped`,
        message: 'Task completion dropped significantly from last week',
        source_type: 'completion_cliff', source_ref: `safety-cliff-${kid}`,
        link_tab: 'kids-checklist', icon: '📉',
      })
    }
  } catch {}
}

/**
 * Compute completion velocity for a kid on a given date.
 * Analyzes timestamp patterns to detect batch-clicking.
 */
export async function computeVelocity(kidName: string, date: string) {
  const kid = kidName.toLowerCase()

  try {
    const tasks = await db.query(
      `SELECT event_id, completed_at FROM kid_daily_checklist
       WHERE child_name = $1 AND event_date = $2 AND completed = TRUE AND completed_at IS NOT NULL
       ORDER BY completed_at`,
      [kid, date]
    )
    if (tasks.length === 0) return

    const timestamps = tasks.map((t: any) => new Date(t.completed_at).getTime())

    // Rapid completion: 5+ tasks within 2 minutes
    let rapidCount = 0
    for (let i = 0; i < timestamps.length - 4; i++) {
      if (timestamps[i + 4] - timestamps[i] < 120000) rapidCount++
    }

    // Completion windows: distinct 30-min blocks
    const blocks = new Set(timestamps.map((t: number) => Math.floor(t / 1800000)))
    const completionWindows = blocks.size

    // Cluster score
    let clusterScore = 'distributed'
    if (completionWindows === 1) clusterScore = rapidCount > 0 ? 'rapid_batch' : 'clustered'
    else if (completionWindows === 2) clusterScore = 'mixed'

    await db.query(
      `INSERT INTO completion_velocity_log (kid_name, log_date, total_tasks, completed_tasks, rapid_completion_count, earliest_completion, latest_completion, completion_windows, cluster_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (kid_name, log_date) DO UPDATE SET
         total_tasks = EXCLUDED.total_tasks, completed_tasks = EXCLUDED.completed_tasks,
         rapid_completion_count = EXCLUDED.rapid_completion_count, cluster_score = EXCLUDED.cluster_score`,
      [kid, date, tasks.length, tasks.length, rapidCount,
       new Date(Math.min(...timestamps)).toTimeString().slice(0, 8),
       new Date(Math.max(...timestamps)).toTimeString().slice(0, 8),
       completionWindows, clusterScore]
    )
  } catch {}
}
