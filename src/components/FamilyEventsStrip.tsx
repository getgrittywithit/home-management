'use client'

import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

interface FamilyEvent {
  id: number
  title: string
  start_time: string
  location: string | null
  event_type: string | null
}

interface CountdownEvent {
  id: number
  countdown_label: string
  start_time: string
  days_away: number
}

const TYPE_DOTS: Record<string, string> = {
  medical: 'bg-red-400', activity: 'bg-blue-400', social: 'bg-green-400',
}

const COUNTDOWN_COLORS = [
  'from-amber-400 to-orange-400',
  'from-purple-400 to-indigo-400',
  'from-blue-400 to-cyan-400',
]

function formatDaysAway(days: number): string {
  if (days <= 0) return 'Today!'
  if (days === 1) return 'Tomorrow!'
  if (days >= 30) return `${Math.round(days / 7)} weeks away`
  return `${days} days away`
}

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatEventTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function FamilyEventsStrip({ events, countdowns }: { events: FamilyEvent[]; countdowns: CountdownEvent[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? events.slice(0, 10) : events.slice(0, 5)

  return (
    <>
      {/* Countdown Cards */}
      {countdowns.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {countdowns.map((cd, i) => (
            <div key={cd.id} className={`bg-gradient-to-r ${COUNTDOWN_COLORS[i % COUNTDOWN_COLORS.length]} text-white rounded-lg p-4 min-w-[180px] flex-shrink-0`}>
              <p className="font-bold text-sm">{cd.countdown_label}</p>
              <p className="text-lg font-bold mt-1">{formatDaysAway(cd.days_away)}</p>
              <p className="text-xs opacity-80">{formatEventDate(cd.start_time)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Events Strip */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-gray-900">Coming Up</h3>
        </div>
        {shown.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">Nothing on the family calendar this week</div>
        ) : (
          <div className="divide-y">
            {shown.map(ev => (
              <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${TYPE_DOTS[ev.event_type || ''] || 'bg-gray-400'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                  <p className="text-xs text-gray-500">
                    {formatEventDate(ev.start_time)} · {formatEventTime(ev.start_time)}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {events.length > 5 && (
          <button onClick={() => setExpanded(!expanded)} className="w-full p-2 text-xs text-indigo-600 hover:bg-gray-50 flex items-center justify-center gap-1">
            {expanded ? 'Show less' : 'See more'} <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
    </>
  )
}
