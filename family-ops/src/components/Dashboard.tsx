'use client'

import { useEffect, useState } from 'react'
import { 
  Calendar, Clock, Users, Droplets, DollarSign, 
  MapPin, AlertTriangle, CheckCircle, Star, Zap,
  Phone, Car, Home, Utensils
} from 'lucide-react'
import { DashboardData, TokensAvailable, FamilyEvent, Zone } from '@/types'

interface DashboardProps {
  initialData?: DashboardData
}

export default function Dashboard({ initialData }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchDashboardData()
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchDashboardData, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      const dashboardData = await response.json()
      setData(dashboardData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
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
              <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
              <div className="flex items-center mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                System operational
              </div>
            </div>
          </div>
        </header>

        {/* Critical Alerts */}
        {(data.waterStatus.jugs_full <= 2 || data.overdueZones.length > 0) && (
          <div className="mb-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Action Required</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {data.waterStatus.jugs_full <= 2 && (
                      <p>• Low water: Only {data.waterStatus.jugs_full}/6 jugs remaining</p>
                    )}
                    {data.overdueZones.length > 0 && (
                      <p>• {data.overdueZones.length} zones overdue</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

          {/* Water Status */}
          <div className={`rounded-lg p-6 shadow-sm border ${
            data.waterStatus.jugs_full <= 2 ? 'bg-red-50 border-red-200' : 'bg-white'
          }`}>
            <div className="flex items-center">
              <Droplets className={`h-8 w-8 ${
                data.waterStatus.jugs_full <= 2 ? 'text-red-500' : 'text-blue-500'
              }`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Water Jugs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.waterStatus.jugs_full}/6 Full
                </p>
                <p className="text-xs text-gray-500">
                  ~{data.waterStatus.estimated_days_left} days left
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
            {/* Token Status */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  Ride Tokens Left Today
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {data.tokensRemaining.map((child: TokensAvailable) => (
                    <div key={child.child_id} className="flex justify-between items-center">
                      <span className="text-gray-700">{child.first_name}</span>
                      <div className="flex items-center">
                        <span className={`font-semibold ${
                          child.tokens_remaining <= 0 
                            ? 'text-red-600' 
                            : child.tokens_remaining === 1 
                              ? 'text-orange-600' 
                              : 'text-primary-600'
                        }`}>
                          {child.tokens_remaining}
                        </span>
                        {child.tokens_remaining === 0 && (
                          <AlertTriangle className="h-4 w-4 text-red-500 ml-1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Zone Status */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  Zone Status
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {getZonesSummary(data.overdueZones).map((zone, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{zone.name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${zone.statusColor}`}>
                        {zone.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                icon={<Droplets className="h-5 w-5" />}
                label="Update Water Jugs"
                color="blue"
                onClick={() => console.log('Open water jug modal')}
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
        {event.tokens_used > 0 && (
          <div className="text-right">
            <div className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">
              {event.tokens_used} token{event.tokens_used !== 1 ? 's' : ''}
            </div>
          </div>
        )}
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

function getZonesSummary(overdueZones: Zone[]) {
  const zones = [
    { name: 'Kitchen & Dishes', status: 'On Track', statusColor: 'bg-green-100 text-green-800' },
    { name: 'Bathrooms', status: 'Due Today', statusColor: 'bg-yellow-100 text-yellow-800' },
    { name: 'Laundry & Linens', status: 'On Track', statusColor: 'bg-green-100 text-green-800' },
  ]
  
  // Add overdue zones
  overdueZones.forEach(zone => {
    zones.push({
      name: zone.name,
      status: 'Overdue',
      statusColor: 'bg-red-100 text-red-800'
    })
  })
  
  return zones.slice(0, 5) // Show top 5
}