'use client'

import { useState, useEffect } from 'react'
import { Sun, Loader2, ArrowRight, AlertTriangle, Calendar, Users, Mail, Home } from 'lucide-react'

interface Props {
  onNavigate?: (tab: string) => void
}

export default function ParentMyDayCard({ onNavigate }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/parent/my-focus?action=overview_summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="skeleton h-6 w-48" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" /> Lola&apos;s {data.day_label}
        </h3>
        {onNavigate && (
          <button onClick={() => onNavigate('boards')} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
            Open My Focus <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        {/* Attention */}
        {data.attention_count > 0 && (
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-semibold">{data.attention_count} item{data.attention_count === 1 ? '' : 's'} need{data.attention_count === 1 ? 's' : ''} attention</span>
          </div>
        )}

        {/* Events */}
        <div className="flex items-center gap-2 text-blue-700">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {data.events_count > 0
              ? `${data.events_count} event${data.events_count === 1 ? '' : 's'} today`
              : 'No events today'}
            {data.events_today?.[0] && <span className="text-gray-500 ml-1">({new Date(data.events_today[0].start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })} {data.events_today[0].title})</span>}
          </span>
        </div>

        {/* Kids */}
        <div className="flex items-center gap-2 text-purple-700">
          <Users className="w-3.5 h-3.5" />
          <span>{data.kids_on_track}/{data.kids?.length || 6} kids on track</span>
          {data.kid_flag && <span className="text-amber-600 text-xs ml-1">⚠️ {data.kid_flag.kid_name}</span>}
        </div>

        {/* Email */}
        {(data.email_important > 0 || data.email_clearable > 0) ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-3.5 h-3.5" />
            <span>
              {data.email_important > 0 && `${data.email_important} important`}
              {data.email_important > 0 && data.email_clearable > 0 && ' · '}
              {data.email_clearable > 0 && `${data.email_clearable} clearable`}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Mail className="w-3 h-3" />
            <span>Email sync not connected</span>
          </div>
        )}

        {/* Household (compact) */}
        <div className="flex items-center gap-2 text-gray-500 text-xs pt-1 border-t border-gray-100 mt-1.5">
          <Home className="w-3 h-3" />
          <span>
            Belle: {data.household?.belle || '—'} · Dinner: {data.household?.dinner || '—'} · Wk{data.household?.zone_week || '?'}
          </span>
        </div>
      </div>
    </div>
  )
}
