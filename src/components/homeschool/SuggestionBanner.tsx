'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp, Check } from 'lucide-react'

interface UnitSuggestion {
  unit_title: string
  description: string
  pedagogy_tags: string[]
  objectives: string[]
  matched_assets: Array<{ id: string; name: string; type: string }>
  rationale: string
  confidence: 'high' | 'medium' | 'low'
}

interface Props {
  kidName: string
  month: string
  subject: string
  onAccept: (suggestion: UnitSuggestion) => void
}

export default function SuggestionBanner({ kidName, month, subject, onAccept }: Props) {
  const [suggestions, setSuggestions] = useState<UnitSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!kidName || !month || !subject) { setLoading(false); return }
    setLoading(true)
    fetch('/api/curriculum-planner', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'suggest_unit', kid_name: kidName, month, subject }),
    })
      .then(r => r.json())
      .then(d => setSuggestions(d.suggestions || []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false))
  }, [kidName, month, subject])

  if (dismissed || (!loading && suggestions.length === 0)) return null

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        Coral is thinking...
      </div>
    )
  }

  const top = suggestions[0]

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
            <Sparkles className="w-4 h-4" />
            Coral suggests
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDismissed(true)} className="text-xs text-purple-400 hover:text-purple-600">
              Start blank
            </button>
            <button onClick={() => setExpanded(!expanded)} className="text-purple-500">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Top suggestion preview */}
        <div className="mt-2">
          <button
            onClick={() => onAccept(top)}
            className="w-full text-left bg-white rounded-lg p-3 border border-purple-100 hover:border-purple-300 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{top.unit_title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{top.description}</p>
              </div>
              <span className="text-xs text-purple-400 group-hover:text-purple-600 flex-shrink-0 ml-2">
                <Check className="w-4 h-4" />
              </span>
            </div>
            {top.matched_assets.length > 0 && (
              <p className="text-[10px] text-teal-600 mt-1.5">
                Already own: {top.matched_assets.map(a => a.name).join(', ')}
              </p>
            )}
            <p className="text-[10px] text-purple-400 mt-1 italic">{top.rationale}</p>
          </button>
        </div>
      </div>

      {/* Expanded: show all 3 suggestions */}
      {expanded && suggestions.length > 1 && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-xs text-purple-500 font-medium">Other ideas:</p>
          {suggestions.slice(1).map((s, i) => (
            <button
              key={i}
              onClick={() => onAccept(s)}
              className="w-full text-left bg-white rounded-lg p-2.5 border border-purple-100 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">{s.unit_title}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  s.confidence === 'high' ? 'bg-green-100 text-green-700' :
                  s.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{s.confidence}</span>
              </div>
              <p className="text-xs text-slate-500">{s.description}</p>
              {s.matched_assets.length > 0 && (
                <p className="text-[10px] text-teal-600 mt-1">
                  You own {s.matched_assets.length} related resource{s.matched_assets.length > 1 ? 's' : ''}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
