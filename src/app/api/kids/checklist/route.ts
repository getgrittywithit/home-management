import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getKidZone } from '@/lib/zoneRotation'

// Belle care weekday assignments
const BELLE_WEEKDAY: Record<number, string> = { 1: 'kaylee', 2: 'amos', 3: 'hannah', 4: 'wyatt', 5: 'ellie' }
const BELLE_WEEKEND_ROTATION = ['hannah', 'wyatt', 'amos', 'kaylee', 'ellie']
const BELLE_ANCHOR = new Date(2026, 2, 15)

function getBelleHelper(date: Date): string {
  const day = date.getDay()
  if (day >= 1 && day <= 5) return BELLE_WEEKDAY[day]
  const sat = new Date(date)
  if (sat.getDay() === 0) sat.setDate(sat.getDate() - 1)
  const weeks = Math.floor((sat.getTime() - BELLE_ANCHOR.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return BELLE_WEEKEND_ROTATION[(((weeks + 4) % 5) + 5) % 5]
}

// Dishes assignments (fixed daily)
const DISHES: Record<string, string[]> = {
  breakfast: ['amos', 'wyatt'],
  lunch: ['ellie', 'hannah'],
  dinner: ['zoey', 'kaylee'],
}

const HOMESCHOOL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const child = searchParams.get('child')?.toLowerCase() || searchParams.get('childName')?.toLowerCase()
    const dateParam = searchParams.get('date')

    // All kids completion overview for the current week
    if (action === 'get_all_completion') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const today = now.toLocaleDateString('en-CA')
      const dow = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dow + 6) % 7))
      const weekStart = monday.toLocaleDateString('en-CA')
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const weekEnd = sunday.toLocaleDateString('en-CA')
      const isWeekday = dow >= 1 && dow <= 5
      const belleHelper = getBelleHelper(now)

      try {
        // Get DB completion rows for the week
        const rows = await db.query(
          `SELECT child_name, event_id, completed FROM kid_daily_checklist WHERE event_date >= $1 AND event_date <= $2`,
          [weekStart, weekEnd]
        )

        // Compute expected task counts per kid for TODAY (dynamic generation)
        const getExpectedTaskCount = (kid: string): { required: number; dailyCare: number } => {
          let req = 0
          const zone = getKidZone(kid.charAt(0).toUpperCase() + kid.slice(1))
          if (zone) req += 2 // morning + afternoon zone chores
          if (DISHES.breakfast.includes(kid)) req++
          if (DISHES.lunch.includes(kid)) req++
          if (DISHES.dinner.includes(kid)) req++
          if ((DINNER_MANAGER[dow] || []).includes(kid)) req++
          if (belleHelper === kid) req += 2 // AM + PM belle care
          if (kid === 'zoey') req++ // Hades
          if (kid === 'amos') req++ // Spike
          if (kid === 'kaylee' || kid === 'wyatt') req++ // Spike helper
          if (kid === 'ellie' || kid === 'hannah') req++ // Midnight
          req++ // Evening tidy (always)
          if (HOMESCHOOL_KIDS.includes(kid) && isWeekday) req++ // School room clean
          return { required: req, dailyCare: 2 } // Morning + Bedtime routines
        }

        const kids = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee'].map(kid => {
          const kidRows = (rows as any[]).filter((r: any) => r.child_name === kid)
          const todayRows = kidRows.filter((r: any) => {
            // Only count today's rows for the completion denominator
            return true // all rows in the week range count for done
          })
          const req = kidRows.filter((r: any) => !r.event_id.startsWith('hygiene-') && !r.event_id.startsWith('earn-'))
          const care = kidRows.filter((r: any) => r.event_id.startsWith('hygiene-'))
          const earn = kidRows.filter((r: any) => r.event_id.startsWith('earn-'))
          const expected = getExpectedTaskCount(kid)
          return {
            name: kid,
            required: { done: req.filter((r: any) => r.completed).length, total: Math.max(req.length, expected.required) },
            dailyCare: { done: care.filter((r: any) => r.completed).length, total: Math.max(care.length, expected.dailyCare) },
            earnMoney: { done: earn.filter((r: any) => r.completed).length, total: earn.length },
          }
        })
        return NextResponse.json({ weekOf: weekStart, kids })
      } catch { return NextResponse.json({ weekOf: weekStart, kids: [] }) }
    }

    if (action === 'today_zone_status') {
      const kids = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      const zones: any[] = []
      for (const kid of kids) {
        const zone = getKidZone(kid.charAt(0).toUpperCase() + kid.slice(1))
        if (!zone) continue

        // Count zone tasks completed today
        try {
          const rows = await db.query(
            `SELECT COUNT(*)::int as total,
                    COUNT(*) FILTER (WHERE completed = TRUE)::int as done
             FROM kid_daily_checklist
             WHERE child_name = $1 AND event_date = $2 AND event_id LIKE 'zone-%'`,
            [kid, today]
          )
          const total = rows[0]?.total || 0
          const done = rows[0]?.done || 0
          zones.push({
            kid_name: kid,
            zone_name: zone,
            task_count: total,
            completed_count: done,
            status: total === 0 ? 'not_started' : done === total ? 'done' : done > 0 ? 'in_progress' : 'not_started'
          })
        } catch {
          zones.push({ kid_name: kid, zone_name: zone, task_count: 0, completed_count: 0, status: 'not_started' })
        }
      }
      return NextResponse.json({ zones })
    }

    if (!child) {
      return NextResponse.json({ error: 'child required' }, { status: 400 })
    }

    const today = dateParam || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const todayDate = new Date(today + 'T12:00:00')
    const dayOfWeek = todayDate.getDay()
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

    // ── Tier 1: Required tasks ──
    const required: any[] = []

    // Zone chores
    const zone = getKidZone(child.charAt(0).toUpperCase() + child.slice(1))
    if (zone) {
      required.push({
        id: `zone-morning-${today}`,
        title: `Morning Zone Chores: ${zone}`,
        description: `Complete your ${zone} zone checklist`,
        category: 'zone',
        time: '8:00 AM',
      })
      required.push({
        id: `zone-afternoon-${today}`,
        title: `Afternoon Zone Chores: ${zone}`,
        description: `Afternoon ${zone} zone tasks`,
        category: 'zone',
        time: '3:00 PM',
      })
    }

    // Dish duty — expandable zone cards
    if (DISHES.breakfast.includes(child)) {
      required.push({
        id: `dishes-breakfast-${today}`,
        title: 'Breakfast Dishes',
        description: 'Wash 5 items, dry, put away, wipe counters, flip dishwasher',
        category: 'dishes',
        time: '8:00 AM',
      })
    }
    if (DISHES.lunch.includes(child)) {
      required.push({
        id: `dishes-lunch-${today}`,
        title: 'Lunch Dishes',
        description: 'Wash 5 items, dry, put away, wipe counters, check dishwasher',
        category: 'dishes',
        time: '12:00 PM',
      })
    }
    if (DISHES.dinner.includes(child)) {
      required.push({
        id: `dishes-evening-${today}`,
        title: 'Evening Dishes',
        description: 'Wash 5 items, dry, put away, wipe everything, flip dishwasher',
        category: 'dishes',
        time: 'After dinner',
      })
    }

    // Dinner Manager — day-gated per fixed weekly schedule
    const DINNER_MANAGER: Record<number, string[]> = {
      0: [],             // Sunday = Dad
      1: ['kaylee'],     // Monday
      2: ['zoey'],       // Tuesday
      3: ['wyatt'],      // Wednesday
      4: ['amos'],       // Thursday
      5: ['ellie', 'hannah'], // Friday — shared
      6: [],             // Saturday = Mom
    }
    if ((DINNER_MANAGER[dayOfWeek] || []).includes(child)) {
      required.push({
        id: `dinner-manager-${today}`,
        title: 'Dinner Manager',
        description: 'Set up, cook assist, clean up after dinner',
        category: 'dishes',
        time: '5:00 PM',
      })
    }

    // Laundry — day-gated per kid_laundry_schedule
    try {
      const laundryRows = await db.query(
        `SELECT laundry_days, extra_duty FROM kid_laundry_schedule WHERE kid_name = $1`,
        [child]
      )
      if (laundryRows.length > 0 && (laundryRows[0].laundry_days || []).includes(dayOfWeek)) {
        required.push({
          id: `laundry-${today}`,
          title: 'Laundry Day',
          description: 'Collect, sort, wash, dry, fold, put away — all same day',
          category: 'tidy',
          time: '9:00 AM',
        })
      }
    } catch { /* laundry schedule table may not exist */ }

    // Belle care
    if (getBelleHelper(todayDate) === child) {
      required.push({
        id: `belle-am-${today}`, title: 'Belle Care — AM Feed + Walk',
        description: 'Feed Belle and take her for a walk', category: 'belle', time: '7:00 AM',
      })
      required.push({
        id: `belle-pm-${today}`, title: 'Belle Care — PM Feed + Walk',
        description: 'Evening feed and walk', category: 'belle', time: '5:00 PM',
      })
    }

    // Pet care — Hades (Zoey only)
    if (child === 'zoey') {
      required.push({
        id: `pet-hades-${today}`, title: 'Hades Care 🐍',
        description: 'Water, temps, health check, tank maintenance', category: 'pet', time: '8:00 AM',
      })
    }

    // Pet care — Spike (Amos primary, Kaylee + Wyatt helpers)
    if (child === 'amos') {
      required.push({
        id: `pet-spike-${today}`, title: 'Spike Care 🦎',
        description: 'UVB, greens, temps, spot clean, handling', category: 'pet', time: '8:00 AM',
      })
    }
    if (child === 'kaylee' || child === 'wyatt') {
      required.push({
        id: `pet-spike-helper-${today}`, title: 'Spike Helper Check 🦎',
        description: 'Quick check on water, food, and visual health', category: 'pet', time: '3:00 PM',
      })
    }

    // Pet care — Midnight (Ellie + Hannah shared)
    if (child === 'ellie' || child === 'hannah') {
      required.push({
        id: `pet-midnight-${today}`, title: 'Midnight Care 🐰',
        description: 'Hay, water, veggies, droppings check, cage care', category: 'pet', time: '8:00 AM',
      })
    }

    // Evening Tidy (daily for everyone)
    required.push({
      id: `evening-tidy-${today}`, title: 'Evening Tidy & Reset',
      description: 'Help tidy the house before bedtime', category: 'tidy', time: '6:00 PM',
    })

    // School Room Group Clean (homeschool only, weekdays)
    if (HOMESCHOOL_KIDS.includes(child) && isWeekday) {
      required.push({
        id: `school-clean-${today}`, title: 'School Room Group Clean',
        description: 'Clean up the school room together', category: 'school_clean', time: '2:00 PM',
      })
    }

    // Parent-added tasks
    const parentTasks = await db.query(
      `SELECT id, title, description FROM parent_tasks
       WHERE child_name = $1 AND is_active = TRUE
       AND (task_date = $2 OR (recurring = TRUE AND task_date IS NULL))`,
      [child, today]
    )
    parentTasks.forEach((t: any) => {
      required.push({ id: `parent-${t.id}`, title: t.title, description: t.description, category: 'parent_task' })
    })

    // ── Tier 2: Daily Care ──
    const dailyCare = [
      { id: `hygiene-morning-${today}`, title: 'Morning Routine', description: 'Brush teeth, get dressed, make bed', category: 'hygiene', time: '7:00 AM' },
      { id: `hygiene-bedtime-${today}`, title: 'Bedtime Routine', description: 'Brush teeth, pajamas, wind down', category: 'hygiene', time: '8:30 PM' },
    ]

    // ── Tier 3: Earn Money ──
    const earnMoney = await db.query(
      `SELECT id, title, description, COALESCE(point_value, points, 10) as points FROM earn_money_chores WHERE child_name = $1 AND is_active = TRUE ORDER BY title`,
      [child]
    )
    const earnMoneyItems = earnMoney.map((c: any) => ({
      id: `earn-${c.id}`, title: c.title, description: c.description, points: c.points, category: 'earn_money',
    }))

    // ── Sort by time (earliest to latest) ──
    const parseTime = (t?: string): number => {
      if (!t) return 9999
      const lower = t.toLowerCase()
      if (lower === 'after dinner') return 1900
      const match = lower.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)
      if (!match) return 9999
      let hours = parseInt(match[1])
      const mins = parseInt(match[2])
      if (match[3] === 'pm' && hours !== 12) hours += 12
      if (match[3] === 'am' && hours === 12) hours = 0
      return hours * 60 + mins
    }
    required.sort((a, b) => parseTime(a.time) - parseTime(b.time))
    dailyCare.sort((a, b) => parseTime(a.time) - parseTime(b.time))

    // ── Completions ──
    const completions = await db.query(
      `SELECT event_id, completed FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2`,
      [child, today]
    )
    const completionMap: Record<string, boolean> = {}
    completions.forEach((r: any) => { completionMap[r.event_id] = r.completed })

    const addStatus = (items: any[]) => items.map(item => ({ ...item, completed: !!completionMap[item.id] }))

    const requiredWithStatus = addStatus(required)
    const allRequiredDone = requiredWithStatus.every(t => t.completed)

    return NextResponse.json({
      childName: child, date: today, zone,
      required: requiredWithStatus,
      dailyCare: addStatus(dailyCare),
      earnMoney: addStatus(earnMoneyItems),
      allRequiredDone,
      stats: {
        requiredTotal: required.length,
        requiredDone: requiredWithStatus.filter(t => t.completed).length,
        dailyCareTotal: dailyCare.length,
        dailyCareDone: addStatus(dailyCare).filter(t => t.completed).length,
        earnMoneyTotal: earnMoneyItems.length,
        earnMoneyDone: addStatus(earnMoneyItems).filter(t => t.completed).length,
      }
    })
  } catch (error) {
    console.error('Checklist API error:', error)
    return NextResponse.json({ error: 'Failed to load checklist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'toggle': {
        const { child, eventId, eventSummary } = body
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const kidName = child.toLowerCase()
        const existing = await db.query(
          `SELECT completed FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2 AND event_id = $3`,
          [kidName, today, eventId]
        )
        const newCompleted = existing.length > 0 ? !existing[0].completed : true
        await db.query(
          `INSERT INTO kid_daily_checklist (child_name, event_date, event_id, event_summary, completed, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (child_name, event_date, event_id)
           DO UPDATE SET completed = $5, completed_at = $6`,
          [kidName, today, eventId, eventSummary || '', newCompleted, newCompleted ? new Date().toISOString() : null]
        )

        // Auto-earn points when completing an Earn Money chore
        if (eventId.startsWith('earn-') && newCompleted) {
          const choreId = parseInt(eventId.replace('earn-', ''))
          const choreRows = await db.query(
            `SELECT COALESCE(point_value, points, 10) as pts, title FROM earn_money_chores WHERE id = $1`,
            [choreId]
          )
          if (choreRows.length > 0) {
            const pts = choreRows[0].pts || 10
            await db.query(
              `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', $2, $3)`,
              [kidName, pts, choreRows[0].title]
            )
            await db.query(
              `UPDATE kid_points_balance SET current_points = current_points + $2, total_earned_all_time = total_earned_all_time + $2, updated_at = NOW()
               WHERE kid_name = $1`,
              [kidName, pts]
            )
          }
        }
        // Reverse points if unchecking an Earn Money chore
        if (eventId.startsWith('earn-') && !newCompleted) {
          const choreId = parseInt(eventId.replace('earn-', ''))
          const choreRows = await db.query(
            `SELECT COALESCE(point_value, points, 10) as pts, title FROM earn_money_chores WHERE id = $1`,
            [choreId]
          )
          if (choreRows.length > 0) {
            const pts = choreRows[0].pts || 10
            await db.query(
              `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'deducted', $2, $3)`,
              [kidName, pts, 'Unchecked: ' + choreRows[0].title]
            )
            await db.query(
              `UPDATE kid_points_balance SET current_points = GREATEST(current_points - $2, 0), updated_at = NOW() WHERE kid_name = $1`,
              [kidName, pts]
            )
          }
        }

        return NextResponse.json({ success: true, completed: newCompleted })
      }

      case 'add_earn_chore': {
        const { child, title, description, points } = body
        await db.query(
          `INSERT INTO earn_money_chores (child_name, title, description, points) VALUES ($1, $2, $3, $4)`,
          [child.toLowerCase(), title, description || '', points || 5]
        )
        return NextResponse.json({ success: true })
      }

      case 'remove_earn_chore': {
        await db.query(`UPDATE earn_money_chores SET is_active = FALSE WHERE id = $1`, [body.choreId])
        return NextResponse.json({ success: true })
      }

      case 'add_parent_task': {
        const { child, title, description, task_date, recurring } = body
        await db.query(
          `INSERT INTO parent_tasks (child_name, title, description, task_date, recurring) VALUES ($1, $2, $3, $4, $5)`,
          [child.toLowerCase(), title, description || '', task_date || null, recurring || false]
        )
        return NextResponse.json({ success: true })
      }

      case 'remove_parent_task': {
        await db.query(`UPDATE parent_tasks SET is_active = FALSE WHERE id = $1`, [body.taskId])
        return NextResponse.json({ success: true })
      }

      case 'flag_sick_day': {
        const { kid, date } = body
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const sickDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await db.query(
          `INSERT INTO kid_sick_days (kid_name, sick_date, reason, severity)
           VALUES ($1, $2, 'Self-reported', 'mild')
           ON CONFLICT (kid_name, sick_date) DO NOTHING`,
          [kid.toLowerCase(), sickDate]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Checklist POST error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // Backward compatibility with KidsChecklistOverview
  return NextResponse.json({ children: [] })
}
