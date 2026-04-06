'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Appointment {
  id: number | string
  family_member_name: string
  provider_name?: string
  appointment_type: string
  appointment_date: string
  location?: string
  reason?: string
  status: string
  notes?: string
}

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  therapy: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  psychiatry: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  checkup: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  specialist: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  dental: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  vision: { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  lab_work: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  vaccination: { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

interface HealthAppointmentsCalendarProps {
  appointments: Appointment[]
}

export default function HealthAppointmentsCalendar({ appointments }: HealthAppointmentsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const navigate = (dir: number) => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + dir)
    setCurrentMonth(d)
    setSelectedDate(null)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const getApptsForDay = (day: number) => {
    const cellDate = new Date(year, month, day)
    return appointments.filter(a => {
      try {
        const ad = new Date(a.appointment_date)
        return isSameDay(ad, cellDate)
      } catch { return false }
    })
  }

  const selectedDayAppts = selectedDate
    ? appointments.filter(a => { try { return isSameDay(new Date(a.appointment_date), selectedDate!) } catch { return false } })
    : []

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-semibold text-gray-900 min-w-[160px] text-center">{monthLabel}</span>
        <button onClick={() => navigate(1)} className="p-1.5 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="bg-gray-50 min-h-[70px]" />
          const dayAppts = getApptsForDay(day)
          const cellDate = new Date(year, month, day)
          const isToday = isSameDay(cellDate, today)
          const isSelected = selectedDate && isSameDay(cellDate, selectedDate)
          return (
            <button key={i} onClick={() => setSelectedDate(cellDate)}
              className={`bg-white min-h-[70px] p-1 text-left hover:bg-blue-50 transition ${isToday ? 'bg-blue-50' : ''} ${isSelected ? 'ring-2 ring-indigo-400' : ''}`}>
              <span className={`text-xs ${isToday ? 'bg-indigo-500 text-white w-5 h-5 rounded-full inline-flex items-center justify-center' : 'text-gray-700'}`}>
                {day}
              </span>
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {dayAppts.slice(0, 3).map(a => {
                  const tc = TYPE_COLORS[a.appointment_type] || TYPE_COLORS.other
                  return <div key={a.id} className={`w-2 h-2 rounded-full ${tc.dot}`} title={`${cap(a.family_member_name)} - ${a.appointment_type}`} />
                })}
                {dayAppts.length > 3 && <span className="text-[8px] text-gray-400">+{dayAppts.length - 3}</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected date panel */}
      {selectedDate && (
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-900 mb-2">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h4>
          {selectedDayAppts.length === 0 ? (
            <p className="text-sm text-gray-400">No appointments this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayAppts.map(a => {
                const tc = TYPE_COLORS[a.appointment_type] || TYPE_COLORS.other
                return (
                  <button key={a.id} onClick={() => setSelectedAppt(a)}
                    className={`w-full text-left rounded-lg p-3 ${tc.bg} hover:opacity-80 transition`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${tc.dot}`} />
                      <span className={`text-sm font-medium ${tc.text}`}>{cap(a.family_member_name)}</span>
                      <span className="text-xs text-gray-500 ml-auto">{cap(a.appointment_type)}</span>
                    </div>
                    {a.provider_name && <p className="text-xs text-gray-600 mt-1">{a.provider_name}</p>}
                    {a.reason && <p className="text-xs text-gray-500 mt-0.5">{a.reason}</p>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Appointment detail popover */}
      {selectedAppt && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center" onClick={() => setSelectedAppt(null)}>
          <div className="bg-white rounded-lg shadow-xl p-5 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${(TYPE_COLORS[selectedAppt.appointment_type] || TYPE_COLORS.other).dot}`} />
              <span className="text-xs text-gray-500 capitalize">{selectedAppt.appointment_type}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${selectedAppt.status === 'completed' ? 'bg-green-100 text-green-700' : selectedAppt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {cap(selectedAppt.status)}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">{cap(selectedAppt.family_member_name)}</h3>
            {selectedAppt.provider_name && <p className="text-sm text-gray-600">{selectedAppt.provider_name}</p>}
            <p className="text-sm text-gray-500 mt-1">
              {new Date(selectedAppt.appointment_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {selectedAppt.location && <p className="text-sm text-gray-500 mt-1">{'\uD83D\uDCCD'} {selectedAppt.location}</p>}
            {selectedAppt.reason && <p className="text-sm text-gray-600 mt-2">{selectedAppt.reason}</p>}
            {selectedAppt.notes && <p className="text-sm text-gray-500 mt-1 italic">{selectedAppt.notes}</p>}
            <button onClick={() => setSelectedAppt(null)} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700">Close</button>
          </div>
        </div>
      )}

      {/* Type legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'other').map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
