import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_reports'
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const status = searchParams.get('status')

  try {
    if (action === 'get_reports') {
      let sql = `SELECT * FROM kid_reports`
      const params: any[] = []
      const conditions: string[] = []
      if (kid) { conditions.push(`submitting_kid = $${params.length + 1}`); params.push(kid) }
      if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status) }
      if (conditions.length) sql += ` WHERE ` + conditions.join(' AND ')
      sql += ` ORDER BY created_at DESC LIMIT 50`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ reports: rows })
    }

    if (action === 'get_report') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const row = (await db.query(`SELECT * FROM kid_reports WHERE id = $1`, [id]).catch(() => []))[0]
      const photos = await db.query(`SELECT * FROM report_photos WHERE report_id = $1 ORDER BY uploaded_at`, [id]).catch(() => [])
      return NextResponse.json({ report: row, photos })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Kid reports GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'submit_report') {
      const { submitting_kid, involved_kids, what_happened, when_happened, feeling, good_bad_neutral, photos } = body
      if (!submitting_kid || !what_happened) return NextResponse.json({ error: 'submitting_kid, what_happened required' }, { status: 400 })
      const result = await db.query(
        `INSERT INTO kid_reports (submitting_kid, involved_kids, what_happened, when_happened, feeling, good_bad_neutral, photos)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [submitting_kid.toLowerCase(), JSON.stringify(involved_kids || []), what_happened,
         when_happened || 'just_now', feeling || null, good_bad_neutral || 'bad', JSON.stringify(photos || [])]
      )
      // Notify parent
      const kidDisplay = submitting_kid.charAt(0).toUpperCase() + submitting_kid.slice(1)
      const tag = good_bad_neutral === 'good' ? '\uD83D\uDE0A' : good_bad_neutral === 'bad' ? '\uD83D\uDE1F' : '\uD83E\uDD37'
      await createNotification({
        title: `${tag} ${kidDisplay} sent a report`,
        message: what_happened.substring(0, 100),
        source_type: 'kid_report', source_ref: `report-${result[0]?.id}`,
        icon: tag, link_tab: 'messages',
      }).catch(() => {})
      return NextResponse.json({ success: true, id: result[0]?.id })
    }

    if (action === 'acknowledge_report') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`UPDATE kid_reports SET status = 'acknowledged', parent_action = 'acknowledge' WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    if (action === 'flag_talk_first') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`UPDATE kid_reports SET status = 'talk_first', parent_action = 'talk_first' WHERE id = $1`, [id])
      // Add to parent my-day
      const report = (await db.query(`SELECT submitting_kid, what_happened FROM kid_reports WHERE id = $1`, [id]).catch(() => []))[0]
      if (report) {
        const kidDisplay = report.submitting_kid.charAt(0).toUpperCase() + report.submitting_kid.slice(1)
        await db.query(
          `INSERT INTO parent_tasks (title, source, source_ref) VALUES ($1, 'kid_report', $2)`,
          [`Talk to ${kidDisplay} about: ${report.what_happened.substring(0, 60)}`, `report-${id}`]
        ).catch(() => {})
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'escalate_to_behavior_event') {
      const { id, behavior_type, severity_tier, description, star_deduction, gem_deduction, parent_note } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const report = (await db.query(`SELECT * FROM kid_reports WHERE id = $1`, [id]).catch(() => []))[0]
      if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

      // Create behavior event
      const event = await db.query(
        `INSERT INTO behavior_events (reporter_kid, involved_kids, behavior_type, severity_tier, description, parent_note, star_deduction, gem_deduction, source_report_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [report.submitting_kid, JSON.stringify(report.involved_kids || []), behavior_type || 'other',
         severity_tier || 2, description || report.what_happened, parent_note || null,
         star_deduction || 0, gem_deduction || 0, id]
      )

      // Apply consequences to involved kids
      const involvedKids = report.involved_kids || []
      for (const involvedKid of involvedKids) {
        const kid = (typeof involvedKid === 'string' ? involvedKid : '').toLowerCase()
        if (!kid || kid === report.submitting_kid) continue

        if (star_deduction && star_deduction > 0) {
          await db.query(`UPDATE digi_pets SET stars_balance = GREATEST(0, stars_balance - $1) WHERE kid_name = $2`, [star_deduction, kid]).catch(() => {})
        }
        if (gem_deduction && gem_deduction > 0) {
          await db.query(`UPDATE digi_pets SET gem_balance = GREATEST(0, gem_balance - $1) WHERE kid_name = $2`, [gem_deduction, kid]).catch(() => {})
          await db.query(`INSERT INTO gem_transactions (kid_name, amount, source_type, description) VALUES ($1, $2, 'behavior_deduction', $3)`,
            [kid, -gem_deduction, `Behavior event: ${behavior_type}`]).catch(() => {})
        }
        // Level 3+ fun lock
        if (severity_tier >= 3) {
          const lockUntil = new Date(Date.now() + 24 * 3600000).toISOString()
          await db.query(`UPDATE digi_pets SET fun_locked_until = $1 WHERE kid_name = $2`, [lockUntil, kid]).catch(() => {})
        }
        // Notify involved kid
        const kidDisplay = kid.charAt(0).toUpperCase() + kid.slice(1)
        const tierMessages: Record<number, string> = {
          0: `Great job, ${kidDisplay}! Mom or Dad noticed something positive.`,
          1: `${kidDisplay}, this is a heads up. No points lost.`,
          2: `${kidDisplay}, a behavior note was logged. You lost ${gem_deduction || 0} gems.`,
          3: `${kidDisplay}, a serious behavior event was logged. Fun features locked for 24 hours.`,
          4: `A family meeting has been called.`,
        }
        await createNotification({
          title: severity_tier === 0 ? '\uD83C\uDF1F Positive catch!' : `Behavior note (Level ${severity_tier})`,
          message: tierMessages[severity_tier] || '',
          source_type: 'behavior_event', icon: severity_tier === 0 ? '\uD83C\uDF1F' : severity_tier >= 3 ? '\u26A0\uFE0F' : '\uD83D\uDCCB',
          target_role: 'kid', kid_name: kid,
        }).catch(() => {})
      }

      // Update report status
      await db.query(`UPDATE kid_reports SET status = 'escalated', parent_action = 'behavior_event', linked_behavior_event_id = $1 WHERE id = $2`,
        [event[0]?.id, id])

      return NextResponse.json({ success: true, event_id: event[0]?.id })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Kid reports POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
