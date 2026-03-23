'use client'

import { useEffect, useState } from 'react'
import {
  Calendar, Clock, Users, DollarSign,
  MapPin, CheckCircle, Zap,
  Phone, Home, Utensils, Shirt, Dog
} from 'lucide-react'
import { DashboardData, FamilyEvent, Zone } from '@/types'
import { getCurrentZoneAssignments, getCurrentZoneWeek, getCurrentZoneWeekRange } from '@/lib/zoneRotation'

interface DashboardProps {
  initialData?: DashboardData
}

export default function Dashboard({ initialData }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      fetchDashboardData()
      
      // Refresh every 2 minutes
      const interval = setInterval(fetchDashboardData, 2 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [isClient])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const dashboardData = await response.json()
      
      // Provide fallback data structure if API returns incomplete data
      const safeDashboardData: DashboardData = {
        onCallParent: dashboardData.onCallParent || 'System Loading',
        todaysEvents: dashboardData.todaysEvents || [],
        todaysRevenue: dashboardData.todaysRevenue || 0,
        weeklyRevenue: dashboardData.weeklyRevenue || 0,
        monthlyRevenue: dashboardData.monthlyRevenue || 0,
        overdueZones: dashboardData.overdueZones || [],
        upcomingPickups: dashboardData.upcomingPickups || []
      }
      
      setData(safeDashboardData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      
      // Set fallback data instead of leaving it null
      setData({
        onCallParent: 'System Loading',
        todaysEvents: [],
        todaysRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        overdueZones: [],
        upcomingPickups: []
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Family Ops Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p className="text-red-600">Failed to load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Family Ops Dashboard 🏠
              </h1>
              <p className="text-gray-600">
                Greenhouse Playbook - Managing 2 adults + 6 kids with systems that work
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Last updated: {isClient ? lastUpdated.toLocaleTimeString() : 'Loading...'}</p>
              <div className="flex items-center mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                System operational
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* On-Call Parent */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">On-Call Today</p>
                <p className="text-2xl font-bold text-gray-900">{data.onCallParent}</p>
                <p className="text-xs text-gray-500">
                  {getCurrentDayRotation()}
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Tracking */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today / Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${data.todaysRevenue} / ${data.weeklyRevenue}
                </p>
                <p className="text-xs text-gray-500">Plant business</p>
              </div>
            </div>
          </div>

          {/* Pickup Windows */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pickup Windows</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getNextPickupWindow()}
                </p>
                <p className="text-xs text-gray-500">Every hour</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Today's Schedule
                  {data.upcomingPickups.length > 0 && (
                    <span className="ml-2 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      {data.upcomingPickups.length} pickup{data.upcomingPickups.length !== 1 ? 's' : ''} soon
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-6">
                {data.todaysEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No events scheduled for today. Ready for anything! 🎯
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.todaysEvents.map((event: FamilyEvent) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Zone Rotation */}
            <ZoneRotationCard />
            {/* Today's Duties */}
            <TodaysDutiesCard />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Commands
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickActionButton
                icon={<Zap className="h-5 w-5" />}
                label="Post Greenlight"
                color="primary"
                onClick={() => console.log('Open greenlight modal')}
              />
              <QuickActionButton
                icon={<DollarSign className="h-5 w-5" />}
                label="Log Revenue"
                color="green"
                onClick={() => console.log('Open revenue modal')}
              />
              <QuickActionButton
                icon={<Home className="h-5 w-5" />}
                label="Check Zones"
                color="orange"
                onClick={() => console.log('Open zones modal')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Fixed weekly schedules (do not rotate)
const DINNER_MANAGER: Record<number, string> = {
  0: 'Levi',             // Sunday
  1: 'Kaylee',           // Monday
  2: 'Zoey',             // Tuesday
  3: 'Wyatt',            // Wednesday
  4: 'Amos',             // Thursday
  5: 'Ellie & Hannah',   // Friday
  6: 'Lola',             // Saturday
}

const LAUNDRY_SCHEDULE: Record<number, { who: string; note: string }> = {
  0: { who: 'Wyatt',                    note: 'towels + overflow' },
  1: { who: 'Levi',                     note: 'work clothes' },
  2: { who: 'Lola',                     note: 'personal + sheets' },
  3: { who: 'Ellie, Hannah & Kaylee',   note: '' },
  4: { who: 'Amos',                     note: '' },
  5: { who: 'Ellie, Hannah & Kaylee',   note: '' },
  6: { who: 'Zoey',                     note: 'bedding day' },
}

const BELLE_CARE: Record<number, { who: string; note: string }> = {
  0: { who: 'Amos',    note: 'AM + PM' },
  1: { who: 'Kaylee',  note: 'AM + PM' },
  2: { who: 'Amos',    note: 'AM only' },
  3: { who: 'Hannah',  note: 'AM + PM' },
  4: { who: 'Wyatt',   note: 'AM + PM' },
  5: { who: 'Ellie',   note: 'AM + PM' },
  6: { who: 'Kaylee',  note: 'weekend' },
}

const DISHES_SCHEDULE = {
  breakfast: 'Amos & Wyatt',
  lunch: 'Ellie & Hannah',
  dinner: 'Zoey & Kaylee',
}

function TodaysDutiesCard() {
  const day = new Date().getDay()
  const dinner = DINNER_MANAGER[day]
  const laundry = LAUNDRY_SCHEDULE[day]
  const belle = BELLE_CARE[day]

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">
          Today's Duties
        </h2>
      </div>
      <div className="p-6 space-y-4">
        {/* Dinner Manager */}
        <div className="flex items-start gap-3">
          <Utensils className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dinner Manager</p>
            <p className="text-sm font-semibold text-gray-900">{dinner}</p>
          </div>
        </div>

        {/* Laundry */}
        <div className="flex items-start gap-3">
          <Shirt className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Laundry</p>
            <p className="text-sm font-semibold text-gray-900">{laundry.who}</p>
            {laundry.note && (
              <p className="text-xs text-gray-500">{laundry.note}</p>
            )}
          </div>
        </div>

        {/* Belle Care */}
        <div className="flex items-start gap-3">
          <Dog className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Belle Care</p>
            <p className="text-sm font-semibold text-gray-900">{belle.who}</p>
            <p className="text-xs text-gray-500">{belle.note}</p>
          </div>
        </div>

        {/* Dishes */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Dishes & Cleanup</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Breakfast</span>
              <span className="font-medium text-gray-900">{DISHES_SCHEDULE.breakfast}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lunch</span>
              <span className="font-medium text-gray-900">{DISHES_SCHEDULE.lunch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Dinner</span>
              <span className="font-medium text-gray-900">{DISHES_SCHEDULE.dinner}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper Components
function EventCard({ event }: { event: FamilyEvent }) {
  const startTime = new Date(event.start_time)
  const isUpcoming = startTime.getTime() - Date.now() < 4 * 60 * 60 * 1000 // Next 4 hours
  
  return (
    <div className={`p-4 rounded-lg border ${
      isUpcoming ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <h3 className="font-medium text-gray-900">{event.title}</h3>
            {event.swap_flag && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                SWAP PENDING
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {event.captain_name && (
                <>
                  <span className="mx-2">•</span>
                  <Users className="h-4 w-4 mr-1" />
                  <span>Captain: {event.captain_name}</span>
                </>
              )}
            </div>
            {event.location && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{event.location}</span>
              </div>
            )}
            {event.contact_info && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                <span>{event.contact_info}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickActionButton({ 
  icon, 
  label, 
  color, 
  onClick 
}: { 
  icon: React.ReactNode
  label: string
  color: 'primary' | 'blue' | 'green' | 'orange'
  onClick: () => void
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 text-green-700 hover:bg-green-100',
    orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100'
  }

  return (
    <button 
      className={`p-4 rounded-lg font-medium transition-colors flex flex-col items-center space-y-2 ${colorClasses[color]}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  )
}

// Helper functions
function getCurrentDayRotation() {
  const day = new Date().getDay()
  const rotations = {
    1: 'Mon: Lola', // Monday
    2: 'Tue: Levi', // Tuesday
    3: 'Wed: Lola', // Wednesday
    4: 'Thu: Levi', // Thursday
    5: 'Fri: Levi', // Friday
    6: 'Sat: Alt',  // Saturday
    0: 'Sun: Alt'   // Sunday
  }
  return rotations[day as keyof typeof rotations] || 'Check schedule'
}

function getNextPickupWindow() {
  const now = new Date()
  const minutes = now.getMinutes()
  
  if (minutes < 15) return ':15'
  if (minutes < 45) return ':45'
  return `${now.getHours() + 1}:15`
}

function ZoneRotationCard() {
  const assignments = getCurrentZoneAssignments()
  const zoneWeek = getCurrentZoneWeek()
  const { start, end } = getCurrentZoneWeekRange()

  const formatShortDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const zoneColors: Record<string, string> = {
    'Kitchen': 'bg-amber-100 text-amber-800',
    'Hotspot': 'bg-red-100 text-red-800',
    'Guest Bathroom': 'bg-indigo-100 text-indigo-800',
    'Kids Bathroom': 'bg-purple-100 text-purple-800',
    'Pantry': 'bg-emerald-100 text-emerald-800',
    'Floors': 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">
          Zone Rotation
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Week {zoneWeek} of 6 &middot; {formatShortDate(start)} – {formatShortDate(end)}
        </p>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {assignments.map(({ kid, zone }) => (
            <div key={kid} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">{kid}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${zoneColors[zone] || 'bg-gray-100 text-gray-800'}`}>
                {zone}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}