import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const kidName = searchParams.get('kid_name')

  if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  const rows = await db.query(
    `SELECT * FROM iep_goal_progress WHERE kid_name = $1 ORDER BY status = 'in_progress' DESC, created_at DESC`,
    [kidName.toLowerCase()]
  ).catch(() => [])

  return NextResponse.json({ goals: rows })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'add_goal': {
      const { kid_name, plan_id, goal_text, target_value, measurement_type } = body
      if (!kid_name || !goal_text) return NextResponse.json({ error: 'kid_name and goal_text required' }, { status: 400 })
      const result = await db.query(
        `INSERT INTO iep_goal_progress (kid_name, plan_id, goal_text, target_value, measurement_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [kid_name.toLowerCase(), plan_id || null, goal_text, target_value || null, measurement_type || 'percentage']
      )
      return NextResponse.json({ success: true, id: result[0]?.id })
    }

    case 'add_data_point': {
      const { id, value, note } = body
      if (!id || value === undefined) return NextResponse.json({ error: 'id and value required' }, { status: 400 })
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const row = await db.query(`SELECT data_points FROM iep_goal_progress WHERE id = $1`, [id]).catch(() => [])
      const existing = row[0]?.data_points || []
      existing.push({ date: today, value: String(value), note: note || null })
      await db.query(
        `UPDATE iep_goal_progress SET data_points = $2, current_value = $3 WHERE id = $1`,
        [id, JSON.stringify(existing), String(value)]
      )
      return NextResponse.json({ success: true })
    }

    case 'update_status': {
      const { id, status } = body
      if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
      await db.query(`UPDATE iep_goal_progress SET status = $2 WHERE id = $1`, [id, status])
      return NextResponse.json({ success: true })
    }

    case 'delete_goal': {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM iep_goal_progress WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
