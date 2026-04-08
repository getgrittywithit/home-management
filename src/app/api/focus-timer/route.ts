import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      task_id TEXT,
      subject TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      duration_seconds INTEGER DEFAULT 0,
      earned_gems INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS beat_my_best_settings (
      kid_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      enabled BOOLEAN DEFAULT false,
      best_time_seconds INTEGER DEFAULT 0,
      PRIMARY KEY(kid_name, subject)
    )
  `)
}

let ready = false
async function init() { if (!ready) { await ensureTables(); ready = true } }

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_today'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_today') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const rows = await db.query(
        `SELECT subject, SUM(duration_seconds)::int as total_seconds, COUNT(*)::int as sessions
         FROM focus_sessions WHERE kid_name = $1 AND started_at::date = $2::date
         GROUP BY subject`, [kid, today]
      ).catch(() => [])
      return NextResponse.json({ today: rows })
    }

    if (action === 'get_weekly') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const d = new Date()
      const day = d.getDay()
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      const monday = d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const rows = await db.query(
        `SELECT subject, SUM(duration_seconds)::int as total_seconds, COUNT(*)::int as sessions
         FROM focus_sessions WHERE kid_name = $1 AND started_at::date >= $2::date
         GROUP BY subject ORDER BY total_seconds DESC`, [kid, monday]
      ).catch(() => [])
      return NextResponse.json({ weekly: rows })
    }

    if (action === 'get_beat_my_best') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const subject = searchParams.get('subject')
      if (!subject) return NextResponse.json({ error: 'subject required' }, { status: 400 })
      const row = (await db.query(
        `SELECT * FROM beat_my_best_settings WHERE kid_name = $1 AND subject = $2`, [kid, subject]
      ).catch(() => []))[0]
      return NextResponse.json({ settings: row || { enabled: false, best_time_seconds: 0 } })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Focus timer GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'log_session') {
      const { kid_name, task_id, subject, duration_seconds } = body
      if (!kid_name || !subject || !duration_seconds) return NextResponse.json({ error: 'kid_name, subject, duration_seconds required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const secs = parseInt(duration_seconds)
      // Gem reward: 15+ min = 1 gem, 30+ min = 2 gems
      let gems = 0
      if (secs >= 1800) gems = 2
      else if (secs >= 900) gems = 1

      await db.query(
        `INSERT INTO focus_sessions (kid_name, task_id, subject, duration_seconds, earned_gems, ended_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [kid, task_id || null, subject, secs, gems]
      )

      if (gems > 0) {
        await db.query(`UPDATE digi_pets SET gem_balance = COALESCE(gem_balance, 0) + $1 WHERE kid_name = $2`, [gems, kid]).catch(() => {})
        await db.query(
          `INSERT INTO gem_transactions (kid_name, amount, source_type, description) VALUES ($1, $2, 'focus_session', $3)`,
          [kid, gems, `${Math.floor(secs / 60)} min focus on ${subject}`]
        ).catch(() => {})
      }

      return NextResponse.json({ success: true, gems_earned: gems, duration_minutes: Math.floor(secs / 60) })
    }

    if (action === 'toggle_beat_my_best') {
      const { kid_name, subject, enabled } = body
      if (!kid_name || !subject) return NextResponse.json({ error: 'kid_name, subject required' }, { status: 400 })
      await db.query(
        `INSERT INTO beat_my_best_settings (kid_name, subject, enabled) VALUES ($1, $2, $3)
         ON CONFLICT (kid_name, subject) DO UPDATE SET enabled = $3`,
        [kid_name.toLowerCase(), subject, enabled !== false]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Focus timer POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
