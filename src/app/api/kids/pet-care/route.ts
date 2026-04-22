import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const date = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  try {
    const rows = await db.query(
      `SELECT pcl.*, p.name AS pet_name FROM pet_care_log pcl
       LEFT JOIN pets p ON p.id = pcl.pet_id
       WHERE pcl.kid_name = $1 AND pcl.care_date = $2`,
      [kid, date]
    ).catch(() => [])
    return NextResponse.json({ tasks: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { kid_name, pet_name, task, completed, notes } = body
    if (!kid_name || !pet_name || !task) return NextResponse.json({ error: 'kid_name + pet_name + task required' }, { status: 400 })

    const kid = kid_name.toLowerCase()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    if (completed) {
      await db.query(
        `INSERT INTO pet_care_log (kid_name, pet_name, task, care_date, completed, notes, created_at)
         VALUES ($1, $2, $3, $4, TRUE, $5, NOW())
         ON CONFLICT (pet_name, kid_name, task, care_date) DO UPDATE SET completed = TRUE, notes = COALESCE($5, pet_care_log.notes)`,
        [kid, pet_name.toLowerCase(), task, today, notes || null]
      )

      // Award stars
      await db.query(
        `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason)
         VALUES ($1, 'earned', 3, $2)`,
        [kid, `Pet care: ${task} for ${pet_name}`]
      ).catch(() => {})
    } else {
      await db.query(
        `DELETE FROM pet_care_log WHERE kid_name = $1 AND pet_name = $2 AND task = $3 AND care_date = $4`,
        [kid, pet_name.toLowerCase(), task, today]
      )
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
