import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const kidName = searchParams.get('kid_name')

  if (!kidName) {
    return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
  }

  try {
    // Get child profile
    const child = await db.query(
      `SELECT * FROM profiles
       WHERE LOWER(first_name) = LOWER($1) AND role = 'child'
       LIMIT 1`,
      [kidName]
    )

    if (child.length === 0) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 })
    }

    const profile = child[0]

    // Fetch remaining data with graceful fallbacks
    let todaysChecklist: any[] = []
    try {
      todaysChecklist = await db.query(
        `SELECT * FROM daily_checklist_items
         WHERE child_id = $1 AND date = CURRENT_DATE
         ORDER BY priority ASC, category ASC, title ASC`,
        [profile.id]
      )
    } catch { /* table may not exist */ }

    let todaysEvents: any[] = []
    try {
      todaysEvents = await db.query(
        `SELECT fe.*, captain.first_name as captain_name
         FROM family_events fe
         LEFT JOIN profiles captain ON fe.captain_id = captain.id
         WHERE fe.child_id = $1 AND DATE(fe.start_time) = CURRENT_DATE
         ORDER BY fe.start_time ASC`,
        [profile.id]
      )
    } catch { /* table may not exist */ }

    let weekEvents: any[] = []
    try {
      weekEvents = await db.query(
        `SELECT fe.*, captain.first_name as captain_name
         FROM family_events fe
         LEFT JOIN profiles captain ON fe.captain_id = captain.id
         WHERE fe.child_id = $1
         AND fe.start_time >= date_trunc('week', CURRENT_DATE)
         AND fe.start_time < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
         ORDER BY fe.start_time ASC`,
        [profile.id]
      )
    } catch { /* table may not exist */ }

    let zones: any[] = []
    try {
      zones = await db.query(
        `SELECT z.*, buddy.first_name as buddy_name
         FROM zones z
         LEFT JOIN profiles buddy ON z.buddy_id = buddy.id
         WHERE z.primary_assignee_id = $1 OR z.buddy_id = $1
         ORDER BY z.cadence ASC, z.name ASC`,
        [profile.id]
      )
    } catch { /* table may not exist */ }

    return NextResponse.json({
      profile,
      todaysChecklist,
      todaysEvents,
      weekEvents,
      zones,
    })
  } catch (error) {
    console.error('kid-data error:', error)
    return NextResponse.json({ error: 'Failed to load kid data' }, { status: 500 })
  }
}
