import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// =============================================================================
// GET /api/calendar-hub?action=xxx
// =============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (!action) {
    return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 })
  }

  switch (action) {
    // ── Calendar connections (active calendars) ──
    case 'get_calendar_connections': {
      try {
        // Try real table first, fallback to deriving from cache
        let connections: any[] = []
        try {
          connections = await db.query(
            `SELECT * FROM calendar_connections WHERE is_active = true ORDER BY sort_order`
          )
        } catch {
          // Derive from calendar_events_cache if table doesn't exist
          connections = await db.query(
            `SELECT DISTINCT calendar_name as name, calendar_id,
                    calendar_name as display_name,
                    true as is_active,
                    'google' as source,
                    0 as sort_order
             FROM calendar_events_cache
             ORDER BY calendar_name`
          )
        }
        return NextResponse.json({ connections })
      } catch (error) {
        console.error('get_calendar_connections error:', error)
        return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
      }
    }

    // ── Events within a date range (merged with app data) ──
    case 'get_calendar_events': {
      const start = searchParams.get('start')
      const end = searchParams.get('end')
      if (!start || !end) {
        return NextResponse.json({ error: 'Missing start/end parameters' }, { status: 400 })
      }

      try {
        // 1) Google Calendar cached events
        const cachedEvents = await db.query(
          `SELECT id, title, start_time, end_time, all_day,
                  calendar_name, calendar_id, location, description,
                  'google' as source
           FROM calendar_events_cache
           WHERE start_time >= $1::date AND start_time < ($2::date + INTERVAL '1 day')
           ORDER BY start_time ASC`,
          [start, end]
        )

        // 2) Meal plans as events
        let mealEvents: any[] = []
        try {
          const meals = await db.query(
            `SELECT id, date, meal_type, title, description
             FROM meal_plans
             WHERE date >= $1 AND date <= $2
             ORDER BY date`,
            [start, end]
          )
          mealEvents = meals.map((m: any) => ({
            id: `meal-${m.id}`,
            title: m.title || `${m.meal_type}`,
            start_time: `${m.date}T${m.meal_type === 'breakfast' ? '08:00' : m.meal_type === 'lunch' ? '12:00' : '18:00'}:00`,
            end_time: `${m.date}T${m.meal_type === 'breakfast' ? '08:30' : m.meal_type === 'lunch' ? '12:30' : '18:30'}:00`,
            all_day: false,
            calendar_name: 'Meal Plan',
            calendar_id: null,
            location: null,
            description: m.description,
            source: 'meals',
          }))
        } catch (e) { console.error('meal merge error:', e) }

        // 3) Student plan meetings within range
        let meetingEvents: any[] = []
        try {
          const meetings = await db.query(
            `SELECT id, kid_name, plan_type, next_meeting_date, next_meeting_time, next_meeting_location
             FROM student_plans
             WHERE next_meeting_date IS NOT NULL
               AND next_meeting_date >= $1 AND next_meeting_date <= $2`,
            [start, end]
          )
          meetingEvents = meetings.map((m: any) => ({
            id: `meeting-${m.id}`,
            title: `${m.kid_name} ${m.plan_type} Meeting`,
            start_time: m.next_meeting_time
              ? `${m.next_meeting_date}T${m.next_meeting_time}`
              : `${m.next_meeting_date}T10:00:00`,
            end_time: m.next_meeting_time
              ? `${m.next_meeting_date}T${m.next_meeting_time.slice(0, 2)}:59:00`
              : `${m.next_meeting_date}T11:00:00`,
            all_day: !m.next_meeting_time,
            calendar_name: 'School',
            calendar_id: null,
            location: m.next_meeting_location,
            description: `${m.plan_type} meeting for ${m.kid_name}`,
            source: 'school',
          }))
        } catch (e) { console.error('meeting merge error:', e) }

        // 4) Active health episodes
        let healthEvents: any[] = []
        try {
          const episodes = await db.query(
            `SELECT id, title, category, start_date, resolved_date, status
             FROM health_episodes
             WHERE status = 'active'
               AND start_date <= $2
               AND (resolved_date IS NULL OR resolved_date >= $1)`,
            [start, end]
          )
          healthEvents = episodes.map((ep: any) => ({
            id: `health-${ep.id}`,
            title: `[Health] ${ep.title}`,
            start_time: `${ep.start_date}T00:00:00`,
            end_time: ep.resolved_date ? `${ep.resolved_date}T23:59:59` : `${end}T23:59:59`,
            all_day: true,
            calendar_name: 'Health',
            calendar_id: null,
            location: null,
            description: `Active ${ep.category} episode`,
            source: 'health',
          }))
        } catch (e) { console.error('health merge error:', e) }

        // 5) Overdue vitals
        let vitalsEvents: any[] = []
        try {
          const overdue = await db.query(
            `SELECT id, member_name, vital_type, frequency_days, last_logged_at
             FROM health_vitals_schedule
             WHERE active = true
               AND last_logged_at + (frequency_days || ' days')::INTERVAL < NOW()`
          )
          const today = new Date().toISOString().split('T')[0]
          vitalsEvents = overdue
            .filter((v: any) => today >= start && today <= end)
            .map((v: any) => ({
              id: `vital-${v.id}`,
              title: `Overdue: ${v.member_name} ${v.vital_type}`,
              start_time: `${today}T09:00:00`,
              end_time: `${today}T09:30:00`,
              all_day: false,
              calendar_name: 'Health',
              calendar_id: null,
              location: null,
              description: `${v.vital_type} check for ${v.member_name} is overdue (every ${v.frequency_days} days)`,
              source: 'health',
            }))
        } catch (e) { console.error('vitals merge error:', e) }

        const allEvents = [...cachedEvents, ...mealEvents, ...meetingEvents, ...healthEvents, ...vitalsEvents]
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

        return NextResponse.json({ events: allEvents })
      } catch (error) {
        console.error('get_calendar_events error:', error)
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
      }
    }

    // ── Today's events (shortcut) ──
    case 'get_today_events': {
      const today = new Date().toISOString().split('T')[0]
      // Redirect to the range query for today
      const url = new URL(request.url)
      url.searchParams.set('action', 'get_calendar_events')
      url.searchParams.set('start', today)
      url.searchParams.set('end', today)
      // Re-call ourselves with modified params
      const todayRequest = new NextRequest(url.toString(), { headers: request.headers })
      return GET(todayRequest)
    }

    // ── Agenda: merged stream grouped by day, N days ahead ──
    case 'get_agenda': {
      const daysAhead = parseInt(searchParams.get('days_ahead') || '60')
      const today = new Date()
      const start = today.toISOString().split('T')[0]
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + daysAhead)
      const end = endDate.toISOString().split('T')[0]

      // Re-use the get_calendar_events logic
      const url = new URL(request.url)
      url.searchParams.set('action', 'get_calendar_events')
      url.searchParams.set('start', start)
      url.searchParams.set('end', end)
      const agendaRequest = new NextRequest(url.toString(), { headers: request.headers })
      const response = await GET(agendaRequest)
      const data = await response.json()

      // Group by day
      const grouped: Record<string, any[]> = {}
      for (const event of (data.events || [])) {
        const day = event.start_time.split('T')[0]
        if (!grouped[day]) grouped[day] = []
        grouped[day].push(event)
      }

      const agenda = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, events]) => ({ date, events }))

      return NextResponse.json({ agenda })
    }

    // ── Calendar preferences for a member ──
    case 'get_calendar_preferences': {
      const memberName = searchParams.get('member_name') || 'default'
      try {
        let prefs: any[] = []
        try {
          prefs = await db.query(
            `SELECT * FROM calendar_view_preferences WHERE member_name = $1`,
            [memberName]
          )
        } catch {
          // Table may not exist yet
        }
        return NextResponse.json({
          preferences: prefs[0] || {
            member_name: memberName,
            default_view: 'week',
            visible_calendars: [],
            quick_filter: 'all',
          }
        })
      } catch (error) {
        console.error('get_calendar_preferences error:', error)
        return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}

// =============================================================================
// POST /api/calendar-hub
// =============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      // ── Sync placeholder ──
      case 'sync_calendar': {
        const { calendar_id } = body
        if (!calendar_id) {
          return NextResponse.json({ error: 'Missing calendar_id' }, { status: 400 })
        }
        try {
          await db.query(
            `UPDATE calendar_connections SET last_synced_at = NOW() WHERE calendar_id = $1`,
            [calendar_id]
          )
        } catch {
          // Table may not exist
        }
        return NextResponse.json({ status: 'synced', calendar_id, synced_at: new Date().toISOString() })
      }

      // ── Update preferences ──
      case 'update_calendar_preferences': {
        const { member_name, default_view, visible_calendars, quick_filter } = body
        try {
          try {
            await db.query(
              `INSERT INTO calendar_view_preferences (member_name, default_view, visible_calendars, quick_filter)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (member_name) DO UPDATE SET
                 default_view = EXCLUDED.default_view,
                 visible_calendars = EXCLUDED.visible_calendars,
                 quick_filter = EXCLUDED.quick_filter,
                 updated_at = NOW()`,
              [member_name || 'default', default_view || 'week', JSON.stringify(visible_calendars || []), quick_filter || 'all']
            )
          } catch {
            // Table may not exist, store in family_config as fallback
            await db.setConfig(`calendar_prefs_${member_name || 'default'}`, JSON.stringify({
              default_view, visible_calendars, quick_filter
            }))
          }
          return NextResponse.json({ status: 'saved' })
        } catch (error) {
          console.error('update_calendar_preferences error:', error)
          return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
        }
      }

      // ── Create local event ──
      case 'create_event': {
        const { title, start_time, end_time, all_day, calendar_name, location, description } = body
        if (!title || !start_time) {
          return NextResponse.json({ error: 'Missing title or start_time' }, { status: 400 })
        }
        try {
          const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const rows = await db.query(
            `INSERT INTO calendar_events_cache (id, title, start_time, end_time, all_day, calendar_name, location, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
              id,
              title,
              start_time,
              end_time || start_time,
              all_day || false,
              calendar_name || 'Household Hub',
              location || null,
              description || null,
            ]
          )
          return NextResponse.json({ event: rows[0] })
        } catch (error) {
          console.error('create_event error:', error)
          return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
        }
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('calendar-hub POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
