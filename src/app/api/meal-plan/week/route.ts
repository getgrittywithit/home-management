import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

// Dinner manager rotation (fixed, does not change week to week)
const DINNER_MANAGERS: Record<number, { kid: string; week1Theme: string; week2Theme: string }> = {
  0: { kid: 'kaylee', week1Theme: 'american-comfort', week2Theme: 'soup-comfort' },
  1: { kid: 'zoey', week1Theme: 'asian', week2Theme: 'asian' },
  2: { kid: 'wyatt', week1Theme: 'bar-night', week2Theme: 'easy-lazy' },
  3: { kid: 'amos', week1Theme: 'mexican', week2Theme: 'mexican' },
  4: { kid: 'ellie', week1Theme: 'pizza-italian', week2Theme: 'pizza-italian' }, // Ellie + Hannah
  5: { kid: 'parents', week1Theme: 'grill', week2Theme: 'experiment' },
  6: { kid: 'parents', week1Theme: 'roast-comfort', week2Theme: 'brunch' },
}

const EPOCH = new Date('2026-03-30T00:00:00') // Week 1 Monday

function getWeekNumber(weekStart: string): 1 | 2 {
  const start = new Date(weekStart + 'T00:00:00')
  const diff = Math.floor((start.getTime() - EPOCH.getTime()) / (7 * 86400000))
  return diff % 2 === 0 ? 1 : 2
}

function getMonday(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toLocaleDateString('en-CA')
}

function getSeason(): string {
  const month = new Date().getMonth() + 1
  return (month >= 3 && month <= 8) ? 'spring-summer' : 'fall-winter'
}

async function ensureWeekPlan(weekStart: string) {
  // Check if plan exists
  const existing = await db.query(
    `SELECT COUNT(*)::int as c FROM meal_week_plan WHERE week_start = $1`, [weekStart]
  ).catch(() => [{ c: 0 }])
  if (existing[0]?.c > 0) return

  // Create 7 blank days with assigned dinner managers
  const weekNum = getWeekNumber(weekStart)
  for (let dow = 0; dow < 7; dow++) {
    const mgr = DINNER_MANAGERS[dow]
    await db.query(
      `INSERT INTO meal_week_plan (week_start, day_of_week, kid_name, status) VALUES ($1, $2, $3, 'planned') ON CONFLICT DO NOTHING`,
      [weekStart, dow, mgr.kid]
    ).catch(() => {})
  }
}

async function getWeekData(weekStart: string) {
  await ensureWeekPlan(weekStart)
  const weekNum = getWeekNumber(weekStart)
  const rows = await db.query(
    `SELECT wp.*, ml.name as meal_name, ml.theme, ml.sides, ml.description
     FROM meal_week_plan wp
     LEFT JOIN meal_library ml ON wp.meal_id = ml.id
     WHERE wp.week_start = $1
     ORDER BY wp.day_of_week`,
    [weekStart]
  ).catch(() => [])

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return rows.map((r: any, i: number) => {
    const mgr = DINNER_MANAGERS[r.day_of_week] || DINNER_MANAGERS[0]
    return {
      ...r,
      day_name: days[r.day_of_week],
      manager_display: mgr.kid === 'parents' ? 'Parents' : (r.day_of_week === 4 ? 'Ellie + Hannah' : mgr.kid.charAt(0).toUpperCase() + mgr.kid.slice(1)),
      theme: r.theme || (weekNum === 1 ? mgr.week1Theme : mgr.week2Theme),
      week_number: weekNum,
    }
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'get_week': {
        const weekStart = searchParams.get('week_start')
        if (!weekStart) return NextResponse.json({ error: 'week_start required' }, { status: 400 })
        const days = await getWeekData(weekStart)
        return NextResponse.json({ week_start: weekStart, week_number: getWeekNumber(weekStart), days })
      }

      case 'get_current_and_next': {
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
        const thisWeekStart = getMonday(now)
        const nextWeekDate = new Date(now)
        nextWeekDate.setDate(nextWeekDate.getDate() + 7)
        const nextWeekStart = getMonday(nextWeekDate)

        const thisWeek = await getWeekData(thisWeekStart)
        const nextWeek = await getWeekData(nextWeekStart)

        // Pick status for next week
        const unpicked = nextWeek.filter((d: any) => !d.meal_id && d.kid_name !== 'parents' && d.status !== 'off_night')
        const waitingOn = Array.from(new Set(unpicked.map((d: any) => d.manager_display)))

        return NextResponse.json({
          this_week: { week_start: thisWeekStart, week_number: getWeekNumber(thisWeekStart), days: thisWeek },
          next_week: { week_start: nextWeekStart, week_number: getWeekNumber(nextWeekStart), days: nextWeek },
          pick_status: { total: 7, picked: 7 - unpicked.length, waiting_on: waitingOn },
          today_dow: (now.getDay() + 6) % 7, // Convert Sun=0 to Mon=0
        })
      }

      case 'get_grocery_settings': {
        const rows = await db.query(`SELECT * FROM grocery_settings LIMIT 1`).catch(() => [])
        return NextResponse.json({ settings: rows[0] || { pickup_day_1: 0, pickup_day_2: 3, deadline_hours_before: 6, auto_assign_on_miss: true } })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Meal plan GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'kid_pick': {
        const { kid_name, week_start, day_of_week, meal_id } = body
        if (!kid_name || !week_start || day_of_week === undefined || !meal_id) {
          return NextResponse.json({ error: 'kid_name, week_start, day_of_week, meal_id required' }, { status: 400 })
        }
        await ensureWeekPlan(week_start)
        await db.query(
          `UPDATE meal_week_plan SET meal_id = $3, picked_at = NOW(), status = 'planned'
           WHERE week_start = $1 AND day_of_week = $2`,
          [week_start, day_of_week, meal_id]
        )
        const meal = await db.query(`SELECT name FROM meal_library WHERE id = $1`, [meal_id]).catch(() => [])
        const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1)
        await createNotification({
          title: `${kidDisplay} picked dinner`,
          message: `${meal[0]?.name || 'a meal'} for next week`,
          source_type: 'meal_request', source_ref: `meal-pick-${kid_name}-${week_start}-${day_of_week}`,
          link_tab: 'food-meals', icon: '🍽️',
        }).catch(() => {})
        return NextResponse.json({ success: true })
      }

      case 'parent_swap': {
        const { week_start, day_of_week, new_meal_id, note } = body
        if (!week_start || day_of_week === undefined || !new_meal_id) {
          return NextResponse.json({ error: 'week_start, day_of_week, new_meal_id required' }, { status: 400 })
        }
        // Save original
        const current = await db.query(
          `SELECT meal_id FROM meal_week_plan WHERE week_start = $1 AND day_of_week = $2`, [week_start, day_of_week]
        ).catch(() => [])
        await db.query(
          `UPDATE meal_week_plan SET meal_id = $3, original_meal_id = $4, parent_override = true, parent_override_note = $5
           WHERE week_start = $1 AND day_of_week = $2`,
          [week_start, day_of_week, new_meal_id, current[0]?.meal_id || null, note || 'Parent swapped']
        )
        return NextResponse.json({ success: true })
      }

      case 'parent_off_night': {
        const { week_start, day_of_week } = body
        if (!week_start || day_of_week === undefined) return NextResponse.json({ error: 'week_start, day_of_week required' }, { status: 400 })
        await db.query(
          `UPDATE meal_week_plan SET meal_id = NULL, status = 'off_night', parent_override = true, parent_override_note = 'Off Night'
           WHERE week_start = $1 AND day_of_week = $2`,
          [week_start, day_of_week]
        )
        return NextResponse.json({ success: true })
      }

      case 'lock_week': {
        const { week_start } = body
        if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 })
        await db.query(
          `UPDATE meal_week_plan SET status = CASE WHEN status = 'off_night' THEN 'off_night' ELSE 'locked' END, locked_at = NOW()
           WHERE week_start = $1`,
          [week_start]
        )
        return NextResponse.json({ success: true })
      }

      case 'auto_assign_unpicked': {
        const { week_start } = body
        if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 })
        const weekNum = getWeekNumber(week_start)
        const season = getSeason()
        const unpicked = await db.query(
          `SELECT day_of_week, kid_name FROM meal_week_plan WHERE week_start = $1 AND meal_id IS NULL AND status = 'planned' AND kid_name != 'parents'`,
          [week_start]
        ).catch(() => [])

        for (const slot of unpicked) {
          const mgr = DINNER_MANAGERS[slot.day_of_week]
          const theme = weekNum === 1 ? mgr.week1Theme : mgr.week2Theme
          const meals = await db.query(
            `SELECT id FROM meal_library WHERE theme = $1 AND (season = $2 OR season = 'year-round') AND active = true ORDER BY RANDOM() LIMIT 1`,
            [theme, season]
          ).catch(() => [])
          if (meals[0]) {
            await db.query(
              `UPDATE meal_week_plan SET meal_id = $3, status = 'planned', parent_override_note = 'Auto-assigned' WHERE week_start = $1 AND day_of_week = $2`,
              [week_start, slot.day_of_week, meals[0].id]
            )
          }
        }
        return NextResponse.json({ success: true, auto_assigned: unpicked.length })
      }

      case 'update_grocery_settings': {
        const { pickup_day_1, pickup_day_2, deadline_hours_before, auto_assign_on_miss } = body
        await db.query(
          `UPDATE grocery_settings SET pickup_day_1 = COALESCE($1, pickup_day_1), pickup_day_2 = COALESCE($2, pickup_day_2),
           deadline_hours_before = COALESCE($3, deadline_hours_before), auto_assign_on_miss = COALESCE($4, auto_assign_on_miss), updated_at = NOW()`,
          [pickup_day_1, pickup_day_2, deadline_hours_before, auto_assign_on_miss]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Meal plan POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
