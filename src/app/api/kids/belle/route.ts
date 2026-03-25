import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ── Constants ──
const WEEKEND_ANCHOR = new Date('2026-03-28T12:00:00')
const BELLE_KIDS = ['kaylee', 'amos', 'hannah', 'wyatt', 'ellie']

// Hardcoded fallback — same as DB, used when DB query fails or returns empty
const WEEKDAY_MAP: Record<number, string> = { 1: 'kaylee', 2: 'amos', 3: 'hannah', 4: 'wyatt', 5: 'ellie' }
const WEEKEND_MAP: Record<number, string> = { 1: 'kaylee', 2: 'amos', 3: 'hannah', 4: 'wyatt', 5: 'ellie' }

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

function getRotationWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  const sat = new Date(d)
  if (dow === 0) sat.setDate(d.getDate() - 1)
  else if (dow !== 6) sat.setDate(d.getDate() + (6 - dow))
  const weeks = Math.floor((sat.getTime() - WEEKEND_ANCHOR.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return ((weeks % 5) + 5) % 5 + 1
}

async function getAssignee(dateStr: string): Promise<string | null> {
  const dow = getDow(dateStr)
  if (dow >= 1 && dow <= 5) {
    // Use hardcoded map as primary source (permanent assignments)
    return WEEKDAY_MAP[dow] || null
  }
  // Weekend: check for accepted swap first
  const satDate = dow === 0
    ? new Date(new Date(dateStr + 'T12:00:00').getTime() - 86400000).toLocaleDateString('en-CA')
    : dateStr
  try {
    const swapRows = await db.query(
      `SELECT covering_kid FROM belle_care_swaps WHERE swap_type = 'weekend' AND swap_date = $1 AND status = 'accepted'`,
      [satDate]
    )
    if (swapRows.length > 0) return swapRows[0].covering_kid
  } catch { /* fall through to rotation */ }
  const rotWeek = getRotationWeek(dateStr)
  return WEEKEND_MAP[rotWeek] || null
}

// Also check weekday swaps
async function getEffectiveAssignee(dateStr: string): Promise<string | null> {
  const dow = getDow(dateStr)
  if (dow >= 1 && dow <= 5) {
    try {
      const swapRows = await db.query(
        `SELECT covering_kid FROM belle_care_swaps WHERE swap_type = 'weekday' AND swap_date = $1 AND status = 'accepted'`,
        [dateStr]
      )
      if (swapRows.length > 0) return swapRows[0].covering_kid
    } catch { /* fall through to base assignee */ }
  }
  return getAssignee(dateStr)
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
  const tasks = ['fur_brush'] // every weekend
  if (rotWeek % 2 === 1) tasks.push('bath') // odd weeks
  if (rotWeek % 2 === 0) tasks.push('nail_trim') // even weeks
  if (rotWeek === 1) tasks.push('ear_clean') // week 1 of cycle
  return tasks
}

function getSaturdayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  const sat = new Date(d)
  sat.setDate(d.getDate() - ((dow + 1) % 7) + 6)
  if (dow === 6) return dateStr
  if (dow === 0) { sat.setDate(d.getDate() - 1); return sat.toLocaleDateString('en-CA') }
  sat.setDate(d.getDate() + (6 - dow))
  return sat.toLocaleDateString('en-CA')
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
  } catch { /* points tables may not exist yet */ }
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

// ── Ensure grooming rows exist for a weekend ──
async function ensureGroomingRows(kidName: string, satDate: string) {
  const sunDate = getSundayOfWeek(satDate)
  const rotWeek = getRotationWeek(satDate)
  const tasks = getGroomingTasks(rotWeek)
  for (const task of tasks) {
    await db.query(
      `INSERT INTO belle_grooming_log (kid_name, task, due_date, weekend_start)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (due_date, task) DO NOTHING`,
      [kidName, task, sunDate, satDate]
    )
  }
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
        const logs = await db.query(`SELECT task, completed FROM belle_care_log WHERE care_date = $1`, [today])
        const cMap: Record<string, boolean> = {}
        logs.forEach((r: any) => { cMap[r.task] = r.completed })
        const tasks = taskKeys.map(k => ({ key: k, ...(TASK_INFO[k] || { label: k, emoji: '', time: '' }), completed: !!cMap[k] }))

        // Grooming if weekend
        let grooming: any[] = []
        if (isWeekend(today) && assignee) {
          const satDate = getDow(today) === 0
            ? new Date(new Date(today + 'T12:00:00').getTime() - 86400000).toLocaleDateString('en-CA')
            : today
          await ensureGroomingRows(assignee, satDate)
          const gRows = await db.query(
            `SELECT task, completed FROM belle_grooming_log WHERE weekend_start = $1`, [satDate]
          )
          grooming = gRows.map((r: any) => ({ key: r.task, ...(GROOMING_INFO[r.task] || { label: r.task, emoji: '' }), completed: r.completed }))
        }

        // Check active swap
        const swapRows = await db.query(
          `SELECT requesting_kid, covering_kid, swap_date, reason, status FROM belle_care_swaps
           WHERE (swap_date = $1 OR (swap_type = 'weekend' AND swap_date = $1))
           AND status = 'accepted' LIMIT 1`,
          [isWeekend(today) ? getSaturdayOfWeek(today) : today]
        )

        return NextResponse.json({ assignee, tasks, grooming, date: today, activeSwap: swapRows[0] || null })
      }

      case 'get_my_tasks_today': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const assignee = await getEffectiveAssignee(today)
        if (assignee !== kid) return NextResponse.json({ assigned: false, assignee })

        const taskKeys = getDailyTasks(today)
        const logs = await db.query(`SELECT task, completed FROM belle_care_log WHERE care_date = $1`, [today])
        const cMap: Record<string, boolean> = {}
        logs.forEach((r: any) => { cMap[r.task] = r.completed })
        const tasks = taskKeys.map(k => ({ key: k, ...(TASK_INFO[k] || { label: k, emoji: '', time: '' }), completed: !!cMap[k] }))

        let grooming: any[] = []
        if (isWeekend(today)) {
          const satDate = getDow(today) === 0
            ? new Date(new Date(today + 'T12:00:00').getTime() - 86400000).toLocaleDateString('en-CA')
            : today
          await ensureGroomingRows(kid, satDate)
          const gRows = await db.query(`SELECT task, completed FROM belle_grooming_log WHERE weekend_start = $1`, [satDate])
          grooming = gRows.map((r: any) => ({ key: r.task, ...(GROOMING_INFO[r.task] || { label: r.task, emoji: '' }), completed: r.completed }))
        }

        return NextResponse.json({ assigned: true, assignee: kid, tasks, grooming, date: today })
      }

      case 'get_my_assignment_info': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const assignee = await getEffectiveAssignee(today)
        const isToday = assignee === kid

        // Find this kid's fixed weekday from hardcoded map
        const fixedDay = Object.entries(WEEKDAY_MAP).find(([, name]) => name === kid)?.[0]
        const fixedDayNum = fixedDay ? parseInt(fixedDay) : null
        const dayNames: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday' }
        const myWeekday = fixedDayNum ? dayNames[fixedDayNum] : null

        // Next occurrence of their weekday
        const todayDate = new Date(today + 'T12:00:00')
        let nextWeekdayDate: string | null = null
        if (fixedDayNum) {
          const d = new Date(todayDate)
          for (let i = 1; i <= 7; i++) {
            d.setDate(todayDate.getDate() + i)
            if (d.getDay() === fixedDayNum) { nextWeekdayDate = d.toLocaleDateString('en-CA'); break }
          }
        }
        const daysUntilWeekday = nextWeekdayDate ? Math.ceil((new Date(nextWeekdayDate + 'T12:00:00').getTime() - todayDate.getTime()) / 86400000) : null

        // Next weekend for this kid
        const thisWeekSat = getSaturdayOfWeek(today)
        let nextWeekendSat: string | null = null
        let nextWeekendDaysAway: number | null = null
        const checkSat = new Date(thisWeekSat + 'T12:00:00')
        for (let i = 0; i < 10; i++) {
          const sat = new Date(checkSat.getTime() + i * 7 * 86400000)
          const satStr = sat.toLocaleDateString('en-CA')
          if (satStr < today) continue
          const rotWeek = getRotationWeek(satStr)
          const rotRows = await db.query(`SELECT kid_name FROM belle_weekend_rotation WHERE week_number = $1`, [rotWeek])
          if (rotRows[0]?.kid_name === kid) {
            nextWeekendSat = satStr
            nextWeekendDaysAway = Math.ceil((sat.getTime() - todayDate.getTime()) / 86400000)
            break
          }
        }

        // Is their weekend THIS coming weekend?
        const upcomingWeekendThisWeek = nextWeekendSat === thisWeekSat && getDow(today) >= 3 && getDow(today) <= 5

        // Pending swaps
        const outgoing = await db.query(
          `SELECT id, covering_kid, swap_type, swap_date, status FROM belle_care_swaps
           WHERE requesting_kid = $1 AND status = 'pending' LIMIT 1`, [kid]
        )
        const incoming = await db.query(
          `SELECT id, requesting_kid, swap_type, swap_date, reason FROM belle_care_swaps
           WHERE covering_kid = $1 AND status = 'pending'`, [kid]
        )

        // Accepted swaps affecting display
        const acceptedCovering = await db.query(
          `SELECT requesting_kid, swap_date, swap_type FROM belle_care_swaps
           WHERE covering_kid = $1 AND status = 'accepted' AND swap_date >= $2`, [kid, today]
        )

        return NextResponse.json({
          isToday, todayAssignee: assignee, myWeekday, nextWeekdayDate, daysUntilWeekday,
          nextWeekendSat, nextWeekendDaysAway, upcomingWeekendThisWeek,
          outgoingSwap: outgoing[0] || null,
          incomingSwaps: incoming,
          acceptedCovering: acceptedCovering,
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
          const assignee = await getEffectiveAssignee(dateStr)
          const taskKeys = getDailyTasks(dateStr)
          const logs = await db.query(`SELECT task, completed FROM belle_care_log WHERE care_date = $1`, [dateStr])
          const done = logs.filter((r: any) => r.completed).length
          days.push({ date: dateStr, dayName: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dd.getDay()], assignee, totalTasks: taskKeys.length, completedTasks: done })
        }
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
          const rotWeek = getRotationWeek(satStr)
          const rows = await db.query(`SELECT kid_name FROM belle_weekend_rotation WHERE week_number = $1`, [rotWeek])
          const groomTasks = getGroomingTasks(rotWeek)
          weekends.push({
            saturday: satStr,
            kid_name: rows[0]?.kid_name || 'unknown',
            label: sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            groomingTasks: groomTasks.map(t => ({ key: t, ...(GROOMING_INFO[t] || { label: t, emoji: '' }) })),
          })
        }
        return NextResponse.json({ weekends })
      }

      case 'get_grooming_schedule': {
        const rows = await db.query(
          `SELECT kid_name, task, due_date, weekend_start, completed, missed_flag
           FROM belle_grooming_log WHERE due_date >= $1 ORDER BY due_date`, [today]
        )
        return NextResponse.json({ grooming: rows })
      }

      case 'get_swap_log': {
        const rows = await db.query(
          `SELECT id, requesting_kid, covering_kid, swap_type, swap_date, reason, status, requested_at, responded_at
           FROM belle_care_swaps ORDER BY requested_at DESC LIMIT 50`
        )
        return NextResponse.json({ swaps: rows })
      }

      case 'get_history': {
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
        // Check no open outgoing
        const existing = await db.query(
          `SELECT id FROM belle_care_swaps WHERE requesting_kid = $1 AND status = 'pending'`, [requesting_kid.toLowerCase()]
        )
        if (existing.length > 0) return NextResponse.json({ error: 'Already have a pending swap request' }, { status: 400 })

        // Validate window
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
          `INSERT INTO belle_care_swaps (requesting_kid, covering_kid, swap_type, swap_date, reason)
           VALUES ($1, $2, $3, $4, $5)`,
          [requesting_kid.toLowerCase(), covering_kid.toLowerCase(), swap_type, swap_date, reason.trim()]
        )
        return NextResponse.json({ success: true })
      }

      case 'respond_to_swap': {
        const { id, response } = body
        if (!id || !['accepted', 'declined'].includes(response)) return NextResponse.json({ error: 'id and valid response required' }, { status: 400 })
        await db.query(
          `UPDATE belle_care_swaps SET status = $2, responded_at = NOW() WHERE id = $1`,
          [id, response]
        )
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
