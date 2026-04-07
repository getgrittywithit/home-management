import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_plans'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_plans' || action === 'get_week') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const weekStart = searchParams.get('week_start')
      let sql = `SELECT * FROM weekly_lesson_plans WHERE kid_name = $1`
      const params: any[] = [kid]
      if (weekStart) { sql += ` AND week_start_date = $2`; params.push(weekStart) }
      sql += ` ORDER BY day_of_week, subject`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ plans: rows })
    }

    if (action === 'get_today') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const dow = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long' })
      const dowNum = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dow)
      const rows = await db.query(
        `SELECT * FROM weekly_lesson_plans WHERE kid_name = $1 AND day_of_week = $2 ORDER BY subject`, [kid, dowNum]
      ).catch(() => [])
      return NextResponse.json({ plans: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Lesson plans GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'add_plan') {
      const { kid_name, subject, day_of_week, week_start_date, activity_title, activity_description, materials, duration_min, resource_links } = body
      if (!kid_name || !subject || !activity_title) return NextResponse.json({ error: 'kid_name, subject, activity_title required' }, { status: 400 })
      const result = await db.query(
        `INSERT INTO weekly_lesson_plans (kid_name, subject, day_of_week, week_start_date, activity_title, activity_description, materials, duration_min, resource_links)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [kid_name.toLowerCase(), subject, day_of_week ?? 1, week_start_date || null, activity_title, activity_description || null, materials || null, duration_min || 30, resource_links || null]
      )
      return NextResponse.json({ success: true, id: result[0]?.id })
    }

    if (action === 'update_plan') {
      const { id, activity_title, activity_description, materials, duration_min, resource_links } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(
        `UPDATE weekly_lesson_plans SET activity_title=$2, activity_description=$3, materials=$4, duration_min=$5, resource_links=$6 WHERE id=$1`,
        [id, activity_title, activity_description || null, materials || null, duration_min || 30, resource_links || null]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_plan') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM weekly_lesson_plans WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Lesson plans POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
