'use client'

import { useState, useEffect } from 'react'
import {
  Calendar, CheckSquare, Clock, Star, MapPin, Users,
  Plus, MessageSquare, Utensils, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, AlertCircle, Award, Home, BookOpen,
  Zap, Trophy, Target, Settings, ExternalLink, Phone, Mail,
  User, Heart, Thermometer, X, Shuffle, Dices
} from 'lucide-react'
import { SAMPLE_SCHOOL_DATA, SchoolProfile } from '@/lib/schoolConfig'
import { getScheduleForChild, getChildScheduleForDate, getAllTeachersForChild, SchedulePeriod } from '@/lib/scheduleConfig'
import KidTabContent from './KidTabContent'
import { getKidZone, type ZoneName } from '@/lib/zoneRotation'
import { SCHOOL_TYPE } from '@/lib/familyConfig'
import AboutMeTab from './AboutMeTab'
import DailyChecklist from './DailyChecklist'
import KidHealthTab from './KidHealthTab'
import KidPointsCard from './KidPointsCard'
import KidCommunicationCards from './KidCommunicationCards'
import KidSchoolNotesCard from './KidSchoolNotesCard'
import BreakButton from './BreakButton'
import DailyCheckInCard from './DailyCheckInCard'
import MealFeedbackCard from './MealFeedbackCard'
import RegulationToolsCard from './RegulationToolsCard'
import BelleCareCard from './BelleCareCard'
import DutyCard from './DutyCard'
import SchoolMakeupCard from './SchoolMakeupCard'
import TonightsDinnerCard from './TonightsDinnerCard'
import LearningPortfolioTab from './LearningPortfolioTab'
import OpportunitiesTab from './OpportunitiesTab'
import GoalsTab from './GoalsTab'
import AchievementsTab from './AchievementsTab'
import KidRequestsTab from './KidRequestsTab'
import KidCalendarTab from './KidCalendarTab'
import FamilyEventsStrip from './FamilyEventsStrip'
import MomAvailabilityBadge from './MomAvailabilityBadge'

interface KidPortalProps {
  kidData: {
    profile: any
    todaysChecklist: any[]
    todaysEvents: any[]
    weekEvents: any[]
    zones: any[]
  }
}

type TabId = 'dashboard' | 'calendar' | 'checklist' | 'school' | 'portfolio' | 'about' | 'health' | 'achievements' | 'goals' | 'opportunities' | 'requests'

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
  { id: 'portfolio', name: 'Portfolio', icon: BookOpen, color: 'bg-indigo-500' },
  { id: 'about', name: 'About Me', icon: User, color: 'bg-teal-500' },
  { id: 'health', name: 'Health', icon: Heart, color: 'bg-rose-500' },
  { id: 'achievements', name: 'Achievements', icon: Award, color: 'bg-yellow-500' },
  { id: 'goals', name: 'Goals', icon: Target, color: 'bg-pink-500' },
  { id: 'opportunities', name: 'Opportunities', icon: Trophy, color: 'bg-amber-500' },
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
  const [familyEvents, setFamilyEvents] = useState<any[]>([])
  const [countdownEvents, setCountdownEvents] = useState<any[]>([])
  const [lolaStatus, setLolaStatus] = useState<{ status: string; note: string | null }>({ status: 'available', note: null })
  const [sickConfirmOpen, setSickConfirmOpen] = useState(false)
  const [sickSubmitted, setSickSubmitted] = useState(false)
  const [sickSubmitting, setSickSubmitting] = useState(false)

  // Dinner Manager state
  const [mealPickerOpen, setMealPickerOpen] = useState(false)
  const [availableMeals, setAvailableMeals] = useState<{ id: number; name: string; description: string; sides: string | null; sides_starch_options: string[] | null; sides_veggie_options: string[] | null; sub_option_count: number }[]>([])
  const [myMealRequest, setMyMealRequest] = useState<{ id: number; meal_name: string; status: string; sub_option_label?: string; sub_option_heat?: string; selected_starch?: string; selected_veggie?: string } | null>(null)
  const [mealRequestLoaded, setMealRequestLoaded] = useState(false)
  const [mealSubmitting, setMealSubmitting] = useState(false)
  const [marinadePickerMealId, setMarinadePickerMealId] = useState<number | null>(null)
  const [marinadeOptions, setMarinadeOptions] = useState<{ id: string; label: string; heat_level: string; category: string; is_favorite: boolean; display_type: string; sort_order: number }[]>([])
  const [marinadeLoading, setMarinadeLoading] = useState(false)
  const [subDisplayType, setSubDisplayType] = useState<'pick-one' | 'show-all'>('pick-one')
  const [selectedStarch, setSelectedStarch] = useState<string | null>(null)
  const [selectedVeggie, setSelectedVeggie] = useState<string | null>(null)
  const [surpriseMealId, setSurpriseMealId] = useState<number | null>(null)
  const [expandedMealId, setExpandedMealId] = useState<number | null>(null)

  // Dinner rotation config
  const DINNER_ROTATION: Record<string, Record<string, { kid: string; theme: string; emoji: string; label: string }>> = {
    week1: {
      monday: { kid: 'kaylee', theme: 'american-comfort', emoji: '🇺🇸', label: 'American Comfort Night' },
      tuesday: { kid: 'zoey', theme: 'asian', emoji: '🥡', label: 'Asian Night' },
      wednesday: { kid: 'wyatt', theme: 'bar-night', emoji: '🥗', label: 'Bar Night' },
      thursday: { kid: 'amos', theme: 'mexican', emoji: '🌮', label: 'Mexican Night' },
      friday: { kid: 'ellie', theme: 'pizza-italian', emoji: '🍕', label: 'Pizza & Italian Night' },
      saturday: { kid: 'parents', theme: 'grill', emoji: '🔥', label: 'Grill Night' },
      sunday: { kid: 'parents', theme: 'roast-comfort', emoji: '🏡', label: 'Roast/Comfort Sunday' },
    },
    week2: {
      monday: { kid: 'kaylee', theme: 'soup-comfort', emoji: '🍲', label: 'Soup/Comfort Night' },
      tuesday: { kid: 'zoey', theme: 'asian', emoji: '🥡', label: 'Asian Night' },
      wednesday: { kid: 'wyatt', theme: 'easy-lazy', emoji: '🥪', label: 'Easy/Lazy Night' },
      thursday: { kid: 'amos', theme: 'mexican', emoji: '🌮', label: 'Mexican Night' },
      friday: { kid: 'ellie', theme: 'pizza-italian', emoji: '🍕', label: 'Pizza & Italian Night' },
      saturday: { kid: 'parents', theme: 'experiment', emoji: '🔬', label: 'Experiment/Big Cook' },
      sunday: { kid: 'parents', theme: 'brunch', emoji: '🍳', label: 'Brunch Sunday' },
    }
  }

  // Calculate current week and today's dinner assignment
  const getDinnerAssignment = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const EPOCH = new Date('2026-03-30T00:00:00')
    const weeks = Math.floor((now.getTime() - EPOCH.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const currentWeek = weeks % 2 === 0 ? 1 : 2
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = days[now.getDay()]
    const weekKey = `week${currentWeek}`
    return DINNER_ROTATION[weekKey]?.[dayName] || null
  }

  const getSeason = () => {
    const month = new Date().getMonth() + 1
    return (month >= 3 && month <= 8) ? 'spring-summer' : 'fall-winter'
  }

  const todaysDinner = getDinnerAssignment()
  const childKey = (profile?.first_name || '').toLowerCase()
  const isMyDinnerDay = todaysDinner && todaysDinner.kid !== 'parents' && (
    todaysDinner.kid === childKey ||
    (todaysDinner.kid === 'ellie' && childKey === 'hannah') // Friday: Ellie & Hannah
  )
  const todayStr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })).toLocaleDateString('en-CA')

  // Fetch kid's meal request status for today
  useEffect(() => {
    if (isMyDinnerDay && childKey) {
      fetch(`/api/parent/meal-requests?action=my_request&kid=${childKey}&date=${todayStr}`)
        .then(r => r.json())
        .then(data => {
          setMyMealRequest(data.request || null)
          setMealRequestLoaded(true)
        })
        .catch(() => setMealRequestLoaded(true))
    } else {
      setMealRequestLoaded(true)
    }
  }, [isMyDinnerDay, childKey, todayStr])

  // Fetch available meals when picker opens
  useEffect(() => {
    if (mealPickerOpen && todaysDinner) {
      fetch(`/api/parent/meal-requests?action=available_meals&theme=${todaysDinner.theme}&season=${getSeason()}`)
        .then(r => r.json())
        .then(data => setAvailableMeals(data.meals || []))
        .catch(() => setAvailableMeals([]))
    }
  }, [mealPickerOpen, todaysDinner?.theme])

  const openMarinadePickerForMeal = async (mealId: number) => {
    setMarinadePickerMealId(mealId)
    setMarinadeLoading(true)
    try {
      const res = await fetch(`/api/parent/meal-requests?action=get_sub_options&meal_id=${mealId}`)
      const data = await res.json()
      setMarinadeOptions(data.options || [])
      setSubDisplayType(data.display_type || 'pick-one')
    } catch { setMarinadeOptions([]); setSubDisplayType('pick-one') }
    finally { setMarinadeLoading(false) }
  }

  const handleMealRequest = async (mealId: number, subOptionId?: string) => {
    if (mealSubmitting) return
    setMealSubmitting(true)
    try {
      const res = await fetch('/api/parent/meal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_meal', kid_name: childKey, meal_id: mealId, date: todayStr, sub_option_id: subOptionId || null, selected_starch: selectedStarch || null, selected_veggie: selectedVeggie || null }),
      })
      const data = await res.json()
      if (data.success) {
        const meal = availableMeals.find(m => m.id === mealId)
        const subOpt = subOptionId ? marinadeOptions.find(o => o.id === subOptionId) : null
        setMyMealRequest({ id: data.request_id, meal_name: meal?.name || '', status: 'pending', sub_option_label: subOpt?.label, sub_option_heat: subOpt?.heat_level, selected_starch: selectedStarch || undefined, selected_veggie: selectedVeggie || undefined })
        setMealPickerOpen(false)
        setMarinadePickerMealId(null)
        setExpandedMealId(null)
        setSurpriseMealId(null)
      }
    } catch (err) {
      console.error('Meal request error:', err)
    } finally {
      setMealSubmitting(false)
    }
  }

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
    // Load family events + availability
    fetch('/api/kids/dashboard?action=get_home_extras')
      .then(r => r.json())
      .then(data => {
        if (data.familyEvents) setFamilyEvents(data.familyEvents)
        if (data.countdownEvents) setCountdownEvents(data.countdownEvents)
        if (data.lolaStatus) setLolaStatus(data.lolaStatus)
      })
      .catch(() => {})
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

  // Check if sick day already submitted today (sessionStorage)
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const key = `sick-day-${(profile?.first_name || '').toLowerCase()}-${today}`
    if (sessionStorage.getItem(key)) setSickSubmitted(true)
  }, [profile?.first_name])

  const handleSickDay = async () => {
    if (sickSubmitted || sickSubmitting) return
    setSickSubmitting(true)
    const childKey = (profile?.first_name || '').toLowerCase()
    const childDisplay = profile?.first_name || childKey
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    try {
      await Promise.all([
        fetch('/api/kids/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'flag_sick_day', kid: childKey, date: today }),
        }),
        fetch('/api/kids/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_message',
            kid: childKey,
            message: `${childDisplay} said they're not feeling well today — sick day flagged and deductions paused.`,
            auto: true,
          }),
        }),
      ])
      setSickSubmitted(true)
      sessionStorage.setItem(`sick-day-${childKey}-${today}`, '1')
    } catch (err) {
      console.error('Sick day error:', err)
    } finally {
      setSickSubmitting(false)
      setSickConfirmOpen(false)
    }
  }

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

        {/* Mom's Availability */}
        <MomAvailabilityBadge status={lolaStatus.status} note={lolaStatus.note} />

        {/* Sick Day Button */}
        <div className="relative">
          {sickSubmitted ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm bg-gray-50 rounded-lg px-4 py-2 border">
              <Thermometer className="w-4 h-4" />
              <span>Mom has been notified</span>
            </div>
          ) : sickConfirmOpen ? (
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <p className="text-sm font-medium text-gray-800 mb-3">Tell Mom you&apos;re sick today?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSickDay}
                  disabled={sickSubmitting}
                  className="bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-600 disabled:opacity-50"
                >
                  {sickSubmitting ? 'Sending...' : 'Yes, tell Mom'}
                </button>
                <button
                  onClick={() => setSickConfirmOpen(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
                >
                  Never mind
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setSickConfirmOpen(true)}
              className="flex items-center gap-2 text-sm text-gray-500 bg-white rounded-lg px-4 py-2 border hover:bg-gray-50 transition-colors"
            >
              <Thermometer className="w-4 h-4" />
              <span>I&apos;m not feeling well</span>
            </button>
          )}
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

        {/* My Points — large balance card above schedule */}
        <KidPointsCard childName={profile.first_name || ''} />

        {/* Tonight's Dinner */}
        <TonightsDinnerCard />

        {/* Dinner Manager Card — only on kid's assigned day */}
        {isMyDinnerDay && todaysDinner && mealRequestLoaded && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 shadow-sm p-4">
            {myMealRequest?.status === 'approved' ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Tonight&apos;s dinner: {myMealRequest.meal_name}{myMealRequest.sub_option_label ? ` — ${myMealRequest.sub_option_label}` : ''}</p>
                  <p className="text-xs text-green-600 mt-0.5">Approved by Mom{myMealRequest.sub_option_heat ? ` · ${myMealRequest.sub_option_heat === 'hot' ? '🔥 Hot' : '😌 Mild'}` : ''}{(myMealRequest.selected_starch || myMealRequest.selected_veggie) ? ` · ${[myMealRequest.selected_starch, myMealRequest.selected_veggie].filter(Boolean).join(' + ')}` : ''}</p>
                </div>
              </div>
            ) : myMealRequest?.status === 'pending' ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Your pick is waiting for approval</p>
                  <p className="text-xs text-amber-600 mt-0.5">{myMealRequest.meal_name}{myMealRequest.sub_option_label ? ` — ${myMealRequest.sub_option_label}` : ''}{(myMealRequest.selected_starch || myMealRequest.selected_veggie) ? ` · ${[myMealRequest.selected_starch, myMealRequest.selected_veggie].filter(Boolean).join(' + ')}` : ''} — {todaysDinner.label} {todaysDinner.emoji}</p>
                </div>
              </div>
            ) : myMealRequest?.status === 'swapped' ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Tonight&apos;s dinner: {myMealRequest.meal_name}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Mom swapped to a different meal</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🍽️</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">You&apos;re Dinner Manager Tonight!</p>
                    <p className="text-xs text-gray-600">Theme: {todaysDinner.label} {todaysDinner.emoji}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMealPickerOpen(true)}
                  className="w-full bg-orange-500 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Pick Your Meal
                </button>
              </>
            )}
          </div>
        )}

        {/* Meal Picker Modal */}
        {mealPickerOpen && todaysDinner && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMealPickerOpen(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-slideUp">
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">What&apos;s for dinner?</h3>
                  <p className="text-sm text-gray-500">{todaysDinner.label} {todaysDinner.emoji}</p>
                </div>
                <button onClick={() => setMealPickerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {availableMeals.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Utensils className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No meals available for this theme yet</p>
                  </div>
                ) : (
                  <>
                    {/* Surprise Me button */}
                    <button
                      onClick={() => {
                        const randomMeal = availableMeals[Math.floor(Math.random() * availableMeals.length)]
                        if (randomMeal) {
                          setSurpriseMealId(randomMeal.id)
                          setExpandedMealId(randomMeal.id)
                          if (randomMeal.sides_starch_options?.length) setSelectedStarch(randomMeal.sides_starch_options[Math.floor(Math.random() * randomMeal.sides_starch_options.length)])
                          else setSelectedStarch(null)
                          if (randomMeal.sides_veggie_options?.length) setSelectedVeggie(randomMeal.sides_veggie_options[Math.floor(Math.random() * randomMeal.sides_veggie_options.length)])
                          else setSelectedVeggie(null)
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm"
                    >
                      <Dices className="w-5 h-5" />
                      Surprise Me!
                    </button>

                    {availableMeals.map(meal => {
                      const isExpanded = expandedMealId === meal.id
                      const isSurprise = surpriseMealId === meal.id
                      const hasStarchOptions = meal.sides_starch_options && meal.sides_starch_options.length > 0
                      const hasVeggieOptions = meal.sides_veggie_options && meal.sides_veggie_options.length > 0
                      const hasShuffle = hasStarchOptions || hasVeggieOptions

                      return (
                        <div
                          key={meal.id}
                          className={`bg-gray-50 rounded-lg p-4 border transition-colors ${isSurprise ? 'border-purple-400 ring-2 ring-purple-200' : 'hover:border-orange-300'}`}
                        >
                          <button
                            className="w-full text-left"
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedMealId(null)
                                setSurpriseMealId(null)
                              } else {
                                setExpandedMealId(meal.id)
                                setSurpriseMealId(null)
                                if (hasStarchOptions) setSelectedStarch(meal.sides_starch_options![0])
                                else setSelectedStarch(null)
                                if (hasVeggieOptions) setSelectedVeggie(meal.sides_veggie_options![0])
                                else setSelectedVeggie(null)
                              }
                            }}
                          >
                            <p className="font-medium text-gray-900">{meal.name}</p>
                            {meal.description && <p className="text-xs text-gray-500 mt-1">{meal.description}</p>}
                            {meal.sides && (
                              <p className="text-xs text-gray-500 mt-1">
                                <span className="font-medium text-gray-600">Sides:</span> {meal.sides}
                              </p>
                            )}
                          </button>

                          {/* Shuffle controls — shown when meal is expanded and has shuffle options */}
                          {isExpanded && hasShuffle && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Sides</p>
                              <div className="flex gap-2">
                                {hasStarchOptions && (
                                  <button
                                    onClick={() => {
                                      const opts = meal.sides_starch_options!
                                      const curIdx = opts.indexOf(selectedStarch || '')
                                      setSelectedStarch(opts[(curIdx + 1) % opts.length])
                                    }}
                                    className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium text-amber-900 hover:bg-amber-100 transition-colors"
                                  >
                                    <span>🍚 {selectedStarch}</span>
                                    <Shuffle className="w-4 h-4 text-amber-500" />
                                  </button>
                                )}
                                {hasVeggieOptions && (
                                  <button
                                    onClick={() => {
                                      const opts = meal.sides_veggie_options!
                                      const curIdx = opts.indexOf(selectedVeggie || '')
                                      setSelectedVeggie(opts[(curIdx + 1) % opts.length])
                                    }}
                                    className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-900 hover:bg-green-100 transition-colors"
                                  >
                                    <span>🥗 {selectedVeggie}</span>
                                    <Shuffle className="w-4 h-4 text-green-500" />
                                  </button>
                                )}
                              </div>
                              {hasStarchOptions && hasVeggieOptions && (
                                <button
                                  onClick={() => {
                                    const sOpts = meal.sides_starch_options!
                                    const vOpts = meal.sides_veggie_options!
                                    setSelectedStarch(sOpts[Math.floor(Math.random() * sOpts.length)])
                                    setSelectedVeggie(vOpts[Math.floor(Math.random() * vOpts.length)])
                                  }}
                                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                                >
                                  <Shuffle className="w-3.5 h-3.5" />
                                  Shuffle Both
                                </button>
                              )}
                            </div>
                          )}

                          {/* Sub-picker: pick-one (marinades) or show-all (bar toppings reference) */}
                          {isExpanded && marinadePickerMealId === meal.id ? (
                            <div className="mt-3 space-y-2">
                              {marinadeLoading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                                  <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full" />
                                  Loading...
                                </div>
                              ) : subDisplayType === 'show-all' ? (
                                /* Bar toppings reference card */
                                <div className="space-y-3">
                                  <p className="text-sm font-semibold text-gray-800">Here&apos;s what goes on the {meal.name} 🍽️</p>
                                  {(() => {
                                    const categories = Array.from(new Set(marinadeOptions.map(o => o.category)));
                                    return categories.map(cat => (
                                      <div key={cat}>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{cat}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {marinadeOptions.filter(o => o.category === cat).map(opt => (
                                            <span key={opt.id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                              opt.is_favorite ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                              {opt.is_favorite && <span>⭐</span>}{opt.label}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                  <button
                                    onClick={() => handleMealRequest(meal.id)}
                                    disabled={mealSubmitting}
                                    className="w-full mt-2 bg-orange-500 text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                                  >
                                    {mealSubmitting ? 'Requesting...' : `Request This Bar Night!`}
                                  </button>
                                </div>
                              ) : (
                                /* Pick-one marinade grid */
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold text-gray-800">Pick your marinade 🍗</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {marinadeOptions.map(opt => (
                                      <button
                                        key={opt.id}
                                        onClick={() => handleMealRequest(meal.id, opt.id)}
                                        disabled={mealSubmitting}
                                        className={`text-left p-2.5 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
                                          opt.heat_level === 'hot'
                                            ? 'bg-red-50 border-red-200 hover:border-red-400'
                                            : 'bg-green-50 border-green-200 hover:border-green-400'
                                        }`}
                                      >
                                        <span className="font-medium">{opt.heat_level === 'hot' ? '🔥' : '😌'} {opt.label}</span>
                                        <span className={`block text-xs mt-0.5 ${opt.heat_level === 'hot' ? 'text-red-500' : 'text-green-600'}`}>
                                          {opt.heat_level === 'hot' ? 'Hot' : 'Mild'}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <button
                                onClick={() => setMarinadePickerMealId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                Back to meals
                              </button>
                            </div>
                          ) : isExpanded ? (
                            <button
                              onClick={() => meal.sub_option_count > 0 ? openMarinadePickerForMeal(meal.id) : handleMealRequest(meal.id)}
                              disabled={mealSubmitting}
                              className="mt-3 w-full bg-orange-500 text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                            >
                              {mealSubmitting ? 'Requesting...' : meal.sub_option_count > 0 ? 'Choose Marinade' : 'Request This Meal!'}
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
              <div className="h-8" /> {/* bottom safe area */}
            </div>
          </>
        )}

        {/* Meal Feedback — after dinner, rate the meal */}
        <MealFeedbackCard childName={profile.first_name || ''} />

        {/* Family Events */}
        <FamilyEventsStrip events={familyEvents} countdowns={countdownEvents} />

        {/* Belle Care */}
        <BelleCareCard childName={profile.first_name || ''} />

        {/* School Makeup (Zoey + Kaylee only) */}
        <SchoolMakeupCard childName={profile.first_name || ''} />

        {/* Dinner Manager & Laundry */}
        <DutyCard childName={profile.first_name || ''} />

        {/* Communication Cards */}
        <KidCommunicationCards childName={profile.first_name || ''} />

        {/* Daily Check-In (after 3 PM) */}
        <DailyCheckInCard childName={profile.first_name || ''} />
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
            {(() => {
              const base = [
                { name: 'IXL', url: 'https://www.ixl.com', icon: '📐', desc: 'Math & ELA Practice' },
                { name: 'Khan Academy', url: 'https://www.khanacademy.org', icon: '🎓', desc: 'Video Lessons' },
                { name: 'Google Classroom', url: 'https://classroom.google.com', icon: '📚', desc: 'Assignments' },
              ]
              const k = childKey
              if (k === 'zoey') {
                return [
                  ...base,
                  { name: 'Skillshare', url: 'https://www.skillshare.com', icon: '🎨', desc: 'Art & Creative Classes' },
                  { name: 'CrashCourse Art', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOPRKzVLY0jJY-uHOH9KVU6', icon: '🖼️', desc: 'Art History Videos' },
                  { name: 'NASA Kids', url: 'https://www.nasa.gov/stem', icon: '🚀', desc: 'Space & STEM' },
                  { name: 'NHM', url: 'https://www.nhm.ac.uk', icon: '🏛️', desc: 'Natural History Museum' },
                  { name: 'Scholastic Art Awards', url: 'https://www.artandwriting.org', icon: '🏆', desc: 'Art Competitions' },
                  { name: 'Code.org', url: 'https://code.org', icon: '💻', desc: 'Learn to Code' },
                  { name: 'CrashCourse', url: 'https://www.youtube.com/@CrashCourse', icon: '📺', desc: 'Video Lessons' },
                ]
              }
              if (k === 'kaylee') {
                return [
                  ...base,
                  { name: 'Code.org', url: 'https://code.org', icon: '💻', desc: 'Learn to Code' },
                  { name: 'CrashCourse', url: 'https://www.youtube.com/@CrashCourse', icon: '📺', desc: 'Video Lessons' },
                ]
              }
              if (k === 'amos') {
                return [
                  ...base,
                  { name: 'Code.org', url: 'https://code.org', icon: '💻', desc: 'Learn to Code' },
                  { name: 'CrashCourse', url: 'https://www.youtube.com/@CrashCourse', icon: '📺', desc: 'Video Lessons' },
                ]
              }
              if (k === 'ellie' || k === 'hannah') {
                return [
                  ...base,
                  { name: 'Code.org', url: 'https://code.org', icon: '💻', desc: 'Learn to Code' },
                  { name: 'CrashCourse', url: 'https://www.youtube.com/@CrashCourse', icon: '📺', desc: 'Video Lessons' },
                ]
              }
              return base
            })().map(link => (
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

        {/* School Notes */}
        <KidSchoolNotesCard childName={profile.first_name || ''} />
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
              { name: 'Code.org', url: 'https://code.org', icon: '💻', desc: 'Learn to Code' },
              { name: 'CrashCourse', url: 'https://www.youtube.com/@CrashCourse', icon: '📺', desc: 'Video Lessons' },
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

        {/* School Notes */}
        <KidSchoolNotesCard childName={profile.first_name || ''} />
      </div>
    )
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard()
      case 'school':
        return renderSchoolTab()
      case 'portfolio':
        return <LearningPortfolioTab childName={profile.first_name || profile.name} />
      case 'about':
        return <AboutMeTab childAge={profile.age || 10} childId={profile.id} childName={profile.first_name || profile.name} />
      case 'health':
        return (
          <div className="space-y-6">
            <RegulationToolsCard />
            <KidHealthTab childName={profile.first_name || profile.name} />
          </div>
        )
      case 'checklist':
        return <DailyChecklist childName={profile.first_name || profile.name} />
      case 'calendar':
        return <KidCalendarTab childName={profile.first_name || profile.name} />
      case 'achievements':
        return <AchievementsTab childName={profile.first_name || profile.name} />
      case 'goals':
        return <GoalsTab childName={profile.first_name || profile.name} />
      case 'opportunities':
        return <OpportunitiesTab childName={profile.first_name || profile.name} />
      case 'requests':
        return <KidRequestsTab childName={profile.first_name || profile.name} />
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

      {/* Break Button — visible on all tabs */}
      <BreakButton childName={profile.first_name || ''} />
    </div>
  )
}