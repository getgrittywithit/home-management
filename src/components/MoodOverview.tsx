'use client'

import { useState, useEffect } from 'react'

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee'
}
const KID_COLORS: Record<string, string> = {
  amos: 'bg-blue-100', ellie: 'bg-purple-100', wyatt: 'bg-green-100',
  hannah: 'bg-pink-100', zoey: 'bg-amber-100', kaylee: 'bg-teal-100',
}
const MOOD_EMOJIS: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }
const ALL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']

interface BreakFlag {
  id: string
  kid_name: string
  flagged_at: string
  note: string | null
}

export default function MoodOverview() {
  const [moods, setMoods] = useState<Record<string, number>>({})
  const [breakFlags, setBreakFlags] = useState<BreakFlag[]>([])

  useEffect(() => {
    fetch('/api/kids/mood?action=get_all_today_moods').then(r => r.json())
      .then(data => setMoods(data.moods || {})).catch(() => {})
    fetch('/api/kids/mood?action=get_break_flags').then(r => r.json())
      .then(data => setBreakFlags(data.flags || [])).catch(() => {})
  }, [])

  const acknowledgeBreak = async (id: string) => {
    await fetch('/api/kids/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acknowledge_break', id })
    })
    setBreakFlags(prev => prev.filter(f => f.id !== id))
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ago`
  }

  return (
    <div className="space-y-4">
      {/* Break Flag Banners */}
      {breakFlags.map(flag => (
        <div key={flag.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌿</span>
            <div>
              <p className="text-sm font-medium text-amber-900">
                {KID_DISPLAY[flag.kid_name] || flag.kid_name} asked for a break
              </p>
              <p className="text-xs text-amber-600">{timeAgo(flag.flagged_at)}</p>
            </div>
          </div>
          <button onClick={() => acknowledgeBreak(flag.id)}
            className="bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-300">
            Acknowledge
          </button>
        </div>
      ))}

      {/* Mood Today Card */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Mood Today</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {ALL_KIDS.map(kid => {
            const score = moods[kid]
            return (
              <div key={kid} className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-1 ${KID_COLORS[kid]}`}>
                  {score ? MOOD_EMOJIS[score] : '—'}
                </div>
                <p className="text-xs font-medium text-gray-700">{KID_DISPLAY[kid]}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
