'use client'

import { useState, useEffect } from 'react'
import { parseDateLocal } from '@/lib/date-local'

const MOOD_EMOJIS: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }
const MOOD_COLORS: Record<number, string> = {
  1: 'bg-red-400', 2: 'bg-orange-400', 3: 'bg-yellow-400', 4: 'bg-teal-400', 5: 'bg-green-400',
}

interface MoodEntry {
  log_date: string
  mood_score: number
  one_win: string | null
  one_hard_thing: string | null
  what_helped: string | null
}

export default function MoodHistoryCard({ childName }: { childName: string }) {
  const [history, setHistory] = useState<MoodEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    fetch(`/api/kids/mood?action=get_mood_history&kid=${childKey}&days=30`)
      .then(r => r.json())
      .then(data => { setHistory(data.history || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [childKey])

  if (!loaded) return null
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-2">{childName}&apos;s Mood History</h3>
        <p className="text-sm text-gray-400">No mood check-ins yet</p>
      </div>
    )
  }

  // Build 30-day chart data (oldest to newest)
  const chartEntries = [...history].reverse()

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 mb-4">{childName}&apos;s Mood History — Last 30 Days</h3>

      {/* Dot chart */}
      <div className="mb-6">
        <div className="flex items-end gap-1 h-24 overflow-x-auto pb-1">
          {chartEntries.map(entry => {
            const height = (entry.mood_score / 5) * 100
            return (
              <div key={entry.log_date} className="flex flex-col items-center gap-1 min-w-[18px]" title={`${entry.log_date}: ${MOOD_EMOJIS[entry.mood_score]}`}>
                <div className="flex-1 flex items-end w-full">
                  <div
                    className={`w-3 rounded-full mx-auto ${MOOD_COLORS[entry.mood_score]}`}
                    style={{ height: `${height}%`, minHeight: '6px' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{chartEntries.length > 0 ? parseDateLocal(chartEntries[0].log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          <span>{chartEntries.length > 0 ? parseDateLocal(chartEntries[chartEntries.length - 1].log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
        </div>
      </div>

      {/* Recent entries */}
      <div className="space-y-3">
        {history.slice(0, 10).map(entry => (
          <div key={entry.log_date} className="flex items-start gap-3 text-sm">
            <div className="text-center flex-shrink-0 w-12">
              <span className="text-xl">{MOOD_EMOJIS[entry.mood_score]}</span>
              <p className="text-xs text-gray-400">
                {parseDateLocal(entry.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              {entry.one_win && <p className="text-gray-700"><span className="text-green-600 font-medium">Win:</span> {entry.one_win}</p>}
              {entry.one_hard_thing && <p className="text-gray-700"><span className="text-orange-600 font-medium">Hard:</span> {entry.one_hard_thing}</p>}
              {entry.what_helped && <p className="text-gray-700"><span className="text-teal-600 font-medium">Helped:</span> {entry.what_helped}</p>}
              {!entry.one_win && !entry.one_hard_thing && !entry.what_helped && (
                <p className="text-gray-400 italic">No details logged</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
