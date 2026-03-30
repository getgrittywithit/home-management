'use client'

import { useState, useEffect } from 'react'
import {
  GraduationCap, Shield, Calendar, AlertTriangle, FileText, Mail,
  CheckCircle, ChevronRight
} from 'lucide-react'

interface SchoolHealthEvent {
  kid_name: string
  plan_type?: string
  doc_type?: string
  event_type: 'next_meeting' | 'annual_review' | 'vaccine_exemption' | 'document_expiry'
  event_date: string
}

interface MissingNudge {
  kid_name: string
  type: string
  message: string
}

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', zoey: 'Zoey', kaylee: 'Kaylee',
  ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah',
}

function capitalize(s: string) {
  return KID_DISPLAY[s] || s.charAt(0).toUpperCase() + s.slice(1)
}

function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T12:00:00')
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function eventIcon(type: string) {
  switch (type) {
    case 'next_meeting':
      return { Icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-50' }
    case 'annual_review':
      return { Icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-50' }
    case 'vaccine_exemption':
      return { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' }
    case 'document_expiry':
      return { Icon: FileText, color: 'text-teal-500', bg: 'bg-teal-50' }
    default:
      return { Icon: Shield, color: 'text-blue-500', bg: 'bg-blue-50' }
  }
}

function eventLabel(ev: SchoolHealthEvent): string {
  switch (ev.event_type) {
    case 'next_meeting':
      return `${ev.plan_type?.toUpperCase() || 'Plan'} meeting`
    case 'annual_review':
      return `${ev.plan_type?.toUpperCase() || 'Plan'} annual review`
    case 'vaccine_exemption':
      return 'Vaccine exemption expires'
    case 'document_expiry':
      return `${ev.doc_type || 'Document'} expires`
    default:
      return 'Upcoming event'
  }
}

export default function SchoolHealthCard() {
  const [events, setEvents] = useState<SchoolHealthEvent[]>([])
  const [nudges, setNudges] = useState<MissingNudge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/students?action=dashboard_school_health')
        .then(r => r.json())
        .catch(() => []),
      fetch('/api/students?action=missing_data')
        .then(r => r.json())
        .catch(() => ({ nudges: [] })),
    ]).then(([evts, missingData]) => {
      setEvents(Array.isArray(evts) ? evts.slice(0, 5) : [])
      // Only show nudges about missing meeting dates
      const meetingNudges = (missingData.nudges || []).filter(
        (n: MissingNudge) => n.type === 'no_review_date'
      )
      setNudges(meetingNudges)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-56 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const isEmpty = events.length === 0 && nudges.length === 0

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-gray-900">School & Health -- Coming Up</h3>
        </div>
        <button className="text-sm text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1">
          See all <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* All clear */}
      {isEmpty && (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">
            All school & health dates are current
          </p>
        </div>
      )}

      {/* Event list */}
      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((ev, idx) => {
            const { Icon, color, bg } = eventIcon(ev.event_type)
            const days = daysUntil(ev.event_date)
            const dateStr = new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })

            return (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {capitalize(ev.kid_name)} -- {eventLabel(ev)}
                  </p>
                  <p className="text-xs text-gray-500">{dateStr}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                  days < 7
                    ? 'bg-red-100 text-red-700'
                    : days < 30
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Missing data nudges */}
      {nudges.length > 0 && (
        <div className="mt-3 space-y-2">
          {nudges.map((nudge, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">{nudge.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
