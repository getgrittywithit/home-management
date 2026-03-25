import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const rows = await db.query(
      `SELECT parent_name, status, note FROM parent_availability WHERE status_date = $1`,
      [today]
    )
    const result: Record<string, { status: string; note: string | null }> = {}
    rows.forEach((r: any) => { result[r.parent_name] = { status: r.status, note: r.note } })
    return NextResponse.json({
      lola: result.lola || { status: 'available', note: null },
      levi: result.levi || { status: 'available', note: null },
    })
  } catch {
    return NextResponse.json({
      lola: { status: 'available', note: null },
      levi: { status: 'available', note: null },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, parent_name, status, note } = await request.json()
    if (action !== 'set_status') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    if (!parent_name || !status) return NextResponse.json({ error: 'parent_name and status required' }, { status: 400 })
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    await db.query(
      `INSERT INTO parent_availability (parent_name, status_date, status, note, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (parent_name, status_date) DO UPDATE SET status = $3, note = $4, updated_at = NOW()`,
      [parent_name, today, status, note || null]
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Availability POST error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
