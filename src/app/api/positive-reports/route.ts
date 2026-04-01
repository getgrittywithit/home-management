import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

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
          `SELECT category, COALESCE(SUM(points), 0)::numeric AS total_points
           FROM kid_positive_reports
           WHERE kid_name = $1 AND approved = true
           GROUP BY category ORDER BY category`,
          [kidName.toLowerCase()]
        )
        return NextResponse.json({ totals: rows })
      } catch { return NextResponse.json({ totals: [] }) }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'submit_report': {
      const { kid_name, category, note, source, submitted_by } = body
      if (!kid_name || !category || !source || !submitted_by) {
        return NextResponse.json({ error: 'required fields missing' }, { status: 400 })
      }
      const points = source === 'parent' ? 2 : source === 'sibling' ? 1.5 : 1
      const autoApprove = source === 'parent'
      try {
        await db.query(
          `INSERT INTO kid_positive_reports (kid_name, category, note, source, submitted_by, points, approved, approved_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [kid_name.toLowerCase(), category, note || null, source, submitted_by.toLowerCase(), points, autoApprove, autoApprove ? submitted_by.toLowerCase() : null]
        )
        return NextResponse.json({ success: true, points, auto_approved: autoApprove })
      } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
      }
    }

    case 'approve_report': {
      const { report_id, approved_by } = body
      if (!report_id) return NextResponse.json({ error: 'report_id required' }, { status: 400 })
      try {
        await db.query(
          `UPDATE kid_positive_reports SET approved = true, approved_by = $2 WHERE id = $1`,
          [report_id, approved_by || 'lola']
        )
        return NextResponse.json({ success: true })
      } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
