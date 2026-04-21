import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const days = parseInt(searchParams.get('days') || '7')
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
  const rows = await db.query(
    `SELECT * FROM kid_ixl_log WHERE kid_name = $1 AND log_date >= CURRENT_DATE - $2 ORDER BY log_date DESC`,
    [kid, days]
  ).catch(() => [])
  return NextResponse.json({ logs: rows })
}

export async function POST(req: NextRequest) {
  try {
    const { kid_name, log_date, minutes_spent, skills_worked_on, smartscore_changes, notes } = await req.json()
    if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
    const date = log_date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    await db.query(
      `INSERT INTO kid_ixl_log (kid_name, log_date, minutes_spent, skills_worked_on, smartscore_changes, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (kid_name, log_date) DO UPDATE SET
         minutes_spent = COALESCE($3, kid_ixl_log.minutes_spent),
         skills_worked_on = COALESCE($4, kid_ixl_log.skills_worked_on),
         smartscore_changes = COALESCE($5, kid_ixl_log.smartscore_changes),
         notes = COALESCE($6, kid_ixl_log.notes)`,
      [kid_name.toLowerCase(), date, minutes_spent || null, skills_worked_on || null, smartscore_changes || null, notes || null]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
