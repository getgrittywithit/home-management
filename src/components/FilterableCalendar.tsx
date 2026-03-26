'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
  Calendar, ChevronLeft, ChevronRight, Filter, Eye, EyeOff,
  BookOpen, ClipboardList, Users, Star, Clock, MapPin
} from 'lucide-react'
import { EVENT_CATEGORIES } from '@/lib/enhancedSchoolConfig'

interface FilterableCalendarProps {
  // Can be extended to accept different children's data
  selectedChild?: string
}

interface CalendarEvent {
  id: string
  title: string
  type: 'school' | 'chores' | 'family' | 'personal'
  date: Date
  startTime?: string
  endTime?: string
  allDay: boolean
  location?: string
  description?: string
  color: string
  icon: string
}

export default function FilterableCalendar({ selectedChild = 'amos-moses-504640' }: FilterableCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')
  const [activeFilters, setActiveFilters] = useState({
    school: true,
    chores: true,
    family: true,
    personal: true
  })

  // Fetch events from Household Hub Google Calendar
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    fetch('/api/kids/dashboard?action=get_home_extras')
      .then(r => r.json())
      .then(data => {
        const gcalEvents = (data.familyEvents || []).map((e: any) => ({
          id: e.id || String(Math.random()),
          title: e.title || 'Untitled',
          type: 'family' as const,
          date: new Date(e.start_time || e.start || ''),
          startTime: e.start_time?.includes('T') ? new Date(e.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined,
          endTime: undefined,
          allDay: !e.start_time?.includes('T'),
          location: e.location || undefined,
          description: '',
          color: EVENT_CATEGORIES.family.color,
          icon: EVENT_CATEGORIES.family.icon,
        }))
        setAllEvents(gcalEvents)
      })
      .catch(() => {})
  }, [])

  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => activeFilters[event.type])
  }, [allEvents, activeFilters])

  const toggleFilter = (type: keyof typeof activeFilters) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    const dayOfWeek = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - dayOfWeek // Adjust for Sunday start
    startOfWeek.setDate(diff)
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      return day
    })
  }

  const getDayEvents = (date: Date) => {
    return filteredEvents.filter(event => 
      event.date.toDateString() === date.toDateString()
    ).sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0
      if (!a.startTime) return -1
      if (!b.startTime) return 1
      return a.startTime.localeCompare(b.startTime)
    })
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getABDay = (date: Date) => {
    // Simple calculation - in production this would use the actual school calendar
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) return null
    
    // Mock A/B calculation based on date
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
    return dayOfYear % 2 === 0 ? 'A' : 'B'
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Family Calendar</h1>
            <p className="text-pink-100">School, chores, and family events</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-medium">Show:</span>
          </div>
          <div className="flex gap-2">
            {Object.entries(EVENT_CATEGORIES).map(([key, category]) => (
              <button
                key={key}
                onClick={() => toggleFilter(key as keyof typeof activeFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  activeFilters[key as keyof typeof activeFilters]
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-600'
                }`}
                style={{
                  backgroundColor: activeFilters[key as keyof typeof activeFilters] 
                    ? category.color 
                    : undefined
                }}
              >
                {activeFilters[key as keyof typeof activeFilters] ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                <span className="text-lg">{category.icon}</span>
                <span className="font-medium capitalize">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <button 
            onClick={() => navigateWeek('prev')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Week
          </button>
          <h2 className="font-semibold">
            Week of {getWeekDays()[0].toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </h2>
          <button 
            onClick={() => navigateWeek('next')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Next Week
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Week View */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 p-2 text-center font-medium text-sm text-gray-600">
              {day}
            </div>
          ))}
          
          {getWeekDays().map(day => {
            const dayEvents = getDayEvents(day)
            const abDay = getABDay(day)
            
            return (
              <div 
                key={day.toISOString()} 
                className={`bg-white min-h-32 p-2 ${
                  isToday(day) ? 'bg-blue-50 border-2 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    isToday(day) ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {day.getDate()}
                  </span>
                  {abDay && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      abDay === 'A' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {abDay}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: event.color, color: 'white' }}
                      title={`${event.title}${event.startTime ? ` at ${formatTime(event.startTime)}` : ''}`}
                    >
                      <div className="flex items-center gap-1">
                        <span>{event.icon}</span>
                        <span className="truncate">{event.title}</span>
                      </div>
                      {event.startTime && (
                        <div className="text-xs opacity-90">
                          {formatTime(event.startTime)}
                        </div>
                      )}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Today's Schedule</h2>
        <div className="space-y-3">
          {getDayEvents(new Date()).length > 0 ? 
            getDayEvents(new Date()).map(event => (
              <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: event.color }}
                />
                <span className="text-lg">{event.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-4">
                    {event.startTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(event.startTime)}
                        {event.endTime && ` - ${formatTime(event.endTime)}`}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full capitalize">
                  {event.type}
                </span>
              </div>
            )) : 
            <p className="text-gray-500 text-center py-4">No events scheduled for today</p>
          }
        </div>
      </div>
    </div>
  )
}