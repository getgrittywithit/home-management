import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'get_pending') {
    try {
      const rows = await db.query(
        `SELECT * FROM zone_photo_submissions WHERE status = 'pending' ORDER BY submitted_at DESC`
      )
      return NextResponse.json({ submissions: rows })
    } catch { return NextResponse.json({ submissions: [] }) }
  }

  // Browse all photo submissions (approved, redo, pending) with optional filters
  if (action === 'get_history') {
    try {
      const kidName = searchParams.get('kid_name')
      const zoneName = searchParams.get('zone_name')
      const status = searchParams.get('status')
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
      const offset = parseInt(searchParams.get('offset') || '0')

      let where = 'WHERE 1=1'
      const params: any[] = []
      let idx = 1
      if (kidName) { where += ` AND kid_name = $${idx++}`; params.push(kidName.toLowerCase()) }
      if (zoneName) { where += ` AND zone_name = $${idx++}`; params.push(zoneName) }
      if (status) { where += ` AND status = $${idx++}`; params.push(status) }

      const rows = await db.query(
        `SELECT id, kid_name, zone_name, photo_url, submitted_at, status, parent_note, reviewed_at
         FROM zone_photo_submissions ${where}
         ORDER BY submitted_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      )
      const countRows = await db.query(
        `SELECT COUNT(*)::int AS total FROM zone_photo_submissions ${where}`,
        params
      )
      return NextResponse.json({
        submissions: rows,
        total: countRows[0]?.total || 0,
        limit, offset,
      })
    } catch (e: any) {
      return NextResponse.json({ submissions: [], total: 0, error: e.message })
    }
  }

  // Get a single submission by ID (for notification deep-link)
  if (action === 'get_submission') {
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    try {
      const rows = await db.query(`SELECT * FROM zone_photo_submissions WHERE id = $1`, [id])
      if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
      return NextResponse.json({ submission: rows[0] })
    } catch { return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 }) }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  if (action === 'approve') {
    const { submission_id } = body
    if (!submission_id) return NextResponse.json({ error: 'submission_id required' }, { status: 400 })
    const sub = await db.query(`SELECT * FROM zone_photo_submissions WHERE id = $1`, [submission_id])
    if (!sub[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
    await db.query(`UPDATE zone_photo_submissions SET status = 'approved', reviewed_at = NOW() WHERE id = $1`, [submission_id])
    await createNotification({
      title: 'Zone approved!',
      message: `Your ${sub[0].zone_name} zone photo was approved`,
      source_type: 'zone_photo', source_ref: `photo:${submission_id}`,
      link_tab: 'chores', icon: '✅',
      target_role: 'kid', kid_name: sub[0].kid_name,
    }).catch(() => {})
    return NextResponse.json({ success: true })
  }

  if (action === 'request_redo') {
    const { submission_id, parent_note } = body
    if (!submission_id) return NextResponse.json({ error: 'submission_id required' }, { status: 400 })
    const sub = await db.query(`SELECT * FROM zone_photo_submissions WHERE id = $1`, [submission_id])
    if (!sub[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
    await db.query(
      `UPDATE zone_photo_submissions SET status = 'redo', parent_note = $2, reviewed_at = NOW() WHERE id = $1`,
      [submission_id, parent_note || 'Please redo this area']
    )
    await createNotification({
      title: 'Zone needs a redo',
      message: `${sub[0].zone_name}: ${parent_note || 'Please redo this area'}`,
      source_type: 'zone_photo', source_ref: `photo:${submission_id}`,
      link_tab: 'chores', icon: '🔄',
      target_role: 'kid', kid_name: sub[0].kid_name,
    }).catch(() => {})
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
