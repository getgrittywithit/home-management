import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const CALENDAR_IDS: Record<string, string> = {
  amos: '194038ae67373069d1fb0a464d4e96578ee04a826a8cedd15b3fa6eec529c66b@group.calendar.google.com',
  ellie: '2ccdd50c3ca89f4a29b5a61c5278cc8db92e658a18766f22d96d8f79d0b34182@group.calendar.google.com',
  wyatt: '9a7bcfe49dc3a83681e5ac0bcc353609c613a4970ad53d862bbf89173e484416@group.calendar.google.com',
  hannah: '09d3ea1464f2ffaca318a1370e2c840dd4ba5bc5fd79a50b55fdc6e7b40048cf@group.calendar.google.com',
  zoey: '95dbf776e9b0639c1790fe48f2dd28fdfe7d1c249d2a2a2f4973ae898c1c4325@group.calendar.google.com',
  kaylee: 'd9ad804eca1b633a86f15bb5c67001f9d8f3328ffcb8bee7a5f3d239567ea2cb@group.calendar.google.com',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kid = searchParams.get('kid')?.toLowerCase()

    if (!kid || !CALENDAR_IDS[kid]) {
      return NextResponse.json({ error: 'Invalid kid' }, { status: 400 })
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })
    const authClient = await auth.getClient()
    const cal = google.calendar({ version: 'v3', auth: authClient as any })

    const now = new Date()
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const res = await cal.events.list({
      calendarId: CALENDAR_IDS[kid],
      timeMin: now.toISOString(),
      timeMax: twoWeeks.toISOString(),
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
    }))

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Kid calendar error:', error)
    return NextResponse.json({ error: 'Failed to load calendar' }, { status: 500 })
  }
}
