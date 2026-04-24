import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { BELLE_WEEKDAY_MAP, BELLE_WEEKEND_ROTATION, BELLE_WEEKEND_ANCHOR, KID_DISPLAY } from '@/lib/constants'
import { parseDateLocal } from '@/lib/date-local'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DINNER_MGR: Record<number, string> = { 0: 'Kaylee', 1: 'Zoey', 2: 'Wyatt', 3: 'Amos', 4: 'Ellie & Hannah', 5: 'Parents', 6: 'Parents' }
const LAUNDRY: Record<number, string> = { 0: 'Levi', 1: 'Lola', 2: 'K+E+H', 3: 'Amos', 4: 'K+E+H', 5: 'Zoey + Sheets', 6: 'Wyatt + Catch-up' }

const WEEK1_THEMES: Record<number, string> = { 0: 'American Comfort', 1: 'Asian Night', 2: 'Bar Night', 3: 'Mexican Night', 4: 'Pizza & Italian', 5: 'Grill Night', 6: 'Roast / Comfort' }
const WEEK2_THEMES: Record<number, string> = { 0: 'Soup/Comfort/Crockpot', 1: 'Asian Night', 2: 'Easy/Lazy Night', 3: 'Mexican Night', 4: 'Pizza & Italian', 5: 'Experiment/Big Cook', 6: 'Brunch/Light' }

const DISH_DUTY = {
  blocks: [
    { emoji: '🌅', meal: 'Breakfast', kids: 'Amos + Wyatt' },
    { emoji: '🥪', meal: 'Lunch', kids: 'Ellie + Hannah' },
    { emoji: '🌙', meal: 'Dinner', kids: 'Zoey + Kaylee' },
  ],
  rules: [
    { text: 'Wash 5 handwash items each', hint: 'big stuff — pots, pans, knives' },
    { text: 'Flip the dishwasher', hint: 'run it, empty it, or leave it' },
    { text: 'CLEAN EMPTY SINK for next meal', emphasis: true },
  ],
}

function getMonday(dateStr?: string): Date {
  const d = dateStr ? parseDateLocal(dateStr) : new Date()
  const dow = d.getDay()
  if (dow === 0) d.setDate(d.getDate() + 1)
  else if (dow === 6) d.setDate(d.getDate() + 2)
  else d.setDate(d.getDate() - ((dow + 6) % 7))
  return d
}

function fmt(d: Date): string { return d.toLocaleDateString('en-CA') }

function getBelleWeekend(satDate: Date): string {
  const weeksSince = Math.floor((satDate.getTime() - BELLE_WEEKEND_ANCHOR.getTime()) / (7 * 86400000))
  const idx = ((weeksSince % 5) + 5) % 5
  return KID_DISPLAY[BELLE_WEEKEND_ROTATION[idx]] || BELLE_WEEKEND_ROTATION[idx]
}

// Bath anchor Jun 13 2026 (Saturday), Nails anchor Jun 14 2026 (Sunday) — biweekly
const BATH_ANCHOR = new Date(2026, 5, 13).getTime()
const NAIL_ANCHOR = new Date(2026, 5, 14).getTime()

function isGroomingWeek(date: Date, anchorMs: number): boolean {
  const weeks = Math.floor((date.getTime() - anchorMs) / (7 * 86400000))
  return weeks % 2 === 0
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const weekStartStr = searchParams.get('week_start')
  const monday = getMonday(weekStartStr || undefined)
  const mondayStr = fmt(monday)

  try {
    // Zone cycle week (epoch Mar 16 2026)
    const zoneEpoch = new Date(2026, 2, 16).getTime()
    const weeksSinceZone = Math.floor((monday.getTime() - zoneEpoch) / (7 * 86400000))
    const zoneCycleWeek = (weeksSinceZone % 6) + 1

    // Meal rotation week (epoch Mar 30 2026)
    const mealEpoch = new Date(2026, 2, 30).getTime()
    const weeksSinceMeal = Math.floor((monday.getTime() - mealEpoch) / (7 * 86400000))
    const mealWeek = (weeksSinceMeal % 2) + 1

    // Build 7-day table
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dayIdx = i // 0=Mon...6=Sun
      const dow = d.getDay() // 0=Sun...6=Sat

      let belle = ''
      if (dow >= 1 && dow <= 5) {
        belle = KID_DISPLAY[BELLE_WEEKDAY_MAP[dow]] || BELLE_WEEKDAY_MAP[dow] || ''
      } else {
        const sat = dow === 0 ? new Date(d.getTime() - 86400000) : d
        belle = getBelleWeekend(sat) + ' (weekend)'
      }

      const themes = mealWeek === 1 ? WEEK1_THEMES : WEEK2_THEMES
      days.push({
        day: DAYS[dayIdx],
        date: fmt(d),
        dinner_manager: DINNER_MGR[dayIdx] || 'Parents',
        dinner_theme: themes[dayIdx] || '',
        laundry: LAUNDRY[dayIdx] || '',
        belle,
      })
    }

    // Zones this week
    const sundayStr = fmt(new Date(monday.getTime() + 6 * 86400000))
    const zones = await db.query(
      `SELECT DISTINCT ztr.kid_name, zd.display_name AS zone_name
       FROM zone_task_rotation ztr
       JOIN zone_definitions zd ON zd.zone_key = ztr.zone_key
       WHERE ztr.assigned_date >= $1 AND ztr.assigned_date <= $2
       ORDER BY ztr.kid_name`,
      [mondayStr, sundayStr]
    ).catch(() => [])

    const zoneAssignments = zones.map((z: any) => ({
      kid: KID_DISPLAY[z.kid_name] || z.kid_name,
      zone: (z.zone_name || '').split('—')[0].trim(),
    }))

    // Belle care card
    const belleCare = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dow = d.getDay()
      let kid = ''
      let extras = ''
      if (dow >= 1 && dow <= 5) {
        kid = KID_DISPLAY[BELLE_WEEKDAY_MAP[dow]] || ''
      } else {
        const sat = dow === 6 ? d : new Date(d.getTime() - 86400000)
        kid = getBelleWeekend(sat)
        if (dow === 6 && isGroomingWeek(d, BATH_ANCHOR)) extras += ' + Bath'
        if (dow === 0 && isGroomingWeek(d, NAIL_ANCHOR)) extras += ' + Nails'
      }
      belleCare.push({ day: DAYS[i], kid: kid + extras, tasks: 'AM + PM' })
    }

    // Reef notes
    const reefNotes = await db.query(`SELECT * FROM reef_notes WHERE week_start_date = $1`, [mondayStr]).catch(() => [])

    // Auto-pull testing events
    const testingEvents = await db.query(
      `SELECT title, start_time, calendar_name FROM calendar_events_cache
       WHERE start_time::date >= $1::date AND start_time::date <= ($2::date + 7)
       AND (title ILIKE '%STAAR%' OR title ILIKE '%EOC%' OR title ILIKE '%testing%' OR title ILIKE '%exam%')
       ORDER BY start_time`,
      [mondayStr, sundayStr]
    ).catch(() => [])

    // Auto-pull week events
    const weekEvents = await db.query(
      `SELECT title, start_time, calendar_name FROM calendar_events_cache
       WHERE start_time::date >= $1::date AND start_time::date <= $2::date
       ORDER BY start_time LIMIT 20`,
      [mondayStr, sundayStr]
    ).catch(() => [])

    const weekNum = Math.ceil((monday.getTime() - new Date(2026, 0, 1).getTime()) / (7 * 86400000))

    return NextResponse.json({
      week_start: mondayStr,
      week_end: sundayStr,
      week_number: weekNum,
      zone_cycle_week: zoneCycleWeek,
      zone_is_last: zoneCycleWeek === 6,
      meal_rotation_week: mealWeek,
      days,
      zones: zoneAssignments,
      belle_care: belleCare,
      dish_duty: DISH_DUTY,
      reef_notes: reefNotes[0] || null,
      testing_events: testingEvents,
      week_events: weekEvents,
    })
  } catch (error: any) {
    console.error('[week-at-a-glance] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
