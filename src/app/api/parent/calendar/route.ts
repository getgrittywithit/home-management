import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/calendar.readonly']
})

async function getCalendarService() {
  const authClient = await auth.getClient()
  return google.calendar({ version: 'v3', auth: authClient as any })
}

function getWeekRange(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  const day = date.getDay()
  const start = new Date(date)
  start.setDate(date.getDate() - day) // Sunday
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getMonthRange(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function cleanEvent(event: any): any {
  const start = event.start?.dateTime || event.start?.date
  const end = event.end?.dateTime || event.end?.date
  const allDay = !event.start?.dateTime
  return {
    id: event.id,
    title: event.summary || '(No title)',
    start,
    end,
    allDay,
    calendar_name: event.organizer?.displayName || event.calendar_name || 'Unknown',
    location: event.location || null,
    description: event.description || null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const calendarService = await getCalendarService()
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

    switch (action) {
      case 'list_events': {
        const view = searchParams.get('view') || 'week'
        const dateStr = searchParams.get('date') || new Date().toLocaleDateString('en-CA')
        const { start, end } = view === 'month' ? getMonthRange(dateStr) : getWeekRange(dateStr)

        let allEvents: any[] = []
        try {
          const calendarList = await calendarService.calendarList.list()
          const calendars = calendarList.data.items || []

          // Batch in groups of 3
          for (let i = 0; i < calendars.length; i += 3) {
            const batch = calendars.slice(i, i + 3)
            const results = await Promise.all(
              batch.map(async (cal) => {
                try {
                  const events = await calendarService.events.list({
                    calendarId: cal.id!,
                    timeMin: start.toISOString(),
                    timeMax: end.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 100,
                  })
                  return (events.data.items || []).map(e => ({
                    ...cleanEvent(e),
                    calendar_name: cal.summary || 'Unknown'
                  }))
                } catch { return [] }
              })
            )
            allEvents.push(...results.flat())
          }
        } catch {
          // Fallback to single calendar
          try {
            const events = await calendarService.events.list({
              calendarId,
              timeMin: start.toISOString(),
              timeMax: end.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
              maxResults: 100,
            })
            allEvents = (events.data.items || []).map(e => cleanEvent(e))
          } catch { /* empty */ }
        }

        // Sort by start time
        allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        return NextResponse.json({ events: allEvents })
      }

      case 'upcoming': {
        const limit = parseInt(searchParams.get('limit') || '5')
        let allEvents: any[] = []

        try {
          const calendarList = await calendarService.calendarList.list()
          const calendars = calendarList.data.items || []

          for (let i = 0; i < calendars.length; i += 3) {
            const batch = calendars.slice(i, i + 3)
            const results = await Promise.all(
              batch.map(async (cal) => {
                try {
                  const events = await calendarService.events.list({
                    calendarId: cal.id!,
                    timeMin: new Date().toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: limit,
                  })
                  return (events.data.items || []).map(e => ({
                    ...cleanEvent(e),
                    calendar_name: cal.summary || 'Unknown'
                  }))
                } catch { return [] }
              })
            )
            allEvents.push(...results.flat())
          }
        } catch {
          try {
            const events = await calendarService.events.list({
              calendarId,
              timeMin: new Date().toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
              maxResults: limit,
            })
            allEvents = (events.data.items || []).map(e => cleanEvent(e))
          } catch { /* empty */ }
        }

        allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        return NextResponse.json({ events: allEvents.slice(0, limit) })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json({ error: 'Failed to load calendar data' }, { status: 500 })
  }
}
