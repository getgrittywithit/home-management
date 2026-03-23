import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { DashboardData } from '@/types'

export async function GET() {
  try {
    // Try to fetch from database, but provide mock data if it fails
    let dashboardData: DashboardData
    
    try {
      // Attempt database queries
      const [
        onCallParent,
        todaysEvents,
        todaysRevenue,
        zoneStatus
      ] = await Promise.all([
        db.getTodaysOnCall(),
        db.getTodaysEvents(),
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

      dashboardData = {
        onCallParent,
        todaysEvents,
        todaysRevenue,
        weeklyRevenue,
        monthlyRevenue,
        overdueZones,
        upcomingPickups
      }
    } catch (dbError) {
      console.error('Database error, using mock data:', dbError)
      
      // Provide mock data when database is unavailable
      dashboardData = {
        onCallParent: 'Levi',
        todaysEvents: [],
        todaysRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        overdueZones: [],
        upcomingPickups: []
      }
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Dashboard API error:', error)
    
    // Always return valid data structure
    return NextResponse.json({
      onCallParent: 'System Starting',
      todaysEvents: [],
      todaysRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0,
      overdueZones: [],
      upcomingPickups: []
    })
  }
}

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json()

    switch (action) {
      case 'set_on_call':
        const { date, parent_id } = data
        await db.setOnCall(date, parent_id)
        return NextResponse.json({ success: true })

      case 'log_sale':
        const { channel, product, gross_amount, fees } = data
        await db.logSale(channel, product, gross_amount, fees || 0)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Dashboard POST error:', error)
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    )
  }
}