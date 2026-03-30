'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Plus, X,
  Settings2, Filter, Utensils, GraduationCap, Heart, Eye, EyeOff,
  ChefHat, BookOpen, Stethoscope, Sun, Sunset, Moon
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  all_day: boolean
  calendar_name: string
  calendar_id: string | null
  location: string | null
  description: string | null
  source: string // 'google' | 'meals' | 'school' | 'health'
}

interface AgendaDay {
  date: string
  events: CalEvent[]
}

type ViewMode = 'today' | 'week' | 'month' | 'agenda'

// ─── Color map ──────────────────────────────────────────────────────────────

const CALENDAR_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  'Household Hub':    { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  border: 'border-indigo-500' },
  'Zoey':            { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  border: 'border-purple-500' },
  'Kaylee':          { bg: 'bg-pink-50',    text: 'text-pink-700',    dot: 'bg-pink-500',    border: 'border-pink-500' },
  'Amos':            { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-500' },
  'Hannah':          { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-400',    border: 'border-rose-400' },
  'Wyatt':           { bg: 'bg-green-50',   text: 'text-green-700',   dot: 'bg-green-500',   border: 'border-green-500' },
  'Ellie':           { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-500' },
  'Levi':            { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-600',    border: 'border-cyan-600' },
  'Champion High':   { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-600',    border: 'border-blue-600' },
  'BMSN':            { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-500',    border: 'border-teal-500' },
  'BISD':            { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500',     border: 'border-sky-500' },
  'School':          { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  border: 'border-orange-500' },
  'Meal Plan':       { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-500' },
  'Health':          { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     border: 'border-red-500' },
  'Lola Work':       { bg: 'bg-gray-50',    text: 'text-gray-700',    dot: 'bg-gray-500',    border: 'border-gray-500' },
  'Local Adventures': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-500' },
  'Finance':         { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  border: 'border-violet-500' },
}

const DEFAULT_COLOR = { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400', border: 'border-slate-400' }

function getCalColor(name: string) {
  for (const [key, val] of Object.entries(CALENDAR_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val
  }
  return DEFAULT_COLOR
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA')
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (toDateStr(d) === toDateStr(today)) return 'Today'
  if (toDateStr(d) === toDateStr(tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
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

function getTimeOfDay(iso: string): 'morning' | 'afternoon' | 'evening' {
  const h = new Date(iso).getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function sourceIcon(source: string) {
  switch (source) {
    case 'meals': return <ChefHat className="w-3.5 h-3.5" />
    case 'school': return <GraduationCap className="w-3.5 h-3.5" />
    case 'health': return <Stethoscope className="w-3.5 h-3.5" />
    default: return null
  }
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const QUICK_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'kids', label: 'Kids Only' },
  { id: 'work', label: 'Work' },
  { id: 'health', label: 'Health' },
  { id: 'family', label: 'Family' },
]

const KIDS_CALENDARS = ['Zoey', 'Kaylee', 'Amos', 'Hannah', 'Wyatt', 'Ellie', 'School', 'Champion High', 'BMSN', 'BISD']
const WORK_CALENDARS = ['Lola Work', 'Finance']
const HEALTH_CALENDARS = ['Health']
const FAMILY_CALENDARS = ['Household Hub', 'Local Adventures', 'Meal Plan']

// ─── Quick filter logic ─────────────────────────────────────────────────────

function matchesQuickFilter(calName: string, filter: string): boolean {
  if (filter === 'all') return true
  const lower = calName.toLowerCase()
  if (filter === 'kids') return KIDS_CALENDARS.some(k => lower.includes(k.toLowerCase()))
  if (filter === 'work') return WORK_CALENDARS.some(k => lower.includes(k.toLowerCase()))
  if (filter === 'health') return HEALTH_CALENDARS.some(k => lower.includes(k.toLowerCase()))
  if (filter === 'family') return FAMILY_CALENDARS.some(k => lower.includes(k.toLowerCase()))
  return true
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FamilyCalendarTab() {
  const [view, setView] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [agenda, setAgenda] = useState<AgendaDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Layer controls
  const [showLayers, setShowLayers] = useState(false)
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(new Set())
  const [quickFilter, setQuickFilter] = useState('all')

  // Event detail modal
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)

  // Quick add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '', date: toDateStr(new Date()), time: '12:00', end_time: '13:00',
    all_day: false, calendar_name: 'Household Hub', location: '', description: '',
  })
  const [saving, setSaving] = useState(false)

  // All unique calendar names for layer panel
  const [allCalendarNames, setAllCalendarNames] = useState<string[]>([])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let start: string, end: string

      if (view === 'today') {
        start = toDateStr(new Date())
        end = start
      } else if (view === 'week') {
        const sun = getSunday(currentDate)
        start = toDateStr(sun)
        end = toDateStr(addDays(sun, 6))
      } else if (view === 'month') {
        const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        // Extend to fill calendar grid
        const startDay = new Date(first)
        startDay.setDate(startDay.getDate() - startDay.getDay())
        const endDay = new Date(last)
        endDay.setDate(endDay.getDate() + (6 - endDay.getDay()))
        start = toDateStr(startDay)
        end = toDateStr(endDay)
      } else {
        // agenda
        start = toDateStr(new Date())
        const endDate = addDays(new Date(), 60)
        end = toDateStr(endDate)
      }

      if (view === 'agenda') {
        const res = await fetch(`/api/calendar-hub?action=get_agenda&days_ahead=60`)
        if (!res.ok) throw new Error('Failed to fetch agenda')
        const data = await res.json()
        setAgenda(data.agenda || [])
        // Extract all calendar names from agenda
        const names = new Set<string>()
        ;(data.agenda || []).forEach((day: AgendaDay) =>
          day.events.forEach(ev => names.add(ev.calendar_name))
        )
        setAllCalendarNames(prev => {
          const arr = prev.slice()
          names.forEach(n => { if (!arr.includes(n)) arr.push(n) })
          return arr.sort()
        })
      } else {
        const res = await fetch(`/api/calendar-hub?action=get_calendar_events&start=${start}&end=${end}`)
        if (!res.ok) throw new Error('Failed to fetch events')
        const data = await res.json()
        setEvents(data.events || [])
        // Extract calendar names
        const names = new Set<string>()
        ;(data.events || []).forEach((ev: CalEvent) => names.add(ev.calendar_name))
        setAllCalendarNames(prev => {
          const arr = prev.slice()
          names.forEach(n => { if (!arr.includes(n)) arr.push(n) })
          return arr.sort()
        })
      }
    } catch {
      setError("Couldn't load calendar. Check your connection.")
      setEvents([])
      setAgenda([])
    } finally {
      setLoading(false)
    }
  }, [view, currentDate])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // ── Filtering ─────────────────────────────────────────────────────────────

  function isVisible(ev: CalEvent): boolean {
    if (hiddenCalendars.has(ev.calendar_name)) return false
    if (quickFilter !== 'all' && !matchesQuickFilter(ev.calendar_name, quickFilter)) return false
    return true
  }

  const filteredEvents = events.filter(isVisible)

  function eventsForDay(day: Date): CalEvent[] {
    return filteredEvents.filter(ev => {
      const evDate = new Date(ev.start_time)
      return isSameDay(evDate, day)
    })
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  const goToday = () => setCurrentDate(new Date())

  const goPrev = () => {
    if (view === 'week' || view === 'today') setCurrentDate(prev => addDays(prev, -7))
    else if (view === 'month') setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goNext = () => {
    if (view === 'week' || view === 'today') setCurrentDate(prev => addDays(prev, 7))
    else if (view === 'month') setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const headerLabel = view === 'today'
    ? formatFullDate(new Date().toISOString())
    : view === 'week'
      ? (() => {
          const sun = getSunday(currentDate)
          const sat = addDays(sun, 6)
          return `${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        })()
      : view === 'month'
        ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        : 'Next 60 Days'

  // ── Quick add ─────────────────────────────────────────────────────────────

  async function handleCreateEvent() {
    if (!newEvent.title.trim()) return
    setSaving(true)
    try {
      const startTime = newEvent.all_day
        ? `${newEvent.date}T00:00:00`
        : `${newEvent.date}T${newEvent.time}:00`
      const endTime = newEvent.all_day
        ? `${newEvent.date}T23:59:59`
        : `${newEvent.date}T${newEvent.end_time}:00`

      const res = await fetch('/api/calendar-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_event',
          title: newEvent.title,
          start_time: startTime,
          end_time: endTime,
          all_day: newEvent.all_day,
          calendar_name: newEvent.calendar_name,
          location: newEvent.location || null,
          description: newEvent.description || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      setShowAddModal(false)
      setNewEvent({ title: '', date: toDateStr(new Date()), time: '12:00', end_time: '13:00', all_day: false, calendar_name: 'Household Hub', location: '', description: '' })
      fetchEvents()
    } catch {
      setError('Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────

  function Skeleton({ rows = 5 }: { rows?: number }) {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  // ── Today View ────────────────────────────────────────────────────────────

  function renderTodayView() {
    if (loading) return <Skeleton rows={6} />
    const today = new Date()
    const todayEvents = filteredEvents.filter(ev => isSameDay(new Date(ev.start_time), today))

    const allDayEvents = todayEvents.filter(ev => ev.all_day)
    const timedEvents = todayEvents.filter(ev => !ev.all_day)

    const morning = timedEvents.filter(ev => getTimeOfDay(ev.start_time) === 'morning')
    const afternoon = timedEvents.filter(ev => getTimeOfDay(ev.start_time) === 'afternoon')
    const evening = timedEvents.filter(ev => getTimeOfDay(ev.start_time) === 'evening')

    const sections = [
      { label: 'All Day', icon: <Calendar className="w-4 h-4" />, items: allDayEvents },
      { label: 'Morning', icon: <Sun className="w-4 h-4 text-amber-500" />, items: morning },
      { label: 'Afternoon', icon: <Sunset className="w-4 h-4 text-orange-500" />, items: afternoon },
      { label: 'Evening', icon: <Moon className="w-4 h-4 text-indigo-500" />, items: evening },
    ]

    if (todayEvents.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No events today</p>
          <p className="text-sm mt-1">Enjoy your free day!</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {sections.map(section => {
          if (section.items.length === 0) return null
          return (
            <div key={section.label}>
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {section.icon}
                {section.label}
              </div>
              <div className="space-y-2">
                {section.items.map(ev => {
                  const color = getCalColor(ev.calendar_name)
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border-l-4 ${color.border} ${color.bg} hover:opacity-90 transition-opacity`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {sourceIcon(ev.source)}
                          <span className={`font-medium text-sm ${color.text}`}>{ev.title}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {!ev.all_day && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(ev.start_time)} - {formatTime(ev.end_time)}
                            </span>
                          )}
                          {ev.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3" />
                              {ev.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{ev.calendar_name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Week View ─────────────────────────────────────────────────────────────

  function renderWeekView() {
    if (loading) return <Skeleton rows={7} />

    const sunday = getSunday(currentDate)
    const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i))
    const today = new Date()

    // Current time indicator position (percentage of day)
    const now = new Date()
    const currentHourPct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100

    return (
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          const dayEvents = eventsForDay(day)
          return (
            <div key={i} className={`min-h-[140px] rounded-lg ${isToday ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-gray-50'}`}>
              <div className={`text-center text-xs font-semibold py-1.5 rounded-t-lg ${isToday ? 'bg-blue-600 text-white' : 'text-gray-500 bg-gray-100'}`}>
                <div>{DAY_NAMES[i]}</div>
                <div className="text-base">{day.getDate()}</div>
              </div>
              <div className="relative p-1 space-y-1">
                {isToday && (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
                    style={{ top: `${Math.max(currentHourPct, 5)}%` }}
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full -mt-1 -ml-1" />
                  </div>
                )}
                {dayEvents.length === 0 && (
                  <div className="text-center text-gray-300 text-xs py-4">--</div>
                )}
                {dayEvents.slice(0, 4).map(ev => {
                  const color = getCalColor(ev.calendar_name)
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`w-full text-left text-xs p-1.5 rounded border-l-3 ${color.border} border-l-4 bg-white shadow-sm hover:shadow-md transition-shadow truncate`}
                    >
                      {!ev.all_day && (
                        <div className="text-gray-400 text-[10px] font-medium">{formatTime(ev.start_time)}</div>
                      )}
                      <div className="text-gray-800 font-medium truncate flex items-center gap-1">
                        {sourceIcon(ev.source)}
                        <span className="truncate">{ev.title}</span>
                      </div>
                    </button>
                  )
                })}
                {dayEvents.length > 4 && (
                  <div className="text-[10px] text-gray-400 text-center font-medium">
                    +{dayEvents.length - 4} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Month View ────────────────────────────────────────────────────────────

  function renderMonthView() {
    if (loading) return <Skeleton rows={8} />

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    const cells: (Date | null)[] = []
    for (let i = 0; i < startOffset; i++) cells.push(addDays(firstDay, i - startOffset))
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(addDays(new Date(year, month, daysInMonth), cells.length - startOffset - daysInMonth + 1))

    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const inMonth = day.getMonth() === month
            const isToday = isSameDay(day, today)
            const dayEvents = eventsForDay(day)
            const MAX_SHOWN = 3

            return (
              <div
                key={i}
                className={`min-h-[80px] p-1 rounded transition-colors cursor-default ${
                  inMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
              >
                <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-blue-600 font-bold' : inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, MAX_SHOWN).map(ev => {
                    const color = getCalColor(ev.calendar_name)
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded ${color.bg} ${color.text} truncate hover:opacity-80`}
                      >
                        {ev.title}
                      </button>
                    )
                  })}
                  {dayEvents.length > MAX_SHOWN && (
                    <div className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - MAX_SHOWN} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Agenda View ───────────────────────────────────────────────────────────

  function renderAgendaView() {
    if (loading) return <Skeleton rows={10} />

    const filteredAgenda = agenda
      .map(day => ({
        ...day,
        events: day.events.filter(isVisible),
      }))
      .filter(day => day.events.length > 0)

    if (filteredAgenda.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No upcoming events</p>
        </div>
      )
    }

    return (
      <div className="space-y-1 max-h-[70vh] overflow-y-auto">
        {filteredAgenda.map(day => (
          <div key={day.date}>
            {/* Sticky date header */}
            <div className="sticky top-0 z-10 bg-gray-100 px-3 py-2 rounded-lg font-semibold text-sm text-gray-700 border-b">
              {formatDayHeader(day.date)}
              <span className="text-gray-400 font-normal ml-2">
                {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="space-y-1 py-1 pl-2">
              {day.events.map(ev => {
                const color = getCalColor(ev.calendar_name)
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg border-l-4 ${color.border} hover:bg-gray-50 transition-colors`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${color.dot} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {sourceIcon(ev.source)}
                        <span className="font-medium text-sm text-gray-900 truncate">{ev.title}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {ev.all_day ? 'All day' : `${formatTime(ev.start_time)} - ${formatTime(ev.end_time)}`}
                        {ev.location && ` \u00b7 ${ev.location}`}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{ev.calendar_name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Event Detail Modal ────────────────────────────────────────────────────

  function renderEventModal() {
    if (!selectedEvent) return null
    const ev = selectedEvent
    const color = getCalColor(ev.calendar_name)

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setSelectedEvent(null)}>
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom"
          onClick={e => e.stopPropagation()}
        >
          {/* Color bar */}
          <div className={`h-2 rounded-t-2xl sm:rounded-t-2xl ${color.dot}`} />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {sourceIcon(ev.source)}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                    {ev.calendar_name}
                  </span>
                  {ev.source !== 'google' && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{ev.source}</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{ev.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{formatFullDate(ev.start_time)}</span>
              </div>

              {!ev.all_day && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{formatTime(ev.start_time)} - {formatTime(ev.end_time)}</span>
                </div>
              )}
              {ev.all_day && (
                <div className="flex items-center gap-3 text-gray-500">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>All day</span>
                </div>
              )}

              {ev.location && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{ev.location}</span>
                </div>
              )}

              {ev.description && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-gray-600 text-sm whitespace-pre-wrap">
                  {ev.description}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Layer Controls Panel ──────────────────────────────────────────────────

  function renderLayerPanel() {
    if (!showLayers) return null

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowLayers(false)}>
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Calendar Layers</h3>
              <button onClick={() => setShowLayers(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Quick filters */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Quick Filters</div>
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setQuickFilter(f.id)}
                    className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                      quickFilter === f.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual calendar toggles */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Calendars</div>
              <div className="space-y-1">
                {allCalendarNames.map(name => {
                  const color = getCalColor(name)
                  const hidden = hiddenCalendars.has(name)
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        const next = new Set(hiddenCalendars)
                        if (hidden) next.delete(name)
                        else next.add(name)
                        setHiddenCalendars(next)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        hidden ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${color.dot}`} />
                      <span className="flex-1 text-left font-medium text-gray-700">{name}</span>
                      {hidden ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Quick Add Modal ───────────────────────────────────────────────────────

  function renderAddModal() {
    if (!showAddModal) return null

    const calendarOptions = ['Household Hub', 'Zoey', 'Kaylee', 'Amos', 'Hannah', 'Wyatt', 'Ellie', 'Levi', 'Lola Work', 'School', 'Health', 'Local Adventures']

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">New Event</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  placeholder="Event title..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* All day toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newEvent.all_day}
                  onChange={e => setNewEvent(p => ({ ...p, all_day: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">All day event</span>
              </label>

              {/* Time */}
              {!newEvent.all_day && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={newEvent.end_time}
                      onChange={e => setNewEvent(p => ({ ...p, end_time: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Calendar selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calendar</label>
                <select
                  value={newEvent.calendar_name}
                  onChange={e => setNewEvent(p => ({ ...p, calendar_name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {calendarOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                  placeholder="Optional location..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleCreateEvent}
                disabled={!newEvent.title.trim() || saving}
                className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
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
          {/* View switcher */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['today', 'week', 'month', 'agenda'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); if (v === 'today') setCurrentDate(new Date()) }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          {view !== 'agenda' && (
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
          )}

          {/* Right side: date label + layer toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">{headerLabel}</span>
            <button
              onClick={() => setShowLayers(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              title="Calendar layers"
            >
              <Settings2 className="w-5 h-5 text-gray-500" />
              {(hiddenCalendars.size > 0 || quickFilter !== 'all') && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
          <button onClick={fetchEvents} className="ml-2 underline text-red-600 hover:text-red-800">Retry</button>
        </div>
      )}

      {/* Calendar view */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        {view === 'today' && renderTodayView()}
        {view === 'week' && renderWeekView()}
        {view === 'month' && renderMonthView()}
        {view === 'agenda' && renderAgendaView()}
      </div>

      {/* FAB: Quick Add */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        title="Add event"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modals */}
      {renderEventModal()}
      {renderLayerPanel()}
      {renderAddModal()}
    </div>
  )
}
