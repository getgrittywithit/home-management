import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  const limit = parseInt(searchParams.get('limit') || '20')
  const rows = await db.query(
    `SELECT * FROM work_log WHERE kid_name = $1 ORDER BY date DESC LIMIT $2`, [kid, limit]
  ).catch(() => [])
  return NextResponse.json({ logs: rows })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'log_day') {
    const { kid_name, date, job_name, job_notes, start_time, end_time, total_hours,
      lunch_start, lunch_end, lunch_description, water_oz, injury_notes, has_injury } = body
    if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
    const logDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const result = await db.query(
      `INSERT INTO work_log (kid_name, date, job_name, job_notes, start_time, end_time, total_hours,
       lunch_start, lunch_end, lunch_description, water_oz, injury_notes, has_injury)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [kid_name.toLowerCase(), logDate, job_name || null, job_notes || null, start_time || null, end_time || null,
       total_hours || null, lunch_start || null, lunch_end || null, lunch_description || null,
       water_oz || 0, injury_notes || null, has_injury || false]
    )
    // Cross-post water to hydration tracker
    if (water_oz && water_oz > 0) {
      const servings = Math.round(water_oz / 8)
      await db.query(
        `INSERT INTO daily_hydration (kid_name, date, servings_logged) VALUES ($1, $2, $3)
         ON CONFLICT (kid_name, date) DO UPDATE SET servings_logged = daily_hydration.servings_logged + $3`,
        [kid_name.toLowerCase(), logDate, servings]
      ).catch(() => {})
    }
    return NextResponse.json({ success: true, id: result[0]?.id })
  }

  if (action === 'update_day') {
    const { id, job_name, job_notes, start_time, end_time, total_hours,
      lunch_start, lunch_end, lunch_description, water_oz, injury_notes, has_injury } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await db.query(
      `UPDATE work_log SET job_name=$2, job_notes=$3, start_time=$4, end_time=$5, total_hours=$6,
       lunch_start=$7, lunch_end=$8, lunch_description=$9, water_oz=$10, injury_notes=$11, has_injury=$12, updated_at=NOW()
       WHERE id=$1`,
      [id, job_name, job_notes, start_time, end_time, total_hours, lunch_start, lunch_end, lunch_description, water_oz, injury_notes, has_injury || false]
    )
    return NextResponse.json({ success: true })
  }

  if (action === 'delete_day') {
    const { id } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await db.query(`DELETE FROM work_log WHERE id = $1`, [id])
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
