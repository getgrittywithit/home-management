import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getKidZone } from '@/lib/zoneRotation'
import { BELLE_WEEKEND_ROTATION } from '@/lib/constants'

const BELLE_WEEKDAY: Record<number, string> = { 1: 'Kaylee', 2: 'Amos', 3: 'Hannah', 4: 'Wyatt', 5: 'Ellie' }
const DINNER_MANAGERS: Record<number, string> = { 1: 'Kaylee', 2: 'Zoey', 3: 'Wyatt', 4: 'Amos', 5: 'Ellie & Hannah', 6: 'Parents', 0: 'Parents' }
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_focus_view'

  try {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const todayStr = now.toLocaleDateString('en-CA')
    const dow = now.getDay()
    const dayName = DAY_NAMES[dow]

    if (action === 'get_focus_view' || action === 'overview_summary') {
      // 1. Action items (needs attention + quick wins)
      const actionItems = await db.query(
        `SELECT * FROM action_items WHERE status NOT IN ('done','dismissed') ORDER BY
           CASE WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN 0
                WHEN due_date = CURRENT_DATE THEN 1
                WHEN priority = 'urgent' THEN 2
                WHEN priority = 'high' THEN 3
                ELSE 4 END,
           due_date ASC NULLS LAST, created_at DESC
         LIMIT 20`
      ).catch(() => [])

      // Needs Attention only surfaces urgent/high priority items.
      // Low-priority items (e.g. mis-tagged email noise) never bubble up here even if overdue —
      // they live on their board and the user can browse to them, but they don't interrupt focus.
      const isAttentionWorthy = (i: any) => i.priority === 'urgent' || i.priority === 'high'
      const overdue = actionItems.filter((i: any) => i.due_date && new Date(i.due_date) < new Date(todayStr) && isAttentionWorthy(i))
      const dueToday = actionItems.filter((i: any) => (i.due_date === todayStr || !i.due_date) && isAttentionWorthy(i))
      const quickWins = actionItems.filter((i: any) => !i.due_date && i.priority === 'normal')

      // 2. Today's calendar events
      const events = await db.query(
        `SELECT title, start_time, end_time, location, calendar_name FROM calendar_events_cache
          WHERE start_time::date = $1 ORDER BY start_time LIMIT 10`,
        [todayStr]
      ).catch(() => [])

      // 3. Today's checklist
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - ((dow + 6) % 7))
      const wsStr = weekStart.toLocaleDateString('en-CA')

      const checklist = await db.query(
        `SELECT id, task_label, category, completed, completed_at FROM parent_weekly_checklist
          WHERE day_of_week = $1 AND is_recurring = TRUE
          ORDER BY category, task_label`,
        [dayName]
      ).catch(() => [])

      // 4. Kid check-in
      const kidSummary = await db.query(
        `SELECT dp.kid_name, dp.stars_balance, dp.streak_days, dp.happiness, dp.level
           FROM digi_pets dp ORDER BY dp.kid_name`
      ).catch(() => [])

      const kidChecklist = await db.query(
        `SELECT child_name, COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE completed)::int AS done
           FROM kid_daily_checklist WHERE event_date = $1
           GROUP BY child_name`, [todayStr]
      ).catch(() => [])

      const kidMap: Record<string, any> = {}
      for (const k of kidSummary) {
        kidMap[k.kid_name] = { ...k, tasks_done: 0, tasks_total: 0 }
      }
      for (const c of kidChecklist) {
        if (kidMap[c.child_name]) {
          kidMap[c.child_name].tasks_done = c.done
          kidMap[c.child_name].tasks_total = c.total
        }
      }

      // 4b. Unanswered messages + pending requests (BUG-6)
      const unansweredMsgs = await db.query(
        `SELECT id, from_kid, message, created_at FROM family_messages
          WHERE parent_reply IS NULL AND archived_at IS NULL
          ORDER BY created_at DESC LIMIT 5`
      ).catch(() => [])
      const pendingRequests = await db.query(
        `SELECT 'grocery' AS type, name AS title, kid_name, created_at FROM kid_grocery_requests WHERE status = 'pending'
         UNION ALL
         SELECT 'calendar', event_title, kid_name, created_at FROM kid_calendar_requests WHERE status = 'pending'
         UNION ALL
         SELECT 'health', description, kid_name, created_at FROM kid_health_requests WHERE status = 'pending'
         ORDER BY created_at DESC LIMIT 5`
      ).catch(() => [])

      // 5. Email summary
      const emailCounts = await db.query(
        `SELECT category, COUNT(*)::int AS count FROM email_inbox
          WHERE archived_at IS NULL GROUP BY category`
      ).catch(() => [])
      const importantCats = ['school_urgent', 'school_normal', 'medical', 'triton_lead', 'triton_ops']
      const importantCount = emailCounts.filter((e: any) => importantCats.includes(e.category)).reduce((s: number, e: any) => s + e.count, 0)
      const noiseCount = emailCounts.filter((e: any) => e.category === 'noise').reduce((s: number, e: any) => s + e.count, 0)
      const subsCount = emailCounts.filter((e: any) => e.category === 'subscriptions').reduce((s: number, e: any) => s + e.count, 0)

      // 6. Household — check for overrides first, fall back to static rotation
      const belleOverride = await db.query(
        `SELECT assigned_to FROM household_overrides WHERE override_date = $1 AND override_type = 'belle_duty'`, [todayStr]
      ).catch(() => [])
      const dinnerOverride = await db.query(
        `SELECT assigned_to FROM household_overrides WHERE override_date = $1 AND override_type = 'dinner_manager'`, [todayStr]
      ).catch(() => [])
      const belleSwap = await db.query(
        `SELECT covering_kid FROM belle_care_swaps WHERE swap_date = $1 AND status = 'accepted' LIMIT 1`, [todayStr]
      ).catch(() => [])
      // Weekend Belle rotation: same anchor + order as Dashboard.tsx / BelleCareCard.tsx
      const BELLE_ANCHOR_MS = new Date(2026, 2, 28).getTime()
      let weekendKid = 'Weekend rotation'
      if (dow === 0 || dow === 6) {
        const satDate = dow === 0 ? new Date(now.getTime() - 86400000) : now
        const weeksSince = Math.floor((satDate.getTime() - BELLE_ANCHOR_MS) / (7 * 86400000))
        const idx = ((weeksSince % 5) + 5) % 5
        weekendKid = BELLE_WEEKEND_ROTATION[idx].charAt(0).toUpperCase() + BELLE_WEEKEND_ROTATION[idx].slice(1)
      }
      const belleKid = belleOverride[0]?.assigned_to || belleSwap[0]?.covering_kid || BELLE_WEEKDAY[dow] || weekendKid
      const dinnerManager = dinnerOverride[0]?.assigned_to || DINNER_MANAGERS[dow] || 'Parents'
      const zoneWeek = Math.ceil(((now.getTime() - new Date('2026-03-16').getTime()) / (7 * 86400000))) % 6 || 6

      // 7. Triton pipeline
      const tritonLeads = await db.query(
        `SELECT COUNT(*)::int AS c FROM triton_jobs WHERE status NOT IN ('paid','cancelled','completed')`
      ).catch(() => [{ c: 0 }])

      const result = {
        date: todayStr,
        day_label: now.toLocaleDateString('en-US', { weekday: 'long' }),
        // Needs attention
        attention_items: [...overdue, ...dueToday].slice(0, 5),
        attention_count: overdue.length + dueToday.length,
        // Calendar
        events_today: events,
        events_count: events.length,
        // Quick wins
        quick_wins: quickWins.slice(0, 5),
        quick_wins_count: quickWins.length,
        // Checklist
        checklist,
        checklist_done: checklist.filter((c: any) => c.completed).length,
        checklist_total: checklist.length,
        // Kids
        kids: Object.values(kidMap),
        kids_on_track: Object.values(kidMap).filter((k: any) => k.tasks_total === 0 || k.tasks_done / Math.max(k.tasks_total, 1) > 0.5).length,
        kid_flag: Object.values(kidMap).find((k: any) => k.tasks_total > 0 && k.tasks_done / k.tasks_total < 0.3),
        // Unanswered messages + pending requests
        unanswered_messages: unansweredMsgs,
        unanswered_count: unansweredMsgs.length,
        pending_requests: pendingRequests,
        pending_count: pendingRequests.length,
        // Email
        email_important: importantCount,
        email_noise: noiseCount,
        email_subs: subsCount,
        email_clearable: noiseCount + subsCount,
        // Household
        household: { belle: belleKid, dinner: dinnerManager, zone_week: zoneWeek },
        // Triton
        triton_active: (tritonLeads as any[])[0]?.c || 0,
        // Inbox (unsorted)
        inbox_items: actionItems.filter((i: any) => !i.due_date && !['urgent', 'high'].includes(i.priority)).slice(0, 5),
        inbox_count: actionItems.filter((i: any) => !i.due_date && !['urgent', 'high'].includes(i.priority)).length,
      }

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('My Focus GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'complete_checklist_item': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE parent_weekly_checklist SET completed = NOT completed, completed_at = CASE WHEN completed THEN NULL ELSE NOW() END WHERE id = $1`,
          [id]
        )
        return NextResponse.json({ success: true })
      }

      case 'add_task': {
        const { title, category, priority, due_date, board } = body
        if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
        const targetBoard = board || 'personal'
        const colMap: Record<string, string> = { triton: 'leads', personal: 'inbox', school: 'inbox', medical: 'inbox', household: 'inbox' }
        const rows = await db.query(
          `INSERT INTO action_items (title, category, priority, due_date, board, column_name, source_type)
           VALUES ($1, $2, $3, $4, $5, $6, 'manual') RETURNING *`,
          [title.trim(), category || null, priority || 'normal', due_date || null, targetBoard, colMap[targetBoard] || 'inbox']
        )
        return NextResponse.json({ item: rows[0] }, { status: 201 })
      }

      case 'complete_task': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE action_items SET status = 'done', column_name = 'done', completed_at = NOW() WHERE id = $1`, [id]
        )
        return NextResponse.json({ success: true })
      }

      case 'snooze_task': {
        const { id, days } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const d = days || 1
        await db.query(
          `UPDATE action_items SET due_date = CURRENT_DATE + $2 WHERE id = $1`, [id, d]
        )
        return NextResponse.json({ success: true })
      }

      case 'dismiss_task': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE action_items SET status = 'dismissed' WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'dismiss_alert': {
        const { alert_key } = body
        if (!alert_key) return NextResponse.json({ error: 'alert_key required' }, { status: 400 })
        await db.query(
          `INSERT INTO parent_alert_dismissals (alert_key) VALUES ($1) ON CONFLICT (alert_key) DO NOTHING`,
          [alert_key]
        ).catch(() => {})
        return NextResponse.json({ dismissed: true })
      }

      case 'get_dismissed_alerts': {
        const rows = await db.query(`SELECT alert_key FROM parent_alert_dismissals`).catch(() => [])
        return NextResponse.json({ keys: rows.map((r: any) => r.alert_key) })
      }

      case 'restore_alerts': {
        await db.query(`DELETE FROM parent_alert_dismissals`).catch(() => {})
        return NextResponse.json({ restored: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('My Focus POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
