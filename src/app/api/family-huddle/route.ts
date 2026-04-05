import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const HOST_ROTATION = ['amos', 'kaylee', 'hannah', 'ellie', 'wyatt', 'zoey']
const HOST_EPOCH = new Date('2026-04-05T12:00:00')
const KID_EMOJIS: Record<string, string> = {
  amos: '\uD83E\uDD89', zoey: '\uD83C\uDF1F', kaylee: '\uD83C\uDFAD',
  ellie: '\uD83D\uDCA1', wyatt: '\u26A1', hannah: '\uD83C\uDF3B',
}
const BELLE_WEEKDAY: Record<number, string> = { 1: 'Kaylee', 2: 'Amos', 3: 'Hannah', 4: 'Wyatt', 5: 'Ellie' }
const BELLE_WEEKEND_ROTATION = ['hannah', 'wyatt', 'amos', 'kaylee', 'ellie']
const BELLE_WEEKEND_EPOCH = new Date('2026-06-13T12:00:00') // anchor Saturday
const BATH_ANCHOR = new Date('2026-06-13T12:00:00') // biweekly Saturday
const NAIL_ANCHOR = new Date('2026-06-14T12:00:00') // biweekly Sunday

// Zone rotation
const ZONE_NAMES = ['Hotspot', 'Kitchen', 'Guest Bath', 'Kids Bath', 'Pantry', 'Floors']
const ZONE_KIDS = ['amos', 'kaylee', 'hannah', 'ellie', 'wyatt', 'zoey']
const ZONE_OFFSETS: Record<string, number[]> = {
  amos: [0, 1, 2, 3, 4, 5], kaylee: [5, 0, 1, 2, 3, 4], hannah: [4, 5, 0, 1, 2, 3],
  ellie: [3, 4, 5, 0, 1, 2], wyatt: [2, 3, 4, 5, 0, 1], zoey: [1, 2, 3, 4, 5, 0],
}
const ZONE_EPOCH = new Date('2026-03-15T12:00:00')

const LAUNDRY: Record<string, string> = {
  Monday: 'Levi work clothes', Tuesday: 'Lola personal + sheets',
  Wednesday: 'Ellie, Hannah & Kaylee', Thursday: 'Amos',
  Friday: 'Ellie, Hannah & Kaylee', Saturday: 'Zoey bedding day',
  Sunday: 'Wyatt towels + overflow',
}
const DISHES = {
  breakfast: 'Amos & Wyatt', lunch: 'Ellie & Hannah',
  dinner_cleanup: 'Zoey & Kaylee', deep_clean: 'Saturday',
  trash: 'Mon & Tue (Amos)',
}

// Dinner managers + themes (2-week rotation, epoch Mar 30)
const MEAL_EPOCH = new Date('2026-03-30T12:00:00')
const MEAL_WEEK1 = [
  { day: 'Monday', manager: 'Kaylee', theme: 'American Comfort' },
  { day: 'Tuesday', manager: 'Zoey', theme: 'Asian Night' },
  { day: 'Wednesday', manager: 'Wyatt', theme: 'Bar Night' },
  { day: 'Thursday', manager: 'Amos', theme: 'Mexican Night' },
  { day: 'Friday', manager: 'Ellie & Hannah', theme: 'Pizza & Italian' },
  { day: 'Saturday', manager: 'Levi/Parents', theme: 'Grill Night' },
  { day: 'Sunday', manager: 'Parents', theme: 'Roast/Comfort' },
]
const MEAL_WEEK2 = [
  { day: 'Monday', manager: 'Kaylee', theme: 'Soup/Comfort/Crockpot' },
  { day: 'Tuesday', manager: 'Zoey', theme: 'Asian Night' },
  { day: 'Wednesday', manager: 'Wyatt', theme: 'Easy/Lazy Night' },
  { day: 'Thursday', manager: 'Amos', theme: 'Mexican Night' },
  { day: 'Friday', manager: 'Ellie & Hannah', theme: 'Pizza & Italian' },
  { day: 'Saturday', manager: 'Levi/Parents', theme: 'Experiment/Big Cook' },
  { day: 'Sunday', manager: 'Parents', theme: 'Brunch/Light' },
]

function getBelleWeekendOwner(saturdayDate: Date) {
  const weeks = Math.floor((saturdayDate.getTime() - BELLE_WEEKEND_EPOCH.getTime()) / (7 * 86400000))
  const idx = ((weeks % BELLE_WEEKEND_ROTATION.length) + BELLE_WEEKEND_ROTATION.length) % BELLE_WEEKEND_ROTATION.length
  return BELLE_WEEKEND_ROTATION[idx]
}

function isBathWeek(saturdayDate: Date) {
  const weeks = Math.floor((saturdayDate.getTime() - BATH_ANCHOR.getTime()) / (7 * 86400000))
  return weeks % 2 === 0
}

function isNailWeek(sundayDate: Date) {
  const weeks = Math.floor((sundayDate.getTime() - NAIL_ANCHOR.getTime()) / (7 * 86400000))
  return weeks % 2 === 0
}

function getZoneAssignments(weekDate: Date) {
  const weeks = Math.floor((weekDate.getTime() - ZONE_EPOCH.getTime()) / (7 * 86400000))
  const zoneWeekIdx = ((weeks % 6) + 6) % 6
  const assignments: Record<string, string> = {}
  for (const kid of ZONE_KIDS) {
    assignments[kid] = ZONE_NAMES[ZONE_OFFSETS[kid][zoneWeekIdx]]
  }
  return { assignments, weekNum: zoneWeekIdx + 1 }
}

function getMealWeek(mondayDate: Date) {
  const weeks = Math.floor((mondayDate.getTime() - MEAL_EPOCH.getTime()) / (7 * 86400000))
  return weeks % 2 === 0 ? 1 : 2
}

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function getWeeksSinceEpoch(date: string) {
  const d = new Date(date + 'T12:00:00')
  const diff = d.getTime() - HOST_EPOCH.getTime()
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
}

function getHostForDate(date: string) {
  const weeks = getWeeksSinceEpoch(date)
  const idx = ((weeks % HOST_ROTATION.length) + HOST_ROTATION.length) % HOST_ROTATION.length
  return HOST_ROTATION[idx]
}

function getSundayOfWeek(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

async function pickIcebreaker() {
  // Get least-used, not used in last 3 weeks
  const rows = await db.query(
    `SELECT id, question, category FROM huddle_icebreakers
     WHERE (last_used_date IS NULL OR last_used_date < CURRENT_DATE - INTERVAL '21 days')
     ORDER BY used_count ASC, RANDOM() LIMIT 1`
  ).catch(() => [])
  if (rows[0]) return rows[0]
  // Fallback: any question
  const fallback = await db.query(`SELECT id, question, category FROM huddle_icebreakers ORDER BY RANDOM() LIMIT 1`).catch(() => [])
  return fallback[0] || { id: 0, question: 'What was the best part of your week?', category: 'fun' }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || ''

  try {
    if (action === 'get_huddle') {
      const id = searchParams.get('id')
      const date = searchParams.get('date')
      let huddle
      if (id) {
        huddle = (await db.query(`SELECT * FROM family_huddle WHERE id = $1`, [id]))[0]
      } else if (date) {
        huddle = (await db.query(`SELECT * FROM family_huddle WHERE huddle_date = $1`, [date]))[0]
      }
      if (!huddle) return NextResponse.json({ huddle: null })
      const shares = await db.query(`SELECT * FROM family_huddle_shares WHERE huddle_id = $1 ORDER BY kid_name`, [huddle.id]).catch(() => [])
      return NextResponse.json({ huddle, shares })
    }

    if (action === 'get_latest') {
      const today = getToday()
      const sunday = getSundayOfWeek(today)
      let huddle = (await db.query(`SELECT * FROM family_huddle WHERE huddle_date = $1`, [sunday]).catch(() => []))[0]
      if (!huddle) {
        // Try most recent
        huddle = (await db.query(`SELECT * FROM family_huddle ORDER BY huddle_date DESC LIMIT 1`).catch(() => []))[0]
      }
      if (!huddle) return NextResponse.json({ huddle: null })
      const shares = await db.query(`SELECT * FROM family_huddle_shares WHERE huddle_id = $1 ORDER BY kid_name`, [huddle.id]).catch(() => [])
      return NextResponse.json({ huddle, shares })
    }

    if (action === 'get_icebreakers') {
      const category = searchParams.get('category')
      const sql = category
        ? `SELECT * FROM huddle_icebreakers WHERE category = $1 ORDER BY question`
        : `SELECT * FROM huddle_icebreakers ORDER BY category, question`
      const rows = await db.query(sql, category ? [category] : []).catch(() => [])
      return NextResponse.json({ icebreakers: rows })
    }

    if (action === 'get_history') {
      const limit = parseInt(searchParams.get('limit') || '8')
      const rows = await db.query(
        `SELECT h.*, (SELECT COUNT(*)::int FROM family_huddle_shares s WHERE s.huddle_id = h.id) as share_count
         FROM family_huddle h ORDER BY huddle_date DESC LIMIT $1`, [limit]
      ).catch(() => [])
      return NextResponse.json({ history: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Huddle GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'generate_agenda': {
        const today = getToday()
        const sunday = body.date || getSundayOfWeek(today)
        const weekNum = getWeeksSinceEpoch(sunday) + 1
        const host = getHostForDate(sunday)
        const hostDisplay = host.charAt(0).toUpperCase() + host.slice(1)

        // Check if already exists
        const existing = await db.query(`SELECT * FROM family_huddle WHERE huddle_date = $1`, [sunday]).catch(() => [])
        if (existing[0]) {
          // Return existing with agenda data
          const shares = await db.query(`SELECT * FROM family_huddle_shares WHERE huddle_id = $1 ORDER BY kid_name`, [existing[0].id]).catch(() => [])
          return NextResponse.json({ huddle: existing[0], shares, agenda: await buildAgenda(sunday) })
        }

        // Pick icebreaker
        const icebreaker = await pickIcebreaker()
        await db.query(`UPDATE huddle_icebreakers SET used_count = used_count + 1, last_used_date = $1 WHERE id = $2`, [sunday, icebreaker.id]).catch(() => {})

        // Create huddle
        const rows = await db.query(
          `INSERT INTO family_huddle (huddle_date, week_number, host_kid, icebreaker_question, icebreaker_category)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [sunday, weekNum, host, icebreaker.question, icebreaker.category]
        )

        const agenda = await buildAgenda(sunday)
        return NextResponse.json({ huddle: rows[0], shares: [], agenda })
      }

      case 'start_huddle': {
        const { huddle_id } = body
        if (!huddle_id) return NextResponse.json({ error: 'huddle_id required' }, { status: 400 })
        await db.query(`UPDATE family_huddle SET status = 'in_progress', started_at = NOW() WHERE id = $1`, [huddle_id])
        return NextResponse.json({ success: true })
      }

      case 'complete_huddle': {
        const { huddle_id } = body
        if (!huddle_id) return NextResponse.json({ error: 'huddle_id required' }, { status: 400 })
        await db.query(`UPDATE family_huddle SET status = 'completed', completed_at = NOW() WHERE id = $1`, [huddle_id])
        return NextResponse.json({ success: true })
      }

      case 'skip_huddle': {
        const { huddle_id, notes } = body
        if (!huddle_id) return NextResponse.json({ error: 'huddle_id required' }, { status: 400 })
        await db.query(`UPDATE family_huddle SET status = 'skipped', notes = $1 WHERE id = $2`, [notes || null, huddle_id])
        return NextResponse.json({ success: true })
      }

      case 'save_share': {
        const { huddle_id, kid_name, share_type, content } = body
        if (!huddle_id || !kid_name) return NextResponse.json({ error: 'huddle_id, kid_name required' }, { status: 400 })
        await db.query(
          `INSERT INTO family_huddle_shares (huddle_id, kid_name, share_type, content)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [huddle_id, kid_name.toLowerCase(), share_type || 'win', content || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'save_notes': {
        const { huddle_id, notes } = body
        if (!huddle_id) return NextResponse.json({ error: 'huddle_id required' }, { status: 400 })
        await db.query(`UPDATE family_huddle SET notes = $1 WHERE id = $2`, [notes, huddle_id])
        return NextResponse.json({ success: true })
      }

      case 'reshuffle_icebreaker': {
        const { huddle_id } = body
        if (!huddle_id) return NextResponse.json({ error: 'huddle_id required' }, { status: 400 })
        const icebreaker = await pickIcebreaker()
        await db.query(`UPDATE huddle_icebreakers SET used_count = used_count + 1, last_used_date = CURRENT_DATE WHERE id = $1`, [icebreaker.id]).catch(() => {})
        await db.query(`UPDATE family_huddle SET icebreaker_question = $1, icebreaker_category = $2 WHERE id = $3`,
          [icebreaker.question, icebreaker.category, huddle_id])
        return NextResponse.json({ success: true, icebreaker })
      }

      case 'add_icebreaker': {
        const { question, category } = body
        if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 })
        await db.query(
          `INSERT INTO huddle_icebreakers (question, category, added_by) VALUES ($1, $2, 'parent')`,
          [question, category || 'fun']
        )
        return NextResponse.json({ success: true })
      }

      case 'generate_printable': {
        const today = getToday()
        const sunday = body.date || getSundayOfWeek(today)
        const agenda = await buildAgenda(sunday)
        return NextResponse.json({ success: true, printable: agenda })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Huddle POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// ── Build agenda from system data ──
async function buildAgenda(sundayDate: string) {
  const sunday = new Date(sundayDate + 'T12:00:00')
  const monday = new Date(sunday)
  monday.setDate(monday.getDate() + 1)
  const saturday = new Date(monday)
  saturday.setDate(saturday.getDate() + 5)
  const nextSunday = new Date(saturday)
  nextSunday.setDate(nextSunday.getDate() + 1)

  const monStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const sunStr = nextSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Stars leaderboard
  const stars = await db.query(
    `SELECT kid_name, stars_balance as stars, streak_days as streak FROM digi_pets ORDER BY stars_balance DESC`
  ).catch(() => [])

  // Zone assignments
  const { assignments: zoneAssignments, weekNum: zoneWeekNum } = getZoneAssignments(monday)

  // Meal plan from rotation
  const mealWeekNum = getMealWeek(monday)
  const mealTemplate = mealWeekNum === 1 ? MEAL_WEEK1 : MEAL_WEEK2
  // Try to get picked meals from DB
  const pickedMeals = await db.query(
    `SELECT day_of_week, meal_name FROM meal_week_plan WHERE week_number = $1`, [mealWeekNum]
  ).catch(() => [])
  const pickedMap: Record<string, string> = {}
  pickedMeals.forEach((m: any) => { if (m.meal_name) pickedMap[m.day_of_week] = m.meal_name })

  // Belle care with weekend
  const weekendOwner = getBelleWeekendOwner(saturday)
  const weekendOwnerDisplay = weekendOwner.charAt(0).toUpperCase() + weekendOwner.slice(1)
  const bathDue = isBathWeek(saturday)
  const nailsDue = isNailWeek(nextSunday)

  // Open requests
  const mealRequests = await db.query(
    `SELECT kid_name, meal_description as content FROM meal_requests WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5`
  ).catch(() => [])
  const groceryRequests = await db.query(
    `SELECT kid_name, item_name as content FROM kid_grocery_requests WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5`
  ).catch(() => [])

  const openRequests = [
    ...mealRequests.map((r: any) => ({ type: 'meal_request', from: r.kid_name, content: r.content })),
    ...groceryRequests.map((r: any) => ({ type: 'grocery_request', from: r.kid_name, content: r.content })),
  ]

  return {
    week_label: `${monStr} – ${sunStr}`,
    stars_leaderboard: stars.map((s: any) => ({
      kid: s.kid_name?.charAt(0).toUpperCase() + s.kid_name?.slice(1),
      stars: s.stars || 0, streak: s.streak || 0,
    })),
    zone_recap: {
      week_num: zoneWeekNum,
      week_label: `Week ${zoneWeekNum} of 6 (${monStr} – ${sunStr})`,
      assignments: Object.entries(zoneAssignments).map(([kid, zone]) => ({
        kid: kid.charAt(0).toUpperCase() + kid.slice(1), zone,
      })),
    },
    meal_plan: mealTemplate.map(m => ({
      day: m.day, theme: m.theme, manager: m.manager, meal: pickedMap[m.day] || null,
    })),
    meal_week: mealWeekNum,
    belle_this_week: {
      monday: BELLE_WEEKDAY[1], tuesday: BELLE_WEEKDAY[2], wednesday: BELLE_WEEKDAY[3],
      thursday: BELLE_WEEKDAY[4], friday: BELLE_WEEKDAY[5],
      weekend_owner: weekendOwnerDisplay,
      grooming: { bath: bathDue, nails: nailsDue },
    },
    open_requests: openRequests,
    upcoming_events: [] as any[],
    laundry: LAUNDRY,
    dishes: DISHES,
    kid_share_prompts: [
      'Share one WIN from this week',
      'Share one thing you\'re LOOKING FORWARD TO next week',
    ],
  }
}
