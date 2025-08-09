import Dashboard from '@/components/Dashboard'
import { db } from '@/lib/database'
import { DashboardData } from '@/types'

// Server-side data fetching for faster initial load
async function getDashboardData(): Promise<DashboardData> {
  try {
    const [
      onCallParent,
      waterStatus,
      todaysEvents,
      tokensRemaining,
      todaysRevenue,
      zoneStatus
    ] = await Promise.all([
      db.getTodaysOnCall(),
      db.getWaterStatus(),
      db.getTodaysEvents(),
      db.getTokensToday(),
      db.getTodaysRevenue(),
      db.getZoneStatus()
    ])

    // Calculate weekly and monthly revenue
    const weeklyRevenue = await db.query(`
      SELECT COALESCE(SUM(net_amount), 0) as total
      FROM money_sales 
      WHERE date >= date_trunc('week', CURRENT_DATE)
    `).then(result => Number(result[0]?.total || 0))

    const monthlyRevenue = await db.query(`
      SELECT COALESCE(SUM(net_amount), 0) as total
      FROM money_sales 
      WHERE date >= date_trunc('month', CURRENT_DATE)
    `).then(result => Number(result[0]?.total || 0))

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
    
    // Return safe defaults if database fails
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

export default async function HomePage() {
  const initialData = await getDashboardData()
  
  return <Dashboard initialData={initialData} />
}