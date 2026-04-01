import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    case 'get_progress': {
      const kidName = searchParams.get('kid_name')
      try {
        let sql = `SELECT * FROM kid_workbook_progress WHERE active = true`
        const params: any[] = []
        if (kidName) { sql += ` AND kid_name = $1`; params.push(kidName.toLowerCase()) }
        sql += ` ORDER BY kid_name, workbook_name`
        const rows = await db.query(sql, params)
        return NextResponse.json({ workbooks: rows })
      } catch { return NextResponse.json({ workbooks: [] }) }
    }

    case 'get_log': {
      const kidName = searchParams.get('kid_name')
      const workbook = searchParams.get('workbook')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        let sql = `SELECT * FROM kid_workbook_log WHERE kid_name = $1`
        const params: any[] = [kidName.toLowerCase()]
        if (workbook) { sql += ` AND workbook_name = $2`; params.push(workbook) }
        sql += ` ORDER BY log_date DESC LIMIT 30`
        return NextResponse.json({ logs: await db.query(sql, params) })
      } catch { return NextResponse.json({ logs: [] }) }
    }

    case 'get_skill_map': {
      const workbook = searchParams.get('workbook')
      const page = searchParams.get('page')
      try {
        let sql = `SELECT * FROM workbook_skill_map WHERE 1=1`
        const params: any[] = []
        if (workbook) { sql += ` AND workbook_name = $${params.length + 1}`; params.push(workbook) }
        if (page) { sql += ` AND $${params.length + 1}::int BETWEEN page_start AND page_end`; params.push(parseInt(page)) }
        return NextResponse.json({ maps: await db.query(sql, params) })
      } catch { return NextResponse.json({ maps: [] }) }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'log_pages': {
      const { kid_name, workbook_name, pages_completed, page_start, page_end, skill_tags, notes } = body
      if (!kid_name || !workbook_name || !pages_completed) {
        return NextResponse.json({ error: 'kid_name, workbook_name, pages_completed required' }, { status: 400 })
      }
      const kid = kid_name.toLowerCase()
      try {
        await db.query(
          `INSERT INTO kid_workbook_log (kid_name, workbook_name, pages_completed, page_start, page_end, skill_tags, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (kid_name, workbook_name, log_date) DO UPDATE SET
             pages_completed = $3, page_start = $4, page_end = $5, skill_tags = COALESCE($6, kid_workbook_log.skill_tags)`,
          [kid, workbook_name, pages_completed, page_start || null, page_end || null, skill_tags || null, notes || null]
        )
        // Update progress
        if (page_end) {
          await db.query(
            `UPDATE kid_workbook_progress SET current_page = GREATEST(current_page, $3)
             WHERE kid_name = $1 AND workbook_name = $2`,
            [kid, workbook_name, page_end]
          )
        }
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('log_pages error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
      }
    }

    case 'add_workbook': {
      const { kid_name, workbook_name, workbook_type, subject, total_pages, daily_target } = body
      if (!kid_name || !workbook_name || !total_pages) {
        return NextResponse.json({ error: 'required fields missing' }, { status: 400 })
      }
      try {
        await db.query(
          `INSERT INTO kid_workbook_progress (kid_name, workbook_name, workbook_type, subject, total_pages, daily_target, started_date)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
           ON CONFLICT (kid_name, workbook_name) DO NOTHING`,
          [kid_name.toLowerCase(), workbook_name, workbook_type || 'other', subject || 'mixed', total_pages, daily_target || 2]
        )
        return NextResponse.json({ success: true })
      } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
