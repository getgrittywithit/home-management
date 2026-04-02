import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ── Constants ──
const BELLE_KIDS = ['kaylee', 'amos', 'hannah', 'wyatt', 'ellie']

// Weekday assignments — fixed, same every week
const WEEKDAY_MAP: Record<number, string> = { 1: 'kaylee', 2: 'amos', 3: 'hannah', 4: 'wyatt', 5: 'ellie' }
// Reverse lookup: kid -> their fixed weekday number
const KID_WEEKDAY: Record<string, number> = { kaylee: 1, amos: 2, hannah: 3, wyatt: 4, ellie: 5 }

// Weekend rotation — 5-week cycle, anchored March 28, 2026 (Week 1 = Hannah)
const WEEKEND_ROTATION = ['hannah', 'wyatt', 'amos', 'kaylee', 'ellie']
const WEEKEND_ANCHOR_MS = new Date(2026, 2, 28).getTime()
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

const EXTRA_TASK: Record<number, { task: string; label: string; emoji: string } | null> = {
  1: { task: 'poop_patrol', label: 'Poop Patrol', emoji: '💩' },
  2: { task: 'brush_fur', label: 'Brush Fur', emoji: '🐕' },
  3: { task: 'brush_teeth', label: 'Brush Teeth', emoji: '🦷' },
  4: { task: 'poop_patrol', label: 'Poop Patrol', emoji: '💩' },
  5: { task: 'brush_fur', label: 'Brush Fur', emoji: '🐕' },
  6: null, 0: null,
}

const TASK_INFO: Record<string, { label: string; emoji: string; time: string }> = {
  am_feed_walk: { label: 'AM Feed + Walk', emoji: '🐾', time: '7:00 AM' },
  poop_patrol: { label: 'Poop Patrol', emoji: '💩', time: '' },
  brush_fur: { label: 'Brush Fur', emoji: '🐕', time: '' },
  brush_teeth: { label: 'Brush Teeth', emoji: '🦷', time: '' },
  pm_feed: { label: 'PM Feed', emoji: '🍽️', time: '5:00 PM' },
  pm_walk: { label: 'PM Walk', emoji: '🌙', time: '7:00 PM' },
}

const GROOMING_INFO: Record<string, { label: string; emoji: string }> = {
  bath: { label: 'Bath', emoji: '🛁' },
  nail_trim: { label: 'Nail Trim', emoji: '✂️' },
  fur_brush: { label: 'Fur Brush', emoji: '🐕' },
  ear_clean: { label: 'Ear Clean', emoji: '🦻' },
}

const TASK_POINTS: Record<string, number> = {
  am_feed_walk: 8, pm_feed: 4, pm_walk: 6, poop_patrol: 5, brush_fur: 5, brush_teeth: 5,
  bath: 15, nail_trim: 12, fur_brush: 8, ear_clean: 10,
}

const DAY_NAMES: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday' }

// ── Helpers ──
function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function getDow(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay() // 0=Sun..6=Sat
}

function isWeekend(dateStr: string): boolean {
  const d = getDow(dateStr)
  return d === 0 || d === 6
}

function getSaturdayDate(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  if (dow === 6) return d
  if (dow === 0) { d.setDate(d.getDate() - 1); return d }
  d.setDate(d.getDate() + (6 - dow))
  return d
}

function getWeekendAssignee(dateStr: string): string {
  const sat = getSaturdayDate(dateStr)
  const weeksSince = Math.floor((sat.getTime() - WEEKEND_ANCHOR_MS) / MS_PER_WEEK)
  const index = ((weeksSince % 5) + 5) % 5
  return WEEKEND_ROTATION[index]
}

function getRotationWeekNumber(dateStr: string): number {
  const sat = getSaturdayDate(dateStr)
  const weeksSince = Math.floor((sat.getTime() - WEEKEND_ANCHOR_MS) / MS_PER_WEEK)
  return (((weeksSince % 5) + 5) % 5) + 1 // 1..5
}

// Pure function — no DB calls
function getBaseAssignee(dateStr: string): string {
  const dow = getDow(dateStr)
  if (dow >= 1 && dow <= 5) return WEEKDAY_MAP[dow] || ''
  return getWeekendAssignee(dateStr)
}

// Checks for accepted swaps, falls back to base assignee
async function getEffectiveAssignee(dateStr: string): Promise<string> {
  const base = getBaseAssignee(dateStr) || ''
  try {
    const dow = getDow(dateStr)
    if (dow >= 1 && dow <= 5) {
      const swapRows = await db.query(
        `SELECT covering_kid FROM belle_care_swaps WHERE swap_type = 'weekday' AND swap_date = $1 AND status = 'accepted'`,
        [dateStr]
      )
      if (swapRows.length > 0) return swapRows[0].covering_kid
    } else {
      const satDate = dow === 0
        ? new Date(new Date(dateStr + 'T12:00:00').getTime() - 86400000).toLocaleDateString('en-CA')
        : dateStr
      const swapRows = await db.query(
        `SELECT covering_kid FROM belle_care_swaps WHERE swap_type = 'weekend' AND swap_date = $1 AND status = 'accepted'`,
        [satDate]
      )
      if (swapRows.length > 0) return swapRows[0].covering_kid
    }
  } catch { /* DB error — use base assignee */ }
  return base
}

function getDailyTasks(dateStr: string): string[] {
  const dow = getDow(dateStr)
  const tasks = ['am_feed_walk']
  const extra = EXTRA_TASK[dow]
  if (extra) tasks.push(extra.task)
  tasks.push('pm_feed', 'pm_walk')
  return tasks
}

function getGroomingTasks(rotWeek: number): string[] {
  const tasks = ['fur_brush']
  if (rotWeek % 2 === 1) tasks.push('bath')
  if (rotWeek % 2 === 0) tasks.push('nail_trim')
  if (rotWeek === 1) tasks.push('ear_clean')
  return tasks
}

function getSaturdayOfWeek(dateStr: string): string {
  return getSaturdayDate(dateStr).toLocaleDateString('en-CA')
}

function getSundayOfWeek(satDate: string): string {
  const d = new Date(satDate + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA')
}

async function creditPoints(kidName: string, points: number, reason: string) {
  try {
    await db.query(
      `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', $2, $3)`,
      [kidName, points, reason]
    )
    await db.query(
      `UPDATE kid_points_balance SET current_points = current_points + $2, total_earned_all_time = total_earned_all_time + $2, updated_at = NOW() WHERE kid_name = $1`,
      [kidName, points]
    )
  } catch { /* silent */ }
}

async function debitPoints(kidName: string, points: number, reason: string) {
  try {
    await db.query(
      `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'deducted', $2, $3)`,
      [kidName, points, reason]
    )
    await db.query(
      `UPDATE kid_points_balance SET current_points = GREATEST(current_points - $2, 0), updated_at = NOW() WHERE kid_name = $1`,
      [kidName, points]
    )
  } catch { /* silent */ }
}

async function ensureGroomingRows(kidName: string, satDate: string) {
  const sunDate = getSundayOfWeek(satDate)
  const rotWeek = getRotationWeekNumber(satDate)
  const tasks = getGroomingTasks(rotWeek)
  for (const task of tasks) {
    try {
      await db.query(
        `INSERT INTO belle_grooming_log (kid_name, task, due_date, weekend_start) VALUES ($1, $2, $3, $4) ON CONFLICT (due_date, task) DO NOTHING`,
        [kidName, task, sunDate, satDate]
      )
    } catch { /* silent */ }
  }
}

async function getTaskCompletion(dateStr: string): Promise<Record<string, boolean>> {
  try {
    const logs = await db.query(`SELECT task, completed FROM belle_care_log WHERE care_date = $1`, [dateStr])
    const m: Record<string, boolean> = {}
    logs.forEach((r: any) => { m[r.task] = r.completed })
    return m
  } catch { return {} }
}

// ── GET ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const kid = searchParams.get('kid')?.toLowerCase()
    const today = getToday()

    switch (action) {
      case 'get_todays_assignee': {
        const assignee = await getEffectiveAssignee(today)
        const taskKeys = getDailyTasks(today)
        const cMap = await getTaskCompletion(today)
        const tasks = taskKeys.map(k => ({ key: k, ...(TASK_INFO[k] || { label: k, emoji: '', time: '' }), completed: !!cMap[k] }))

        let grooming: any[] = []
        if (isWeekend(today) && assignee) {
          const satDate = getDow(today) === 0
            ? new Date(new Date(today + 'T12:00:00').getTime() - 86400000).toLocaleDateString('en-CA')
            : today
          await ensureGroomingRows(assignee, satDate)
          try {
            const gRows = await db.query(`SELECT task, completed FROM belle_grooming_log WHERE weekend_start = $1`, [satDate])
            grooming = gRows.map((r: any) => ({ key: r.task, ...(GROOMING_INFO[r.task] || { label: r.task, emoji: '' }), completed: r.completed }))
          } catch { /* silent */ }
        }

        return NextResponse.json({ assignee, tasks, grooming, date: today })
      }

      case 'get_my_tasks_today': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const assignee = await getEffectiveAssignee(today)
        if (assignee !== kid) return NextResponse.json({ assigned: false, assignee })

        const taskKeys = getDailyTasks(today)
        const cMap = await getTaskCompletion(today)
        const tasks = taskKeys.map(k => ({ key: k, ...(TASK_INFO[k] || { label: k, emoji: '', time: '' }), completed: !!cMap[k] }))

        let grooming: any[] = []
        if (isWeekend(today)) {
          const satDate = getDow(today) === 0
            ? new Date(new Date(today + 'T12:00:00').getTime() - 86400000).toLocaleDateString('en-CA')
            : today
          await ensureGroomingRows(kid, satDate)
          try {
            const gRows = await db.query(`SELECT task, completed FROM belle_grooming_log WHERE weekend_start = $1`, [satDate])
            grooming = gRows.map((r: any) => ({ key: r.task, ...(GROOMING_INFO[r.task] || { label: r.task, emoji: '' }), completed: r.completed }))
          } catch { /* silent */ }
        }

        return NextResponse.json({ assigned: true, assignee: kid, tasks, grooming, date: today })
      }

      case 'get_my_assignment_info': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })

        // All assignment logic is pure — no DB calls needed
        const assignee = getBaseAssignee(today) || ''
        const isToday = assignee === kid

        const fixedDayNum = KID_WEEKDAY[kid] || null
        const myWeekday = fixedDayNum ? DAY_NAMES[fixedDayNum] : null

        // Next occurrence of their weekday
        const todayDate = new Date(today + 'T12:00:00')
        let nextWeekdayDate: string | null = null
        if (fixedDayNum) {
          for (let i = 1; i <= 7; i++) {
            const d = new Date(todayDate.getTime() + i * 86400000)
            if (d.getDay() === fixedDayNum) { nextWeekdayDate = d.toLocaleDateString('en-CA'); break }
          }
        }
        const daysUntilWeekday = nextWeekdayDate
          ? Math.ceil((new Date(nextWeekdayDate + 'T12:00:00').getTime() - todayDate.getTime()) / 86400000)
          : null

        // Next weekend for this kid (pure math, no DB)
        const thisWeekSat = getSaturdayOfWeek(today)
        let nextWeekendSat: string | null = null
        let nextWeekendDaysAway: number | null = null
        for (let i = 0; i < 10; i++) {
          const sat = new Date(new Date(thisWeekSat + 'T12:00:00').getTime() + i * 7 * 86400000)
          const satStr = sat.toLocaleDateString('en-CA')
          if (satStr < today) continue
          const rotWeek = getRotationWeekNumber(satStr)
          if (WEEKEND_ROTATION[rotWeek - 1] === kid) {
            nextWeekendSat = satStr
            nextWeekendDaysAway = Math.ceil((sat.getTime() - todayDate.getTime()) / 86400000)
            break
          }
        }

        const upcomingWeekendThisWeek = nextWeekendSat === thisWeekSat && getDow(today) >= 3 && getDow(today) <= 5

        // Swap data — wrapped in try/catch so DB issues don't break the response
        let outgoingSwap = null
        let incomingSwaps: any[] = []
        let acceptedCovering: any[] = []
        try {
          const outgoing = await db.query(
            `SELECT id, covering_kid, swap_type, swap_date, status FROM belle_care_swaps WHERE requesting_kid = $1 AND status = 'pending' LIMIT 1`, [kid]
          )
          outgoingSwap = outgoing[0] || null
          incomingSwaps = await db.query(
            `SELECT id, requesting_kid, swap_type, swap_date, reason FROM belle_care_swaps WHERE covering_kid = $1 AND status = 'pending'`, [kid]
          )
          acceptedCovering = await db.query(
            `SELECT requesting_kid, swap_date, swap_type FROM belle_care_swaps WHERE covering_kid = $1 AND status = 'accepted' AND swap_date >= $2`, [kid, today]
          )
        } catch { /* DB error — swaps just won't show */ }

        // Check if an accepted swap overrides today's assignee
        let effectiveIsToday = isToday
        try {
          const effectiveAssignee = await getEffectiveAssignee(today)
          effectiveIsToday = effectiveAssignee === kid
        } catch {
          effectiveIsToday = isToday // fallback to base
        }

        return NextResponse.json({
          isToday: effectiveIsToday, todayAssignee: assignee, myWeekday, nextWeekdayDate, daysUntilWeekday,
          nextWeekendSat, nextWeekendDaysAway, upcomingWeekendThisWeek,
          outgoingSwap, incomingSwaps, acceptedCovering,
        })
      }

      case 'get_weekly_overview': {
        const d = new Date(today + 'T12:00:00')
        const dow = d.getDay()
        const monday = new Date(d)
        monday.setDate(d.getDate() - ((dow + 6) % 7))

        const days = []
        for (let i = 0; i < 7; i++) {
          const dd = new Date(monday)
          dd.setDate(monday.getDate() + i)
          const dateStr = dd.toLocaleDateString('en-CA')
          const assignee = getBaseAssignee(dateStr) || ''
          const taskKeys = getDailyTasks(dateStr)
          const cMap = await getTaskCompletion(dateStr)
          const done = Object.values(cMap).filter(Boolean).length
          days.push({ date: dateStr, dayName: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dd.getDay()], assignee, totalTasks: taskKeys.length, completedTasks: done })
        }
        days.sort((a: any, b: any) => a.date.localeCompare(b.date))
        return NextResponse.json({ days })
      }

      case 'get_weekend_schedule': {
        const d = new Date(today + 'T12:00:00')
        const dow = d.getDay()
        const nextSat = new Date(d)
        if (dow !== 6) nextSat.setDate(d.getDate() + ((6 - dow + 7) % 7))
        const weekends = []
        for (let i = 0; i < 5; i++) {
          const sat = new Date(nextSat.getTime() + i * 7 * 86400000)
          const satStr = sat.toLocaleDateString('en-CA')
          const rotWeek = getRotationWeekNumber(satStr)
          const groomTasks = getGroomingTasks(rotWeek)
          weekends.push({
            saturday: satStr,
            kid_name: WEEKEND_ROTATION[rotWeek - 1] || 'unknown',
            label: sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            groomingTasks: groomTasks.map(t => ({ key: t, ...(GROOMING_INFO[t] || { label: t, emoji: '' }) })),
          })
        }
        return NextResponse.json({ weekends })
      }

      case 'get_grooming_schedule': {
        try {
          const rows = await db.query(
            `SELECT kid_name, task, due_date, weekend_start, completed, missed_flag FROM belle_grooming_log WHERE due_date >= $1 ORDER BY due_date`, [today]
          )
          return NextResponse.json({ grooming: rows })
        } catch { return NextResponse.json({ grooming: [] }) }
      }

      case 'get_swap_log': {
        try {
          const rows = await db.query(
            `SELECT id, requesting_kid, covering_kid, swap_type, swap_date, reason, status, requested_at, responded_at FROM belle_care_swaps ORDER BY requested_at DESC LIMIT 50`
          )
          return NextResponse.json({ swaps: rows })
        } catch { return NextResponse.json({ swaps: [] }) }
      }

      case 'get_history': {
        try {
          const filterKid = searchParams.get('filter_kid')?.toLowerCase()
          let q = `SELECT kid_name, care_date, task, completed FROM belle_care_log WHERE care_date >= CURRENT_DATE - INTERVAL '60 days'`
          const p: any[] = []
          if (filterKid) { q += ` AND kid_name = $1`; p.push(filterKid) }
          q += ` ORDER BY care_date DESC, task`
          const logs = await db.query(q, p)
          const gLogs = await db.query(
            `SELECT kid_name, task, due_date, weekend_start, completed, missed_flag FROM belle_grooming_log WHERE due_date >= CURRENT_DATE - INTERVAL '60 days' ORDER BY due_date DESC`
          )
          return NextResponse.json({ logs, groomingLogs: gLogs })
        } catch { return NextResponse.json({ logs: [], groomingLogs: [] }) }
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Belle GET error:', error)
    return NextResponse.json({ error: 'Failed to load belle data' }, { status: 500 })
  }
}

// ── POST ──
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
          `INSERT INTO belle_care_log (kid_name, care_date, task, completed, completed_at) VALUES ($1, $2, $3, TRUE, NOW())
           ON CONFLICT (care_date, task) DO UPDATE SET completed = TRUE, completed_at = NOW(), kid_name = $1`,
          [kid_name.toLowerCase(), today, task]
        )
        const pts = TASK_POINTS[task] || 5
        await creditPoints(kid_name.toLowerCase(), pts, `Belle: ${TASK_INFO[task]?.label || task}`)
        return NextResponse.json({ success: true, points: pts })
      }

      case 'uncomplete_task': {
        const { kid_name, task } = body
        if (!task) return NextResponse.json({ error: 'task required' }, { status: 400 })
        await db.query(`UPDATE belle_care_log SET completed = FALSE, completed_at = NULL WHERE care_date = $1 AND task = $2`, [today, task])
        const pts = TASK_POINTS[task] || 5
        if (kid_name) await debitPoints(kid_name.toLowerCase(), pts, `Unchecked Belle: ${TASK_INFO[task]?.label || task}`)
        return NextResponse.json({ success: true })
      }

      case 'complete_grooming_task': {
        const { kid_name, task, weekend_start } = body
        if (!kid_name || !task || !weekend_start) return NextResponse.json({ error: 'kid_name, task, weekend_start required' }, { status: 400 })
        await db.query(
          `UPDATE belle_grooming_log SET completed = TRUE, completed_at = NOW(), kid_name = $1 WHERE weekend_start = $2 AND task = $3`,
          [kid_name.toLowerCase(), weekend_start, task]
        )
        const pts = TASK_POINTS[task] || 10
        await creditPoints(kid_name.toLowerCase(), pts, `Belle grooming: ${GROOMING_INFO[task]?.label || task}`)
        return NextResponse.json({ success: true, points: pts })
      }

      case 'request_swap': {
        const { requesting_kid, covering_kid, swap_type, swap_date, reason } = body
        if (!requesting_kid || !covering_kid || !swap_type || !swap_date || !reason?.trim() || reason.trim().length < 5) {
          return NextResponse.json({ error: 'All fields required, reason min 5 chars' }, { status: 400 })
        }
        const existing = await db.query(
          `SELECT id FROM belle_care_swaps WHERE requesting_kid = $1 AND status = 'pending'`, [requesting_kid.toLowerCase()]
        )
        if (existing.length > 0) return NextResponse.json({ error: 'Already have a pending swap request' }, { status: 400 })

        const todayDate = new Date(today + 'T12:00:00')
        const swapDateObj = new Date(swap_date + 'T12:00:00')
        if (swap_type === 'weekday') {
          const daysDiff = Math.ceil((swapDateObj.getTime() - todayDate.getTime()) / 86400000)
          if (daysDiff < 0 || daysDiff > 5) return NextResponse.json({ error: 'Weekday swap must be this week, future day' }, { status: 400 })
        } else {
          const todayDow = getDow(today)
          if (todayDow < 3 || todayDow > 5) return NextResponse.json({ error: 'Weekend swaps only Wed-Fri' }, { status: 400 })
        }

        await db.query(
          `INSERT INTO belle_care_swaps (requesting_kid, covering_kid, swap_type, swap_date, reason) VALUES ($1, $2, $3, $4, $5)`,
          [requesting_kid.toLowerCase(), covering_kid.toLowerCase(), swap_type, swap_date, reason.trim()]
        )
        return NextResponse.json({ success: true })
      }

      case 'respond_to_swap': {
        const { id, response } = body
        if (!id || !['accepted', 'declined'].includes(response)) return NextResponse.json({ error: 'id and valid response required' }, { status: 400 })
        await db.query(`UPDATE belle_care_swaps SET status = $2, responded_at = NOW() WHERE id = $1`, [id, response])
        return NextResponse.json({ success: true })
      }

      case 'cancel_swap': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM belle_care_swaps WHERE id = $1 AND status = 'pending'`, [id])
        return NextResponse.json({ success: true })
      }

      case 'flag_missed_grooming': {
        const yesterday = new Date(new Date(today + 'T12:00:00').getTime() - 86400000).toLocaleDateString('en-CA')
        if (getDow(yesterday) !== 0) return NextResponse.json({ success: true, message: 'Not a Sunday' })
        await db.query(
          `UPDATE belle_grooming_log SET missed_flag = TRUE WHERE due_date = $1 AND completed = FALSE`,
          [yesterday]
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
