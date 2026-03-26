import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const HOUSEHOLD_HUB_ID = 'family05780461431364461113@group.calendar.google.com'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })
    const authClient = await auth.getClient()
    const cal = google.calendar({ version: 'v3', auth: authClient as any })

    const now = new Date()
    const maxDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    const res = await cal.events.list({
      calendarId: HOUSEHOLD_HUB_ID,
      timeMin: now.toISOString(),
      timeMax: maxDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    })

    const events = (res.data.items || []).map(e => ({
      id: e.id || '',
      summary: e.summary || 'Untitled',
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
      location: e.location || null,
      description: e.description || null,
    }))

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Kid calendar error:', error)
    return NextResponse.json({ events: [] })
  }
}
