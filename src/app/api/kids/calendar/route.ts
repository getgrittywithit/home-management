import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { db } from '@/lib/database'

// Shared calendars ALL kids see
const SHARED_CALENDARS = [
  process.env.GOOGLE_CALENDAR_ID || 'primary',  // Primary family calendar
  'family05780461431364461113@group.calendar.google.com', // Household Hub
]

async function getKidCalendarIds(kidName: string): Promise<string[]> {
  // Check DB for configured calendar IDs
  try {
    const rows = await db.query(
      `SELECT calendar_id FROM kid_calendar_ids WHERE kid_name = $1`, [kidName.toLowerCase()]
    ).catch(() => [])
    if (rows.length > 0) {
      return [...rows.map((r: any) => r.calendar_id), ...SHARED_CALENDARS]
    }
  } catch { /* table may not exist */ }

  // Fall back to shared calendars only
  return SHARED_CALENDARS
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const kidName = searchParams.get('kid_name')?.toLowerCase()
    const action = searchParams.get('action')

    // List configured calendar IDs
    if (action === 'get_calendar_config') {
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT * FROM kid_calendar_ids WHERE kid_name = $1`, [kidName]
        ).catch(() => [])
        return NextResponse.json({ calendars: rows, shared: SHARED_CALENDARS })
      } catch {
        return NextResponse.json({ calendars: [], shared: SHARED_CALENDARS })
      }
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })
    const authClient = await auth.getClient()
    const cal = google.calendar({ version: 'v3', auth: authClient as any })

    const now = new Date()
    const maxDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    // Get calendar IDs for this kid (or shared if no kid specified)
    const calendarIds = kidName ? await getKidCalendarIds(kidName) : SHARED_CALENDARS

    // Fetch events from all assigned calendars in parallel
    const allEvents: any[] = []
    const fetchPromises = calendarIds.map(async (calId) => {
      try {
        const res = await cal.events.list({
          calendarId: calId,
          timeMin: now.toISOString(),
          timeMax: maxDate.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 50,
        })
        for (const e of (res.data.items || [])) {
          allEvents.push({
            id: e.id || '',
            summary: e.summary || 'Untitled',
            start: e.start?.dateTime || e.start?.date || '',
            end: e.end?.dateTime || e.end?.date || '',
            location: e.location || null,
            description: e.description || null,
            calendarId: calId,
          })
        }
      } catch (err) {
        console.error(`Calendar fetch error for ${calId}:`, err)
      }
    })

    await Promise.all(fetchPromises)

    // Sort by start time and deduplicate by event ID
    const seen = new Set<string>()
    const events = allEvents
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .filter(e => {
        if (seen.has(e.id)) return false
        seen.add(e.id)
        return true
      })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Kid calendar error:', error)
    return NextResponse.json({ events: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'set_calendar_id') {
      const { kid_name, calendar_id, label } = body
      if (!kid_name || !calendar_id) return NextResponse.json({ error: 'kid_name, calendar_id required' }, { status: 400 })

      await db.query(`CREATE TABLE IF NOT EXISTS kid_calendar_ids (
        id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, calendar_id TEXT NOT NULL, label TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(kid_name, calendar_id)
      )`).catch(() => {})

      await db.query(
        `INSERT INTO kid_calendar_ids (kid_name, calendar_id, label) VALUES ($1, $2, $3)
         ON CONFLICT (kid_name, calendar_id) DO UPDATE SET label = $3`,
        [kid_name.toLowerCase(), calendar_id, label || null]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'remove_calendar_id') {
      const { kid_name, calendar_id } = body
      if (!kid_name || !calendar_id) return NextResponse.json({ error: 'kid_name, calendar_id required' }, { status: 400 })
      await db.query(`DELETE FROM kid_calendar_ids WHERE kid_name = $1 AND calendar_id = $2`, [kid_name.toLowerCase(), calendar_id])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Kid calendar POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
