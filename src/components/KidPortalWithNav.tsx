'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, CheckSquare, Clock, Star, MapPin, Users, 
  Plus, MessageSquare, Utensils, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, AlertCircle, Award, Home, BookOpen,
  Zap, Trophy, Target, Settings, ExternalLink, Phone, Mail,
  User, Heart
} from 'lucide-react'
import { SAMPLE_SCHOOL_DATA, SchoolProfile } from '@/lib/schoolConfig'
import { getScheduleForChild, getChildScheduleForDate, getAllTeachersForChild, SchedulePeriod } from '@/lib/scheduleConfig'
import KidTabContent from './KidTabContent'
import { getKidZone, type ZoneName } from '@/lib/zoneRotation'
import { SCHOOL_TYPE } from '@/lib/familyConfig'
import AboutMeTab from './AboutMeTab'
import DailyChecklist from './DailyChecklist'
import KidHealthTab from './KidHealthTab'

interface KidPortalProps {
  kidData: {
    profile: any
    todaysChecklist: any[]
    todaysEvents: any[]
    weekEvents: any[]
    zones: any[]
  }
}

type TabId = 'dashboard' | 'calendar' | 'checklist' | 'school' | 'about' | 'health' | 'achievements' | 'goals' | 'requests'

interface NavTab {
  id: TabId
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const navTabs: NavTab[] = [
  { id: 'dashboard', name: 'Home', icon: Home, color: 'bg-blue-500' },
  { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'bg-purple-500' },
  { id: 'checklist', name: 'Daily Checklist', icon: CheckSquare, color: 'bg-green-500' },
  { id: 'school', name: 'School', icon: BookOpen, color: 'bg-orange-500' },
  { id: 'about', name: 'About Me', icon: User, color: 'bg-teal-500' },
  { id: 'health', name: 'Health', icon: Heart, color: 'bg-rose-500' },
  { id: 'achievements', name: 'Achievements', icon: Award, color: 'bg-yellow-500' },
  { id: 'goals', name: 'Goals', icon: Target, color: 'bg-pink-500' },
  { id: 'requests', name: 'Requests', icon: MessageSquare, color: 'bg-indigo-500' }
]

export default function KidPortalWithNav({ kidData }: KidPortalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [schoolData, setSchoolData] = useState<SchoolProfile>(SAMPLE_SCHOOL_DATA)
  const [realSchedule, setRealSchedule] = useState<any>(null)
  const [currentlyReading, setCurrentlyReading] = useState<string>('')

  const { profile, todaysChecklist, todaysEvents, weekEvents, zones } = kidData

  // Dashboard state
  const [dashboardEvents, setDashboardEvents] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState({ totalEvents: 0, completedEvents: 0, dueSoon: 0 })
  const [dashboardLoaded, setDashboardLoaded] = useState(false)
  const [currentMinutes, setCurrentMinutes] = useState(0)

  // Load kid dashboard from API
  useEffect(() => {
    if (profile?.first_name) {
      const childKey = profile.first_name.toLowerCase()
      fetch(`/api/kids/dashboard?child=${childKey}`)
        .then(r => r.json())
        .then(data => {
          if (data.events) setDashboardEvents(data.events)
          if (data.stats) setDashboardStats(data.stats)
          setDashboardLoaded(true)
        })
        .catch(() => setDashboardLoaded(true))
    }
  }, [profile?.first_name])

  // Load currently reading for homeschool kids
  useEffect(() => {
    const kidName = profile?.first_name || ''
    const isHS = SCHOOL_TYPE[kidName.toLowerCase()] === 'homeschool'
    if (isHS && kidName) {
      fetch('/api/school/homeschool')
        .then(r => r.json())
        .then(data => {
          if (data.currentlyReading) {
            setCurrentlyReading(data.currentlyReading[kidName] || '')
          }
        })
        .catch(() => {})
    }
  }, [profile?.first_name])

  // Update current time every minute for "NOW" indicator
  useEffect(() => {
    const update = () => {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes())
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  const toggleDashboardItem = async (eventId: string, summary: string, startTime: string) => {
    // Optimistic update
    setDashboardEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, completed: !e.completed } : e
    ))
    setDashboardStats(prev => {
      const event = dashboardEvents.find(e => e.id === eventId)
      const delta = event?.completed ? -1 : 1
      return { ...prev, completedEvents: prev.completedEvents + delta }
    })

    try {
      await fetch('/api/kids/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_checklist',
          child: profile.first_name,
          eventId,
          eventSummary: summary,
          eventStartTime: startTime,
        })
      })
    } catch (error) {
      console.error('Error toggling checklist item:', error)
    }
  }

  // Load real schedule data based on child name
  useEffect(() => {
    if (profile?.first_name) {
      const childKey = profile.first_name.toLowerCase()
      const schedule = getScheduleForChild(childKey)
      const todaysSchedule = getChildScheduleForDate(profile.first_name, selectedDate)
      
      if (schedule) {
        setRealSchedule(schedule)
        
        // Convert real schedule to SchoolProfile format for the school tab
        const realSchoolData: SchoolProfile = {
          ...schoolData,
          school: schedule.school,
          schoolYear: schedule.schoolYear,
          teachers: schedule.periods.map((period, index) => ({
            id: `teacher-${index}`,
            name: period.teacher,
            email: '', // We don't have email data in the schedule
            subject: period.course,
            room: period.room,
            preferredContact: 'email' as const,
            locked: true
          })).filter((teacher, index, array) => 
            // Remove duplicates based on teacher name
            array.findIndex(t => t.name === teacher.name) === index
          ),
          classes: schedule.periods.map((period, index) => ({
            id: `class-${index}`,
            name: period.course,
            subject: period.course,
            teacherId: `teacher-${index}`,
            room: period.room,
            color: '#3B82F6', // Default blue
            locked: true,
            schedule: [{
              dayOfWeek: period.days === 'A' ? 1 : period.days === 'B' ? 2 : 1, // Simplified mapping
              startTime: '08:00', // We don't have time data in the current schedule
              endTime: '09:00',
              period: period.period
            }]
          }))
        }
        setSchoolData(realSchoolData)
      }
    }
  }, [profile?.first_name, selectedDate])

  // Calculate completion stats
  const completedTasks = todaysChecklist.filter(item => item.completed).length
  const totalTasks = todaysChecklist.length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const toggleTaskComplete = async (taskId: string) => {
    console.log('Toggle task:', taskId)
  }

  const getDayEvents = (date: Date) => {
    return weekEvents.filter(event => {
      const eventDate = new Date(event.start_time)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const getUpcomingAssignments = () => {
    const now = new Date()
    return schoolData.assignments
      .filter(assignment => new Date(assignment.dueDate) >= now && !assignment.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'school': return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400' }
      case 'chores': return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-400' }
      case 'break': return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-400' }
      case 'creative': return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-400' }
      case 'routine': return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-400' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-400' }
    }
  }

  const formatEventTime = (isoTime: string) => {
    const d = new Date(isoTime)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
  }

  const ZONE_BANNER_COLORS: Record<string, string> = {
    'Kitchen': 'from-amber-500 to-orange-500',
    'Hotspot': 'from-red-500 to-rose-500',
    'Pantry': 'from-emerald-500 to-green-500',
    'Floors': 'from-orange-500 to-yellow-500',
    'Kids Bathroom': 'from-purple-500 to-violet-500',
    'Guest Bathroom': 'from-indigo-500 to-blue-500',
  }

  const renderDashboard = () => {
    const kidZone = getKidZone(profile.first_name)
    const zoneBannerColor = kidZone ? (ZONE_BANNER_COLORS[kidZone] || 'from-gray-500 to-gray-600') : null

    // Parse HH:MM from ISO-ish timestamp like "2026-03-24T09:00:00"
    const toMins = (iso: string) => {
      const timePart = iso.split('T')[1] || '00:00'
      const [h, m] = timePart.split(':').map(Number)
      return h * 60 + m
    }

    // Find current and next events using Chicago minutes
    const currentIdx = dashboardEvents.findIndex(e => {
      const startMins = toMins(e.startTime)
      const endMins = toMins(e.endTime)
      return currentMinutes >= startMins && currentMinutes < endMins
    })
    const nextIdx = currentIdx >= 0
      ? (currentIdx + 1 < dashboardEvents.length ? currentIdx + 1 : -1)
      : dashboardEvents.findIndex(e => toMins(e.startTime) > currentMinutes)

    // Check if all blocks are past
    const lastEnd = dashboardEvents.length > 0 ? toMins(dashboardEvents[dashboardEvents.length - 1].endTime) : 0
    const allPast = dashboardEvents.length > 0 && currentMinutes >= lastEnd

    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {profile.first_name}! {profile.emoji}</h1>
              <p className="text-blue-100">
                {allPast
                  ? 'Great job today! All done.'
                  : currentIdx >= 0
                    ? `Right now: ${dashboardEvents[currentIdx].summary}`
                    : 'Ready to make today amazing?'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {dashboardStats.totalEvents > 0 ? Math.round((dashboardStats.completedEvents / dashboardStats.totalEvents) * 100) : 0}%
              </div>
              <div className="text-xs text-blue-100">Done today</div>
            </div>
          </div>
        </div>

        {/* Zone Banner */}
        {kidZone && zoneBannerColor && (
          <div className={`bg-gradient-to-r ${zoneBannerColor} text-white px-6 py-3 rounded-lg flex items-center gap-3`}>
            <span className="text-xl">🧹</span>
            <span className="font-semibold">This week's zone: {kidZone.toUpperCase()}</span>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{dashboardStats.completedEvents}/{dashboardStats.totalEvents}</div>
                <div className="text-sm text-gray-600">Tasks Complete</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{dashboardStats.totalEvents}</div>
                <div className="text-sm text-gray-600">Events Today</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{dashboardStats.dueSoon}</div>
                <div className="text-sm text-gray-600">Due Soon</div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Schedule Timeline */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Today's Schedule</h2>
            <span className="text-xs text-gray-500">
              {new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          {!dashboardLoaded ? (
            <div className="p-8 text-center text-gray-400">Loading schedule...</div>
          ) : dashboardEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No events scheduled for today</div>
          ) : (
            <div className="divide-y">
              {allPast && (
                <div className="px-4 py-3 bg-green-50 text-center">
                  <span className="text-sm font-medium text-green-700">All done for today! Great job! 🎉</span>
                </div>
              )}
              {dashboardEvents.map((event, i) => {
                const isCurrent = i === currentIdx
                const isNext = i === nextIdx && !isCurrent
                const isPast = toMins(event.endTime) <= currentMinutes
                const colors = getCategoryColor(event.category)
                const faded = (isPast && !isCurrent) || allPast

                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isCurrent ? `bg-blue-50 border-l-4 ${colors.border}` :
                      isNext ? 'bg-green-50/40' :
                      ''
                    } ${faded && !event.completed ? 'opacity-50' : ''}`}
                  >
                    <button
                      onClick={() => toggleDashboardItem(event.id, event.summary, event.startTime)}
                      className="flex-shrink-0"
                    >
                      {event.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className={`w-5 h-5 ${isCurrent ? 'text-blue-500' : 'text-gray-300'}`} />
                      )}
                    </button>

                    <div className="w-20 flex-shrink-0 text-right">
                      <span className={`text-sm font-medium ${isCurrent ? 'text-blue-700' : 'text-gray-500'}`}>
                        {formatEventTime(event.startTime)}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {event.category}
                      </span>
                      <span className={`text-sm ${
                        event.completed ? 'line-through text-gray-400' :
                        isCurrent ? 'font-semibold text-gray-900' :
                        faded ? 'text-gray-400' : 'text-gray-800'
                      }`}>
                        {event.summary}
                      </span>
                    </div>

                    <div className="flex-shrink-0">
                      {isCurrent && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
                          NOW
                        </span>
                      )}
                      {isNext && (
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">
                          Up Next
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  const isHomeschool = SCHOOL_TYPE[profile.first_name?.toLowerCase() || ''] === 'homeschool'

  const renderSchoolTab = () => {
    if (isHomeschool) return renderHomeschoolView()
    return renderPublicSchoolView()
  }

  const renderHomeschoolView = () => {
    // Filter dashboard events to academic blocks only
    const schoolBlocks = dashboardEvents.filter(e =>
      e.category === 'school' || e.category === 'enrichment'
    )

    const toMinsLocal = (iso: string) => {
      const timePart = iso.split('T')[1] || '00:00'
      const [h, m] = timePart.split(':').map(Number)
      return h * 60 + m
    }

    return (
      <div className="space-y-6">
        {/* Homeschool Header */}
        <div className="bg-gradient-to-r from-teal-500 to-green-500 text-white p-6 rounded-lg">
          <h1 className="text-2xl font-bold">Homeschool</h1>
          <p className="text-teal-100">{profile.grade || ''} · 2025-2026</p>
        </div>

        {/* Today's School Blocks */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900">Today's School Blocks</h2>
          </div>
          {schoolBlocks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No school blocks today</div>
          ) : (
            <div className="divide-y">
              {schoolBlocks.map(event => {
                const startMins = toMinsLocal(event.startTime)
                const endMins = toMinsLocal(event.endTime)
                const isCurrent = currentMinutes >= startMins && currentMinutes < endMins
                const isPast = endMins <= currentMinutes
                const colors = getCategoryColor(event.category)

                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      isCurrent ? `bg-teal-50 border-l-4 border-l-teal-500` : ''
                    } ${isPast ? 'opacity-50' : ''}`}
                  >
                    <div className="w-20 flex-shrink-0 text-right">
                      <span className={`text-sm font-medium ${isCurrent ? 'text-teal-700' : 'text-gray-500'}`}>
                        {formatEventTime(event.startTime)}
                      </span>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                      {event.category}
                    </span>
                    <span className={`text-sm ${
                      event.completed ? 'line-through text-gray-400' :
                      isCurrent ? 'font-semibold text-gray-900' : 'text-gray-800'
                    }`}>
                      {event.summary}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
                        NOW
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* About Our Homeschool */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-bold mb-3">About Our Homeschool</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            We follow an eclectic, Montessori-based approach adapted for ADHD and autism.
            Our days mix structured academics with hands-on learning, movement breaks, and
            independent work blocks. Subjects rotate through math, reading, writing, science,
            and social studies, with enrichment time built in for art, music, and life skills.
            The schedule flexes to match each kid&apos;s pace and energy level.
          </p>
        </div>

        {/* Quick Links */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-bold mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: 'IXL', url: 'https://www.ixl.com', icon: '📐', desc: 'Math & ELA Practice' },
              { name: 'Khan Academy', url: 'https://www.khanacademy.org', icon: '🎓', desc: 'Video Lessons' },
              { name: 'Google Classroom', url: 'https://classroom.google.com', icon: '📚', desc: 'Assignments' },
            ].map(link => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">{link.icon}</span>
                <div>
                  <div className="font-medium">{link.name}</div>
                  <div className="text-sm text-gray-500">{link.desc}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
              </a>
            ))}
          </div>
        </div>

        {/* What We're Learning */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-bold mb-4">What We're Learning</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="p-3 bg-teal-50 rounded-lg">
              <span className="font-medium text-teal-800">📖 Currently Reading:</span> {currentlyReading || 'Not set'}
            </div>
            <p className="text-xs text-gray-400 italic">More curriculum details can be added from the parent portal.</p>
          </div>
        </div>
      </div>
    )
  }

  const renderPublicSchoolView = () => {
    const todaysSchedule = getChildScheduleForDate(profile.first_name, selectedDate)
    const childKey = profile.first_name?.toLowerCase() || ''
    const teachers = realSchedule?.periods || []

    return (
      <div className="space-y-6">
        {/* Public School Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 rounded-lg">
          <h1 className="text-2xl font-bold">{realSchedule?.school || schoolData.school}</h1>
          <p className="text-blue-100">{profile.grade || ''} · 2025-2026</p>
          {todaysSchedule && todaysSchedule.isSchoolDay && (
            <div className="mt-2 text-sm text-blue-100">
              Today: {todaysSchedule.dayType} Day ({todaysSchedule.periods.length} classes)
            </div>
          )}
        </div>

        {/* Today's A/B Day */}
        {todaysSchedule && todaysSchedule.isSchoolDay && (
          <div className="bg-white p-6 rounded-lg border">
            <div className={`text-center p-4 rounded-lg ${
              todaysSchedule.dayType === 'A' ? 'bg-green-50' : 'bg-blue-50'
            }`}>
              <p className={`font-bold text-lg ${
                todaysSchedule.dayType === 'A' ? 'text-green-700' : 'text-blue-700'
              }`}>
                Today is a {todaysSchedule.dayType} Day ({todaysSchedule.periods.length} classes)
              </p>
            </div>
          </div>
        )}
        {/* Full A/B Schedule */}
        {realSchedule && (
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-bold mb-4">My Complete Schedule</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* A Day Schedule */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">A</span>
                  A Day Classes
                </h3>
                <div className="space-y-2">
                  {realSchedule.periods
                    .filter((period: SchedulePeriod) => period.days === 'A' || period.days === 'AB')
                    .sort((a: SchedulePeriod, b: SchedulePeriod) => {
                      // Custom sort for period numbers including 0A, 0B
                      const getPeriodValue = (period: string) => {
                        if (period === '0A') return 0.1
                        if (period === '0B') return 0.2
                        return parseInt(period) || 999
                      }
                      return getPeriodValue(a.period) - getPeriodValue(b.period)
                    })
                    .map((period: SchedulePeriod, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-semibold text-green-700">
                          {period.period}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{period.course}</div>
                          <div className="text-sm text-gray-600">{period.teacher}</div>
                          <div className="text-xs text-gray-500">Room {period.room}</div>
                        </div>
                        {period.days === 'AB' && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            Both Days
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* B Day Schedule */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">B</span>
                  B Day Classes
                </h3>
                <div className="space-y-2">
                  {realSchedule.periods
                    .filter((period: SchedulePeriod) => period.days === 'B' || period.days === 'AB')
                    .sort((a: SchedulePeriod, b: SchedulePeriod) => {
                      // Custom sort for period numbers including 0A, 0B
                      const getPeriodValue = (period: string) => {
                        if (period === '0A') return 0.1
                        if (period === '0B') return 0.2
                        return parseInt(period) || 999
                      }
                      return getPeriodValue(a.period) - getPeriodValue(b.period)
                    })
                    .map((period: SchedulePeriod, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
                          {period.period}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{period.course}</div>
                          <div className="text-sm text-gray-600">{period.teacher}</div>
                          <div className="text-xs text-gray-500">Room {period.room}</div>
                        </div>
                        {period.days === 'AB' && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            Both Days
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Schedule Legend */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Schedule Guide:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                    A Day: Green schedule
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                    B Day: Blue schedule
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-purple-500 rounded-full"></span>
                    Both Days: Every day classes
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="p-3 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-700 mb-2">My Schedule Stats:</h4>
                <div className="space-y-1 text-sm text-orange-600">
                  <div>Total Classes: {realSchedule.periods.length}</div>
                  <div>A Day Classes: {realSchedule.periods.filter((p: SchedulePeriod) => p.days === 'A').length}</div>
                  <div>B Day Classes: {realSchedule.periods.filter((p: SchedulePeriod) => p.days === 'B').length}</div>
                  <div>Daily Classes: {realSchedule.periods.filter((p: SchedulePeriod) => p.days === 'AB').length}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links — Public School */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-bold mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: 'Skyward Portal', url: 'https://skyward-student.bisd.net', icon: '📊', desc: 'Grades & Attendance' },
              { name: 'Google Classroom', url: 'https://classroom.google.com', icon: '📚', desc: 'Assignments' },
              { name: 'BISD Website', url: 'https://www.bisd.net', icon: '🏫', desc: 'District Info' },
            ].map(link => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">{link.icon}</span>
                <div>
                  <div className="font-medium">{link.name}</div>
                  <div className="text-sm text-gray-500">{link.desc}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
              </a>
            ))}
          </div>
        </div>

        {/* My Teachers — from real schedule data */}
        {teachers.length > 0 && (
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-bold mb-4">My Teachers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from(new Set(teachers.map((p: any) => p.teacher))).map((teacherName: any) => {
                const period = teachers.find((p: any) => p.teacher === teacherName)
                return (
                  <div key={teacherName} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span>👨‍🏫</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{teacherName}</div>
                      <div className="text-sm text-gray-600">{period.course} · Room {period.room}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard()
      case 'school':
        return renderSchoolTab()
      case 'about':
        return <AboutMeTab childAge={profile.age || 10} childId={profile.id} childName={profile.first_name || profile.name} />
      case 'health':
        return <KidHealthTab childName={profile.first_name || profile.name} />
      case 'checklist':
        return <DailyChecklist childName={profile.first_name || profile.name} />
      case 'calendar':
        return (
          <div className="p-6 bg-white rounded-lg border">
            <h2 className="text-xl font-bold mb-4">Calendar</h2>
            <p className="text-gray-600">Calendar feature coming soon!</p>
          </div>
        )
      case 'achievements':
      case 'goals':
      case 'requests':
        return <KidTabContent kidData={kidData} activeTab={activeTab} />
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Profile Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
              {profile.emoji || '👦'}
            </div>
            <div>
              <div className="font-semibold">{profile.first_name}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-4 space-y-2">
          {navTabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                  ${isActive 
                    ? `${tab.color} text-white shadow-md` 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  )
}