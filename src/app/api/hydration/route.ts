import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS daily_hydration (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      cups_logged INTEGER DEFAULT 0,
      oz_logged INTEGER DEFAULT 0,
      goal_cups INTEGER DEFAULT 8,
      goal_oz INTEGER DEFAULT 64,
      warning_level TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(kid_name, date)
    )
  `)
  // Add oz columns if missing (migration for existing table)
  await db.query(`ALTER TABLE daily_hydration ADD COLUMN IF NOT EXISTS oz_logged INTEGER DEFAULT 0`).catch(() => {})
  await db.query(`ALTER TABLE daily_hydration ADD COLUMN IF NOT EXISTS goal_oz INTEGER DEFAULT 64`).catch(() => {})
  await db.query(`ALTER TABLE daily_hydration ADD COLUMN IF NOT EXISTS warning_level TEXT`).catch(() => {})

  await db.query(`
    CREATE TABLE IF NOT EXISTS water_log (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      logged_at TIMESTAMPTZ DEFAULT NOW(),
      amount_oz INTEGER NOT NULL,
      cup_size_oz INTEGER NOT NULL,
      daily_total_oz INTEGER,
      warning_level TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS weight_log (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      weight_lbs NUMERIC(5,1),
      logged_by TEXT DEFAULT 'parent',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

let ready = false
async function init() { if (!ready) { await ensureTables(); ready = true } }

// Per-kid default water goals (oz) based on age — midpoint of range
const DEFAULT_GOALS_OZ: Record<string, number> = {
  amos: 72,    // 17yo: 64-80 oz
  zoey: 64,    // 15yo: 56-72 oz
  kaylee: 60,  // 13yo: 56-64 oz
  ellie: 56,   // 12yo: 48-64 oz
  wyatt: 48,   // 10yo: 40-56 oz
  hannah: 44,  // 8yo: 40-48 oz
}

function getGoalOz(kidName: string): number {
  return DEFAULT_GOALS_OZ[kidName] || 64
}

function getWarningLevel(ozLogged: number, goalOz: number): string | null {
  const pct = goalOz > 0 ? ozLogged / goalOz : 0
  if (pct >= 1.5) return 'blocked'
  if (pct >= 1.2) return 'caution'
  if (pct >= 1.0) return 'goal_met'
  if (pct >= 0.8) return 'encouraged'
  return null
}

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_today'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_today') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      let row = (await db.query(`SELECT * FROM daily_hydration WHERE kid_name = $1 AND date = $2`, [kid, today]).catch(() => []))[0]
      if (!row) {
        const goalOz = getGoalOz(kid)
        await db.query(
          `INSERT INTO daily_hydration (kid_name, date, cups_logged, oz_logged, goal_cups, goal_oz) VALUES ($1, $2, 0, 0, $3, $4) ON CONFLICT DO NOTHING`,
          [kid, today, Math.ceil(goalOz / 8), goalOz]
        ).catch(() => {})
        row = { kid_name: kid, date: today, cups_logged: 0, oz_logged: 0, goal_cups: Math.ceil(goalOz / 8), goal_oz: goalOz, warning_level: null }
      }
      return NextResponse.json({ hydration: row })
    }

    if (action === 'get_history') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const days = parseInt(searchParams.get('days') || '7')
      const rows = await db.query(
        `SELECT * FROM daily_hydration WHERE kid_name = $1 ORDER BY date DESC LIMIT $2`, [kid, days]
      ).catch(() => [])
      return NextResponse.json({ history: rows })
    }

    if (action === 'get_water_log') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const rows = await db.query(
        `SELECT * FROM water_log WHERE kid_name = $1 AND logged_at::date = $2::date ORDER BY logged_at DESC`, [kid, today]
      ).catch(() => [])
      return NextResponse.json({ logs: rows })
    }

    if (action === 'get_settings') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      return NextResponse.json({
        goal_oz: getGoalOz(kid),
        cup_sizes: [4, 8, 12, 16, 32],
      })
    }

    if (action === 'get_weight') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const row = (await db.query(
        `SELECT * FROM weight_log WHERE kid_name = $1 ORDER BY date DESC LIMIT 1`, [kid]
      ).catch(() => []))[0]
      return NextResponse.json({ weight: row || null })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Hydration GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'log_water') {
      const { kid_name, amount_oz, cup_size_oz } = body
      if (!kid_name || !amount_oz) return NextResponse.json({ error: 'kid_name, amount_oz required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const goalOz = getGoalOz(kid)

      // Get current total
      let current = (await db.query(`SELECT oz_logged FROM daily_hydration WHERE kid_name = $1 AND date = $2`, [kid, today]).catch(() => []))[0]

      // Check if blocked (150%+)
      const currentOz = current?.oz_logged || 0
      if (currentOz >= goalOz * 1.5) {
        return NextResponse.json({
          success: false,
          blocked: true,
          message: 'Water logging paused for today. Talk to Mom or Dad if you feel weird.',
          hydration: { oz_logged: currentOz, goal_oz: goalOz, warning_level: 'blocked' },
        })
      }

      const newTotal = currentOz + amount_oz
      const warning = getWarningLevel(newTotal, goalOz)

      // Upsert daily total
      await db.query(
        `INSERT INTO daily_hydration (kid_name, date, cups_logged, oz_logged, goal_cups, goal_oz, warning_level)
         VALUES ($1, $2, 1, $3, $4, $5, $6)
         ON CONFLICT (kid_name, date) DO UPDATE SET
           oz_logged = daily_hydration.oz_logged + $3,
           cups_logged = daily_hydration.cups_logged + 1,
           warning_level = $6`,
        [kid, today, amount_oz, Math.ceil(goalOz / 8), goalOz, warning]
      )

      // Log individual entry
      await db.query(
        `INSERT INTO water_log (kid_name, amount_oz, cup_size_oz, daily_total_oz, warning_level)
         VALUES ($1, $2, $3, $4, $5)`,
        [kid, amount_oz, cup_size_oz || amount_oz, newTotal, warning]
      ).catch(() => {})

      // Send parent notification at 150%
      if (warning === 'blocked' && (currentOz < goalOz * 1.5)) {
        const kidDisplay = kid.charAt(0).toUpperCase() + kid.slice(1)
        await createNotification({
          title: `${kidDisplay} — high water intake`,
          message: `${kidDisplay} logged ${newTotal} oz today (${Math.round(newTotal / goalOz * 100)}% of goal). Water logging paused.`,
          source_type: 'health_alert',
          source_ref: `water-cap-${kid}-${today}`,
          link_tab: 'health',
          icon: '💧',
        }).catch(() => {})
      }

      const row = (await db.query(`SELECT * FROM daily_hydration WHERE kid_name = $1 AND date = $2`, [kid, today]).catch(() => []))[0]
      return NextResponse.json({ success: true, hydration: row, warning })
    }

    // Legacy support
    if (action === 'log_cup') {
      const { kid_name } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      // Default to 8oz cup for legacy
      body.amount_oz = 8
      body.cup_size_oz = 8
      body.action = 'log_water'
      const fakeReq = new Request(req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      return POST(new NextRequest(fakeReq))
    }

    if (action === 'remove_water') {
      const { kid_name, amount_oz } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const oz = amount_oz || 8
      await db.query(
        `UPDATE daily_hydration SET oz_logged = GREATEST(0, oz_logged - $3), cups_logged = GREATEST(0, cups_logged - 1)
         WHERE kid_name = $1 AND date = $2`, [kid, today, oz]
      )
      // Re-evaluate warning
      const row = (await db.query(`SELECT * FROM daily_hydration WHERE kid_name = $1 AND date = $2`, [kid, today]).catch(() => []))[0]
      if (row) {
        const warning = getWarningLevel(row.oz_logged, row.goal_oz)
        await db.query(`UPDATE daily_hydration SET warning_level = $1 WHERE kid_name = $2 AND date = $3`, [warning, kid, today]).catch(() => {})
        row.warning_level = warning
      }
      return NextResponse.json({ success: true, hydration: row })
    }

    // Legacy
    if (action === 'remove_cup') {
      body.amount_oz = 8
      body.action = 'remove_water'
      const fakeReq = new Request(req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      return POST(new NextRequest(fakeReq))
    }

    if (action === 'update_goal') {
      const { kid_name, goal_oz } = body
      if (!kid_name || !goal_oz) return NextResponse.json({ error: 'kid_name, goal_oz required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      await db.query(
        `UPDATE daily_hydration SET goal_oz = $1, goal_cups = $2 WHERE kid_name = $3 AND date = $4`,
        [goal_oz, Math.ceil(goal_oz / 8), kid, today]
      ).catch(() => {})
      return NextResponse.json({ success: true })
    }

    if (action === 'log_weight') {
      const { kid_name, weight_lbs } = body
      if (!kid_name || !weight_lbs) return NextResponse.json({ error: 'kid_name, weight_lbs required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      await db.query(
        `INSERT INTO weight_log (kid_name, date, weight_lbs) VALUES ($1, $2, $3)`,
        [kid, today, weight_lbs]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Hydration POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
