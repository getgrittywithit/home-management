import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS daily_hydration (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      cups_logged INTEGER DEFAULT 0,
      goal_cups INTEGER DEFAULT 8,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(kid_name, date)
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

// Calculate recommended cups based on weight (rough guideline: weight_lbs / 2 / 8 = cups, min 4, max 12)
function calcGoalCups(weightLbs: number | null): number {
  if (!weightLbs || weightLbs <= 0) return 8
  const ozNeeded = weightLbs / 2
  const cups = Math.round(ozNeeded / 8)
  return Math.max(4, Math.min(12, cups))
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

      // Get or create today's hydration record
      let row = (await db.query(`SELECT * FROM daily_hydration WHERE kid_name = $1 AND date = $2`, [kid, today]).catch(() => []))[0]
      if (!row) {
        // Get latest weight to calculate goal
        const weight = (await db.query(
          `SELECT weight_lbs FROM weight_log WHERE kid_name = $1 ORDER BY date DESC LIMIT 1`, [kid]
        ).catch(() => []))[0]
        const goal = calcGoalCups(weight?.weight_lbs)
        await db.query(
          `INSERT INTO daily_hydration (kid_name, date, cups_logged, goal_cups) VALUES ($1, $2, 0, $3) ON CONFLICT DO NOTHING`,
          [kid, today, goal]
        ).catch(() => {})
        row = { kid_name: kid, date: today, cups_logged: 0, goal_cups: goal }
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

    if (action === 'log_cup') {
      const { kid_name } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      // Get latest weight for goal calc
      const weight = (await db.query(
        `SELECT weight_lbs FROM weight_log WHERE kid_name = $1 ORDER BY date DESC LIMIT 1`, [kid]
      ).catch(() => []))[0]
      const goal = calcGoalCups(weight?.weight_lbs)

      await db.query(
        `INSERT INTO daily_hydration (kid_name, date, cups_logged, goal_cups) VALUES ($1, $2, 1, $3)
         ON CONFLICT (kid_name, date) DO UPDATE SET cups_logged = daily_hydration.cups_logged + 1`,
        [kid, today, goal]
      )
      const row = (await db.query(`SELECT * FROM daily_hydration WHERE kid_name = $1 AND date = $2`, [kid, today]).catch(() => []))[0]
      return NextResponse.json({ success: true, hydration: row })
    }

    if (action === 'remove_cup') {
      const { kid_name } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      await db.query(
        `UPDATE daily_hydration SET cups_logged = GREATEST(0, cups_logged - 1) WHERE kid_name = $1 AND date = $2`, [kid, today]
      )
      const row = (await db.query(`SELECT * FROM daily_hydration WHERE kid_name = $1 AND date = $2`, [kid, today]).catch(() => []))[0]
      return NextResponse.json({ success: true, hydration: row })
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
      // Update today's hydration goal
      const newGoal = calcGoalCups(weight_lbs)
      await db.query(
        `UPDATE daily_hydration SET goal_cups = $1 WHERE kid_name = $2 AND date = $3`, [newGoal, kid, today]
      ).catch(() => {})
      return NextResponse.json({ success: true, new_goal_cups: newGoal })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Hydration POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
