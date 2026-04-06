'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Calendar, List } from 'lucide-react'

interface CalEvent {
  id: number; title: string; start: string; end: string
  calendar_name: string; calendar_color: string
  all_day: boolean; location: string; description: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
  } catch { return '' }
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function CalendarView() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)

  useEffect(() => { fetchEvents() }, [currentDate, viewMode])

  const fetchEvents = async () => {
    setLoading(true)
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    if (viewMode === 'week') {
      start.setDate(start.getDate() - start.getDay())
      end.setDate(start.getDate() + 6)
    } else {
      start.setDate(1)
      end.setMonth(end.getMonth() + 1, 0)
    }

    const startStr = start.toLocaleDateString('en-CA')
    const endStr = end.toLocaleDateString('en-CA')

    const res = await fetch(`/api/calendar?action=get_events&start_date=${startStr}&end_date=${endStr}`)
      .then(r => r.json()).catch(() => ({ events: [] }))
    setEvents(res.events || [])
    setLoading(false)
  }

  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  // Get unique calendar names for legend
  const calendars = Array.from(new Set(events.map(e => e.calendar_name))).map(name => {
    const ev = events.find(e => e.calendar_name === name)
    return { name, color: ev?.calendar_color || '#4285f4' }
  })

  // Header label
  const headerLabel = viewMode === 'week'
    ? (() => {
        const s = new Date(currentDate); s.setDate(s.getDate() - s.getDay())
        const e = new Date(s); e.setDate(e.getDate() + 6)
        return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2013 ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      })()
    : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border text-xs">
            <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 font-medium ${viewMode === 'week' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600'}`}>Week</button>
            <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 font-medium ${viewMode === 'month' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600'}`}>Month</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={goToday} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 px-2">Today</button>
          <button onClick={() => navigate(1)} className="p-1.5 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-gray-900 min-w-[180px] text-center">{headerLabel}</span>
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}

      {!loading && viewMode === 'week' && <WeekView events={events} currentDate={currentDate} onSelect={setSelectedEvent} />}
      {!loading && viewMode === 'month' && <MonthView events={events} currentDate={currentDate} onSelect={setSelectedEvent} />}

      {/* Event popover */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-lg shadow-xl p-5 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedEvent.calendar_color }} />
              <span className="text-xs text-gray-500">{selectedEvent.calendar_name}</span>
            </div>
            <h3 className="font-semibold text-gray-900">{selectedEvent.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedEvent.all_day ? 'All day' : `${formatTime(selectedEvent.start)} \u2013 ${formatTime(selectedEvent.end)}`}
            </p>
            {selectedEvent.location && <p className="text-sm text-gray-500 mt-1">{'\uD83D\uDCCD'} {selectedEvent.location}</p>}
            {selectedEvent.description && <p className="text-sm text-gray-600 mt-2">{selectedEvent.description}</p>}
            <button onClick={() => setSelectedEvent(null)} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700">Close</button>
          </div>
        </div>
      )}

      {/* Color legend */}
      {calendars.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          {calendars.map(c => (
            <div key={c.name} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Week View ──
function WeekView({ events, currentDate, onSelect }: { events: CalEvent[]; currentDate: Date; onSelect: (e: CalEvent) => void }) {
  const weekStart = new Date(currentDate)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const today = new Date()

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border">
      {days.map((day, i) => {
        const dayEvents = events.filter(e => {
          const eDate = new Date(e.start)
          return isSameDay(eDate, day)
        })
        const isToday = isSameDay(day, today)
        return (
          <div key={i} className={`bg-white min-h-[120px] p-2 ${isToday ? 'bg-blue-50' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{DAYS[i]}</span>
              <span className={`text-sm font-medium ${isToday ? 'bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
                {day.getDate()}
              </span>
            </div>
            <div className="space-y-0.5">
              {dayEvents.slice(0, 4).map(ev => (
                <button key={ev.id} onClick={() => onSelect(ev)}
                  className="w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate hover:opacity-80"
                  style={{ backgroundColor: ev.calendar_color + '22', color: ev.calendar_color, borderLeft: `2px solid ${ev.calendar_color}` }}>
                  {ev.all_day ? ev.title : `${formatTime(ev.start)} ${ev.title}`}
                </button>
              ))}
              {dayEvents.length > 4 && <p className="text-[10px] text-gray-400 text-center">+{dayEvents.length - 4} more</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Month View ──
function MonthView({ events, currentDate, onSelect }: { events: CalEvent[]; currentDate: Date; onSelect: (e: CalEvent) => void }) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div className="grid grid-cols-7 gap-px mb-px">
        {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="bg-gray-50 min-h-[80px]" />
          const cellDate = new Date(year, month, day)
          const dayEvents = events.filter(e => isSameDay(new Date(e.start), cellDate))
          const isToday = isSameDay(cellDate, today)
          return (
            <div key={i} className={`bg-white min-h-[80px] p-1 ${isToday ? 'bg-blue-50' : ''}`}>
              <span className={`text-xs ${isToday ? 'bg-indigo-500 text-white w-5 h-5 rounded-full inline-flex items-center justify-center' : 'text-gray-700'}`}>
                {day}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <button key={ev.id} onClick={() => onSelect(ev)}
                    className="w-full text-[9px] leading-tight truncate rounded px-0.5 hover:opacity-80"
                    style={{ backgroundColor: ev.calendar_color + '22', color: ev.calendar_color }}>
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && <p className="text-[9px] text-gray-400 text-center">+{dayEvents.length - 3}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
