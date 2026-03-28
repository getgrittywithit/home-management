'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'

interface CalEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  calendar_name: string
  location: string | null
  description: string | null
}

const CALENDAR_COLORS: Record<string, string> = {
  'Household Hub': 'bg-indigo-500',
  'Zoey': 'bg-purple-500',
  'Kaylee': 'bg-pink-500',
  'Amos': 'bg-blue-500',
  'Hannah': 'bg-rose-400',
  'Wyatt': 'bg-green-500',
  'Ellie': 'bg-amber-500',
  'Champion High': 'bg-blue-600',
  'BMSN': 'bg-teal-500',
  'BISD': 'bg-blue-500',
  'School': 'bg-blue-500',
  'Primary': 'bg-violet-500',
  'Chores': 'bg-amber-600',
  'Meal Plan': 'bg-orange-500',
  'Pet': 'bg-red-400',
  'Levi': 'bg-cyan-600',
  'Lola Work': 'bg-gray-500',
  'Local Adventures': 'bg-emerald-500',
  'Finance': 'bg-purple-600',
}
const DEFAULT_COLOR = 'bg-slate-400'

function getCalColor(name: string) {
  for (const [key, val] of Object.entries(CALENDAR_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val
  }
  return DEFAULT_COLOR
}

function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatUpcomingDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getSunday(d: Date): Date {
  const result = new Date(d)
  result.setDate(result.getDate() - result.getDay())
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Skeleton loaders
function WeekSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-16 bg-gray-100 rounded animate-pulse" />
          <div className="h-12 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function MonthSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  )
}

function UpcomingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  )
}

export default function CalendarTab() {
  const [view, setView] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [upcoming, setUpcoming] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/parent/calendar?action=list_events&view=${view}&date=${toDateStr(currentDate)}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setEvents(data.events || [])
    } catch {
      setError("Couldn't load calendar — check connection")
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [view, currentDate])

  const fetchUpcoming = useCallback(async () => {
    setUpcomingLoading(true)
    try {
      const res = await fetch('/api/parent/calendar?action=upcoming&limit=5')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setUpcoming(data.events || [])
    } catch {
      setUpcoming([])
    } finally {
      setUpcomingLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])
  useEffect(() => { fetchUpcoming() }, [fetchUpcoming])

  const today = new Date()

  // Navigation
  const goToday = () => setCurrentDate(new Date())

  const goPrev = () => {
    if (view === 'week') {
      setCurrentDate(prev => addDays(prev, -7))
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }
  }

  const goNext = () => {
    if (view === 'week') {
      setCurrentDate(prev => addDays(prev, 7))
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }
  }

  // Helpers to bucket events by day
  function eventsForDay(day: Date): CalEvent[] {
    return events.filter(ev => {
      const evDate = new Date(ev.start)
      return isSameDay(evDate, day)
    })
  }

  // Header label
  const headerLabel = view === 'week'
    ? (() => {
        const sun = getSunday(currentDate)
        const sat = addDays(sun, 6)
        const mo1 = sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const mo2 = sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        return `${mo1} - ${mo2}`
      })()
    : `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  // Week view
  function renderWeekView() {
    if (loading) return <WeekSkeleton />

    const sunday = getSunday(currentDate)
    const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i))

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          const dayEvents = eventsForDay(day)
          return (
            <div key={i} className="min-h-[120px]">
              <div className={`text-center text-xs font-semibold mb-1 py-1 rounded ${isToday ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
                <div>{DAY_NAMES[i]}</div>
                <div className="text-sm">{day.getDate()}</div>
              </div>
              <div className="space-y-1">
                {dayEvents.length === 0 && (
                  <div className="text-center text-gray-300 text-xs py-2">&mdash;</div>
                )}
                {dayEvents.map(ev => (
                  <div
                    key={ev.id}
                    className={`text-xs p-1.5 rounded border-l-3 ${getCalColor(ev.calendar_name)} border-l-4 bg-white shadow-sm`}
                    title={`${ev.title}\n${ev.calendar_name}${ev.location ? '\n' + ev.location : ''}`}
                  >
                    {!ev.allDay && (
                      <div className="text-gray-400 font-medium">{formatTime(ev.start)}</div>
                    )}
                    <div className="text-gray-800 font-medium truncate">{ev.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Month view
  function renderMonthView() {
    if (loading) return <MonthSkeleton />

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay() // 0=Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Build grid: pad start with prev month days, fill current, pad end
    const cells: (Date | null)[] = []
    for (let i = 0; i < startOffset; i++) {
      cells.push(addDays(firstDay, i - startOffset))
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d))
    }
    // Pad to fill last row
    while (cells.length % 7 !== 0) {
      cells.push(addDays(new Date(year, month, daysInMonth), cells.length - startOffset - daysInMonth + 1))
    }

    const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : []

    return (
      <div className="flex gap-4">
        <div className="flex-1">
          {/* Day name headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const inMonth = day.getMonth() === month
              const isToday = isSameDay(day, today)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const dayEvents = eventsForDay(day)
              const maxDots = 3
              const extraCount = dayEvents.length > maxDots ? dayEvents.length - maxDots : 0

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[72px] p-1 rounded text-left transition-colors
                    ${inMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                    ${isToday ? 'bg-blue-50' : ''}
                    hover:bg-gray-100
                  `}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                    {day.getDate()}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, maxDots).map(ev => (
                      <div key={ev.id} className={`w-2 h-2 rounded-full ${getCalColor(ev.calendar_name)}`} />
                    ))}
                  </div>
                  {extraCount > 0 && (
                    <div className="text-[10px] text-gray-400 mt-0.5">+{extraCount} more</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Side detail */}
        {selectedDay && (
          <div className="w-72 shrink-0 bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-gray-400">No events</p>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map(ev => (
                  <div key={ev.id} className={`border-l-4 ${getCalColor(ev.calendar_name)} pl-3 py-1`}>
                    <div className="font-medium text-sm text-gray-900">{ev.title}</div>
                    {!ev.allDay && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(ev.start)} - {formatTime(ev.end)}
                      </div>
                    )}
                    {ev.allDay && (
                      <div className="text-xs text-gray-400 mt-0.5">All day</div>
                    )}
                    {ev.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-gray-400 mt-0.5">{ev.calendar_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Upcoming events card
  function renderUpcoming() {
    if (upcomingLoading) return <UpcomingSkeleton />

    if (upcoming.length === 0) {
      return <p className="text-sm text-gray-400">No upcoming events</p>
    }

    return (
      <div className="space-y-2">
        {upcoming.map(ev => (
          <div key={ev.id} className={`flex items-start gap-3 border-l-4 ${getCalColor(ev.calendar_name)} pl-3 py-2`}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{ev.title}</div>
              <div className="text-xs text-gray-500">
                {formatUpcomingDate(ev.start)}
                {!ev.allDay && ` \u00b7 ${formatTime(ev.start)}`}
                {` \u00b7 ${ev.calendar_name}`}
              </div>
              {ev.location && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{ev.location}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Calendar className="w-7 h-7" />
          <div>
            <h1 className="text-2xl font-bold">Family Calendar</h1>
            <p className="text-pink-100">All events across your family calendars</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('week')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Month
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
              Today
            </button>
            <button onClick={goNext} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Date label */}
          <div className="text-lg font-semibold text-gray-800">{headerLabel}</div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Calendar view */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        {view === 'week' ? renderWeekView() : renderMonthView()}
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-pink-500" />
          <h2 className="text-lg font-bold text-gray-900">Upcoming Events</h2>
        </div>
        {renderUpcoming()}
      </div>
    </div>
  )
}
