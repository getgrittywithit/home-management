'use client'

import { useState, useEffect } from 'react'

interface CalEvent { id: string; summary: string; start: string; end: string; location: string | null }

export default function KidCalendarTab({ childName }: { childName: string }) {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loaded, setLoaded] = useState(false)

  const kid = childName.toLowerCase()
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

    Promise.all([
      fetch(`/api/kids/calendar?days=30&kid_name=${kid}`).then(r => r.json()).catch(() => ({ events: [] })),
      fetch(`/api/calendar?action=get_events&start_date=${today}&end_date=${futureDate}`).then(r => r.json()).catch(() => []),
    ]).then(([kidData, familyEvents]) => {
      const kidEvents = (kidData.events || []) as CalEvent[]
      const capName = childName.charAt(0).toUpperCase() + childName.slice(1)
      const familyFiltered = (Array.isArray(familyEvents) ? familyEvents : [])
        .filter((e: any) =>
          e.calendar_name === `Kids: ${capName}` ||
          e.calendar_name === 'Family (Primary)' ||
          e.event_type === 'friend_visit'
        )
        .map((e: any) => ({
          id: e.id || `fam-${e.title}-${e.start_time}`,
          summary: e.title,
          start: e.start_time,
          end: e.end_time || e.start_time,
          location: e.location || null,
        }))
      const seenIds = new Set(kidEvents.map(e => e.id))
      const merged = [...kidEvents, ...familyFiltered.filter((e: CalEvent) => !seenIds.has(e.id))]
      merged.sort((a, b) => (a.start || '').localeCompare(b.start || ''))
      setEvents(merged)
      setLoaded(true)
    })
  }, [kid, childName])

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
        <h1 className="text-2xl font-bold">{childName}&apos;s Calendar</h1>
        <p className="text-purple-200">Next 30 days — appointments, events &amp; family calendar</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border text-center text-gray-400">
          <p>No upcoming events on your calendar</p>
          <p className="text-xs mt-1">Ask Mom to add your Google Calendar ID in settings</p>
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
