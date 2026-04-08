import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS daily_lesson_notes (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      date DATE NOT NULL,
      morning_plan TEXT,
      reflection TEXT,
      day_tags JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(kid_name, date)
    )
  `)
}

let ready = false
async function init() { if (!ready) { await ensureTable(); ready = true } }

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_today'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_today') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const row = (await db.query(`SELECT * FROM daily_lesson_notes WHERE kid_name = $1 AND date = $2`, [kid, today]).catch(() => []))[0]
      return NextResponse.json({ note: row || null })
    }

    if (action === 'get_week') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const dateParam = searchParams.get('date')
      const refDate = dateParam ? new Date(dateParam + 'T12:00:00') : new Date()
      const day = refDate.getDay()
      const monday = new Date(refDate)
      monday.setDate(refDate.getDate() - (day === 0 ? 6 : day - 1))
      const friday = new Date(monday)
      friday.setDate(monday.getDate() + 4)
      const monStr = monday.toLocaleDateString('en-CA')
      const friStr = friday.toLocaleDateString('en-CA')
      const rows = await db.query(
        `SELECT * FROM daily_lesson_notes WHERE kid_name = $1 AND date BETWEEN $2 AND $3 ORDER BY date`,
        [kid, monStr, friStr]
      ).catch(() => [])
      return NextResponse.json({ notes: rows, week_start: monStr, week_end: friStr })
    }

    if (action === 'get_morning_plan') {
      // For kid portal — returns today's morning plan (read-only for kid)
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const row = (await db.query(
        `SELECT morning_plan, day_tags FROM daily_lesson_notes WHERE kid_name = $1 AND date = $2`, [kid, today]
      ).catch(() => []))[0]
      return NextResponse.json({ morning_plan: row?.morning_plan || null, day_tags: row?.day_tags || [] })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Lesson notes GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'save_note') {
      const { kid_name, date, morning_plan, reflection, day_tags } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const noteDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      await db.query(
        `INSERT INTO daily_lesson_notes (kid_name, date, morning_plan, reflection, day_tags)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (kid_name, date) DO UPDATE SET
           morning_plan = COALESCE($3, daily_lesson_notes.morning_plan),
           reflection = COALESCE($4, daily_lesson_notes.reflection),
           day_tags = COALESCE($5, daily_lesson_notes.day_tags),
           updated_at = NOW()`,
        [kid, noteDate, morning_plan || null, reflection || null, JSON.stringify(day_tags || [])]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'add_tag') {
      const { kid_name, date, tag } = body
      if (!kid_name || !tag) return NextResponse.json({ error: 'kid_name, tag required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const noteDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      // Upsert the note, append tag
      await db.query(
        `INSERT INTO daily_lesson_notes (kid_name, date, day_tags)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (kid_name, date) DO UPDATE SET
           day_tags = (
             CASE WHEN daily_lesson_notes.day_tags @> $3::jsonb THEN daily_lesson_notes.day_tags
             ELSE daily_lesson_notes.day_tags || $3::jsonb END
           ), updated_at = NOW()`,
        [kid, noteDate, JSON.stringify([tag])]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Lesson notes POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
