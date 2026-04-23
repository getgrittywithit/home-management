'use client'

import { useState, useEffect } from 'react'
import { Sliders, Save, Loader2 } from 'lucide-react'

interface Weights {
  montessori_weight: number
  waldorf_weight: number
  charlotte_mason_weight: number
  unschool_weight: number
  classical_weight: number
  hands_on_weight: number
  literature_based_weight: number
}

const SLIDERS: Array<{ key: keyof Weights; label: string; emoji: string; color: string }> = [
  { key: 'montessori_weight', label: 'Montessori', emoji: '🧩', color: 'accent-teal-500' },
  { key: 'waldorf_weight', label: 'Waldorf', emoji: '🌿', color: 'accent-emerald-500' },
  { key: 'charlotte_mason_weight', label: 'Charlotte Mason', emoji: '📖', color: 'accent-amber-500' },
  { key: 'unschool_weight', label: 'Unschool / Life Learner', emoji: '🌎', color: 'accent-blue-500' },
  { key: 'classical_weight', label: 'Classical', emoji: '🏛️', color: 'accent-purple-500' },
  { key: 'hands_on_weight', label: 'Hands-on / Tactile', emoji: '🤲', color: 'accent-orange-500' },
  { key: 'literature_based_weight', label: 'Literature-based', emoji: '📚', color: 'accent-rose-500' },
]

const PRESETS: Array<{ label: string; weights: Weights }> = [
  {
    label: "Lola's Blend",
    weights: { montessori_weight: 25, waldorf_weight: 20, charlotte_mason_weight: 30, unschool_weight: 10, classical_weight: 5, hands_on_weight: 70, literature_based_weight: 60 },
  },
  {
    label: 'Montessori-heavy',
    weights: { montessori_weight: 80, waldorf_weight: 10, charlotte_mason_weight: 5, unschool_weight: 5, classical_weight: 0, hands_on_weight: 60, literature_based_weight: 20 },
  },
  {
    label: 'CM Classical',
    weights: { montessori_weight: 10, waldorf_weight: 5, charlotte_mason_weight: 60, unschool_weight: 0, classical_weight: 40, hands_on_weight: 30, literature_based_weight: 70 },
  },
  {
    label: 'Pure Unschool',
    weights: { montessori_weight: 10, waldorf_weight: 10, charlotte_mason_weight: 5, unschool_weight: 80, classical_weight: 0, hands_on_weight: 40, literature_based_weight: 20 },
  },
  {
    label: 'Balanced',
    weights: { montessori_weight: 25, waldorf_weight: 25, charlotte_mason_weight: 25, unschool_weight: 25, classical_weight: 25, hands_on_weight: 50, literature_based_weight: 50 },
  },
]

export default function PedagogyPresetPanel({ onClose }: { onClose: () => void }) {
  const [weights, setWeights] = useState<Weights>(PRESETS[0].weights)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/curriculum-planner?action=get_pedagogy_prefs')
      .then(r => r.json())
      .then(d => { if (d.prefs) setWeights(d.prefs) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/curriculum-planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_pedagogy_prefs', ...weights }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const applyPreset = (preset: Weights) => {
    setWeights(preset)
    setSaved(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-500" />
            Teaching Philosophy
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-600">
            Tune how Coral suggests units and resources. Higher weight = more suggestions in that style.
          </p>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p.weights)}
                className="px-3 py-1.5 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-50">
                {p.label}
              </button>
            ))}
          </div>

          {/* Sliders */}
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-3">
              {SLIDERS.map(s => (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-slate-700 flex items-center gap-1.5">
                      <span>{s.emoji}</span> {s.label}
                    </label>
                    <span className="text-xs font-mono text-slate-500 w-8 text-right">{weights[s.key]}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={weights[s.key]}
                    onChange={e => { setWeights({ ...weights, [s.key]: parseInt(e.target.value) }); setSaved(false) }}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-between">
          {saved && <span className="text-xs text-emerald-600 font-medium">Saved!</span>}
          {!saved && <span />}
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
