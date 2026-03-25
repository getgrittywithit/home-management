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
    const child = searchParams.get('child')?.toLowerCase() || searchParams.get('childName')?.toLowerCase()
    const dateParam = searchParams.get('date')

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

    // Dishes duty
    // Breakfast & Lunch: single checkbox each
    if (DISHES.breakfast.includes(child)) {
      required.push({
        id: `dishes-breakfast-${today}`,
        title: 'Breakfast Dishes',
        description: 'Wash your 5 handwash items · Put away leftovers, pantry & fridge items · Clear & wipe table/counters · Flip dishwasher if full',
        category: 'dishes',
        time: '8:00 AM',
      })
    }
    if (DISHES.lunch.includes(child)) {
      required.push({
        id: `dishes-lunch-${today}`,
        title: 'Lunch Dishes',
        description: 'Wash your 5 handwash items · Put away leftovers, pantry & fridge items · Clear & wipe table/counters · Unload or flip dishwasher',
        category: 'dishes',
        time: '12:00 PM',
      })
    }
    // Dinner: 3 separate checkboxes
    if (DISHES.dinner.includes(child)) {
      required.push({
        id: `dishes-dinner-${today}`,
        title: '\u{1F37D}\u{FE0F} Dinner Dishes',
        description: 'Wash your 5 handwash items · Put away leftovers, pantry & fridge items · Clear & wipe table/counters · Run dishwasher for overnight',
        category: 'dishes',
        time: 'After dinner',
      })
      required.push({
        id: `dishes-dinner-trash-${today}`,
        title: '\u{1F5D1}\u{FE0F} Kitchen Trash',
        description: 'Take out the kitchen trash bag and replace with a new one',
        category: 'dishes',
        time: 'After dinner',
      })
      required.push({
        id: `dishes-dinner-sink-${today}`,
        title: '\u{2728} Sink Check',
        description: 'Sink must be empty, clean, and shining — it\u2019s not done until it shines!',
        category: 'dishes',
        time: 'After dinner',
      })
    }

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
      `SELECT id, title, description, points FROM earn_money_chores WHERE child_name = $1 AND is_active = TRUE ORDER BY title`,
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
        const existing = await db.query(
          `SELECT completed FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2 AND event_id = $3`,
          [child.toLowerCase(), today, eventId]
        )
        const newCompleted = existing.length > 0 ? !existing[0].completed : true
        await db.query(
          `INSERT INTO kid_daily_checklist (child_name, event_date, event_id, event_summary, completed, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (child_name, event_date, event_id)
           DO UPDATE SET completed = $5, completed_at = $6`,
          [child.toLowerCase(), today, eventId, eventSummary || '', newCompleted, newCompleted ? new Date().toISOString() : null]
        )
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
