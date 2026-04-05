import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const HOST_ROTATION = ['amos', 'kaylee', 'hannah', 'ellie', 'wyatt', 'zoey']
const HOST_EPOCH = new Date('2026-04-05T12:00:00')
const KID_EMOJIS: Record<string, string> = {
  amos: '\uD83E\uDD89', zoey: '\uD83C\uDF1F', kaylee: '\uD83C\uDFAD',
  ellie: '\uD83D\uDCA1', wyatt: '\u26A1', hannah: '\uD83C\uDF3B',
}
const BELLE_WEEKDAY: Record<number, string> = { 1: 'Kaylee', 2: 'Amos', 3: 'Hannah', 4: 'Wyatt', 5: 'Ellie' }

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
  const nextSunday = new Date(sundayDate + 'T12:00:00')
  const weekStart = new Date(nextSunday)
  weekStart.setDate(weekStart.getDate() + 1) // Monday
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6) // following Sunday
  const weekStartStr = weekStart.toLocaleDateString('en-CA')
  const weekEndStr = weekEnd.toLocaleDateString('en-CA')

  // Stars leaderboard
  const stars = await db.query(
    `SELECT kid_name, stars_balance as stars, streak_days as streak FROM digi_pets ORDER BY stars_balance DESC`
  ).catch(() => [])

  // Zone assignments (from zone rotation)
  // Week number in 6-week cycle
  const epoch = new Date('2026-03-15T12:00:00')
  const weeksSinceZoneEpoch = Math.floor((nextSunday.getTime() - epoch.getTime()) / (7 * 86400000))
  const zoneWeek = ((weeksSinceZoneEpoch % 6) + 6) % 6

  // Upcoming events (placeholder — would need calendar integration)
  const events: any[] = []

  // Meal plan
  const mealPlan = await db.query(
    `SELECT day_of_week, theme, manager_name, meal_name FROM meal_week_plan
     WHERE week_number = $1 ORDER BY CASE day_of_week
       WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
       WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7 END`,
    [zoneWeek % 2 === 0 ? 1 : 2]
  ).catch(() => [])

  // Belle care
  const belleWeek = {
    monday: BELLE_WEEKDAY[1], tuesday: BELLE_WEEKDAY[2], wednesday: BELLE_WEEKDAY[3],
    thursday: BELLE_WEEKDAY[4], friday: BELLE_WEEKDAY[5],
  }

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
    stars_leaderboard: stars.map((s: any) => ({
      kid: s.kid_name?.charAt(0).toUpperCase() + s.kid_name?.slice(1),
      stars: s.stars || 0, streak: s.streak || 0,
    })),
    zone_week: zoneWeek + 1,
    upcoming_events: events,
    meal_plan: mealPlan.map((m: any) => ({
      day: m.day_of_week, theme: m.theme, manager: m.manager_name, meal: m.meal_name,
    })),
    belle_this_week: belleWeek,
    open_requests: openRequests,
    kid_share_prompts: [
      'Share one WIN from this week',
      'Share one thing you\'re LOOKING FORWARD TO next week',
    ],
  }
}
