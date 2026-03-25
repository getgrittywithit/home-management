import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { db } from '@/lib/database'

const HOUSEHOLD_CALENDAR_ID = 'family05780461431364461113@group.calendar.google.com'

async function getGoogleCalendarEvents() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })
  const authClient = await auth.getClient()
  const cal = google.calendar({ version: 'v3', auth: authClient as any })

  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  // For countdowns, look further ahead (60 days)
  const farFuture = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  const res = await cal.events.list({
    calendarId: HOUSEHOLD_CALENDAR_ID,
    timeMin: now.toISOString(),
    timeMax: farFuture.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 30,
  })

  const items = res.data.items || []
  const nextWeekISO = nextWeek.toISOString()

  const familyEvents = items
    .filter(e => (e.start?.dateTime || e.start?.date || '') < nextWeekISO)
    .slice(0, 10)
    .map(e => ({
      id: e.id,
      title: e.summary || '',
      start_time: e.start?.dateTime || e.start?.date || '',
      location: e.location || null,
      event_type: null,
    }))

  const countdownEvents = items
    .filter(e => (e.description || '').includes('#countdown'))
    .slice(0, 3)
    .map(e => {
      const startTime = e.start?.dateTime || e.start?.date || ''
      const daysAway = Math.ceil((new Date(startTime).getTime() - now.getTime()) / 86400000)
      return {
        id: e.id,
        countdown_label: e.summary || '',
        start_time: startTime,
        days_away: daysAway,
      }
    })

  return { familyEvents, countdownEvents }
}

// Google Calendar IDs for each kid (ready for live sync)
const CALENDAR_IDS: Record<string, string> = {
  amos: '194038ae67373069d1fb0a464d4e96578ee04a826a8cedd15b3fa6eec529c66b@group.calendar.google.com',
  ellie: '2ccdd50c3ca89f4a29b5a61c5278cc8db92e658a18766f22d96d8f79d0b34182@group.calendar.google.com',
  wyatt: '9a7bcfe49dc3a83681e5ac0bcc353609c613a4970ad53d862bbf89173e484416@group.calendar.google.com',
  hannah: '09d3ea1464f2ffaca318a1370e2c840dd4ba5bc5fd79a50b55fdc6e7b40048cf@group.calendar.google.com',
  zoey: '95dbf776e9b0639c1790fe48f2dd28fdfe7d1c249d2a2a2f4973ae898c1c4325@group.calendar.google.com',
  kaylee: 'd9ad804eca1b633a86f15bb5c67001f9d8f3328ffcb8bee7a5f3d239567ea2cb@group.calendar.google.com',
}

// Homeschool daily template (used until live Google Calendar sync is added)
const HOMESCHOOL_TEMPLATE = [
  { id: 'hs-01', time: '06:30', endTime: '08:00', summary: '☀️ Morning Routine', category: 'routine' },
  { id: 'hs-02', time: '08:00', endTime: '09:00', summary: '🧹 Morning Zone Chores + Breakfast Dishes', category: 'chores' },
  { id: 'hs-03', time: '09:00', endTime: '09:45', summary: '📚 Math Time', category: 'school' },
  { id: 'hs-04', time: '09:45', endTime: '10:00', summary: '🧠 Brain Break', category: 'break' },
  { id: 'hs-05', time: '10:00', endTime: '10:20', summary: '📖 Independent Reading', category: 'school' },
  { id: 'hs-06', time: '10:20', endTime: '10:45', summary: '✏️ ELAR / Writing', category: 'school' },
  { id: 'hs-07', time: '10:45', endTime: '11:00', summary: '🍎 Brain Break + Snack', category: 'break' },
  { id: 'hs-08', time: '11:00', endTime: '11:45', summary: '🔬 Science / Social Studies + Zone Checklist', category: 'school' },
  { id: 'hs-09', time: '11:45', endTime: '12:15', summary: '🎨 Creative Building & Art', category: 'creative' },
  { id: 'hs-10', time: '12:15', endTime: '12:45', summary: '🍔 Lunch', category: 'break' },
  { id: 'hs-11', time: '12:45', endTime: '13:45', summary: '🙏 Quiet Time', category: 'break' },
  { id: 'hs-12', time: '13:45', endTime: '14:00', summary: '📖 Group Reading', category: 'school' },
  { id: 'hs-13', time: '14:00', endTime: '14:30', summary: '🧹 School Room Group Clean', category: 'chores' },
  { id: 'hs-14', time: '14:30', endTime: '15:00', summary: '🌳 Outdoor / Park Time', category: 'creative' },
  { id: 'hs-15', time: '15:00', endTime: '15:30', summary: '🧹 Afternoon Zone Chores', category: 'chores' },
  { id: 'hs-16', time: '15:30', endTime: '17:30', summary: '🎮 Free Time', category: 'creative' },
  { id: 'hs-17', time: '17:30', endTime: '18:00', summary: '🍽️ Dinner', category: 'break' },
  { id: 'hs-18', time: '18:00', endTime: '18:30', summary: '🧹 Evening Tidy & Reset', category: 'chores' },
  { id: 'hs-19', time: '18:30', endTime: '20:30', summary: '💚 Family Time', category: 'creative' },
  { id: 'hs-20', time: '20:30', endTime: '21:00', summary: '🌙 Bedtime Routine', category: 'routine' },
]

// Public school kids get a simpler template
const PUBLIC_SCHOOL_TEMPLATE = [
  { id: 'ps-01', time: '06:00', endTime: '07:00', summary: '☀️ Morning Routine', category: 'routine' },
  { id: 'ps-02', time: '07:00', endTime: '07:30', summary: '🍽️ Breakfast + Pack Lunch', category: 'break' },
  { id: 'ps-03', time: '07:30', endTime: '15:30', summary: '📚 School Day', category: 'school' },
  { id: 'ps-04', time: '15:30', endTime: '16:00', summary: '🧹 Afternoon Zone Chores', category: 'chores' },
  { id: 'ps-05', time: '16:00', endTime: '17:00', summary: '📖 Homework / Reading', category: 'school' },
  { id: 'ps-06', time: '17:00', endTime: '17:30', summary: '🎮 Free Time', category: 'creative' },
  { id: 'ps-07', time: '17:30', endTime: '18:00', summary: '🍽️ Dinner', category: 'break' },
  { id: 'ps-08', time: '18:00', endTime: '18:30', summary: '🧹 Evening Tidy & Reset', category: 'chores' },
  { id: 'ps-09', time: '18:30', endTime: '20:30', summary: '💚 Family Time', category: 'creative' },
  { id: 'ps-10', time: '20:30', endTime: '21:00', summary: '🌙 Bedtime Routine', category: 'routine' },
]

const HOMESCHOOL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah']

function getTemplateForKid(childKey: string) {
  return HOMESCHOOL_KIDS.includes(childKey) ? HOMESCHOOL_TEMPLATE : PUBLIC_SCHOOL_TEMPLATE
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const child = searchParams.get('child')?.toLowerCase()

    // Home extras: family events from Google Calendar, countdowns, availability
    if (action === 'get_home_extras') {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      const [calData, availRes] = await Promise.all([
        getGoogleCalendarEvents().catch(() => ({ familyEvents: [], countdownEvents: [] })),
        db.query(
          `SELECT status, note FROM parent_availability WHERE parent_name = 'lola' AND status_date = $1`,
          [today]
        ).catch(() => []),
      ])

      return NextResponse.json({
        familyEvents: calData.familyEvents,
        countdownEvents: calData.countdownEvents,
        lolaStatus: (availRes as any[])[0] || { status: 'available', note: null },
      })
    }

    if (action === 'get_tonights_dinner') {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const DINNER_MANAGER: Record<number, string[]> = {
        0: ['Levi'], 1: ['Kaylee'], 2: ['Zoey'], 3: ['Wyatt'], 4: ['Amos'], 5: ['Ellie', 'Hannah'], 6: ['Lola'],
      }
      const dow = new Date(today + 'T12:00:00').getDay()
      const managers = DINNER_MANAGER[dow] || []
      try {
        const rows = await db.query(
          `SELECT dish_name FROM meal_plans WHERE date = $1 AND meal_type = 'dinner' LIMIT 1`,
          [today]
        )
        return NextResponse.json({
          dinner: rows[0]?.dish_name || null,
          dinnerManager: managers.join(' & '),
        })
      } catch {
        return NextResponse.json({ dinner: null, dinnerManager: managers.join(' & ') })
      }
    }

    if (!child) {
      return NextResponse.json({ error: 'child query param required' }, { status: 400 })
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const template = getTemplateForKid(child)

    // Fetch checklist completions for today
    const completions = await db.query(
      `SELECT event_id, completed, completed_at FROM kid_daily_checklist
       WHERE child_name = $1 AND event_date = $2`,
      [child, today]
    )

    const completionMap: Record<string, { completed: boolean; completed_at: string | null }> = {}
    completions.forEach((row: any) => {
      completionMap[row.event_id] = { completed: row.completed, completed_at: row.completed_at }
    })

    // Build events with completion status
    const events = template.map(block => ({
      id: block.id,
      summary: block.summary,
      startTime: `${today}T${block.time}:00`,
      endTime: `${today}T${block.endTime}:00`,
      category: block.category,
      completed: completionMap[block.id]?.completed || false,
      completedAt: completionMap[block.id]?.completed_at || null,
    }))

    // Calculate stats
    const totalEvents = events.length
    const completedEvents = events.filter(e => e.completed).length
    const now = new Date()
    const chicagoNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const twoHoursLater = new Date(chicagoNow.getTime() + 2 * 60 * 60 * 1000)
    const dueSoon = events.filter(e => {
      const start = new Date(e.startTime)
      return !e.completed && start >= chicagoNow && start <= twoHoursLater
    }).length

    // Zone info — for now return null, will be parsed from Google Calendar later
    const zoneInfo = null

    return NextResponse.json({
      childName: child,
      calendarId: CALENDAR_IDS[child] || null,
      date: today,
      zoneInfo,
      events,
      stats: { totalEvents, completedEvents, dueSoon }
    })
  } catch (error) {
    console.error('Kid dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, child, eventId, eventSummary, eventStartTime } = await request.json()

    if (action !== 'toggle_checklist') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const childKey = child?.toLowerCase()
    if (!childKey || !eventId) {
      return NextResponse.json({ error: 'child and eventId required' }, { status: 400 })
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    // Check current state
    const existing = await db.query(
      `SELECT completed FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2 AND event_id = $3`,
      [childKey, today, eventId]
    )

    const newCompleted = existing.length > 0 ? !existing[0].completed : true

    await db.query(
      `INSERT INTO kid_daily_checklist (child_name, event_date, event_id, event_summary, event_start_time, completed, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (child_name, event_date, event_id)
       DO UPDATE SET completed = $6, completed_at = $7`,
      [childKey, today, eventId, eventSummary || '', eventStartTime || null, newCompleted, newCompleted ? new Date().toISOString() : null]
    )

    return NextResponse.json({ success: true, completed: newCompleted })
  } catch (error) {
    console.error('Kid dashboard POST error:', error)
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 })
  }
}
