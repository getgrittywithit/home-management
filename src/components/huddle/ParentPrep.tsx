'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Eye, X, CheckSquare } from 'lucide-react'

const PRIORITY_BADGES: Record<string, { label: string; color: string; emoji: string }> = {
  hot: { label: 'Hot', color: 'bg-red-100 text-red-700', emoji: '\uD83D\uDD34' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700', emoji: '\uD83D\uDFE1' },
  low: { label: 'Low', color: 'bg-green-100 text-green-700', emoji: '\uD83D\uDFE2' },
  info: { label: 'Info', color: 'bg-blue-100 text-blue-700', emoji: '\u2139\uFE0F' },
}

const SOURCE_ICONS: Record<string, string> = {
  med_adherence: '\uD83D\uDC8A', safety_events: '\uD83D\uDEA8', mood_logs: '\uD83D\uDE1E',
  checklist: '\uD83D\uDCCB', meal_requests: '\uD83C\uDF5D', kid_notes: '\uD83D\uDCDD',
  grocery_requests: '\uD83D\uDED2', behavior_logs: '\u26A0\uFE0F', attendance: '\uD83E\uDE7A',
  pre_submits: '\uD83D\uDCDD',
}

interface PrepItem {
  id?: number
  source: string
  kid_name: string | null
  summary: string
  priority: string
  status?: string
}

interface ParentPrepProps {
  huddleId: number
  mode: 'quick' | 'full'
}

export default function ParentPrep({ huddleId, mode }: ParentPrepProps) {
  const [expanded, setExpanded] = useState(false)
  const [items, setItems] = useState<PrepItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadPrep = async () => {
    if (loaded) return
    setLoading(true)
    const res = await fetch('/api/family-huddle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_parent_prep', huddle_id: huddleId }),
    }).then(r => r.json()).catch(() => ({ items: [] }))
    setItems(res.items || [])
    setLoaded(true)
    setLoading(false)
  }

  useEffect(() => {
    if (expanded && !loaded) loadPrep()
  }, [expanded])

  const filteredItems = mode === 'quick'
    ? items.filter(i => i.priority === 'hot' || i.priority === 'medium')
    : items

  const dismissItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const toggleBringUp = (idx: number) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, status: item.status === 'bring_up' ? 'surfaced' : 'bring_up' } : item
    ))
  }

  const hotCount = items.filter(i => i.priority === 'hot').length

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-amber-100/50 transition"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600" />
          <span className="font-semibold text-gray-900 text-sm">Parent Prep &mdash; This Week&apos;s Intel</span>
          {hotCount > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{hotCount} hot</span>}
          {items.length > 0 && <span className="text-xs text-gray-500">({items.length} items)</span>}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          {loading && <p className="text-sm text-gray-400 py-2">Scanning this week&apos;s data...</p>}
          {!loading && filteredItems.length === 0 && (
            <p className="text-sm text-gray-500 py-2">All clear this week! Nothing flagged.</p>
          )}
          {filteredItems.map((item, idx) => {
            const badge = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.info
            const icon = SOURCE_ICONS[item.source] || '\uD83D\uDCCB'
            const isBringUp = item.status === 'bring_up'
            return (
              <div key={idx} className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm ${isBringUp ? 'bg-amber-100 border border-amber-300' : 'bg-white/80'}`}>
                <span className="text-base mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  {item.kid_name && <span className="font-semibold text-gray-800">{item.kid_name}: </span>}
                  <span className="text-gray-700">{item.summary}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badge.color}`}>{badge.emoji} {badge.label}</span>
                <button onClick={() => toggleBringUp(idx)} title="Bring up in meeting"
                  className={`p-1 rounded hover:bg-amber-100 ${isBringUp ? 'text-amber-700' : 'text-gray-300'}`}>
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => dismissItem(idx)} title="Dismiss"
                  className="p-1 rounded hover:bg-red-100 text-gray-300 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
