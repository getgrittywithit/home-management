'use client'

import { useState, useEffect } from 'react'
import { Gift, Sparkles, Loader2, Copy, AlertTriangle } from 'lucide-react'

const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const CAT_COLORS: Record<string, string> = {
  Educational: 'bg-blue-100 text-blue-700', Creative: 'bg-purple-100 text-purple-700',
  Outdoor: 'bg-green-100 text-green-700', Tech: 'bg-gray-100 text-gray-700',
  Experience: 'bg-pink-100 text-pink-700', Clothing: 'bg-amber-100 text-amber-700',
  Books: 'bg-teal-100 text-teal-700',
}

export default function GiftSuggestions() {
  const [selectedKid, setSelectedKid] = useState('amos')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [accessNotes, setAccessNotes] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState('')

  const fetchExisting = async (kid: string) => {
    const res = await fetch(`/api/gifts?action=get_suggestions&kid_name=${kid}`).then(r => r.json()).catch(() => ({}))
    if (res.suggestion?.suggestions) {
      const s = typeof res.suggestion.suggestions === 'string' ? JSON.parse(res.suggestion.suggestions) : res.suggestion.suggestions
      setSuggestions(s)
    } else {
      setSuggestions([])
    }
  }

  useEffect(() => { fetchExisting(selectedKid) }, [selectedKid])

  const handleGenerate = async () => {
    setGenerating(true)
    const res = await fetch('/api/gifts', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_suggestions', kid_name: selectedKid }) }).then(r => r.json()).catch(() => ({}))
    if (res.suggestions) {
      setSuggestions(res.suggestions)
      setAccessNotes(res.accessibility_notes || [])
    }
    setGenerating(false)
  }

  const handleShare = () => {
    const text = `Gift Ideas for ${cap(selectedKid)}:\n\n` +
      suggestions.map((s, i) => `${i + 1}. ${s.name} (${s.price_range})\n   ${s.description}`).join('\n\n')
    navigator.clipboard.writeText(text).catch(() => {})
    setToast('List copied! Paste in a text to Donna or Sara.')
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="w-5 h-5 text-pink-500" /> Gift Ideas
        </h2>
        {suggestions.length > 0 && (
          <button onClick={handleShare}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">
            <Copy className="w-3 h-3" /> Share as List
          </button>
        )}
      </div>

      {toast && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{toast}</div>}

      {/* Kid selector */}
      <div className="flex gap-2 flex-wrap">
        {KIDS.map(k => (
          <button key={k} onClick={() => setSelectedKid(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selectedKid === k ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cap(k)}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button onClick={handleGenerate} disabled={generating}
        className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating ? 'Generating...' : `Generate Ideas for ${cap(selectedKid)}`}
      </button>

      {/* Accessibility notes */}
      {accessNotes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          <p className="text-sm font-medium text-amber-800 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Accessibility Notes</p>
          {accessNotes.map((note, i) => <p key={i} className="text-sm text-amber-700">{note}</p>)}
        </div>
      )}

      {/* Suggestions grid */}
      {suggestions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((s, i) => (
            <div key={i} className="bg-white rounded-lg border shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                {s.category && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[s.category] || 'bg-gray-100 text-gray-600'}`}>
                    {s.category}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{s.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-green-700">{s.price_range}</span>
                {s.why && <span className="text-gray-400 italic">{s.why}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Gift className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No suggestions yet for {cap(selectedKid)}.</p>
          <p className="text-sm text-gray-400 mt-1">Click &quot;Generate Ideas&quot; to get personalized gift suggestions.</p>
        </div>
      )}
    </div>
  )
}
