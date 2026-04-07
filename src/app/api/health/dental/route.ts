import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  const rows = await db.query(
    `SELECT * FROM dental_history WHERE kid_name = $1 ORDER BY event_date DESC`, [kid]
  ).catch(() => [])
  return NextResponse.json({ history: rows })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'add_event') {
    const { kid_name, event_type, tooth_number, description, provider, event_date, notes } = body
    if (!kid_name || !event_type) return NextResponse.json({ error: 'kid_name, event_type required' }, { status: 400 })
    const result = await db.query(
      `INSERT INTO dental_history (kid_name, event_type, tooth_number, description, provider, event_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [kid_name.toLowerCase(), event_type, tooth_number || null, description || null, provider || null, event_date || null, notes || null]
    )
    return NextResponse.json({ success: true, id: result[0]?.id })
  }

  if (action === 'delete_event') {
    const { id } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await db.query(`DELETE FROM dental_history WHERE id = $1`, [id])
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
