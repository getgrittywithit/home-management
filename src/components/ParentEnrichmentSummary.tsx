'use client'

import { useState, useEffect } from 'react'
import { Sparkles, BookOpen, Beaker, Globe, DollarSign, Palette, TreePine, Calculator, BarChart2 } from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

interface EnrichmentEntry {
  kid_name: string
  date: string
  picked: boolean
  completed: boolean
  stars_earned: number
  title: string
  subject: string
  duration_min: number
}

interface KidSummary {
  total_shown: number
  total_picked: number
  total_completed: number
  by_subject: Record<string, number>
  entries: EnrichmentEntry[]
}

const SUBJECT_ICONS: Record<string, React.ReactNode> = {
  math: <Calculator className="w-3.5 h-3.5" />,
  elar: <BookOpen className="w-3.5 h-3.5" />,
  science: <Beaker className="w-3.5 h-3.5" />,
  social_studies: <Globe className="w-3.5 h-3.5" />,
  financial_literacy: <DollarSign className="w-3.5 h-3.5" />,
  art: <Palette className="w-3.5 h-3.5" />,
  pe_outdoor: <TreePine className="w-3.5 h-3.5" />,
}

const KID_COLORS: Record<string, string> = {
  amos: 'blue',
  ellie: 'purple',
  wyatt: 'orange',
  hannah: 'green',
  kaylee: 'pink',
  zoey: 'indigo',
}

export default function ParentEnrichmentSummary() {
  const [summary, setSummary] = useState<Record<string, KidSummary>>({})
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/homeschool?action=get_enrichment_summary&days=${days}`)
        const json = await res.json()
        setSummary(json.summary || {})
      } catch (err) {
        console.error('Failed to load enrichment summary:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [days])

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-center text-gray-500 text-sm">
        Loading enrichment data...
      </div>
    )
  }

  const kidNames = Object.keys(summary)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Enrichment Activity Summary
          </h3>
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  days === d ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {kidNames.length === 0 ? (
          <p className="text-center text-gray-400 py-4 text-sm">
            No enrichment activity yet. Activities appear when kids finish their main tasks early.
          </p>
        ) : (
          <div className="space-y-4">
            {kidNames.map((kidName) => {
              const s = summary[kidName]
              const color = KID_COLORS[kidName] || 'gray'

              return (
                <div key={kidName} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize text-gray-900">{kidName}</h4>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>{s.total_completed} completed</span>
                      <span>{s.total_picked} picked</span>
                      <span>{s.total_shown} shown</span>
                    </div>
                  </div>

                  {/* Subject breakdown */}
                  {Object.keys(s.by_subject).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {Object.entries(s.by_subject).map(([subj, count]) => (
                        <span
                          key={subj}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-50 rounded text-gray-600"
                        >
                          {SUBJECT_ICONS[subj]} {count} {subj.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Recent entries */}
                  <div className="space-y-1">
                    {s.entries.slice(0, 5).map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${entry.completed ? 'bg-green-500' : entry.picked ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                        <span className="text-gray-600 flex-1 truncate">{entry.title}</span>
                        <span className="text-gray-400">{parseDateLocal(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        {entry.stars_earned > 0 && (
                          <span className="text-yellow-600">+{entry.stars_earned}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
