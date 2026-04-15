import { redirect } from 'next/navigation'
import ParentPortalWithNav from '@/components/ParentPortalWithNav'
import { db } from '@/lib/database'
import { DashboardData } from '@/types'
import { currentSessionFromCookies } from '@/lib/auth'

// Optimize data fetching with sequential queries to avoid connection pool exhaustion
async function getDashboardData(): Promise<DashboardData> {
  try {
    // Fetch data sequentially to avoid connection pool issues
    const onCallParent = await db.getTodaysOnCall()
    const todaysEvents = await db.getTodaysEvents()
    const todaysRevenue = await db.getTodaysRevenue()
    const zoneStatus = await db.getZoneStatus()

    // Calculate weekly and monthly revenue
    const weeklyRevenue = await db.query(`
      SELECT COALESCE(SUM(net_amount), 0) as total
      FROM money_sales 
      WHERE date >= date_trunc('week', CURRENT_DATE)
    `).then((result: any[]) => Number(result[0]?.total || 0))

    const monthlyRevenue = await db.query(`
      SELECT COALESCE(SUM(net_amount), 0) as total
      FROM money_sales 
      WHERE date >= date_trunc('month', CURRENT_DATE)
    `).then((result: any[]) => Number(result[0]?.total || 0))

    // Find overdue zones
    const overdueZones = zoneStatus.filter((zone: any) => {
      if (!zone.next_due_date) return false
      const dueDate = new Date(zone.next_due_date)
      return dueDate < new Date() && zone.status !== 'completed'
    })

    // Get upcoming pickups (next 4 hours)
    const upcomingPickups = todaysEvents.filter((event: any) => {
      const eventTime = new Date(event.start_time)
      const fourHoursFromNow = new Date(Date.now() + 4 * 60 * 60 * 1000)
      return eventTime <= fourHoursFromNow && eventTime > new Date()
    })

    return {
      onCallParent,
      todaysEvents,
      todaysRevenue,
      weeklyRevenue,
      monthlyRevenue,
      overdueZones,
      upcomingPickups
    }

  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    
    return {
      onCallParent: 'Not Set',
      todaysEvents: [],
      todaysRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0,
      overdueZones: [],
      upcomingPickups: []
    }
  }
}

export default async function DashboardPage() {
  const session = await currentSessionFromCookies()
  if (!session) redirect('/login?next=/dashboard')
  if (session.role !== 'parent') redirect(`/kids/${session.username}`)

  const initialData = await getDashboardData()

  return <ParentPortalWithNav initialData={initialData} />
}