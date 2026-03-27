'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'

export default function AbScheduleSetup({ kid }: { kid: string }) {
  const [schedule, setSchedule] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [startType, setStartType] = useState('A')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const today = new Date()
    const from = today.toLocaleDateString('en-CA')
    const to = new Date(today.getTime() + 21 * 86400000).toLocaleDateString('en-CA')
    fetch(`/api/parent/teacher?action=get_ab_schedule&kid=${kid}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {}
        ;(d.schedule || []).forEach((s: any) => { map[s.date] = s.day_type })
        setSchedule(map)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [kid])

  const setPattern = async () => {
    if (!startDate) return
    setSaving(true)
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_ab_pattern', kid, start_date: startDate, starting_type: startType })
    })
    // Reload
    const today = new Date()
    const from = today.toLocaleDateString('en-CA')
    const to = new Date(today.getTime() + 21 * 86400000).toLocaleDateString('en-CA')
    const d = await fetch(`/api/parent/teacher?action=get_ab_schedule&kid=${kid}&from=${from}&to=${to}`).then(r => r.json())
    const map: Record<string, string> = {}
    ;(d.schedule || []).forEach((s: any) => { map[s.date] = s.day_type })
    setSchedule(map)
    setSaving(false)
    setStartDate('')
  }

  const toggleDay = async (date: string) => {
    const current = schedule[date]
    const newType = current === 'A' ? 'B' : 'A'
    setSchedule(prev => ({ ...prev, [date]: newType }))
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_ab_day', kid, date, day_type: newType })
    })
  }

  // Build 3 weeks of weekdays
  const today = new Date()
  const weeks: { date: Date; dateStr: string }[][] = []
  const start = new Date(today)
  start.setDate(start.getDate() - start.getDay() + 1) // Monday
  for (let w = 0; w < 3; w++) {
    const week: { date: Date; dateStr: string }[] = []
    for (let d = 0; d < 5; d++) {
      const dt = new Date(start.getTime() + (w * 7 + d) * 86400000)
      week.push({ date: dt, dateStr: dt.toLocaleDateString('en-CA') })
    }
    weeks.push(week)
  }

  if (!loaded) return null

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-blue-500" />
        <span className="font-medium text-sm">A/B Day Schedule</span>
      </div>

      {/* Mini week views */}
      <div className="space-y-2 mb-3">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1">
            {week.map(day => {
              const type = schedule[day.dateStr]
              const isToday = day.dateStr === today.toLocaleDateString('en-CA')
              return (
                <button key={day.dateStr} onClick={() => toggleDay(day.dateStr)}
                  className={`flex-1 text-center py-1.5 rounded text-xs font-medium border transition-colors ${
                    isToday ? 'ring-2 ring-blue-400' : ''
                  } ${
                    type === 'A' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    type === 'B' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                    'bg-gray-50 text-gray-400 border-gray-200'
                  }`}>
                  <div className="text-[10px] text-gray-400">{day.date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div>{type || '—'}</div>
                  <div className="text-[10px]">{day.date.getMonth() + 1}/{day.date.getDate()}</div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Pattern setter */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Set pattern from:</span>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1 text-xs" />
        <select value={startType} onChange={e => setStartType(e.target.value)} className="border rounded px-2 py-1 text-xs">
          <option value="A">Start A</option>
          <option value="B">Start B</option>
        </select>
        <button onClick={setPattern} disabled={saving || !startDate} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
          Apply 8 weeks
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">Click any day to toggle A/B manually</p>
    </div>
  )
}
