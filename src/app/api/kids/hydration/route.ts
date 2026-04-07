import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const action = searchParams.get('action') || 'get_today'

  if (action === 'get_today') {
    let row = (await db.query(`SELECT * FROM daily_hydration WHERE kid_name = $1 AND date = $2`, [kid, today]).catch(() => []))[0]
    if (!row) {
      // Auto-calculate goal from weight
      const weight = (await db.query(`SELECT weight_lbs FROM weight_log WHERE kid_name = $1 ORDER BY date_logged DESC LIMIT 1`, [kid]).catch(() => []))[0]
      const goalOz = weight?.weight_lbs ? Math.round(parseFloat(weight.weight_lbs) / 2) : 64
      await db.query(`INSERT INTO daily_hydration (kid_name, date, daily_goal_oz) VALUES ($1, $2, $3) ON CONFLICT (kid_name, date) DO NOTHING`, [kid, today, goalOz])
      row = (await db.query(`SELECT * FROM daily_hydration WHERE kid_name = $1 AND date = $2`, [kid, today]).catch(() => []))[0]
    }
    return NextResponse.json({ hydration: row })
  }

  if (action === 'get_history') {
    const days = parseInt(searchParams.get('days') || '7')
    const rows = await db.query(
      `SELECT * FROM daily_hydration WHERE kid_name = $1 AND date >= CURRENT_DATE - $2 * INTERVAL '1 day' ORDER BY date DESC`, [kid, days]
    ).catch(() => [])
    return NextResponse.json({ history: rows })
  }

  if (action === 'get_weight') {
    const rows = await db.query(`SELECT * FROM weight_log WHERE kid_name = $1 ORDER BY date_logged DESC LIMIT 10`, [kid]).catch(() => [])
    return NextResponse.json({ weights: rows })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'log_water') {
    const { kid_name } = body
    if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    await db.query(
      `INSERT INTO daily_hydration (kid_name, date) VALUES ($1, $2) ON CONFLICT (kid_name, date) DO NOTHING`, [kid_name.toLowerCase(), today]
    )
    await db.query(
      `UPDATE daily_hydration SET servings_logged = servings_logged + 1, updated_at = NOW() WHERE kid_name = $1 AND date = $2`,
      [kid_name.toLowerCase(), today]
    )
    const row = (await db.query(`SELECT * FROM daily_hydration WHERE kid_name = $1 AND date = $2`, [kid_name.toLowerCase(), today]).catch(() => []))[0]
    return NextResponse.json({ success: true, hydration: row })
  }

  if (action === 'log_weight') {
    const { kid_name, weight_lbs } = body
    if (!kid_name || !weight_lbs) return NextResponse.json({ error: 'kid_name, weight_lbs required' }, { status: 400 })
    await db.query(`INSERT INTO weight_log (kid_name, weight_lbs) VALUES ($1, $2)`, [kid_name.toLowerCase(), weight_lbs])
    // Recalculate today's hydration goal
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const goalOz = Math.round(parseFloat(weight_lbs) / 2)
    await db.query(
      `INSERT INTO daily_hydration (kid_name, date, daily_goal_oz) VALUES ($1, $2, $3)
       ON CONFLICT (kid_name, date) DO UPDATE SET daily_goal_oz = $3`,
      [kid_name.toLowerCase(), today, goalOz]
    )
    return NextResponse.json({ success: true, daily_goal_oz: goalOz })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
