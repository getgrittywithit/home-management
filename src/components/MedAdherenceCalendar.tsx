'use client'

import { useState, useEffect } from 'react'
import { Pill, ChevronLeft, ChevronRight } from 'lucide-react'

interface DayStatus {
  date: string
  status: 'taken' | 'missed' | 'none'
}

interface MedAdherenceCalendarProps {
  personName: string
  medication: string
}

export default function MedAdherenceCalendar({ personName, medication }: MedAdherenceCalendarProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [days, setDays] = useState<DayStatus[]>([])
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    fetch(`/api/health-hub?action=get_med_adherence&person=${personName}&medication=${encodeURIComponent(medication)}&month=${month}`)
      .then(r => r.ok ? r.json() : { days: [] })
      .then(data => {
        setDays(data.days || [])
        setStreak(data.streak || 0)
      })
      .catch(() => {})
  }, [personName, medication, month])

  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const firstDayOfWeek = new Date(year, mon - 1, 1).getDay()
  const today = new Date().toLocaleDateString('en-CA')

  const prevMonth = () => {
    const d = new Date(year, mon - 2, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const d = new Date(year, mon, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const getStatus = (day: number): 'taken' | 'missed' | 'none' => {
    const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (dateStr > today) return 'none'
    const found = days.find(d => d.date === dateStr)
    return found?.status || (dateStr < today ? 'missed' : 'none')
  }

  const monthName = new Date(year, mon - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
          <Pill className="w-4 h-4 text-blue-500" /> {medication}
        </h3>
        {streak > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            🔥 {streak}-day streak
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-xs font-medium text-gray-600">{monthName}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[10px] text-gray-400 font-medium py-0.5">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const status = getStatus(day)
          const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === today
          return (
            <div
              key={day}
              className={`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-medium mx-auto ${
                status === 'taken' ? 'bg-green-500 text-white' :
                status === 'missed' ? 'bg-red-400 text-white' :
                isToday ? 'ring-1 ring-blue-400 text-gray-700' :
                'text-gray-400'
              }`}
            >
              {day}
            </div>
          )
        })}
      </div>

      <div className="flex gap-3 mt-2 text-[10px] text-gray-500 justify-center">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Taken</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Missed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200" /> No data</span>
      </div>
    </div>
  )
}
