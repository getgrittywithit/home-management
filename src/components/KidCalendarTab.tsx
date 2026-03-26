'use client'

import { useState, useEffect } from 'react'

interface CalEvent { id: string; summary: string; start: string; end: string; location: string | null }

export default function KidCalendarTab({ childName }: { childName: string }) {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/kids/calendar?days=30')
      .then(r => r.json())
      .then(data => { setEvents(data.events || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>

  // Group events by date
  const grouped: Record<string, CalEvent[]> = {}
  events.forEach(e => {
    const dateKey = (e.start || '').split('T')[0]
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(e)
  })

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Family Calendar</h1>
        <p className="text-purple-200">Next 30 days</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border text-center text-gray-400">
          <p>Nothing on the family calendar coming up</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateStr, dayEvents]) => {
            const isToday = dateStr === today
            const d = new Date(dateStr + 'T12:00:00')
            const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            return (
              <div key={dateStr}>
                <div className={`text-sm font-semibold px-1 mb-1 ${isToday ? 'text-purple-600' : 'text-gray-500'}`}>
                  {isToday ? 'Today — ' : ''}{label}
                </div>
                <div className="bg-white rounded-lg border divide-y">
                  {dayEvents.map(e => {
                    const time = e.start.includes('T') ? new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'All day'
                    return (
                      <div key={e.id} className={`px-4 py-3 ${isToday ? 'bg-purple-50/50' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{e.summary}</span>
                          <span className="text-xs text-gray-500">{time}</span>
                        </div>
                        {e.location && <p className="text-xs text-gray-400 mt-0.5">{e.location}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
