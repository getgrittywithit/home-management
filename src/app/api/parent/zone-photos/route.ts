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
      source_type: 'zone_photo', source_ref: `kid:${sub[0].kid_name}`,
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
      source_type: 'zone_photo', source_ref: `kid:${sub[0].kid_name}`,
      link_tab: 'chores', icon: '🔄',
      target_role: 'kid', kid_name: sub[0].kid_name,
    }).catch(() => {})
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
