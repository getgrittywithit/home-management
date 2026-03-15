'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
  Calendar, ChevronLeft, ChevronRight, Eye, EyeOff,
  BookOpen, ClipboardList, Users, Clock, MapPin, 
  Settings, School, Home, Utensils, Trophy,
  CheckSquare, Star, Heart
} from 'lucide-react'
import { getChildScheduleForDate } from '@/lib/scheduleConfig'
import { getAllFamilyData } from '@/lib/familyConfig'

interface KidsCalendarProps {
  childName: string
  childAge: number
}

interface CalendarToggles {
  // Event Categories
  myEvents: boolean
  familyEvents: boolean
  schoolSchedule: boolean
  chores: boolean
  activities: boolean
  
  // Time Ranges  
  showWeekends: boolean
  showPastEvents: boolean
  
  // Detail Levels
  showTimes: boolean
  showLocations: boolean
  
  // View Options
  compactView: boolean
}

interface CalendarEvent {
  id: string
  title: string
  category: 'school' | 'chores' | 'family' | 'activities' | 'personal'
  date: Date
  startTime?: string
  endTime?: string
  allDay: boolean
  location?: string
  description?: string
  color: string
  icon: string
  assignedTo?: string[]
  priority: 'low' | 'medium' | 'high'
  rideTokens?: number
}

const EVENT_CATEGORIES = {
  school: {
    name: 'School',
    color: '#3B82F6',
    icon: '📚',
    description: 'Classes and school events'
  },
  chores: {
    name: 'Chores',
    color: '#10B981',
    icon: '🏠',
    description: 'Daily responsibilities'
  },
  family: {
    name: 'Family',
    color: '#F59E0B',
    icon: '👨‍👩‍👧‍👦',
    description: 'Family activities and events'
  },
  activities: {
    name: 'Activities',
    color: '#8B5CF6',
    icon: '⚽',
    description: 'Sports, clubs, and fun activities'
  },
  personal: {
    name: 'Personal',
    color: '#EC4899',
    icon: '⭐',
    description: 'Personal appointments and reminders'
  }
}

export default function KidsCalendar({ childName, childAge }: KidsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showSettings, setShowSettings] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Age-appropriate default toggles
  const getDefaultToggles = (): CalendarToggles => {
    const baseToggles = {
      myEvents: true,
      familyEvents: true,
      schoolSchedule: true,
      chores: true,
      activities: true,
      showWeekends: childAge >= 12, // Older kids see weekends by default
      showPastEvents: false,
      showTimes: childAge >= 10, // Show times for older kids
      showLocations: childAge >= 8,
      compactView: childAge < 10 // Younger kids get simpler view
    }
    
    return baseToggles
  }

  const [toggles, setToggles] = useState<CalendarToggles>(getDefaultToggles())

  useEffect(() => {
    setIsClient(true)
    // Load saved preferences from localStorage
    const savedToggles = localStorage.getItem(`calendar-toggles-${childName}`)
    if (savedToggles) {
      setToggles(JSON.parse(savedToggles))
    }
  }, [childName])

  // Save preferences to localStorage
  const updateToggles = (newToggles: Partial<CalendarToggles>) => {
    const updated = { ...toggles, ...newToggles }
    setToggles(updated)
    if (isClient) {
      localStorage.setItem(`calendar-toggles-${childName}`, JSON.stringify(updated))
    }
  }

  // Generate calendar events based on real family data
  const allEvents = useMemo(() => {
    if (!isClient) return []
    
    const events: CalendarEvent[] = []
    const familyData = getAllFamilyData()
    const child = familyData.children.find(c => c.name.toLowerCase() === childName.toLowerCase())
    
    if (!child) return events

    // Generate events for the next 30 days
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dayOfWeek = date.getDay()
      
      // School Schedule Events (Monday-Friday)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const schedule = getChildScheduleForDate(childName, date)
        if (schedule && schedule.isSchoolDay) {
          // Add school day event
          events.push({
            id: `school-${i}`,
            title: `School - ${schedule.dayType} Day`,
            category: 'school',
            date: date,
            startTime: '08:00',
            endTime: '15:30',
            allDay: false,
            location: schedule.studentName.includes('Champion') ? 'Champion High School' : 
                     schedule.studentName.includes('BMSN') ? 'Boerne Middle North' : 'Herff Elementary',
            description: `${schedule.periods.length} classes today`,
            color: EVENT_CATEGORIES.school.color,
            icon: EVENT_CATEGORIES.school.icon,
            assignedTo: [child.name],
            priority: 'high' as const
          })

          // Add individual classes for detailed view (for middle/high school)
          if (childAge >= 11 && schedule.periods.length > 0) {
            schedule.periods.slice(0, 3).forEach((period, index) => {
              const startHour = 8 + index * 1.5
              const startTime = `${Math.floor(startHour).toString().padStart(2, '0')}:${(startHour % 1 * 60).toString().padStart(2, '0')}`
              
              events.push({
                id: `class-${i}-${index}`,
                title: period.course,
                category: 'school',
                date: date,
                startTime: startTime,
                endTime: `${Math.floor(startHour + 1.25).toString().padStart(2, '0')}:${((startHour + 1.25) % 1 * 60).toString().padStart(2, '0')}`,
                allDay: false,
                location: `Room ${period.room}`,
                description: `Teacher: ${period.teacher}`,
                color: EVENT_CATEGORIES.school.color,
                icon: '📖',
                assignedTo: [child.name],
                priority: 'medium' as const
              })
            })
          }
        }
      }

      // Daily Chores (every day except Sunday for younger kids)
      if (dayOfWeek !== 0 || childAge >= 12) {
        const choreTime = childAge <= 10 ? '16:00' : '17:00'
        events.push({
          id: `chores-${i}`,
          title: childAge <= 8 ? 'Clean Up Time' : 
                childAge <= 12 ? 'Daily Chores' : 'Responsibilities',
          category: 'chores',
          date: date,
          startTime: choreTime,
          endTime: `${parseInt(choreTime.split(':')[0]) + 1}:${choreTime.split(':')[1]}`,
          allDay: false,
          location: 'Home',
          description: 'Daily tasks and tidying up',
          color: EVENT_CATEGORIES.chores.color,
          icon: EVENT_CATEGORIES.chores.icon,
          assignedTo: [child.name],
          priority: 'medium' as const
        })
      }

      // Weekly Activities (vary by day)
      if (dayOfWeek === 3 && childAge >= 6) { // Wednesday activities
        events.push({
          id: `activity-${i}`,
          title: childAge <= 10 ? 'Play Time' : 
                childAge <= 14 ? 'Club Meeting' : 'Extracurricular',
          category: 'activities',
          date: date,
          startTime: '15:45',
          endTime: '17:00',
          allDay: false,
          location: childAge <= 10 ? 'Park' : 'School',
          description: childAge <= 10 ? 'Outdoor play and exercise' : 'Club activities',
          color: EVENT_CATEGORIES.activities.color,
          icon: EVENT_CATEGORIES.activities.icon,
          assignedTo: [child.name],
          priority: 'medium' as const,
          rideTokens: childAge >= 12 ? 1 : 0
        })
      }

      // Family Events (weekends)
      if (dayOfWeek === 6 && i % 7 === 0) { // Saturday every week
        events.push({
          id: `family-${i}`,
          title: 'Family Time',
          category: 'family',
          date: date,
          startTime: '10:00',
          endTime: '12:00',
          allDay: false,
          location: 'Various',
          description: 'Family activity or outing',
          color: EVENT_CATEGORIES.family.color,
          icon: EVENT_CATEGORIES.family.icon,
          assignedTo: familyData.children.map(c => c.name),
          priority: 'high' as const
        })
      }

      // Personal Events (birthdays, appointments, etc.)
      if (i === 10) { // Sample personal event in 10 days
        events.push({
          id: `personal-${i}`,
          title: childAge <= 8 ? 'Special Day' : 'Personal Appointment',
          category: 'personal',
          date: date,
          startTime: '14:00',
          endTime: '15:00',
          allDay: false,
          location: childAge <= 10 ? 'Fun Place' : 'TBD',
          description: 'Personal event or appointment',
          color: EVENT_CATEGORIES.personal.color,
          icon: EVENT_CATEGORIES.personal.icon,
          assignedTo: [child.name],
          priority: 'low' as const
        })
      }
    }

    return events
  }, [childName, childAge, isClient])

  // Filter events based on toggles
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      // Category filters
      if (event.category === 'school' && !toggles.schoolSchedule) return false
      if (event.category === 'chores' && !toggles.chores) return false
      if (event.category === 'family' && !toggles.familyEvents) return false
      if (event.category === 'activities' && !toggles.activities) return false
      if (event.category === 'personal' && !toggles.myEvents) return false

      // Weekend filter
      if (!toggles.showWeekends && (event.date.getDay() === 0 || event.date.getDay() === 6)) {
        return false
      }

      // Past events filter
      if (!toggles.showPastEvents && event.date < new Date()) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        event.date.setHours(0, 0, 0, 0)
        if (event.date < today) return false
      }

      return true
    })
  }, [allEvents, toggles])

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    const dayOfWeek = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - dayOfWeek
    startOfWeek.setDate(diff)
    
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      return day
    })

    return toggles.showWeekends ? days : days.slice(1, 6) // Mon-Fri if weekends hidden
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

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Calendar</h1>
            <p className="text-purple-100">
              {childAge <= 8 ? 'Your fun schedule!' : 
               childAge <= 12 ? 'Your activities and responsibilities' :
               'Your schedule and commitments'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Calendar Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Show/Hide Categories */}
            <div>
              <h3 className="font-medium mb-3">What to Show</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={toggles.schoolSchedule}
                    onChange={(e) => updateToggles({ schoolSchedule: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-2xl">{EVENT_CATEGORIES.school.icon}</span>
                  <span>School Classes</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={toggles.chores}
                    onChange={(e) => updateToggles({ chores: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-2xl">{EVENT_CATEGORIES.chores.icon}</span>
                  <span>{childAge <= 8 ? 'Clean Up Time' : 'Chores & Responsibilities'}</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={toggles.activities}
                    onChange={(e) => updateToggles({ activities: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-2xl">{EVENT_CATEGORIES.activities.icon}</span>
                  <span>{childAge <= 8 ? 'Play Time' : 'Activities & Sports'}</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={toggles.familyEvents}
                    onChange={(e) => updateToggles({ familyEvents: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-2xl">{EVENT_CATEGORIES.family.icon}</span>
                  <span>Family Events</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={toggles.myEvents}
                    onChange={(e) => updateToggles({ myEvents: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-2xl">{EVENT_CATEGORIES.personal.icon}</span>
                  <span>My Personal Events</span>
                </label>
              </div>
            </div>

            {/* View Options */}
            <div>
              <h3 className="font-medium mb-3">View Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={toggles.showWeekends}
                    onChange={(e) => updateToggles({ showWeekends: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span>Show Weekends</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={toggles.showTimes}
                    onChange={(e) => updateToggles({ showTimes: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span>Show Times</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={toggles.showLocations}
                    onChange={(e) => updateToggles({ showLocations: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span>Show Locations</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={toggles.compactView}
                    onChange={(e) => updateToggles({ compactView: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <Eye className="w-4 h-4 text-gray-600" />
                  <span>Simple View</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Week Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <button 
            onClick={() => navigateWeek('prev')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
            {childAge <= 8 ? 'Last Week' : 'Previous'}
          </button>
          <h2 className="font-semibold">
            {getWeekDays()[0].toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric' 
            })} - {getWeekDays()[getWeekDays().length - 1].toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <button 
            onClick={() => navigateWeek('next')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {childAge <= 8 ? 'Next Week' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Week View */}
        <div className={`grid gap-px bg-gray-200 ${toggles.showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
          {(toggles.showWeekends ? 
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : 
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          ).map(day => (
            <div key={day} className="bg-gray-50 p-2 text-center font-medium text-sm text-gray-600">
              {day}
            </div>
          ))}
          
          {getWeekDays().map(day => {
            const dayEvents = getDayEvents(day)
            
            return (
              <div 
                key={day.toISOString()} 
                className={`bg-white min-h-32 p-2 ${
                  isToday(day) ? 'bg-purple-50 border-2 border-purple-200' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    isToday(day) ? 'text-purple-600' : 'text-gray-900'
                  }`}>
                    {day.getDate()}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, toggles.compactView ? 2 : 3).map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: event.color, color: 'white' }}
                      title={`${event.title}${event.startTime && toggles.showTimes ? ` at ${formatTime(event.startTime)}` : ''}${event.location && toggles.showLocations ? ` at ${event.location}` : ''}`}
                    >
                      <div className="flex items-center gap-1">
                        <span>{event.icon}</span>
                        <span className="truncate">{event.title}</span>
                      </div>
                      {event.startTime && toggles.showTimes && (
                        <div className="text-xs opacity-90">
                          {formatTime(event.startTime)}
                        </div>
                      )}
                    </div>
                  ))}
                  {dayEvents.length > (toggles.compactView ? 2 : 3) && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - (toggles.compactView ? 2 : 3)} more
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
        <h2 className="text-xl font-bold mb-4">
          {childAge <= 8 ? "Today's Fun!" : "Today's Schedule"}
        </h2>
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
                    {event.startTime && toggles.showTimes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(event.startTime)}
                        {event.endTime && ` - ${formatTime(event.endTime)}`}
                      </span>
                    )}
                    {event.location && toggles.showLocations && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </span>
                    )}
                    {event.rideTokens && event.rideTokens > 0 && (
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        {event.rideTokens} token{event.rideTokens > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <span 
                  className="text-xs px-2 py-1 rounded-full capitalize font-medium"
                  style={{ backgroundColor: event.color, color: 'white' }}
                >
                  {event.category === 'chores' && childAge <= 8 ? 'cleanup' : event.category}
                </span>
              </div>
            )) : 
            <p className="text-gray-500 text-center py-4">
              {childAge <= 8 ? 'No activities today!' : 'No events scheduled for today'}
            </p>
          }
        </div>
      </div>
    </div>
  )
}