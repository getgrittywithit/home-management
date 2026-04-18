import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'
import { ALL_KIDS as KIDS } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_balances'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_balances') {
      if (kid) {
        const row = (await db.query(
          `SELECT stars_balance, gem_balance, weekly_stars, streak_math, streak_book, streak_vocab, fun_locked_until FROM digi_pets WHERE kid_name = $1`, [kid]
        ).catch(() => []))[0]
        return NextResponse.json({ balances: row || { stars_balance: 0, gem_balance: 0, weekly_stars: 0 } })
      }
      // All kids
      const rows = await db.query(
        `SELECT kid_name, stars_balance, gem_balance, weekly_stars, streak_math, streak_book, streak_vocab FROM digi_pets ORDER BY kid_name`
      ).catch(() => [])
      return NextResponse.json({ balances: rows })
    }

    if (action === 'get_weekly_goal') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const monday = getMonday()
      const row = (await db.query(
        `SELECT * FROM weekly_star_goals WHERE kid_name = $1 AND week_start = $2`, [kid, monday]
      ).catch(() => []))[0]
      if (!row) {
        await db.query(
          `INSERT INTO weekly_star_goals (kid_name, week_start) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [kid, monday]
        ).catch(() => {})
        return NextResponse.json({ goal: { kid_name: kid, week_start: monday, target_stars: 50, earned_stars: 0, goal_met: false } })
      }
      return NextResponse.json({ goal: row })
    }

    if (action === 'get_gem_history') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const limit = parseInt(searchParams.get('limit') || '20')
      const rows = await db.query(
        `SELECT * FROM gem_transactions WHERE kid_name = $1 ORDER BY created_at DESC LIMIT $2`, [kid, limit]
      ).catch(() => [])
      return NextResponse.json({ transactions: rows })
    }

    if (action === 'get_streak_status') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const row = (await db.query(
        `SELECT streak_math, streak_book, streak_vocab FROM digi_pets WHERE kid_name = $1`, [kid]
      ).catch(() => []))[0]
      const multiplier = getStreakMultiplier(Math.max(row?.streak_math || 0, row?.streak_book || 0, row?.streak_vocab || 0))
      return NextResponse.json({ streaks: row || {}, multiplier })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Economy GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'award_stars') {
      const { kid_name, amount, source_type, description } = body
      if (!kid_name || !amount) return NextResponse.json({ error: 'kid_name, amount required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      await db.query(`UPDATE digi_pets SET stars_balance = stars_balance + $1, weekly_stars = weekly_stars + $1 WHERE kid_name = $2`, [amount, kid])
      // Update weekly goal
      const monday = getMonday()
      await db.query(
        `INSERT INTO weekly_star_goals (kid_name, week_start, earned_stars) VALUES ($1, $2, $3)
         ON CONFLICT (kid_name, week_start) DO UPDATE SET earned_stars = weekly_star_goals.earned_stars + $3`,
        [kid, monday, amount]
      ).catch(() => {})
      // Check goal met
      const goal = (await db.query(`SELECT target_stars, earned_stars FROM weekly_star_goals WHERE kid_name = $1 AND week_start = $2`, [kid, monday]).catch(() => []))[0]
      if (goal && goal.earned_stars >= goal.target_stars && !goal.goal_met) {
        await db.query(`UPDATE weekly_star_goals SET goal_met = true WHERE kid_name = $1 AND week_start = $2`, [kid, monday])
        await createNotification({ title: `${kid.charAt(0).toUpperCase() + kid.slice(1)} hit their weekly star goal!`, message: `${goal.earned_stars}/${goal.target_stars} stars this week`, source_type: 'star_goal', icon: '\u2B50' }).catch(() => {})
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'award_gems') {
      const { kid_name, amount, source_type, description } = body
      if (!kid_name || !amount) return NextResponse.json({ error: 'kid_name, amount required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      // Apply streak multiplier
      const streaks = (await db.query(`SELECT streak_math, streak_book, streak_vocab FROM digi_pets WHERE kid_name = $1`, [kid]).catch(() => []))[0]
      const streakField = source_type === 'buddy_math' ? 'streak_math' : source_type === 'buddy_book' ? 'streak_book' : source_type === 'vocab' ? 'streak_vocab' : null
      let multiplier = 1
      if (streakField && streaks) {
        multiplier = getStreakMultiplier(streaks[streakField] || 0)
      }
      const finalAmount = Math.round(amount * multiplier)
      await db.query(`UPDATE digi_pets SET gem_balance = gem_balance + $1 WHERE kid_name = $2`, [finalAmount, kid])
      await db.query(
        `INSERT INTO gem_transactions (kid_name, amount, source_type, source_id, description) VALUES ($1, $2, $3, $4, $5)`,
        [kid, finalAmount, source_type || 'manual', body.source_id || null, description || null]
      )
      return NextResponse.json({ success: true, gems_awarded: finalAmount, multiplier })
    }

    if (action === 'deduct_stars') {
      // Parent-only
      const { kid_name, amount, reason_code, description } = body
      if (!kid_name || !amount) return NextResponse.json({ error: 'kid_name, amount required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      // Check immune days (sick, break, low mood)
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const immune = await checkImmuneDay(kid, today)
      if (immune) return NextResponse.json({ success: false, immune: true, reason: immune })
      // Apply per-kid multiplier
      const settings = (await db.query(`SELECT star_multiplier FROM kid_behavior_settings WHERE kid_name = $1`, [kid]).catch(() => []))[0]
      const mult = settings?.star_multiplier || 1.0
      const finalDeduction = Math.round(amount * mult)
      await db.query(`UPDATE digi_pets SET stars_balance = GREATEST(0, stars_balance - $1) WHERE kid_name = $2`, [finalDeduction, kid])
      return NextResponse.json({ success: true, deducted: finalDeduction })
    }

    if (action === 'deduct_gems') {
      const { kid_name, amount, reason_code, description } = body
      if (!kid_name || !amount) return NextResponse.json({ error: 'kid_name, amount required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const immune = await checkImmuneDay(kid, today)
      if (immune) return NextResponse.json({ success: false, immune: true, reason: immune })
      const settings = (await db.query(`SELECT gem_multiplier FROM kid_behavior_settings WHERE kid_name = $1`, [kid]).catch(() => []))[0]
      const mult = settings?.gem_multiplier || 1.0
      const finalDeduction = Math.round(amount * mult)
      await db.query(`UPDATE digi_pets SET gem_balance = GREATEST(0, gem_balance - $1) WHERE kid_name = $2`, [finalDeduction, kid])
      await db.query(
        `INSERT INTO gem_transactions (kid_name, amount, source_type, description) VALUES ($1, $2, 'behavior_deduction', $3)`,
        [kid, -finalDeduction, description || reason_code || 'Behavior consequence']
      )
      return NextResponse.json({ success: true, deducted: finalDeduction })
    }

    if (action === 'set_weekly_goal') {
      const { kid_name, target_stars } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const monday = getMonday()
      await db.query(
        `INSERT INTO weekly_star_goals (kid_name, week_start, target_stars) VALUES ($1, $2, $3)
         ON CONFLICT (kid_name, week_start) DO UPDATE SET target_stars = $3`,
        [kid_name.toLowerCase(), monday, target_stars || 50]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'lock_fun_features') {
      const { kid_name, hours } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const lockUntil = new Date(Date.now() + (hours || 24) * 3600000).toISOString()
      await db.query(`UPDATE digi_pets SET fun_locked_until = $1 WHERE kid_name = $2`, [lockUntil, kid_name.toLowerCase()])
      return NextResponse.json({ success: true, locked_until: lockUntil })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Economy POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function getStreakMultiplier(streak: number): number {
  if (streak >= 7) return 4
  if (streak >= 5) return 3
  if (streak >= 3) return 2
  return 1
}

async function checkImmuneDay(kidName: string, date: string): Promise<string | null> {
  // Check sick day
  const sick = await db.query(`SELECT id FROM kid_sick_days WHERE kid_name = $1 AND sick_date = $2`, [kidName, date]).catch(() => [])
  if (sick.length > 0) return 'Sick day — immune from deductions'
  // Check break button
  const breakFlag = await db.query(`SELECT id FROM kid_break_flags WHERE kid_name = $1 AND flagged_at::date = $2`, [kidName, date]).catch(() => [])
  if (breakFlag.length > 0) return 'Break day — immune from deductions'
  // Check low mood (≤2)
  const mood = await db.query(`SELECT mood FROM kid_mood_log WHERE child_name = $1 AND log_date = $2 AND mood <= 2`, [kidName, date]).catch(() => [])
  if (mood.length > 0) return 'Low mood day — immune from deductions'
  return null
}
