import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

function getMonday(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const dow = d.getDay()
  // Sat/Sun → target upcoming Monday
  if (dow === 0) d.setDate(d.getDate() + 1)
  else if (dow === 6) d.setDate(d.getDate() + 2)
  else d.setDate(d.getDate() - ((dow + 6) % 7))
  return d.toLocaleDateString('en-CA')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('week_start') || getMonday()
  try {
    const rows = await db.query(`SELECT * FROM reef_notes WHERE week_start_date = $1`, [weekStart]).catch(() => [])
    return NextResponse.json(rows[0] || { week_start_date: weekStart, testing_notes: null, events_notes: null, rhythms_notes: null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const weekStart = body.week_start || getMonday()
    await db.query(
      `INSERT INTO reef_notes (week_start_date, testing_notes, events_notes, rhythms_notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (week_start_date) DO UPDATE SET
         testing_notes = COALESCE($2, reef_notes.testing_notes),
         events_notes = COALESCE($3, reef_notes.events_notes),
         rhythms_notes = COALESCE($4, reef_notes.rhythms_notes),
         updated_at = NOW()`,
      [weekStart, body.testing_notes || null, body.events_notes || null, body.rhythms_notes || null]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
