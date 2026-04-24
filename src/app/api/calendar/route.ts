import { NextRequest, NextResponse } from 'next/server'
import { CalendarService } from '@/lib/google-calendar'
import { db } from '@/lib/database'
import { parseDateLocal } from '@/lib/date-local'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'list_calendars': {
        const rows = await db.query(
          `SELECT id, google_calendar_id, display_name, color_hex, category, member_name,
                  is_visible_default, sort_order, last_synced_at, is_active
             FROM calendar_connections
            WHERE is_active = TRUE
            ORDER BY sort_order, display_name`
        ).catch(() => [])
        return NextResponse.json({ calendars: rows })
      }

      case 'sync':
        const result = await CalendarService.syncCalendarEvents()
        return NextResponse.json(result)

      case 'check-swaps':
        await CalendarService.checkPendingSwaps()
        return NextResponse.json({ status: 'checked' })

      case 'upcoming':
        const events = await db.getUpcomingEvents(20)
        return NextResponse.json(events)

      case 'get_events': {
        const startDate = searchParams.get('start_date') || new Date().toISOString().slice(0, 10)
        const endDate = searchParams.get('end_date') || (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })()
        const rows = await db.query(
          `SELECT id, title, description, start_time, end_time, location, calendar_name, calendar_color, all_day, event_type
           FROM family_events WHERE start_time::date BETWEEN $1 AND $2 ORDER BY start_time`,
          [startDate, endDate]
        ).catch(() => [])
        const mapped = rows.map((e: any) => ({
          id: e.id, title: e.title || 'Untitled', start: e.start_time, end: e.end_time,
          calendar_name: e.calendar_name || 'Family', calendar_color: e.calendar_color || '#4285f4',
          all_day: e.all_day || false, location: e.location || '', description: e.description || '',
          event_type: e.event_type || '',
        }))
        return NextResponse.json({ events: mapped })
      }

      case 'get_today': {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const rows = await db.query(
          `SELECT id, title, description, start_time, end_time, location, calendar_name, calendar_color, all_day
           FROM family_events WHERE start_time::date = $1 ORDER BY start_time`,
          [today]
        ).catch(() => [])
        return NextResponse.json({ events: rows })
      }

      case 'get_week': {
        const weekStart = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const ws = parseDateLocal(weekStart)
        ws.setDate(ws.getDate() + 6)
        const weekEnd = ws.toLocaleDateString('en-CA')
        const rows = await db.query(
          `SELECT id, title, description, start_time, end_time, location, calendar_name, calendar_color, all_day
           FROM family_events WHERE start_time::date BETWEEN $1 AND $2 ORDER BY start_time`,
          [weekStart, weekEnd]
        ).catch(() => [])
        return NextResponse.json({ events: rows })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Calendar API GET error:', error)
    return NextResponse.json(
      { error: 'Failed to process calendar request' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create_event':
        const { event_data } = body
        
        // First create in our database
        const eventResult = await db.query(`
          INSERT INTO family_events (
            child_id, title, event_type, start_time, end_time,
            captain_id, backup_id, location, contact_info, 
            gear_needed, pharmacy
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `, [
          event_data.child_id,
          event_data.title,
          event_data.event_type,
          event_data.start_time,
          event_data.end_time,
          event_data.captain_id,
          event_data.backup_id,
          event_data.location,
          event_data.contact_info,
          event_data.gear_needed,
          event_data.pharmacy
        ])

        // Then create in Google Calendar
        const calendarEvent = await CalendarService.createFamilyEvent(eventResult[0])
        
        return NextResponse.json({
          database_event: eventResult[0],
          calendar_event: calendarEvent
        })

      case 'request_swap':
        const { event_id, new_captain_id, urgent } = body
        const swapResult = await CalendarService.handleMedicalSwap(
          event_id,
          new_captain_id,
          urgent || false
        )
        return NextResponse.json(swapResult)

      case 'confirm_swap':
        // This would be called when someone confirms a swap in Telegram
        const { family_event_id } = body
        await db.query(`
          UPDATE family_events 
          SET swap_flag = false, updated_at = NOW()
          WHERE id = $1
        `, [family_event_id])
        
        return NextResponse.json({ confirmed: true })

      case 'move_unconfirmed':
        const { calendar_event_id } = body
        const moveResult = await CalendarService.moveUnconfirmedSwap(calendar_event_id)
        return NextResponse.json(moveResult)

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('Calendar API POST error:', error)
    return NextResponse.json(
      { error: `Calendar operation failed: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}