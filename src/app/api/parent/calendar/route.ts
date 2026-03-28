import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'list_events': {
        const view = searchParams.get('view') || 'week'
        const dateStr = searchParams.get('date') || new Date().toLocaleDateString('en-CA')
        const { start, end } = view === 'month' ? getMonthRange(dateStr) : getWeekRange(dateStr)

        const rows = await db.query(
          `SELECT id, title, start_time as start, end_time as "end", all_day as "allDay",
                  calendar_name, location, description
           FROM calendar_events_cache
           WHERE start_time >= $1 AND start_time <= $2
           ORDER BY start_time ASC`,
          [start.toISOString(), end.toISOString()]
        )

        return NextResponse.json({ events: rows })
      }

      case 'upcoming': {
        const limit = parseInt(searchParams.get('limit') || '5')
        const rows = await db.query(
          `SELECT id, title, start_time as start, end_time as "end", all_day as "allDay",
                  calendar_name, location, description
           FROM calendar_events_cache
           WHERE start_time >= NOW()
           ORDER BY start_time ASC
           LIMIT $1`,
          [Math.min(limit, 20)]
        )

        return NextResponse.json({ events: rows })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json({ error: 'Failed to load calendar data' }, { status: 500 })
  }
}
