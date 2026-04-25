import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'get_pending') {
    try {
      // Drop photo_url from the list response — see get_image_bytes below.
      // A pending list with 20 photos went from ~10 MB JSON to ~5 KB.
      const rows = await db.query(
        `SELECT id, kid_name, zone_name, submitted_at, status, parent_note, reviewed_at
         FROM zone_photo_submissions WHERE status = 'pending' ORDER BY submitted_at DESC`
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

      // photo_url omitted — frontend fetches bytes via get_image_bytes per row
      const rows = await db.query(
        `SELECT id, kid_name, zone_name, submitted_at, status, parent_note, reviewed_at
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

  // ZONE-PHOTO-VIEWER-FIX: stream actual image bytes for a single submission.
  // The kid camera capture inlines JPEGs as ~500 KB base64 data URIs in
  // photo_url, which Mobile Safari refuses to render past ~32–128 KB. This
  // route strips the data: prefix and serves real bytes with a proper
  // Content-Type, so iOS renders cleanly. Future Supabase Storage uploads
  // (regular https URLs) fall through to a 302 redirect.
  if (action === 'get_image_bytes') {
    const id = searchParams.get('id')
    if (!id) return new NextResponse('id required', { status: 400 })
    try {
      const rows = await db.query(
        `SELECT photo_url FROM zone_photo_submissions WHERE id = $1`,
        [id]
      )
      const photoUrl: string | undefined = rows[0]?.photo_url
      if (!photoUrl) return new NextResponse('not found', { status: 404 })

      // Case A: data URI — decode + serve as binary
      const dataUriMatch = photoUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/)
      if (dataUriMatch) {
        const mimeType = dataUriMatch[1]
        const bytes = Buffer.from(dataUriMatch[2], 'base64')
        return new NextResponse(bytes, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(bytes.length),
            'Cache-Control': 'private, max-age=86400',
          },
        })
      }

      // Case B: regular URL (e.g. Supabase Storage when ZONE-PHOTO-STORAGE-MIGRATE
      // ships) — let the browser fetch it directly via redirect
      return NextResponse.redirect(photoUrl, 302)
    } catch (e: any) {
      return new NextResponse(`Failed: ${e.message}`, { status: 500 })
    }
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
