'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertTriangle, TrendingUp, Pill } from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

// ============================================================================
// TYPES
// ============================================================================

interface MedEntry {
  taken: string[]
  missed: string[]
  adherence_pct: number
}

interface MoodEntry {
  primary_mood: string
  energy: number | null
  anxiety: number | null
  irritability: number | null
  focus: number | null
}

interface TimelineEntry {
  date: string
  meds: MedEntry
  mood: MoodEntry | null
}

interface Pattern {
  type: string
  description: string
  confidence: string
  occurrences: number
}

interface Summary {
  avg_adherence_pct: number
  avg_mood_on_full_adherence: string | null
  avg_mood_on_partial_adherence: string | null
  total_mood_entries: number
  total_med_days_logged: number
}

interface CorrelationData {
  kid_name: string
  range_days: number
  timeline: TimelineEntry[]
  patterns: Pattern[]
  summary: Summary
}

// ============================================================================
// CONSTANTS
// ============================================================================

const KIDS_WITH_MEDS = [
  { value: 'amos', label: 'Amos' },
  { value: 'wyatt', label: 'Wyatt' },
]

const RANGE_OPTIONS = [7, 30, 90]

const MOOD_EMOJI: Record<string, string> = {
  great: '\u{1F60A}',
  good: '\u{1F642}',
  okay: '\u{1F610}',
  rough: '\u{1F614}',
  bad: '\u{1F622}',
}

// ============================================================================
// HELPERS
// ============================================================================

function formatShortDate(dateStr: string): string {
  const d = parseDateLocal(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatWeekday(dateStr: string): string {
  const d = parseDateLocal(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MedMoodTimeline() {
  const [selectedKid, setSelectedKid] = useState('amos')
  const [range, setRange] = useState(30)
  const [data, setData] = useState<CorrelationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/kids/med-mood-correlation?kid_name=${selectedKid}&range=${range}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Failed to load data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedKid, range])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------- Render ----------

  return (
    <div className="space-y-4">
      {/* Header + Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-800">Med-Mood Correlation</h3>
        </div>

        {/* Kid selector */}
        <div className="flex gap-1 ml-auto">
          {KIDS_WITH_MEDS.map(kid => (
            <button
              key={kid.value}
              onClick={() => setSelectedKid(kid.value)}
              className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                selectedKid === kid.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {kid.label}
            </button>
          ))}
        </div>

        {/* Range selector */}
        <div className="flex gap-1">
          {RANGE_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                range === r
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading correlation data...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Summary bar */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex flex-wrap gap-4 text-sm text-teal-800">
            <span className="font-medium">{data.summary.avg_adherence_pct}% adherence</span>
            <span className="text-teal-400">|</span>
            <span>{data.summary.total_mood_entries} mood entries</span>
            <span className="text-teal-400">|</span>
            <span>{data.summary.total_med_days_logged} days tracked</span>
            {data.summary.avg_mood_on_full_adherence && (
              <>
                <span className="text-teal-400">|</span>
                <span>
                  Full meds: {MOOD_EMOJI[data.summary.avg_mood_on_full_adherence] || ''}{' '}
                  {data.summary.avg_mood_on_full_adherence}
                </span>
              </>
            )}
            {data.summary.avg_mood_on_partial_adherence && (
              <>
                <span className="text-teal-400">|</span>
                <span>
                  Missed: {MOOD_EMOJI[data.summary.avg_mood_on_partial_adherence] || ''}{' '}
                  {data.summary.avg_mood_on_partial_adherence}
                </span>
              </>
            )}
          </div>

          {/* Timeline — horizontal scroll of day cards */}
          {data.timeline.length > 0 ? (
            <div className="overflow-x-auto pb-2 -mx-1">
              <div className="flex gap-2 px-1" style={{ minWidth: 'max-content' }}>
                {data.timeline.map(entry => {
                  const hasMissed = entry.meds.missed.length > 0
                  const totalMeds = entry.meds.taken.length + entry.meds.missed.length
                  const moodEmoji = entry.mood
                    ? MOOD_EMOJI[entry.mood.primary_mood] || '\u{1F610}'
                    : '\u{2014}'

                  return (
                    <div
                      key={entry.date}
                      className={`flex-shrink-0 w-20 rounded-lg border p-2 text-center text-xs ${
                        hasMissed
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Date */}
                      <div className="text-gray-400 text-[10px] leading-tight">
                        {formatWeekday(entry.date)}
                      </div>
                      <div className="font-medium text-gray-700 mb-1">
                        {formatShortDate(entry.date)}
                      </div>

                      {/* Mood emoji */}
                      <div className="text-2xl leading-none mb-1">{moodEmoji}</div>

                      {/* Adherence bar */}
                      {totalMeds > 0 && (
                        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                          <div
                            className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                              hasMissed ? 'bg-red-400' : 'bg-green-500'
                            }`}
                            style={{ width: `${entry.meds.adherence_pct}%` }}
                          />
                        </div>
                      )}

                      {/* Missed indicator */}
                      {hasMissed && (
                        <div className="flex items-center justify-center gap-0.5 text-red-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                          <span className="text-[10px]">{entry.meds.missed.length} missed</span>
                        </div>
                      )}

                      {/* Focus score if available */}
                      {entry.mood?.focus != null && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Focus: {entry.mood.focus}/5
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              No data yet for this range. Mood and medication logs will appear here.
            </div>
          )}

          {/* Pattern cards */}
          {data.patterns.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-600">Detected Patterns</h4>
              {data.patterns.map((pattern, idx) => {
                const isPositive = pattern.type === 'streak_improvement'
                const Icon = isPositive ? TrendingUp : AlertTriangle
                const bgColor = isPositive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                const iconColor = isPositive ? 'text-green-600' : 'text-amber-600'
                const textColor = isPositive ? 'text-green-800' : 'text-amber-800'
                const badgeBg = isPositive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'

                return (
                  <div
                    key={`${pattern.type}-${idx}`}
                    className={`border rounded-lg p-3 ${bgColor}`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${textColor}`}>{pattern.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeBg}`}>
                            {pattern.occurrences} occurrence{pattern.occurrences !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-gray-400">
                            {pattern.confidence} confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {data.patterns.length === 0 && data.timeline.length > 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              No clear patterns detected yet. More data will improve accuracy.
            </div>
          )}
        </>
      )}
    </div>
  )
}
