import { NextRequest, NextResponse } from 'next/server'
import { CalendarService } from '@/lib/google-calendar'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'sync':
        const result = await CalendarService.syncCalendarEvents()
        return NextResponse.json(result)

      case 'check-swaps':
        await CalendarService.checkPendingSwaps()
        return NextResponse.json({ status: 'checked' })

      case 'upcoming':
        const events = await db.getUpcomingEvents(20)
        return NextResponse.json(events)

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
            gear_needed, pharmacy, tokens_used
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
          event_data.pharmacy,
          event_data.tokens_used || 0
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