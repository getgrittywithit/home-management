import KidPortal from '@/components/KidPortal'
import { db } from '@/lib/database'
import { notFound } from 'next/navigation'

interface KidPageProps {
  params: {
    childName: string
  }
}

async function getKidData(childName: string) {
  try {
    // Get child profile
    const child = await db.query(`
      SELECT * FROM profiles 
      WHERE LOWER(first_name) = LOWER($1) AND role = 'child'
      LIMIT 1
    `, [childName])

    if (child.length === 0) {
      return null
    }

    const childProfile = child[0]

    // Get today's checklist
    const checklist = await db.query(`
      SELECT * FROM daily_checklist_items
      WHERE child_id = $1 AND date = CURRENT_DATE
      ORDER BY priority ASC, category ASC, title ASC
    `, [childProfile.id])

    // Get today's events
    const events = await db.query(`
      SELECT 
        fe.*,
        captain.first_name as captain_name
      FROM family_events fe
      LEFT JOIN profiles captain ON fe.captain_id = captain.id
      WHERE fe.child_id = $1 
      AND DATE(fe.start_time) = CURRENT_DATE
      ORDER BY fe.start_time ASC
    `, [childProfile.id])

    // Get this week's calendar events  
    const weekEvents = await db.query(`
      SELECT 
        fe.*,
        captain.first_name as captain_name
      FROM family_events fe
      LEFT JOIN profiles captain ON fe.captain_id = captain.id
      WHERE fe.child_id = $1 
      AND fe.start_time >= date_trunc('week', CURRENT_DATE)
      AND fe.start_time < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
      ORDER BY fe.start_time ASC
    `, [childProfile.id])

    // Get zone assignments
    const zones = await db.query(`
      SELECT 
        z.*,
        buddy.first_name as buddy_name
      FROM zones z
      LEFT JOIN profiles buddy ON z.buddy_id = buddy.id
      WHERE z.primary_assignee_id = $1 OR z.buddy_id = $1
      ORDER BY z.cadence ASC, z.name ASC
    `, [childProfile.id])

    // Get ride tokens remaining
    const tokens = await db.query(`
      SELECT * FROM tokens_available_today
      WHERE child_id = $1
    `, [childProfile.id])

    return {
      profile: childProfile,
      todaysChecklist: checklist,
      todaysEvents: events,
      weekEvents: weekEvents,
      zones: zones,
      tokens: tokens[0] || { tokens_remaining: 0 }
    }

  } catch (error) {
    console.error('Error fetching kid data:', error)
    return null
  }
}

export default async function KidPage({ params }: KidPageProps) {
  const kidData = await getKidData(params.childName)
  
  if (!kidData) {
    notFound()
  }

  return <KidPortal kidData={kidData} />
}

// Generate static params for all kids
export async function generateStaticParams() {
  try {
    const children = await db.query(`
      SELECT LOWER(first_name) as name FROM profiles WHERE role = 'child'
    `)
    
    return children.map((child: any) => ({
      childName: child.name
    }))
  } catch {
    return []
  }
}