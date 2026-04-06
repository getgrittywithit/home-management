import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const HOST_ROTATION = ['amos', 'kaylee', 'hannah', 'ellie', 'wyatt', 'zoey']
const HOST_EPOCH = new Date('2026-04-05T12:00:00')
const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
// KID_EMOJIS used in frontend, kept here for reference
// amos: owl, zoey: star, kaylee: theater, ellie: bulb, wyatt: lightning, hannah: sunflower
const BELLE_WEEKDAY: Record<number, string> = { 1: 'Kaylee', 2: 'Amos', 3: 'Hannah', 4: 'Wyatt', 5: 'Ellie' }
const BELLE_WEEKEND_ROTATION = ['hannah', 'wyatt', 'amos', 'kaylee', 'ellie']
const BELLE_WEEKEND_EPOCH = new Date('2026-06-13T12:00:00')
const BATH_ANCHOR = new Date('2026-06-13T12:00:00')
const NAIL_ANCHOR = new Date('2026-06-14T12:00:00')

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

const BONUS_TYPES = ['gratitude', 'goal_checkin', 'family_challenge']
const BONUS_EPOCH = new Date('2026-04-05T12:00:00')

const GAME_TYPES = ['mad_libs', 'family_trivia', 'vocab_showdown', 'this_or_that']
const GAME_DISPLAY: Record<string, { name: string; desc: string; quick: string }> = {
  mad_libs: { name: 'Mad Libs', desc: 'Fill in the blanks to create a silly family story!', quick: '1 short story (3-4 blanks)' },
  family_trivia: { name: 'Family Trivia', desc: 'How well do you know your family? Test everyone!', quick: '3 quick questions' },
  vocab_showdown: { name: 'Vocab Showdown', desc: 'Fast-fire word round — shout the answer first!', quick: '60-second speed round' },
  this_or_that: { name: 'This or That', desc: 'Pick a side and defend your choice!', quick: '2 quick prompts' },
}

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

function getBonusType(sundayDate: Date) {
  const weeks = Math.floor((sundayDate.getTime() - BONUS_EPOCH.getTime()) / (7 * 86400000))
  const idx = ((weeks % 3) + 3) % 3
  return BONUS_TYPES[idx]
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

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

// Normalize date strings from Postgres (may arrive as "2026-04-05T00:00:00.000Z")
function normalizeDate(d: any): string {
  if (!d) return getToday()
  const str = typeof d === 'string' ? d : new Date(d).toISOString()
  return str.slice(0, 10) // "YYYY-MM-DD"
}

async function pickIcebreaker() {
  const rows = await db.query(
    `SELECT id, question, category FROM huddle_icebreakers
     WHERE (last_used_date IS NULL OR last_used_date < CURRENT_DATE - INTERVAL '21 days')
     ORDER BY used_count ASC, RANDOM() LIMIT 1`
  ).catch(() => [])
  if (rows[0]) return rows[0]
  const fallback = await db.query(`SELECT id, question, category FROM huddle_icebreakers ORDER BY RANDOM() LIMIT 1`).catch(() => [])
  return fallback[0] || { id: 0, question: 'What was the best part of your week?', category: 'fun' }
}

// ── Auto-Detected Wins Scanner ──
async function scanCelebrations(weekStart: string, weekEnd: string) {
  const celebrations: any[] = []

  // New achievements this week
  const achievements = await db.query(
    `SELECT kid_name, badge_name, tier FROM kid_achievements WHERE unlocked_at::date BETWEEN $1 AND $2 ORDER BY unlocked_at DESC`,
    [weekStart, weekEnd]
  ).catch(() => [])
  for (const a of achievements) {
    celebrations.push({ kid: cap(a.kid_name), type: 'achievement', text: `Unlocked ${cap(a.tier)} ${a.badge_name}!`, emoji: '\uD83C\uDFC6' })
  }

  // Star milestones
  const starKids = await db.query(
    `SELECT kid_name, stars_balance, streak_days FROM digi_pets ORDER BY stars_balance DESC`
  ).catch(() => [])
  for (const s of starKids) {
    const bal = s.stars_balance || 0
    const milestones = [500, 250, 100, 50]
    for (const m of milestones) {
      if (bal >= m) {
        celebrations.push({ kid: cap(s.kid_name), type: 'milestone', text: `Hit ${m} total stars!`, emoji: '\u2B50' })
        break
      }
    }
    if ((s.streak_days || 0) >= 3) {
      celebrations.push({ kid: cap(s.kid_name), type: 'streak', text: `${s.streak_days}-day streak!`, emoji: '\uD83D\uDD25' })
    }
  }

  // Perfect med week (Amos/Wyatt)
  for (const kid of ['amos', 'wyatt']) {
    const meds = await db.query(
      `SELECT COUNT(*)::int as taken FROM med_adherence_log WHERE kid_name = $1 AND log_date BETWEEN $2 AND $3 AND taken = true`,
      [kid, weekStart, weekEnd]
    ).catch(() => [])
    if ((meds[0]?.taken || 0) >= 7) {
      celebrations.push({ kid: cap(kid), type: 'med_perfect', text: 'Perfect med week — every dose on time!', emoji: '\uD83D\uDC8A' })
    }
  }

  // GOOD-1 sibling/parent shoutouts
  const shoutouts = await db.query(
    `SELECT reporter_name, kid_name, description FROM positive_behavior_reports WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC LIMIT 5`,
    [weekStart, weekEnd]
  ).catch(() => [])
  for (const s of shoutouts) {
    celebrations.push({ kid: cap(s.kid_name), type: 'sibling_shoutout', text: s.description || 'Got a shoutout!', emoji: '\uD83D\uDC9B', from: cap(s.reporter_name) })
  }

  // Zone completion 100%
  for (const kid of KIDS) {
    const zoneData = await db.query(
      `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE completed = TRUE)::int as done
       FROM kid_daily_checklist WHERE child_name = $1 AND event_date BETWEEN $2 AND $3 AND task_category = 'zone'`,
      [kid, weekStart, weekEnd]
    ).catch(() => [])
    if (zoneData[0]?.total > 0 && zoneData[0]?.done === zoneData[0]?.total) {
      celebrations.push({ kid: cap(kid), type: 'zone_perfect', text: '100% zone completion this week!', emoji: '\u2728' })
    }
  }

  return celebrations
}

// ── Parent Prep Intelligence ──
async function generateParentPrep(weekStart: string, weekEnd: string) {
  const items: any[] = []

  // Missed meds (Hot)
  for (const kid of ['amos', 'wyatt']) {
    const missed = await db.query(
      `SELECT COUNT(*)::int as missed FROM med_adherence_log WHERE kid_name = $1 AND log_date BETWEEN $2 AND $3 AND taken = false`,
      [kid, weekStart, weekEnd]
    ).catch(() => [])
    if ((missed[0]?.missed || 0) > 0) {
      items.push({ source: 'med_adherence', kid_name: cap(kid), summary: `${missed[0].missed} missed med dose(s) this week`, priority: 'hot' })
    }
  }

  // Safety events / break button usage (Hot)
  for (const kid of KIDS) {
    const breaks = await db.query(
      `SELECT COUNT(*)::int as c FROM kid_break_flags WHERE kid_name = $1 AND flagged_at::date BETWEEN $2 AND $3`,
      [kid, weekStart, weekEnd]
    ).catch(() => [])
    if ((breaks[0]?.c || 0) > 0) {
      items.push({ source: 'safety_events', kid_name: cap(kid), summary: `Used Break button ${breaks[0].c} time(s)`, priority: 'hot' })
    }
  }

  // Low mood patterns (Hot)
  for (const kid of KIDS) {
    const mood = await db.query(
      `SELECT COUNT(*)::int as low_days FROM kid_mood_log WHERE child_name = $1 AND log_date BETWEEN $2 AND $3 AND COALESCE(mood_score, mood) <= 2`,
      [kid, weekStart, weekEnd]
    ).catch(() => [])
    if ((mood[0]?.low_days || 0) >= 3) {
      items.push({ source: 'mood_logs', kid_name: cap(kid), summary: `${mood[0].low_days} low-mood days this week`, priority: 'hot' })
    }
  }

  // Zones below 30% (Medium)
  for (const kid of KIDS) {
    const tasks = await db.query(
      `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE completed = TRUE)::int as done
       FROM kid_daily_checklist WHERE child_name = $1 AND event_date BETWEEN $2 AND $3`,
      [kid, weekStart, weekEnd]
    ).catch(() => [])
    const total = tasks[0]?.total || 0
    const done = tasks[0]?.done || 0
    const pct = total > 0 ? Math.round((done / total) * 100) : 100
    if (total > 0 && pct < 30) {
      items.push({ source: 'checklist', kid_name: cap(kid), summary: `Zone completion at ${pct}% — needs reset`, priority: 'medium' })
    }
  }

  // Pending meal requests (Medium)
  const pendingMeals = await db.query(
    `SELECT kid_name, meal_description FROM meal_requests WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5`
  ).catch(() => [])
  for (const m of pendingMeals) {
    items.push({ source: 'meal_requests', kid_name: cap(m.kid_name), summary: `Meal request: ${m.meal_description}`, priority: 'medium' })
  }

  // Unread kid notes (Medium)
  const unreadNotes = await db.query(
    `SELECT kid_name, content FROM kid_notes WHERE read = false ORDER BY created_at DESC LIMIT 5`
  ).catch(() => [])
  for (const n of unreadNotes) {
    items.push({ source: 'kid_notes', kid_name: cap(n.kid_name), summary: `Unread note: "${(n.content || '').slice(0, 60)}"`, priority: 'medium' })
  }

  // Pending grocery requests (Low)
  const pendingGrocery = await db.query(
    `SELECT kid_name, item_name FROM kid_grocery_requests WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5`
  ).catch(() => [])
  for (const g of pendingGrocery) {
    items.push({ source: 'grocery_requests', kid_name: cap(g.kid_name), summary: `Grocery request: ${g.item_name}`, priority: 'low' })
  }

  // Behavior logs (Medium)
  const behaviors = await db.query(
    `SELECT kid_name, behavior_type, description FROM behavior_logs WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC LIMIT 5`,
    [weekStart, weekEnd]
  ).catch(() => [])
  for (const b of behaviors) {
    items.push({ source: 'behavior_logs', kid_name: cap(b.kid_name), summary: `Behavior: ${b.description || b.behavior_type}`, priority: 'medium' })
  }

  // Sick days (Info)
  const sick = await db.query(
    `SELECT kid_name, COUNT(*)::int as days FROM attendance_log WHERE log_date BETWEEN $1 AND $2 AND status = 'sick' GROUP BY kid_name`,
    [weekStart, weekEnd]
  ).catch(() => [])
  for (const s of sick) {
    items.push({ source: 'attendance', kid_name: cap(s.kid_name), summary: `${s.days} sick day(s) this week`, priority: 'info' })
  }

  // Sort by priority
  const order: Record<string, number> = { hot: 0, medium: 1, low: 2, info: 3 }
  items.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3))

  return items
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
        const sunday = body.date ? normalizeDate(body.date) : getSundayOfWeek(today)
        const weekNum = getWeeksSinceEpoch(sunday) + 1
        const host = getHostForDate(sunday)

        const existing = await db.query(`SELECT * FROM family_huddle WHERE huddle_date = $1`, [sunday]).catch(() => [])
        if (existing[0]) {
          const shares = await db.query(`SELECT * FROM family_huddle_shares WHERE huddle_id = $1 ORDER BY kid_name`, [existing[0].id]).catch(() => [])
          return NextResponse.json({ huddle: existing[0], shares, agenda: await buildAgenda(sunday, existing[0].id) })
        }

        const icebreaker = await pickIcebreaker()
        await db.query(`UPDATE huddle_icebreakers SET used_count = used_count + 1, last_used_date = $1 WHERE id = $2`, [sunday, icebreaker.id]).catch(() => {})

        const bonusType = getBonusType(new Date(sunday + 'T12:00:00'))

        const rows = await db.query(
          `INSERT INTO family_huddle (huddle_date, week_number, host_kid, icebreaker_question, icebreaker_category, bonus_type)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [sunday, weekNum, host, icebreaker.question, icebreaker.category, bonusType]
        )

        const agenda = await buildAgenda(sunday, rows[0].id)
        return NextResponse.json({ huddle: rows[0], shares: [], agenda })
      }

      case 'start_huddle': {
        const { huddle_id } = body
        if (!huddle_id) return NextResponse.json({ error: 'huddle_id required' }, { status: 400 })
        await db.query(`UPDATE family_huddle SET status = 'in_progress', started_at = NOW() WHERE id = $1`, [huddle_id])
        return NextResponse.json({ success: true })
      }

      case 'complete_huddle': {
        const { huddle_id, mode } = body
        if (!huddle_id) return NextResponse.json({ error: 'huddle_id required' }, { status: 400 })
        if (mode) await db.query(`UPDATE family_huddle SET mode = $1 WHERE id = $2`, [mode, huddle_id])
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

      case 'set_mode': {
        const { huddle_id, mode } = body
        if (!huddle_id || !mode) return NextResponse.json({ error: 'huddle_id, mode required' }, { status: 400 })
        await db.query(`UPDATE family_huddle SET mode = $1 WHERE id = $2`, [mode, huddle_id])
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

      // ── Parent Prep ──
      case 'generate_parent_prep': {
        const { huddle_id } = body
        const weekEnd = getToday()
        const d = new Date(); d.setDate(d.getDate() - 6)
        const weekStart = d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

        const items = await generateParentPrep(weekStart, weekEnd)

        // Pre-submit count
        let preSubmitCount = 0
        if (huddle_id) {
          const ps = await db.query(
            `SELECT COUNT(*)::int as c FROM family_huddle_shares WHERE huddle_id = $1 AND pre_submitted = true`, [huddle_id]
          ).catch(() => [])
          preSubmitCount = ps[0]?.c || 0
        }
        if (preSubmitCount > 0) {
          items.push({ source: 'pre_submits', kid_name: null, summary: `${preSubmitCount} of 6 kids pre-submitted shares`, priority: 'info' })
        }

        // Save items to DB if huddle_id provided
        if (huddle_id) {
          for (const item of items) {
            await db.query(
              `INSERT INTO huddle_prep_items (huddle_id, source, kid_name, summary, priority) VALUES ($1, $2, $3, $4, $5)`,
              [huddle_id, item.source, item.kid_name, item.summary, item.priority]
            ).catch(() => {})
          }
        }

        return NextResponse.json({ success: true, items })
      }

      case 'update_prep_item': {
        const { item_id, status } = body
        if (!item_id || !status) return NextResponse.json({ error: 'item_id, status required' }, { status: 400 })
        await db.query(`UPDATE huddle_prep_items SET status = $1 WHERE id = $2`, [status, item_id])
        return NextResponse.json({ success: true })
      }

      // ── Mini Games ──
      case 'get_game_options': {
        // Find most recently played game type
        const recent = await db.query(
          `SELECT game_type FROM huddle_game_log ORDER BY created_at DESC LIMIT 1`
        ).catch(() => [])
        const exclude = recent[0]?.game_type || ''

        const available = GAME_TYPES.filter(t => t !== exclude)
        // Pick 3 (or all if only 3 available)
        const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 3)
        const options = shuffled.map(t => ({
          game_type: t,
          display_name: GAME_DISPLAY[t].name,
          description: GAME_DISPLAY[t].desc,
          quick_version_description: GAME_DISPLAY[t].quick,
        }))

        return NextResponse.json({ success: true, options })
      }

      case 'load_game': {
        const { game_type, mode } = body
        const isQuick = mode === 'quick'

        if (game_type === 'mad_libs') {
          const templates = await db.query(
            `SELECT * FROM huddle_game_templates WHERE game_type = 'mad_libs' ORDER BY used_count ASC, RANDOM() LIMIT 1`
          ).catch(() => [])
          const template = templates[0]
          if (template) {
            await db.query(`UPDATE huddle_game_templates SET used_count = used_count + 1 WHERE id = $1`, [template.id]).catch(() => {})
          }
          // Try to get vocab words for word bank
          const vocabWords = await db.query(
            `SELECT word, part_of_speech FROM vocab_words ORDER BY RANDOM() LIMIT 20`
          ).catch(() => [])
          return NextResponse.json({
            success: true,
            game: { type: 'mad_libs', template: template?.template_text || '', blank_tags: template?.blank_tags || [], vocab_bank: vocabWords }
          })
        }

        if (game_type === 'family_trivia') {
          const limit = isQuick ? 3 : 8
          const questions = await db.query(
            `SELECT id, question, answer, about_kid FROM huddle_trivia_bank ORDER BY used_count ASC, RANDOM() LIMIT $1`, [limit]
          ).catch(() => [])
          for (const q of questions) {
            await db.query(`UPDATE huddle_trivia_bank SET used_count = used_count + 1, last_used_date = CURRENT_DATE WHERE id = $1`, [q.id]).catch(() => {})
          }
          return NextResponse.json({ success: true, game: { type: 'family_trivia', questions } })
        }

        if (game_type === 'vocab_showdown') {
          const words = await db.query(
            `SELECT word, definition FROM vocab_words ORDER BY RANDOM() LIMIT 15`
          ).catch(() => [])
          // Fallback if no vocab words
          const fallbackWords = words.length > 0 ? words : [
            { word: 'Perseverance', definition: 'Continued effort despite difficulty' },
            { word: 'Resilient', definition: 'Able to recover quickly from tough situations' },
            { word: 'Hypothesis', definition: 'An educated guess or prediction' },
            { word: 'Elaborate', definition: 'To explain in more detail' },
            { word: 'Compassion', definition: 'Caring about others and wanting to help' },
          ]
          return NextResponse.json({
            success: true,
            game: { type: 'vocab_showdown', words: fallbackWords, timer_seconds: isQuick ? 60 : 180 }
          })
        }

        if (game_type === 'this_or_that') {
          const limit = isQuick ? 2 : 5
          const rows = await db.query(
            `SELECT id, prompt_text, option_a, option_b FROM huddle_prompts ORDER BY used_count ASC, RANDOM() LIMIT $1`, [limit]
          ).catch(() => [])
          for (const r of rows) {
            await db.query(`UPDATE huddle_prompts SET used_count = used_count + 1 WHERE id = $1`, [r.id]).catch(() => {})
          }
          return NextResponse.json({ success: true, game: { type: 'this_or_that', prompts: rows } })
        }

        return NextResponse.json({ error: 'Unknown game_type' }, { status: 400 })
      }

      case 'save_game': {
        const { huddle_id, game_type, game_data, memorable_moment, duration_seconds } = body
        if (!huddle_id || !game_type) return NextResponse.json({ error: 'huddle_id, game_type required' }, { status: 400 })
        await db.query(
          `INSERT INTO huddle_game_log (huddle_id, game_type, game_data, memorable_moment, duration_seconds) VALUES ($1, $2, $3, $4, $5)`,
          [huddle_id, game_type, game_data ? JSON.stringify(game_data) : null, memorable_moment || null, duration_seconds || null]
        )
        await db.query(`UPDATE family_huddle SET game_type = $1 WHERE id = $2`, [game_type, huddle_id]).catch(() => {})
        return NextResponse.json({ success: true })
      }

      case 'get_vocab_words': {
        const words = await db.query(
          `SELECT word, definition, part_of_speech FROM vocab_words ORDER BY RANDOM() LIMIT 20`
        ).catch(() => [])
        return NextResponse.json({ success: true, words })
      }

      // ── Bonus Rounds ──
      case 'get_bonus_round': {
        const { huddle_id } = body
        const today = getToday()
        const sunday = getSundayOfWeek(today)
        const bonusType = getBonusType(new Date(sunday + 'T12:00:00'))

        let content: any = { type: bonusType, kids: KIDS.map(k => cap(k)) }

        if (bonusType === 'family_challenge') {
          const challenge = await db.query(
            `SELECT id, challenge_text, category FROM huddle_challenges ORDER BY used_count ASC, RANDOM() LIMIT 1`
          ).catch(() => [])
          if (challenge[0]) {
            content.challenge = challenge[0]
            await db.query(`UPDATE huddle_challenges SET used_count = used_count + 1, last_used_date = CURRENT_DATE WHERE id = $1`, [challenge[0].id]).catch(() => {})
          }
        }

        if (bonusType === 'goal_checkin' && huddle_id) {
          // Check for previous goals to carry over
          const prevGoals = await db.query(
            `SELECT kid_name, content FROM huddle_bonus_rounds
             WHERE bonus_type = 'goal_checkin' AND kid_name IS NOT NULL
             ORDER BY created_at DESC LIMIT 6`
          ).catch(() => [])
          content.previous_goals = prevGoals
        }

        return NextResponse.json({ success: true, bonus: content })
      }

      case 'save_bonus_round': {
        const { huddle_id, bonus_type, responses } = body
        if (!huddle_id || !bonus_type) return NextResponse.json({ error: 'huddle_id, bonus_type required' }, { status: 400 })
        if (Array.isArray(responses)) {
          for (const r of responses) {
            await db.query(
              `INSERT INTO huddle_bonus_rounds (huddle_id, bonus_type, kid_name, content) VALUES ($1, $2, $3, $4)`,
              [huddle_id, bonus_type, r.kid_name || null, r.content || null]
            )
          }
        }
        await db.query(`UPDATE family_huddle SET bonus_type = $1 WHERE id = $2`, [bonus_type, huddle_id]).catch(() => {})
        return NextResponse.json({ success: true })
      }

      case 'swap_challenge': {
        const { exclude_id } = body
        const challenge = await db.query(
          `SELECT id, challenge_text, category FROM huddle_challenges WHERE id != $1 ORDER BY used_count ASC, RANDOM() LIMIT 1`,
          [exclude_id || 0]
        ).catch(() => [])
        if (challenge[0]) {
          await db.query(`UPDATE huddle_challenges SET used_count = used_count + 1, last_used_date = CURRENT_DATE WHERE id = $1`, [challenge[0].id]).catch(() => {})
        }
        return NextResponse.json({ success: true, challenge: challenge[0] || null })
      }

      // ── Kid Pre-Submit ──
      case 'pre_submit_share': {
        const { kid_name, share_type, content } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        // Find or create upcoming Sunday's huddle
        const today = getToday()
        const todayDate = new Date(today + 'T12:00:00')
        const dayOfWeek = todayDate.getDay()
        // Next Sunday (or today if it's Sunday)
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
        const nextSunday = new Date(todayDate)
        nextSunday.setDate(nextSunday.getDate() + daysUntilSunday)
        const sundayStr = nextSunday.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

        let huddle = (await db.query(`SELECT * FROM family_huddle WHERE huddle_date = $1`, [sundayStr]).catch(() => []))[0]
        if (!huddle) {
          // Auto-create the huddle
          const weekNum = getWeeksSinceEpoch(sundayStr) + 1
          const host = getHostForDate(sundayStr)
          const icebreaker = await pickIcebreaker()
          const bonusType = getBonusType(new Date(sundayStr + 'T12:00:00'))
          await db.query(`UPDATE huddle_icebreakers SET used_count = used_count + 1, last_used_date = $1 WHERE id = $2`, [sundayStr, icebreaker.id]).catch(() => {})
          const rows = await db.query(
            `INSERT INTO family_huddle (huddle_date, week_number, host_kid, icebreaker_question, icebreaker_category, bonus_type)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [sundayStr, weekNum, host, icebreaker.question, icebreaker.category, bonusType]
          )
          huddle = rows[0]
        }

        // Upsert the share
        const existing = await db.query(
          `SELECT id FROM family_huddle_shares WHERE huddle_id = $1 AND kid_name = $2`, [huddle.id, kid_name.toLowerCase()]
        ).catch(() => [])
        if (existing[0]) {
          await db.query(
            `UPDATE family_huddle_shares SET share_type = $1, content = $2, pre_submitted = true, pre_submitted_at = NOW() WHERE id = $3`,
            [share_type || 'win', content || '', existing[0].id]
          )
        } else {
          await db.query(
            `INSERT INTO family_huddle_shares (huddle_id, kid_name, share_type, content, pre_submitted, pre_submitted_at) VALUES ($1, $2, $3, $4, true, NOW())`,
            [huddle.id, kid_name.toLowerCase(), share_type || 'win', content || '']
          )
        }

        return NextResponse.json({ success: true })
      }

      case 'get_pre_submits': {
        const today = getToday()
        const sunday = getSundayOfWeek(today)
        // Also check next Sunday if it's Sat
        const todayDate = new Date(today + 'T12:00:00')
        const dayOfWeek = todayDate.getDay()
        const nextSunday = dayOfWeek === 0 ? sunday : (() => {
          const ns = new Date(todayDate)
          ns.setDate(ns.getDate() + (7 - dayOfWeek))
          return ns.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        })()

        const huddle = (await db.query(`SELECT id FROM family_huddle WHERE huddle_date = $1`, [nextSunday]).catch(() => []))[0]
        if (!huddle) return NextResponse.json({ success: true, pre_submits: [] })

        const shares = await db.query(
          `SELECT kid_name, share_type, content, pre_submitted_at FROM family_huddle_shares WHERE huddle_id = $1 AND pre_submitted = true ORDER BY kid_name`,
          [huddle.id]
        ).catch(() => [])

        return NextResponse.json({ success: true, pre_submits: shares })
      }

      // ── Share-to-Task Bridge ──
      case 'create_action_item': {
        const { huddle_id, kid_name, title, destination, share_id } = body
        if (!huddle_id || !title) return NextResponse.json({ error: 'huddle_id, title required' }, { status: 400 })

        const dest = destination || 'my_day'

        if (dest === 'my_day') {
          // Create parent my-day task
          const task = await db.query(
            `INSERT INTO parent_my_day (title, source, due_date, time_block) VALUES ($1, 'huddle', CURRENT_DATE, 'morning') RETURNING id`,
            [title]
          ).catch(() => [])
          const taskId = task[0]?.id

          // Log the action item
          await db.query(
            `INSERT INTO huddle_action_items (huddle_id, title, destination, kid_name, external_task_id) VALUES ($1, $2, $3, $4, $5)`,
            [huddle_id, title, dest, kid_name || null, taskId || null]
          )

          // Mark share as task-created if share_id provided
          if (share_id) {
            await db.query(
              `UPDATE family_huddle_shares SET task_created = true, task_id = $1 WHERE id = $2`, [taskId, share_id]
            ).catch(() => {})
          }
        } else if (dest === 'grocery') {
          await db.query(
            `INSERT INTO kid_grocery_requests (kid_name, item_name, status) VALUES ($1, $2, 'pending')`,
            [kid_name || 'parent', title]
          ).catch(() => {})
          await db.query(
            `INSERT INTO huddle_action_items (huddle_id, title, destination, kid_name) VALUES ($1, $2, 'grocery', $3)`,
            [huddle_id, title, kid_name || null]
          )
        } else {
          await db.query(
            `INSERT INTO huddle_action_items (huddle_id, title, destination, kid_name) VALUES ($1, $2, 'note', $3)`,
            [huddle_id, title, kid_name || null]
          )
        }

        return NextResponse.json({ success: true })
      }

      // ── Printable ──
      case 'generate_printable': {
        const today = getToday()
        const sunday = body.date ? normalizeDate(body.date) : getSundayOfWeek(today)
        const agenda = await buildAgenda(sunday)

        // Get family challenge if set for this week's huddle
        const huddle = (await db.query(`SELECT id FROM family_huddle WHERE huddle_date = $1`, [sunday]).catch(() => []))[0]
        let familyChallenge = null
        if (huddle) {
          const ch = await db.query(
            `SELECT content FROM huddle_bonus_rounds WHERE huddle_id = $1 AND bonus_type = 'family_challenge' AND kid_name IS NULL LIMIT 1`,
            [huddle.id]
          ).catch(() => [])
          familyChallenge = ch[0]?.content || null
        }

        return NextResponse.json({ success: true, printable: { ...agenda, family_challenge: familyChallenge } })
      }

      // ── get_history via POST (also available via GET) ──
      case 'get_history': {
        const limit = body.limit || 10
        const rows = await db.query(
          `SELECT h.*, (SELECT COUNT(*)::int FROM family_huddle_shares s WHERE s.huddle_id = h.id) as share_count
           FROM family_huddle h ORDER BY huddle_date DESC LIMIT $1`, [limit]
        ).catch(() => [])
        return NextResponse.json({ success: true, history: rows })
      }

      // ── Aliases for alternative action names ──
      case 'shuffle_icebreaker': {
        // Alias for reshuffle_icebreaker
        const { huddle_id } = body
        if (!huddle_id) return NextResponse.json({ error: 'huddle_id required' }, { status: 400 })
        const icebreaker = await pickIcebreaker()
        await db.query(`UPDATE huddle_icebreakers SET used_count = used_count + 1, last_used_date = CURRENT_DATE WHERE id = $1`, [icebreaker.id]).catch(() => {})
        await db.query(`UPDATE family_huddle SET icebreaker_question = $1, icebreaker_category = $2 WHERE id = $3`,
          [icebreaker.question, icebreaker.category, huddle_id])
        return NextResponse.json({ success: true, icebreaker })
      }

      case 'save_pre_submit': {
        // Alias for pre_submit_share — accepts { kid, content, type }
        const spKid = body.kid || body.kid_name
        if (!spKid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        // Find upcoming Sunday's huddle
        const spToday = getToday()
        const spTodayDate = new Date(spToday + 'T12:00:00')
        const spDow = spTodayDate.getDay()
        const spDaysUntil = spDow === 0 ? 0 : 7 - spDow
        const spNext = new Date(spTodayDate)
        spNext.setDate(spNext.getDate() + spDaysUntil)
        const spSunday = spNext.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        let spHuddle = (await db.query(`SELECT * FROM family_huddle WHERE huddle_date = $1`, [spSunday]).catch(() => []))[0]
        if (!spHuddle) {
          const wn = getWeeksSinceEpoch(spSunday) + 1
          const host = getHostForDate(spSunday)
          const ice = await pickIcebreaker()
          const bt = getBonusType(new Date(spSunday + 'T12:00:00'))
          await db.query(`UPDATE huddle_icebreakers SET used_count = used_count + 1, last_used_date = $1 WHERE id = $2`, [spSunday, ice.id]).catch(() => {})
          const rows = await db.query(
            `INSERT INTO family_huddle (huddle_date, week_number, host_kid, icebreaker_question, icebreaker_category, bonus_type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [spSunday, wn, host, ice.question, ice.category, bt]
          )
          spHuddle = rows[0]
        }
        const spExisting = await db.query(`SELECT id FROM family_huddle_shares WHERE huddle_id = $1 AND kid_name = $2`, [spHuddle.id, spKid.toLowerCase()]).catch(() => [])
        if (spExisting[0]) {
          await db.query(`UPDATE family_huddle_shares SET share_type = $1, content = $2, pre_submitted = true, pre_submitted_at = NOW() WHERE id = $3`,
            [body.type || body.share_type || 'win', body.content || '', spExisting[0].id])
        } else {
          await db.query(`INSERT INTO family_huddle_shares (huddle_id, kid_name, share_type, content, pre_submitted, pre_submitted_at) VALUES ($1,$2,$3,$4,true,NOW())`,
            [spHuddle.id, spKid.toLowerCase(), body.type || body.share_type || 'win', body.content || ''])
        }
        return NextResponse.json({ success: true })
      }

      case 'get_parent_prep': {
        // Alias for generate_parent_prep
        const weekEnd2 = getToday()
        const d2 = new Date(); d2.setDate(d2.getDate() - 6)
        const weekStart2 = d2.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const items2 = await generateParentPrep(weekStart2, weekEnd2)
        return NextResponse.json({ success: true, items: items2 })
      }

      case 'get_auto_wins': {
        // Returns celebrations from current week
        const weekEnd3 = getToday()
        const d3 = new Date(); d3.setDate(d3.getDate() - 6)
        const weekStart3 = d3.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const celebrations = await scanCelebrations(weekStart3, weekEnd3)
        return NextResponse.json({ success: true, celebrations })
      }

      case 'create_task_from_share':
      case 'create_task': {
        // Alias for create_action_item
        const title = body.title || body.content || ''
        if (!title) return NextResponse.json({ error: 'title/content required' }, { status: 400 })
        const hId = body.huddle_id
        // Find current huddle if not provided
        let resolvedHuddleId = hId
        if (!resolvedHuddleId) {
          const latestH = await db.query(`SELECT id FROM family_huddle ORDER BY huddle_date DESC LIMIT 1`).catch(() => [])
          resolvedHuddleId = latestH[0]?.id
        }
        if (!resolvedHuddleId) return NextResponse.json({ error: 'No huddle found' }, { status: 400 })
        const task = await db.query(
          `INSERT INTO parent_my_day (title, source, due_date, time_block) VALUES ($1, 'huddle', $2, 'morning') RETURNING *`,
          [title, body.due_date || getToday()]
        ).catch(() => [])
        await db.query(
          `INSERT INTO huddle_action_items (huddle_id, title, destination, kid_name, external_task_id) VALUES ($1, $2, 'my_day', $3, $4)`,
          [resolvedHuddleId, title, body.kid || body.kid_name || null, task[0]?.id || null]
        ).catch(() => {})
        return NextResponse.json({ success: true, task: task[0] || null })
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
async function buildAgenda(sundayDate: string, huddleId?: number) {
  const normalized = normalizeDate(sundayDate)
  const sunday = new Date(normalized + 'T12:00:00')
  const monday = new Date(sunday)
  monday.setDate(monday.getDate() + 1)
  const saturday = new Date(monday)
  saturday.setDate(saturday.getDate() + 5)
  const nextSunday = new Date(saturday)
  nextSunday.setDate(nextSunday.getDate() + 1)

  const monStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const sunStr = nextSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const weekEnd = nextSunday.toLocaleDateString('en-CA')
  const weekStartDate = new Date(monday)
  weekStartDate.setDate(weekStartDate.getDate() - 6)
  const weekStart = weekStartDate.toLocaleDateString('en-CA')

  // Stars leaderboard
  const stars = await db.query(
    `SELECT kid_name, stars_balance as stars, streak_days as streak FROM digi_pets ORDER BY stars_balance DESC`
  ).catch(() => [])

  // Zone assignments + completion data
  const { assignments: zoneAssignments, weekNum: zoneWeekNum } = getZoneAssignments(monday)
  const zoneCompletion: Record<string, { total: number; done: number }> = {}
  for (const kid of ZONE_KIDS) {
    const tasks = await db.query(
      `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE completed = TRUE)::int as done
       FROM kid_daily_checklist WHERE child_name = $1 AND event_date BETWEEN $2 AND $3`,
      [kid, weekStart, weekEnd]
    ).catch(() => [])
    zoneCompletion[kid] = { total: tasks[0]?.total || 0, done: tasks[0]?.done || 0 }
  }

  // Meal plan
  const mealWeekNum = getMealWeek(monday)
  const mealTemplate = mealWeekNum === 1 ? MEAL_WEEK1 : MEAL_WEEK2
  const pickedMeals = await db.query(
    `SELECT day_of_week, meal_name FROM meal_week_plan WHERE week_number = $1`, [mealWeekNum]
  ).catch(() => [])
  const pickedMap: Record<string, string> = {}
  pickedMeals.forEach((m: any) => { if (m.meal_name) pickedMap[m.day_of_week] = m.meal_name })

  // Belle care with weekend
  const weekendOwner = getBelleWeekendOwner(saturday)
  const weekendOwnerDisplay = cap(weekendOwner)
  const bathDue = isBathWeek(saturday)
  const nailsDue = isNailWeek(nextSunday)

  // Open requests
  const mealRequests = await db.query(
    `SELECT kid_name, meal_description as content FROM meal_requests WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5`
  ).catch(() => [])
  const groceryRequests = await db.query(
    `SELECT kid_name, item_name as content FROM kid_grocery_requests WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5`
  ).catch(() => [])
  const kidNotes = await db.query(
    `SELECT kid_name, content FROM kid_notes WHERE read = false ORDER BY created_at DESC LIMIT 5`
  ).catch(() => [])

  const openRequests = [
    ...mealRequests.map((r: any) => ({ type: 'meal_request', from: r.kid_name, content: r.content })),
    ...groceryRequests.map((r: any) => ({ type: 'grocery_request', from: r.kid_name, content: r.content })),
    ...kidNotes.map((r: any) => ({ type: 'kid_note', from: r.kid_name, content: r.content })),
  ]

  // Auto-detected celebrations
  const celebrations = await scanCelebrations(weekStart, weekEnd)

  // Bonus type for the week
  const bonusType = getBonusType(sunday)

  // Pre-submit count
  let preSubmitCount = 0
  if (huddleId) {
    const ps = await db.query(
      `SELECT COUNT(*)::int as c FROM family_huddle_shares WHERE huddle_id = $1 AND pre_submitted = true`, [huddleId]
    ).catch(() => [])
    preSubmitCount = ps[0]?.c || 0
  }

  return {
    week_label: `${monStr} – ${sunStr}`,
    stars_leaderboard: stars.map((s: any) => ({
      kid: cap(s.kid_name), stars: s.stars || 0, streak: s.streak || 0,
    })),
    zone_recap: {
      week_num: zoneWeekNum,
      week_label: `Week ${zoneWeekNum} of 6 (${monStr} – ${sunStr})`,
      assignments: Object.entries(zoneAssignments).map(([kid, zone]) => {
        const comp = zoneCompletion[kid] || { total: 0, done: 0 }
        const pct = comp.total > 0 ? Math.round((comp.done / comp.total) * 100) : null
        return { kid: cap(kid), zone, completion_pct: pct }
      }),
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
    celebrations,
    bonus_type: bonusType,
    pre_submit_count: preSubmitCount,
    kid_share_prompts: [
      'Share one WIN from this week',
      'Share one thing you\'re LOOKING FORWARD TO next week',
    ],
  }
}
