'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, ChevronRight, AlertTriangle } from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

interface CalEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  all_day: boolean
  calendar_name: string
  location: string | null
  source: string
}

interface AgendaDay {
  date: string
  events: CalEvent[]
}

const CALENDAR_DOT_COLORS: Record<string, string> = {
  'Household Hub': 'bg-indigo-500',
  'Zoey': 'bg-purple-500',
  'Kaylee': 'bg-pink-500',
  'Amos': 'bg-blue-500',
  'Hannah': 'bg-rose-400',
  'Wyatt': 'bg-green-500',
  'Ellie': 'bg-amber-500',
  'Levi': 'bg-cyan-600',
  'School': 'bg-orange-500',
  'Meal Plan': 'bg-emerald-500',
  'Health': 'bg-red-500',
  'Lola Work': 'bg-gray-500',
}

function getDotColor(name: string): string {
  for (const [key, val] of Object.entries(CALENDAR_DOT_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val
  }
  return 'bg-slate-400'
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDayLabel(dateStr: string): string {
  const d = parseDateLocal(dateStr)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const toDS = (dt: Date) => dt.toLocaleDateString('en-CA')
  if (toDS(d) === toDS(today)) return 'Today'
  if (toDS(d) === toDS(tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function daysUntil(dateStr: string): number {
  const d = parseDateLocal(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface CalendarDashboardCardProps {
  onNavigate?: () => void
}

export default function CalendarDashboardCard({ onNavigate }: CalendarDashboardCardProps) {
  const [agenda, setAgenda] = useState<AgendaDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/calendar-hub?action=get_agenda&days_ahead=14')
      .then(r => r.json())
      .then(data => setAgenda((data.agenda || []).slice(0, 5)))
      .catch(() => setAgenda([]))
      .finally(() => setLoading(false))
  }, [])

  const totalEvents = agenda.reduce((sum, d) => sum + d.events.length, 0)

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-pink-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Coming Up</h3>
            {!loading && <p className="text-xs text-gray-500">{totalEvents} events this week</p>}
          </div>
        </div>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="flex items-center gap-1 text-xs text-pink-600 font-medium hover:text-pink-700 transition-colors"
          >
            View Calendar <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : agenda.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No upcoming events</p>
        ) : (
          <div className="space-y-3">
            {agenda.map(day => (
              <div key={day.date}>
                <div className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                  {formatDayLabel(day.date)}
                  <span className="text-gray-300 font-normal">
                    {day.date !== new Date().toLocaleDateString('en-CA') &&
                      ` \u00b7 ${parseDateLocal(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {day.events.slice(0, 4).map(ev => {
                    const urgent = daysUntil(day.date) <= 7 && !ev.all_day
                    return (
                      <div key={ev.id} className="flex items-start gap-2 group">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getDotColor(ev.calendar_name)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {urgent && daysUntil(day.date) <= 1 && (
                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-800 truncate">{ev.title}</span>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            {!ev.all_day && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {formatTime(ev.start_time)}
                              </span>
                            )}
                            {ev.all_day && <span>All day</span>}
                            {ev.location && (
                              <span className="flex items-center gap-0.5 truncate">
                                <MapPin className="w-3 h-3" />
                                {ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {day.events.length > 4 && (
                    <div className="text-xs text-gray-400 pl-4">+{day.events.length - 4} more</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
