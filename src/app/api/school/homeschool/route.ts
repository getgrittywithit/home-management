import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// Template daily schedule — same rhythm for all 4 homeschool kids
const DAILY_SCHEDULE = [
  { time: '06:30', duration: 90, summary: 'Morning Routine', category: 'routine' },
  { time: '08:00', duration: 60, summary: 'Morning Zone Chores + Breakfast Dishes', category: 'chores' },
  { time: '09:00', duration: 45, summary: 'Math Time', category: 'academics' },
  { time: '09:45', duration: 15, summary: 'Brain Break', category: 'break' },
  { time: '10:00', duration: 20, summary: 'Independent Reading', category: 'academics' },
  { time: '10:20', duration: 25, summary: 'ELAR / Writing', category: 'academics' },
  { time: '10:45', duration: 15, summary: 'Brain Break + Snack', category: 'break' },
  { time: '11:00', duration: 45, summary: 'Science / Social Studies + Zone Daily Checklist', category: 'academics' },
  { time: '11:45', duration: 30, summary: 'Creative Building & Art', category: 'enrichment' },
  { time: '12:15', duration: 30, summary: 'Lunch', category: 'routine' },
  { time: '12:45', duration: 60, summary: 'Quiet Time', category: 'break' },
  { time: '13:45', duration: 15, summary: 'Group Reading', category: 'academics' },
  { time: '14:00', duration: 30, summary: 'School Room Group Clean', category: 'chores' },
  { time: '14:30', duration: 30, summary: 'Outdoor / Park Time', category: 'enrichment' },
  { time: '15:00', duration: 30, summary: 'Afternoon Zone Chores', category: 'chores' },
  { time: '15:30', duration: 120, summary: 'Free Time', category: 'break' },
  { time: '17:30', duration: 30, summary: 'Dinner', category: 'routine' },
  { time: '18:00', duration: 30, summary: 'Evening Tidy & Reset', category: 'chores' },
  { time: '18:30', duration: 120, summary: 'Family Time', category: 'routine' },
  { time: '20:30', duration: 30, summary: 'Bedtime Routine', category: 'routine' },
]

const HOMESCHOOL_KIDS = ['Amos', 'Ellie', 'Wyatt', 'Hannah']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const date = dateParam || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    // Fetch checklist completion status for all homeschool kids for this date
    const completions = await db.query(
      `SELECT child_name, event_summary, completed, completed_at
       FROM homeschool_checklist
       WHERE checklist_date = $1 AND child_name = ANY($2)`,
      [date, HOMESCHOOL_KIDS]
    )

    // Build completion map: { "Amos|Math Time": true }
    const completionMap: Record<string, boolean> = {}
    completions.forEach((row: any) => {
      completionMap[`${row.child_name}|${row.event_summary}`] = row.completed
    })

    return NextResponse.json({
      date,
      schedule: DAILY_SCHEDULE,
      kids: HOMESCHOOL_KIDS,
      completions: completionMap
    })
  } catch (error) {
    console.error('Homeschool API error:', error)
    return NextResponse.json({ error: 'Failed to load homeschool data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    switch (action) {
      case 'toggle_checklist_item': {
        const { child_name, event_summary, date, completed } = data
        await db.query(
          `INSERT INTO homeschool_checklist (child_name, checklist_date, event_summary, completed, completed_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (child_name, checklist_date, event_summary)
           DO UPDATE SET completed = $4, completed_at = $5`,
          [child_name, date, event_summary, completed, completed ? new Date().toISOString() : null]
        )
        return NextResponse.json({ success: true })
      }

      case 'reset_daily_checklist': {
        const { date: resetDate } = data
        await db.query(
          `DELETE FROM homeschool_checklist WHERE checklist_date = $1 AND child_name = ANY($2)`,
          [resetDate, HOMESCHOOL_KIDS]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Homeschool API error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
