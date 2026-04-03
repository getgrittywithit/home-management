import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'
import { checkAchievements } from '@/lib/achievement-checker'

const CATEGORIES = ['kindness', 'courage', 'honesty', 'teamwork', 'gratitude', 'resilience']
const CATEGORY_EMOJI: Record<string, string> = {
  kindness: '💛', courage: '🦁', honesty: '⭐', teamwork: '🤝', gratitude: '🙏', resilience: '💪',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    case 'get_reports': {
      const kidName = searchParams.get('kid_name')
      const pending = searchParams.get('pending') === 'true'
      try {
        let sql = `SELECT * FROM kid_positive_reports WHERE 1=1`
        const params: any[] = []
        if (kidName) { sql += ` AND kid_name = $${params.length + 1}`; params.push(kidName.toLowerCase()) }
        if (pending) { sql += ` AND approved = false` }
        sql += ` ORDER BY created_at DESC LIMIT 50`
        return NextResponse.json({ reports: await db.query(sql, params) })
      } catch { return NextResponse.json({ reports: [] }) }
    }

    case 'get_totals': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT category, COALESCE(SUM(points), 0)::numeric AS total_points, COUNT(*)::int AS count
           FROM kid_positive_reports
           WHERE kid_name = $1 AND approved = true
           GROUP BY category ORDER BY category`,
          [kidName.toLowerCase()]
        )
        return NextResponse.json({ totals: rows })
      } catch { return NextResponse.json({ totals: [] }) }
    }

    case 'get_pending': {
      try {
        const rows = await db.query(
          `SELECT * FROM kid_positive_reports WHERE approved = FALSE ORDER BY created_at DESC`
        )
        return NextResponse.json({ reports: rows })
      } catch { return NextResponse.json({ reports: [] }) }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    // Unified submit (backward-compatible)
    case 'submit_report': {
      const { kid_name, category, note, source, submitted_by } = body
      if (!kid_name || !category || !source || !submitted_by) {
        return NextResponse.json({ error: 'required fields missing' }, { status: 400 })
      }
      if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      const points = source === 'parent' ? 2 : source === 'sibling' ? 1.5 : 1
      const autoApprove = source === 'parent'
      const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1).toLowerCase()

      try {
        await db.query(
          `INSERT INTO kid_positive_reports (kid_name, category, note, source, submitted_by, points, approved, approved_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [kid_name.toLowerCase(), category, note || null, source, submitted_by.toLowerCase(), points, autoApprove, autoApprove ? submitted_by.toLowerCase() : null]
        )

        const emoji = CATEGORY_EMOJI[category] || '⭐'

        if (source === 'parent') {
          // Immediate — notify kid
          await createNotification({
            title: `Mom noticed you were ${category} today!`,
            message: note || `Caught being ${category}`,
            source_type: 'caught_being_good', source_ref: `good-parent-${kid_name.toLowerCase()}-${Date.now()}`,
            link_tab: 'my-day', icon: emoji,
            target_role: 'kid', kid_name: kid_name.toLowerCase(),
          }).catch(e => console.error('Parent report notify failed:', e.message))
        } else if (source === 'sibling') {
          // Needs approval — notify parent
          const reporterDisplay = submitted_by.charAt(0).toUpperCase() + submitted_by.slice(1).toLowerCase()
          await createNotification({
            title: `${reporterDisplay} saw ${kidDisplay} being ${category}`,
            message: note || `Sibling spotted ${category}`,
            source_type: 'positive_report', source_ref: `good-sibling-${kid_name.toLowerCase()}-${Date.now()}`,
            link_tab: 'kids-checklist', icon: emoji,
          }).catch(e => console.error('Sibling report notify failed:', e.message))
        } else {
          // Self-report — needs approval, notify parent
          await createNotification({
            title: `${kidDisplay}: "I did something good!"`,
            message: `${emoji} ${category}: ${note || 'No details'}`,
            source_type: 'positive_report', source_ref: `good-self-${kid_name.toLowerCase()}-${Date.now()}`,
            link_tab: 'kids-checklist', icon: emoji,
          }).catch(e => console.error('Self report notify failed:', e.message))
        }

        return NextResponse.json({ success: true, points, auto_approved: autoApprove })
      } catch (error) {
        console.error('Positive report error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
      }
    }

    case 'approve_report': {
      const { report_id, approved_by } = body
      if (!report_id) return NextResponse.json({ error: 'report_id required' }, { status: 400 })
      try {
        const row = await db.query(`SELECT * FROM kid_positive_reports WHERE id = $1`, [report_id]).catch(() => [])
        await db.query(
          `UPDATE kid_positive_reports SET approved = true, approved_by = $2 WHERE id = $1`,
          [report_id, approved_by || 'parent']
        )
        // Notify the kid their report was approved
        if (row[0]) {
          const r = row[0]
          const emoji = CATEGORY_EMOJI[r.category] || '⭐'
          await createNotification({
            title: `Nice work on ${r.category}!`,
            message: r.source === 'sibling'
              ? `${r.submitted_by.charAt(0).toUpperCase() + r.submitted_by.slice(1)} noticed you being ${r.category}!`
              : `Mom approved your ${r.category} report!`,
            source_type: 'positive_approved', source_ref: `good-approved-${r.kid_name}-${report_id}`,
            link_tab: 'achievements', icon: emoji,
            target_role: 'kid', kid_name: r.kid_name,
          }).catch(e => console.error('Approve notify failed:', e.message))
          // ACHIEVE-1: Check for kindness/community badges
          checkAchievements(r.kid_name).catch(() => {})
          if (r.source === 'sibling' && r.submitted_by) {
            checkAchievements(r.submitted_by).catch(() => {}) // community badge for reporter
          }
        }
        return NextResponse.json({ success: true })
      } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
    }

    case 'reject_report': {
      const { report_id } = body
      if (!report_id) return NextResponse.json({ error: 'report_id required' }, { status: 400 })
      await db.query(`DELETE FROM kid_positive_reports WHERE id = $1 AND approved = FALSE`, [report_id]).catch(() => {})
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
