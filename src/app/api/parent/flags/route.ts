import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'get_all_flags') {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const kids = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']

      const [messages, breaks, sickDays, missedChores, petCare, upcomingMeetings, zoneStatus, checklistStatus, pointsToday, mealRequests, upcomingMeetings30d, expiringExemptions, expiringDocuments] = await Promise.all([
        // Unread messages
        db.query(`SELECT from_kid, COUNT(*)::int as count FROM family_messages WHERE read_at IS NULL GROUP BY from_kid`).catch(() => []),

        // Break requests
        db.query(`SELECT kid_name, flagged_at as created_at FROM kid_break_flags WHERE acknowledged = FALSE AND flagged_at::date = $1`, [today]).catch(() => []),

        // Sick day self-reports today
        db.query(`SELECT kid_name, sick_date FROM kid_sick_days WHERE sick_date = $1`, [today]).catch(() => []),

        // Yesterday's incomplete zone chores
        (async () => {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
          try {
            const rows = await db.query(
              `SELECT child_name, event_id FROM kid_daily_checklist
               WHERE event_date = $1 AND event_id LIKE 'zone-%' AND completed = FALSE`,
              [yStr]
            )
            return rows
          } catch { return [] }
        })(),

        // Pet care overdue
        (async () => {
          const flags: { pet: string; issue: string; severity: string }[] = []
          try {
            // Hades (snake) - flag if last feeding > 7 days
            const hades = await db.query(`SELECT fed_date FROM pet_feeding_log WHERE pet_key = 'hades' ORDER BY fed_date DESC LIMIT 1`)
            if (hades.length > 0) {
              const daysSince = Math.floor((Date.now() - new Date(hades[0].fed_date).getTime()) / (1000 * 60 * 60 * 24))
              if (daysSince > 7) flags.push({ pet: 'Hades', issue: `last feeding ${daysSince} days ago`, severity: 'warning' })
            }
            // Spike (lizard) - flag if last bath > 5 days
            const spike = await db.query(`SELECT completed_at FROM zone_task_rotation WHERE zone_key = 'spike_care' AND completed = TRUE ORDER BY completed_at DESC LIMIT 1`).catch(() => [])
            if (spike.length > 0) {
              const daysSince = Math.floor((Date.now() - new Date(spike[0].completed_at).getTime()) / (1000 * 60 * 60 * 24))
              if (daysSince > 5) flags.push({ pet: 'Spike', issue: `last bath ${daysSince} days ago`, severity: 'warning' })
            }
            // Midnight (rabbit) - flag if cage clean > 3 days
            const midnight = await db.query(`SELECT completed_at FROM zone_task_rotation WHERE zone_key = 'midnight_care' AND completed = TRUE ORDER BY completed_at DESC LIMIT 1`).catch(() => [])
            if (midnight.length > 0) {
              const daysSince = Math.floor((Date.now() - new Date(midnight[0].completed_at).getTime()) / (1000 * 60 * 60 * 24))
              if (daysSince > 3) flags.push({ pet: 'Midnight', issue: `cage clean ${daysSince} days ago`, severity: 'warning' })
            }
          } catch { /* swallow */ }
          return flags
        })(),

        // 504/IEP meetings within 7 days
        db.query(
          `SELECT kid_name, next_meeting_date, next_meeting_time, plan_type
           FROM special_ed_plans
           WHERE next_meeting_date IS NOT NULL
           AND next_meeting_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`
        ).catch(() => []),

        // Zone completion today
        (async () => {
          try {
            const rows = await db.query(
              `SELECT child_name,
                      COUNT(*)::int as total,
                      COUNT(*) FILTER (WHERE completed = TRUE)::int as done
               FROM kid_daily_checklist
               WHERE event_date = $1 AND event_id LIKE 'zone-%'
               GROUP BY child_name`,
              [today]
            )
            const completed = rows.filter((r: { done: number; total: number }) => r.done === r.total && r.total > 0).length
            return { completed, total: kids.length }
          } catch { return { completed: 0, total: kids.length } }
        })(),

        // Checklist completion today
        (async () => {
          try {
            const rows = await db.query(
              `SELECT child_name,
                      COUNT(*)::int as total,
                      COUNT(*) FILTER (WHERE completed = TRUE)::int as done
               FROM kid_daily_checklist
               WHERE event_date = $1 AND event_id NOT LIKE 'earn-%' AND event_id NOT LIKE 'hygiene-%'
               GROUP BY child_name`,
              [today]
            )
            const completed = rows.filter((r: { done: number; total: number }) => r.done === r.total && r.total > 0).length
            return { completed, total: kids.length }
          } catch { return { completed: 0, total: kids.length } }
        })(),

        // Points earned today
        db.query(
          `SELECT COALESCE(SUM(points), 0)::int as total
           FROM kid_points_log
           WHERE transaction_type = 'earned' AND created_at::date = $1`,
          [today]
        ).catch(() => [{ total: 0 }]),

        // Pending meal requests
        db.query(
          `SELECT mr.id, mr.kid_name, mr.assigned_date, ml.name as meal_name, ml.theme
           FROM meal_requests mr
           JOIN meal_library ml ON mr.meal_id = ml.id
           WHERE mr.status = 'pending'
           ORDER BY mr.assigned_date`
        ).catch(() => []),

        // Upcoming ARD/504 meetings within 30 days
        db.query(
          `SELECT sp.kid_name, sp.plan_type, sp.next_meeting_date
           FROM kid_special_ed_plans sp
           WHERE sp.status = 'active' AND sp.next_meeting_date IS NOT NULL
           AND sp.next_meeting_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`
        ).catch(() => []),

        // Vaccine exemptions expiring within 60 days
        db.query(
          `SELECT kid_name, display_name, vaccine_exemption_expiry
           FROM student_profiles
           WHERE vaccine_exemption = true AND vaccine_exemption_expiry IS NOT NULL
           AND vaccine_exemption_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'`
        ).catch(() => []),

        // Documents expiring within 30 days
        db.query(
          `SELECT kid_name, doc_type, doc_label, expiration_date
           FROM student_documents
           WHERE expiration_date IS NOT NULL
           AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`
        ).catch(() => []),
      ])

      const totalUnread = (messages as { count: number }[]).reduce((sum: number, r) => sum + r.count, 0)
        + (breaks as unknown[]).length
        + (sickDays as unknown[]).length
        + (mealRequests as unknown[]).length

      return NextResponse.json({
        messages,
        breaks,
        sick_days: sickDays,
        missed_chores: missedChores,
        pet_care: petCare,
        upcoming_meetings: upcomingMeetings,
        upcoming_meetings_30d: upcomingMeetings30d,
        expiring_exemptions: expiringExemptions,
        expiring_documents: expiringDocuments,
        calendar_events: [],
        zone_status: zoneStatus,
        checklist_status: checklistStatus,
        meal_requests: mealRequests,
        points_today: (pointsToday as { total: number }[])[0]?.total || 0,
        total_unread: totalUnread,
      })
    }

    // Quick badge count only (for navbar)
    if (action === 'get_badge_count') {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const [msgCount, breakCount, sickCount, mealCount] = await Promise.all([
        db.query(`SELECT COUNT(*)::int as count FROM family_messages WHERE read_at IS NULL`).catch(() => [{ count: 0 }]),
        db.query(`SELECT COUNT(*)::int as count FROM kid_break_flags WHERE acknowledged = FALSE AND flagged_at::date = $1`, [today]).catch(() => [{ count: 0 }]),
        db.query(`SELECT COUNT(*)::int as count FROM kid_sick_days WHERE sick_date = $1`, [today]).catch(() => [{ count: 0 }]),
        db.query(`SELECT COUNT(*)::int as count FROM meal_requests WHERE status = 'pending'`).catch(() => [{ count: 0 }]),
      ])
      const total = ((msgCount as { count: number }[])[0]?.count || 0)
        + ((breakCount as { count: number }[])[0]?.count || 0)
        + ((sickCount as { count: number }[])[0]?.count || 0)
        + ((mealCount as { count: number }[])[0]?.count || 0)
      return NextResponse.json({ count: total })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Flags API error:', error)
    return NextResponse.json({ error: 'Failed to load flags' }, { status: 500 })
  }
}
