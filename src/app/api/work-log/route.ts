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
      start_time TIME,
      end_time TIME,
      gross_minutes INTEGER,
      lunch_minutes INTEGER DEFAULT 30,
      travel_minutes INTEGER DEFAULT 0,
      material_run_minutes INTEGER DEFAULT 0,
      other_deduction_minutes INTEGER DEFAULT 0,
      billable_minutes INTEGER,
      lunch_description TEXT,
      lunch_type TEXT,
      lunch_cost_estimate NUMERIC(6,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  // Add new columns if missing (migration for existing rows)
  const cols = [
    'start_time TIME', 'end_time TIME', 'gross_minutes INTEGER',
    'lunch_minutes INTEGER DEFAULT 30', 'travel_minutes INTEGER DEFAULT 0',
    'material_run_minutes INTEGER DEFAULT 0', 'other_deduction_minutes INTEGER DEFAULT 0',
    'billable_minutes INTEGER', 'lunch_description TEXT', 'lunch_type TEXT',
    'lunch_cost_estimate NUMERIC(6,2)',
  ]
  for (const col of cols) {
    const [name, ...typeParts] = col.split(' ')
    await db.query(`ALTER TABLE work_log ADD COLUMN IF NOT EXISTS ${name} ${typeParts.join(' ')}`).catch(() => {})
  }
}

let ready = false
async function init() { if (!ready) { await ensureTable(); ready = true } }

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

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
      let sql = `SELECT kid_name,
        SUM(hours)::numeric(6,1) as total_hours,
        SUM(COALESCE(billable_minutes, gross_minutes, hours * 60))::int as total_billable_min,
        SUM(COALESCE(gross_minutes, hours * 60))::int as total_gross_min,
        COUNT(*)::int as entries
        FROM work_log WHERE date >= $1::date`
      const params: any[] = [monday]
      if (targetKid) { params.push(targetKid); sql += ` AND kid_name = $2` }
      sql += ` GROUP BY kid_name`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ summary: rows, week_start: monday })
    }

    if (action === 'get_lunch_summary') {
      const targetKid = kid || null
      const from = searchParams.get('from') || getMonday()
      const to = searchParams.get('to')
      let sql = `SELECT lunch_type, COUNT(*)::int as count FROM work_log WHERE date >= $1::date AND lunch_type IS NOT NULL`
      const params: any[] = [from]
      if (to) { params.push(to); sql += ` AND date <= $${params.length}::date` }
      if (targetKid) { params.push(targetKid); sql += ` AND kid_name = $${params.length}` }
      sql += ` GROUP BY lunch_type`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ lunch_summary: rows })
    }

    if (action === 'get_totals') {
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
      let sql = `SELECT kid_name, date, hours, COALESCE(billable_minutes/60.0, hours) as billable_hours, job_name, description, start_time, end_time, lunch_type, lunch_description FROM work_log WHERE 1=1`
      const params: any[] = []
      if (targetKid) { params.push(targetKid); sql += ` AND kid_name = $${params.length}` }
      if (from) { params.push(from); sql += ` AND date >= $${params.length}::date` }
      if (to) { params.push(to); sql += ` AND date <= $${params.length}::date` }
      sql += ` ORDER BY date ASC`
      const rows = await db.query(sql, params).catch(() => [])
      const header = 'Kid,Date,Gross Hours,Billable Hours,Job,Description,Start,End,Lunch Type,Lunch'
      const lines = rows.map((r: any) =>
        `"${r.kid_name}","${r.date}",${r.hours},${Number(r.billable_hours || r.hours).toFixed(1)},"${(r.job_name || '').replace(/"/g, '""')}","${(r.description || '').replace(/"/g, '""')}","${r.start_time || ''}","${r.end_time || ''}","${r.lunch_type || ''}","${(r.lunch_description || '').replace(/"/g, '""')}"`
      )
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
      const { kid_name, date, hours, job_name, description, start_time, end_time,
        lunch_minutes, travel_minutes, material_run_minutes, other_deduction_minutes,
        lunch_description, lunch_type, lunch_cost_estimate } = body

      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      if (!WORK_KIDS.includes(kid)) return NextResponse.json({ error: 'Work log only available for Amos and Wyatt' }, { status: 400 })
      const logDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      // Calculate gross and billable minutes
      let grossMin = hours ? Math.round(Number(hours) * 60) : 0
      if (start_time && end_time) {
        grossMin = timeToMinutes(end_time) - timeToMinutes(start_time)
        if (grossMin < 0) grossMin += 24 * 60 // overnight
      }

      const lunchMin = lunch_minutes || 0
      const travelMin = travel_minutes || 0
      const materialMin = material_run_minutes || 0
      const otherMin = other_deduction_minutes || 0
      const billableMin = Math.max(0, grossMin - lunchMin - travelMin - materialMin - otherMin)
      const grossHrs = Number((grossMin / 60).toFixed(1))

      const rows = await db.query(
        `INSERT INTO work_log (kid_name, date, hours, job_name, description, start_time, end_time,
          gross_minutes, lunch_minutes, travel_minutes, material_run_minutes, other_deduction_minutes,
          billable_minutes, lunch_description, lunch_type, lunch_cost_estimate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
        [kid, logDate, grossHrs, job_name || null, description || null,
         start_time || null, end_time || null, grossMin, lunchMin, travelMin, materialMin, otherMin,
         billableMin, lunch_description || null, lunch_type || null, lunch_cost_estimate || null]
      )
      return NextResponse.json({ success: true, log: rows[0] })
    }

    if (action === 'update_log') {
      const { id, ...updates } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      delete updates.action
      const fields: string[] = []
      const values: any[] = []
      let idx = 1
      for (const [key, val] of Object.entries(updates)) {
        if (val !== undefined) { fields.push(`${key} = $${idx++}`); values.push(val) }
      }
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
