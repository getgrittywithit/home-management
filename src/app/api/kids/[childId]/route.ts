import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { childId: string } }
) {
  try {
    const childId = params.childId

    // Get child profile
    const child = await db.query(`
      SELECT * FROM profiles WHERE id = $1 AND role = 'child'
    `, [childId])

    if (child.length === 0) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    // Get today's checklist
    const checklist = await db.query(`
      SELECT * FROM daily_checklist_items
      WHERE child_id = $1 AND date = CURRENT_DATE
      ORDER BY priority ASC, category ASC
    `, [childId])

    // Get upcoming events
    const events = await db.query(`
      SELECT fe.*, captain.first_name as captain_name
      FROM family_events fe
      LEFT JOIN profiles captain ON fe.captain_id = captain.id
      WHERE fe.child_id = $1 AND fe.start_time >= NOW()
      ORDER BY fe.start_time ASC
      LIMIT 10
    `, [childId])

    // Get tokens remaining
    const tokens = await db.query(`
      SELECT * FROM tokens_available_today WHERE child_id = $1
    `, [childId])

    return NextResponse.json({
      profile: child[0],
      checklist,
      events,
      tokens: tokens[0] || { tokens_remaining: 0 }
    })

  } catch (error) {
    console.error('Error fetching kid data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch kid data' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { childId: string } }
) {
  try {
    const childId = params.childId
    const { action, data } = await request.json()

    switch (action) {
      case 'toggle_task':
        const { taskId } = data
        await db.query(`
          UPDATE daily_checklist_items 
          SET completed = NOT completed,
              completed_at = CASE WHEN NOT completed THEN NOW() ELSE NULL END
          WHERE id = $1 AND child_id = $2
        `, [taskId, childId])
        
        return NextResponse.json({ success: true })

      case 'request_meal':
        const { mealType, description, specialNotes, requestDate } = data
        const mealRequest = await db.query(`
          INSERT INTO meal_requests (child_id, meal_type, request_date, meal_description, special_notes)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [childId, mealType, requestDate, description, specialNotes])
        
        return NextResponse.json({ mealRequest: mealRequest[0] })

      case 'send_note':
        const { subject, message, priority, recipientId } = data
        const note = await db.query(`
          INSERT INTO kid_notes (child_id, recipient_id, subject, message, priority)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [childId, recipientId, subject, message, priority])
        
        return NextResponse.json({ note: note[0] })

      case 'request_event':
        const { 
          title, 
          description, 
          startTime, 
          endTime, 
          location, 
          eventType, 
          requiresRide,
          contactInfo,
          gearNeeded
        } = data
        
        const eventRequest = await db.query(`
          INSERT INTO kid_calendar_requests (
            child_id, title, description, start_time, end_time, 
            location, event_type, requires_ride, contact_info, gear_needed
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          childId, title, description, startTime, endTime,
          location, eventType, requiresRide, contactInfo, gearNeeded
        ])
        
        return NextResponse.json({ eventRequest: eventRequest[0] })

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('Error in kid portal action:', error)
    return NextResponse.json(
      { error: `Action failed: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}