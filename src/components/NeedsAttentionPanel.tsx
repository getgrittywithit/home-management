'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle, Thermometer, MessageSquare, Clock, MapPin,
  Calendar, Gift, ChevronRight, X
} from 'lucide-react'

interface FlagItem {
  type: string
  label: string
  time?: string
  tabId: string
  icon: React.ReactNode
}

interface NeedsAttentionPanelProps {
  onNavigate: (tabId: string) => void
}

export default function NeedsAttentionPanel({ onNavigate }: NeedsAttentionPanelProps) {
  const [flags, setFlags] = useState<FlagItem[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/parent/flags?action=get_all_flags')
      .then(r => r.json())
      .then(data => {
        const items: FlagItem[] = []

        // Sick reports
        if (data.sick_days?.length > 0) {
          for (const s of data.sick_days) {
            const name = s.kid_name?.charAt(0).toUpperCase() + s.kid_name?.slice(1)
            items.push({
              type: 'sick',
              label: `${name} not feeling well`,
              time: 'Today',
              tabId: 'kids-health',
              icon: <Thermometer className="w-3.5 h-3.5" />,
            })
          }
        }

        // Unread messages
        if (data.messages?.length > 0) {
          const totalMessages = data.messages.reduce((sum: number, m: any) => sum + (m.count || 0), 0)
          if (totalMessages > 0) {
            items.push({
              type: 'message',
              label: `${totalMessages} unread message${totalMessages > 1 ? 's' : ''}`,
              tabId: 'messages',
              icon: <MessageSquare className="w-3.5 h-3.5" />,
            })
          }
        }

        // Break requests
        if (data.breaks?.length > 0) {
          for (const b of data.breaks) {
            const name = b.kid_name?.charAt(0).toUpperCase() + b.kid_name?.slice(1)
            items.push({
              type: 'break',
              label: `${name} needs a break`,
              time: b.created_at ? new Date(b.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : undefined,
              tabId: 'kids-checklist',
              icon: <Clock className="w-3.5 h-3.5" />,
            })
          }
        }

        // Missed zone tasks
        if (data.missed_chores?.length > 0) {
          const kidNames = Array.from(new Set(data.missed_chores.map((c: any) => c.child_name) as string[]))
          items.push({
            type: 'zone',
            label: `${kidNames.length} kid${kidNames.length > 1 ? 's' : ''} missed zone tasks yesterday`,
            tabId: 'chores',
            icon: <MapPin className="w-3.5 h-3.5" />,
          })
        }

        // Upcoming meetings
        if (data.upcoming_meetings?.length > 0) {
          for (const m of data.upcoming_meetings) {
            const name = m.kid_name?.charAt(0).toUpperCase() + m.kid_name?.slice(1)
            items.push({
              type: 'meeting',
              label: `${name}: ${m.plan_type} meeting ${m.next_meeting_date}`,
              tabId: 'school',
              icon: <Calendar className="w-3.5 h-3.5" />,
            })
          }
        }

        // Meal requests pending
        if (data.meal_requests?.length > 0) {
          items.push({
            type: 'meal',
            label: `${data.meal_requests.length} pending meal request${data.meal_requests.length > 1 ? 's' : ''}`,
            tabId: 'food-inventory',
            icon: <Gift className="w-3.5 h-3.5" />,
          })
        }

        setFlags(items)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded || flags.length === 0 || dismissed) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-900">
            {flags.length} item{flags.length > 1 ? 's' : ''} need{flags.length === 1 ? 's' : ''} attention
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-100 rounded"
        >
          <X className="w-4 h-4 text-amber-500" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {flags.map((flag, i) => (
          <button
            key={`${flag.type}-${i}`}
            onClick={() => onNavigate(flag.tabId)}
            className="inline-flex items-center gap-1.5 bg-white border border-amber-200 rounded-full px-3 py-1.5 text-xs text-amber-900 hover:bg-amber-100 transition-colors"
          >
            <span className="text-amber-600">{flag.icon}</span>
            <span>{flag.label}</span>
            {flag.time && <span className="text-amber-500 ml-0.5">{flag.time}</span>}
            <ChevronRight className="w-3 h-3 text-amber-400" />
          </button>
        ))}
      </div>
    </div>
  )
}
