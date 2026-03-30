import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// Template daily schedule — same rhythm for all 4 homeschool kids
const DAILY_SCHEDULE = [
  { time: '06:30', duration: 90, summary: 'Morning Routine', category: 'routine' },
  { time: '08:00', duration: 60, summary: 'Morning Zone Chores + Breakfast Dishes', category: 'chores' },
  { time: '09:00', duration: 45, summary: 'Math Time', category: 'academics' },
  { time: '09:45', duration: 15, summary: 'Brain Break', category: 'break' },
  { time: '10:00', duration: 20, summary: 'Independent Reading', category: 'academics' },
  { time: '10:20', duration: 25, summary: 'ELAR / Writing', category: 'academics' },
  { time: '10:45', duration: 15, summary: 'Brain Break + Snack', category: 'break' },
  { time: '11:00', duration: 45, summary: 'Science / Social Studies + Zone Daily Checklist', category: 'academics' },
  { time: '11:45', duration: 30, summary: 'Creative Building & Art', category: 'enrichment' },
  { time: '12:15', duration: 30, summary: 'Lunch', category: 'routine' },
  { time: '12:45', duration: 60, summary: 'Quiet Time', category: 'break' },
  { time: '13:45', duration: 15, summary: 'Group Reading', category: 'academics' },
  { time: '14:00', duration: 30, summary: 'School Room Group Clean', category: 'chores' },
  { time: '14:30', duration: 30, summary: 'Outdoor / Park Time', category: 'enrichment' },
  { time: '15:00', duration: 30, summary: 'Afternoon Zone Chores', category: 'chores' },
  { time: '15:30', duration: 120, summary: 'Free Time', category: 'break' },
  { time: '17:30', duration: 30, summary: 'Dinner', category: 'routine' },
  { time: '18:00', duration: 30, summary: 'Evening Tidy & Reset', category: 'chores' },
  { time: '18:30', duration: 120, summary: 'Family Time', category: 'routine' },
  { time: '20:30', duration: 30, summary: 'Bedtime Routine', category: 'routine' },
]

const HOMESCHOOL_KIDS = ['Amos', 'Ellie', 'Wyatt', 'Hannah']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const date = dateParam || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    // Fetch checklist completion status for all homeschool kids for this date
    const completions = await db.query(
      `SELECT child_name, event_summary, completed, completed_at
       FROM homeschool_checklist
       WHERE checklist_date = $1 AND child_name = ANY($2)`,
      [date, HOMESCHOOL_KIDS]
    )

    // Build completion map: { "Amos|Math Time": true }
    const completionMap: Record<string, boolean> = {}
    completions.forEach((row: any) => {
      completionMap[`${row.child_name}|${row.event_summary}`] = row.completed
    })

    // Fetch currently_reading per kid
    const readingRows = await db.query(
      `SELECT kid_name, currently_reading FROM homeschool_settings WHERE kid_name = ANY($1)`,
      [HOMESCHOOL_KIDS]
    )
    const currentlyReading: Record<string, string> = {}
    readingRows.forEach((r: any) => { currentlyReading[r.kid_name] = r.currently_reading })

    // Check for get_learning_data action (Fix F)
    const action = searchParams.get('action')
    const kidName = searchParams.get('kid')

    if (action === 'get_learning_data' && kidName) {
      const kidLower = kidName.toLowerCase()
      const kidCapitalized = kidName.charAt(0).toUpperCase() + kidName.slice(1).toLowerCase()

      // Current book (in_progress)
      let currentBook = null
      try {
        const books = await db.query(
          `SELECT title, author FROM hs_books
           WHERE status = 'in_progress' AND (
             student_names::text ILIKE $1 OR student_names::text ILIKE $2
           )
           ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
          [`%${kidLower}%`, `%${kidCapitalized}%`]
        )
        if (books.length > 0) currentBook = { title: books[0].title, author: books[0].author }
      } catch { /* table may not exist */ }

      // Current unit (active)
      let currentUnit = null
      try {
        const units = await db.query(
          `SELECT title, subject_tags FROM hs_units
           WHERE status = 'active' AND (
             student_names::text ILIKE $1 OR student_names::text ILIKE $2
           )
           ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
          [`%${kidLower}%`, `%${kidCapitalized}%`]
        )
        if (units.length > 0) currentUnit = { subject: units[0].subject_tags?.[0] || 'General', unit_name: units[0].title }
      } catch { /* table may not exist */ }

      // Just finished (most recent completed book or unit)
      let justFinished = null
      try {
        const finBooks = await db.query(
          `SELECT title, 'book' as type, updated_at FROM hs_books
           WHERE status = 'completed' AND (
             student_names::text ILIKE $1 OR student_names::text ILIKE $2
           )
           ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
          [`%${kidLower}%`, `%${kidCapitalized}%`]
        )
        const finUnits = await db.query(
          `SELECT title, 'unit' as type, updated_at FROM hs_units
           WHERE status = 'completed' AND (
             student_names::text ILIKE $1 OR student_names::text ILIKE $2
           )
           ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
          [`%${kidLower}%`, `%${kidCapitalized}%`]
        )
        const candidates = [...finBooks, ...finUnits].sort((a, b) =>
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        )
        if (candidates.length > 0) {
          const c = candidates[0]
          justFinished = c.type === 'book'
            ? { title: c.title, type: 'book' as const }
            : { unit_name: c.title, type: 'unit' as const }
        }
      } catch { /* table may not exist */ }

      // Coming up (next scheduled/planned unit)
      let comingUp = null
      try {
        const upcoming = await db.query(
          `SELECT title, subject_tags FROM hs_units
           WHERE status = 'planned' AND (
             student_names::text ILIKE $1 OR student_names::text ILIKE $2
           )
           ORDER BY start_date ASC NULLS LAST LIMIT 1`,
          [`%${kidLower}%`, `%${kidCapitalized}%`]
        )
        if (upcoming.length > 0) comingUp = { subject: upcoming[0].subject_tags?.[0] || 'General', unit_name: upcoming[0].title }
      } catch { /* table may not exist */ }

      // Word of the week (from homeschool_settings notes or a dedicated field)
      let wordOfWeek = null
      try {
        const wordRows = await db.query(
          `SELECT word_of_week FROM homeschool_settings WHERE kid_name = $1 AND word_of_week IS NOT NULL LIMIT 1`,
          [kidCapitalized]
        )
        if (wordRows.length > 0 && wordRows[0].word_of_week) wordOfWeek = wordRows[0].word_of_week
      } catch { /* column may not exist */ }

      return NextResponse.json({
        currentBook, currentUnit, justFinished, comingUp, wordOfWeek
      })
    }

    return NextResponse.json({
      date,
      schedule: DAILY_SCHEDULE,
      kids: HOMESCHOOL_KIDS,
      completions: completionMap,
      currentlyReading,
    })
  } catch (error) {
    console.error('Homeschool API error:', error)
    return NextResponse.json({ error: 'Failed to load homeschool data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    switch (action) {
      case 'toggle_checklist_item': {
        const { child_name, event_summary, date, completed } = data
        await db.query(
          `INSERT INTO homeschool_checklist (child_name, checklist_date, event_summary, completed, completed_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (child_name, checklist_date, event_summary)
           DO UPDATE SET completed = $4, completed_at = $5`,
          [child_name, date, event_summary, completed, completed ? new Date().toISOString() : null]
        )
        return NextResponse.json({ success: true })
      }

      case 'update_currently_reading': {
        const { value } = data
        if (!value) return NextResponse.json({ error: 'Missing value' }, { status: 400 })
        // Update all homeschool kids at once (shared group read)
        await db.query(
          `UPDATE homeschool_settings SET currently_reading = $1, updated_at = NOW()
           WHERE kid_name = ANY($2)`,
          [value, HOMESCHOOL_KIDS]
        )
        return NextResponse.json({ success: true })
      }

      case 'reset_daily_checklist': {
        const { date: resetDate } = data
        await db.query(
          `DELETE FROM homeschool_checklist WHERE checklist_date = $1 AND child_name = ANY($2)`,
          [resetDate, HOMESCHOOL_KIDS]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Homeschool API error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
