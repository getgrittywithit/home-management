import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_all'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  if (action === 'get_all') {
    const status = searchParams.get('status')
    let sql = `SELECT * FROM app_feedback`
    const params: any[] = []
    if (kid) { sql += ` WHERE kid_name = $${params.length + 1}`; params.push(kid) }
    if (status) { sql += `${kid ? ' AND' : ' WHERE'} status = $${params.length + 1}`; params.push(status) }
    sql += ` ORDER BY created_at DESC`
    const rows = await db.query(sql, params).catch(() => [])
    return NextResponse.json({ feedback: rows })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'submit') {
    const { kid_name, type, description } = body
    if (!kid_name || !description) return NextResponse.json({ error: 'kid_name, description required' }, { status: 400 })
    const result = await db.query(
      `INSERT INTO app_feedback (kid_name, type, description) VALUES ($1, $2, $3) RETURNING id`,
      [kid_name.toLowerCase(), type || 'idea', description]
    )
    return NextResponse.json({ success: true, id: result[0]?.id })
  }

  if (action === 'update_status') {
    const { id, status, parent_notes } = body
    if (!id || !status) return NextResponse.json({ error: 'id, status required' }, { status: 400 })
    await db.query(
      `UPDATE app_feedback SET status = $2, parent_notes = $3, resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE NULL END WHERE id = $1`,
      [id, status, parent_notes || null]
    )
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
