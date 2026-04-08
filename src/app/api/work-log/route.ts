import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const WORK_KIDS = ['amos', 'wyatt']

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS work_log (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      hours NUMERIC(4,1) NOT NULL,
      job_name TEXT,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

let ready = false
async function init() { if (!ready) { await ensureTable(); ready = true } }

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_logs'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_logs') {
      let sql = `SELECT * FROM work_log`
      const params: any[] = []
      if (kid) {
        params.push(kid)
        sql += ` WHERE kid_name = $1`
      } else {
        sql += ` WHERE kid_name = ANY($1)`
        params.push(WORK_KIDS)
      }
      sql += ` ORDER BY date DESC, created_at DESC LIMIT 50`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ logs: rows })
    }

    if (action === 'get_weekly_summary') {
      const targetKid = kid || null
      const monday = getMonday()
      let sql = `SELECT kid_name, SUM(hours)::numeric(6,1) as total_hours, COUNT(*)::int as entries
                 FROM work_log WHERE date >= $1::date`
      const params: any[] = [monday]
      if (targetKid) {
        params.push(targetKid)
        sql += ` AND kid_name = $2`
      }
      sql += ` GROUP BY kid_name`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ summary: rows, week_start: monday })
    }

    if (action === 'get_totals') {
      // All-time totals per kid
      const rows = await db.query(
        `SELECT kid_name, SUM(hours)::numeric(6,1) as total_hours, COUNT(*)::int as total_entries,
                MIN(date) as first_log, MAX(date) as last_log
         FROM work_log WHERE kid_name = ANY($1)
         GROUP BY kid_name`, [WORK_KIDS]
      ).catch(() => [])
      return NextResponse.json({ totals: rows })
    }

    if (action === 'export_csv') {
      const targetKid = kid || null
      const from = searchParams.get('from')
      const to = searchParams.get('to')
      let sql = `SELECT kid_name, date, hours, job_name, description FROM work_log WHERE 1=1`
      const params: any[] = []
      if (targetKid) { params.push(targetKid); sql += ` AND kid_name = $${params.length}` }
      if (from) { params.push(from); sql += ` AND date >= $${params.length}::date` }
      if (to) { params.push(to); sql += ` AND date <= $${params.length}::date` }
      sql += ` ORDER BY date ASC`
      const rows = await db.query(sql, params).catch(() => [])
      // Build CSV
      const header = 'Kid,Date,Hours,Job,Description'
      const lines = rows.map((r: any) => `"${r.kid_name}","${r.date}",${r.hours},"${(r.job_name || '').replace(/"/g, '""')}","${(r.description || '').replace(/"/g, '""')}"`)
      const csv = [header, ...lines].join('\n')
      return NextResponse.json({ csv, row_count: rows.length })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Work log GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'log_work') {
      const { kid_name, date, hours, job_name, description } = body
      if (!kid_name || !hours) return NextResponse.json({ error: 'kid_name, hours required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      if (!WORK_KIDS.includes(kid)) return NextResponse.json({ error: 'Work log only available for Amos and Wyatt' }, { status: 400 })
      const logDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const rows = await db.query(
        `INSERT INTO work_log (kid_name, date, hours, job_name, description) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [kid, logDate, hours, job_name || null, description || null]
      )
      return NextResponse.json({ success: true, log: rows[0] })
    }

    if (action === 'update_log') {
      const { id, hours, job_name, description } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const fields: string[] = []
      const values: any[] = []
      let idx = 1
      if (hours !== undefined) { fields.push(`hours = $${idx++}`); values.push(hours) }
      if (job_name !== undefined) { fields.push(`job_name = $${idx++}`); values.push(job_name) }
      if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description) }
      if (fields.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 })
      values.push(id)
      const rows = await db.query(`UPDATE work_log SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values)
      return NextResponse.json({ success: true, log: rows[0] })
    }

    if (action === 'delete_log') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM work_log WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Work log POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}
