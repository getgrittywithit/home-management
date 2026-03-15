import Dashboard from '@/components/Dashboard'
import { db } from '@/lib/database'
import { DashboardData } from '@/types'

// Optimize data fetching with sequential queries to avoid connection pool exhaustion
async function getDashboardData(): Promise<DashboardData> {
  try {
    // Fetch data sequentially to avoid connection pool issues
    const onCallParent = await db.getTodaysOnCall()
    const waterStatus = await db.getWaterStatus()
    const todaysEvents = await db.getTodaysEvents()
    const tokensRemaining = await db.getTokensToday()
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
      waterStatus,
      todaysEvents,
      tokensRemaining,
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
      waterStatus: { jugs_full: 0, jugs_empty: 0, jugs_in_use: 0, estimated_days_left: 0 },
      todaysEvents: [],
      tokensRemaining: [],
      todaysRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0,
      overdueZones: [],
      upcomingPickups: []
    }
  }
}

export default async function DashboardPage() {
  const initialData = await getDashboardData()
  
  return <Dashboard initialData={initialData} />
}