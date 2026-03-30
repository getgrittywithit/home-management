'use client'

import { useState, useEffect } from 'react'
import {
  Plus, X, Thermometer, Heart, Activity, Wind, Scale, CircleDot,
  AlertTriangle, StickyNote, Check, ChevronRight, Loader2
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface FamilyMember {
  name: string
  role: 'parent' | 'child'
}

const FAMILY_MEMBERS: FamilyMember[] = [
  { name: 'Lola', role: 'parent' },
  { name: 'Levi', role: 'parent' },
  { name: 'Amos', role: 'child' },
  { name: 'Zoey', role: 'child' },
  { name: 'Kaylee', role: 'child' },
  { name: 'Ellie', role: 'child' },
  { name: 'Wyatt', role: 'child' },
  { name: 'Hannah', role: 'child' },
]

const LOG_TYPES = [
  { id: 'temperature', label: 'Temperature', icon: Thermometer, color: 'bg-orange-100 text-orange-600' },
  { id: 'heart_rate', label: 'Heart Rate', icon: Heart, color: 'bg-red-100 text-red-600' },
  { id: 'bp', label: 'Blood Pressure', icon: Activity, color: 'bg-purple-100 text-purple-600' },
  { id: 'o2', label: 'O2 Sat', icon: Wind, color: 'bg-cyan-100 text-cyan-600' },
  { id: 'weight_height', label: 'Weight/Height', icon: Scale, color: 'bg-green-100 text-green-600' },
  { id: 'dental', label: 'Dental', icon: CircleDot, color: 'bg-blue-100 text-blue-600' },
  { id: 'symptoms', label: 'Symptoms', icon: AlertTriangle, color: 'bg-amber-100 text-amber-600' },
  { id: 'note', label: 'Note', icon: StickyNote, color: 'bg-gray-100 text-gray-600' },
]

interface ActiveEpisode {
  id: string
  name: string
  members: string[]
}

const MEMBER_COLORS: Record<string, string> = {
  Lola: 'bg-rose-200 text-rose-700 ring-rose-400',
  Levi: 'bg-blue-200 text-blue-700 ring-blue-400',
  Amos: 'bg-green-200 text-green-700 ring-green-400',
  Zoey: 'bg-purple-200 text-purple-700 ring-purple-400',
  Kaylee: 'bg-pink-200 text-pink-700 ring-pink-400',
  Ellie: 'bg-amber-200 text-amber-700 ring-amber-400',
  Wyatt: 'bg-cyan-200 text-cyan-700 ring-cyan-400',
  Hannah: 'bg-lime-200 text-lime-700 ring-lime-400',
}

// ============================================================================
// QUICK HEALTH LOG — FAB + MODAL
// ============================================================================

export default function QuickHealthLog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)

  // Form state
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState('')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [linkedEpisode, setLinkedEpisode] = useState<string | null>(null)

  // Type-specific fields
  const [bpSystolic, setBpSystolic] = useState('')
  const [bpDiastolic, setBpDiastolic] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')

  // Active episodes for linking
  const [episodes, setEpisodes] = useState<ActiveEpisode[]>([])

  useEffect(() => {
    if (open && step === 4) {
      fetch('/api/health-hub?action=get_episodes')
        .then(r => r.json())
        .then(data => {
          const active = (data.episodes || []).filter((e: ActiveEpisode & { resolved?: boolean }) => !e.resolved)
          // Only show episodes that include at least one selected member
          const relevant = active.filter((ep: ActiveEpisode) =>
            ep.members.some((m: string) => selectedMembers.includes(m))
          )
          setEpisodes(relevant)
        })
        .catch(() => setEpisodes([]))
    }
  }, [open, step, selectedMembers])

  const reset = () => {
    setStep(1)
    setSelectedMembers([])
    setSelectedType('')
    setValue('')
    setNotes('')
    setLinkedEpisode(null)
    setBpSystolic('')
    setBpDiastolic('')
    setWeight('')
    setHeight('')
    setEpisodes([])
  }

  const handleOpen = () => {
    reset()
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    reset()
  }

  const toggleMember = (name: string) => {
    setSelectedMembers(prev =>
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    )
  }

  const getComputedValue = (): string => {
    if (selectedType === 'bp') return `${bpSystolic}/${bpDiastolic}`
    if (selectedType === 'weight_height') {
      const parts = []
      if (weight) parts.push(`${weight} lbs`)
      if (height) parts.push(`${height} in`)
      return parts.join(', ')
    }
    return value
  }

  const canAdvance = (): boolean => {
    if (step === 1) return selectedMembers.length > 0
    if (step === 2) return !!selectedType
    if (step === 3) {
      if (selectedType === 'bp') return !!bpSystolic && !!bpDiastolic
      if (selectedType === 'weight_height') return !!weight || !!height
      if (selectedType === 'note' || selectedType === 'symptoms') return !!value
      return !!value
    }
    return true
  }

  const advanceStep = () => {
    if (step < 4) {
      // If step 3 and no relevant episodes, skip step 4
      if (step === 3) {
        // We check episodes in step 4 useEffect, so just go there
        setStep(4)
      } else {
        setStep(step + 1)
      }
    }
  }

  const save = async () => {
    setSaving(true)
    const computedValue = getComputedValue()
    try {
      await fetch('/api/health-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quick_log',
          members: selectedMembers,
          type: selectedType,
          value: computedValue,
          notes,
          episode_id: linkedEpisode,
        })
      })
      setOpen(false)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      reset()
    } catch { /* empty */ }
    setSaving(false)
  }

  const stepLabel = ['', 'Who?', 'What type?', 'Enter value', 'Link to episode?'][step]

  return (
    <>
      {/* FAB */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 hover:shadow-xl transition-all flex items-center justify-center group"
        title="Quick Health Log"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
      </button>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-24 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">Health log saved!</span>
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={handleClose}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">Quick Health Log</h3>
                <p className="text-xs text-gray-500">Step {step} of 4 — {stepLabel}</p>
              </div>
              <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-100">
              <div className="h-1 bg-red-500 transition-all" style={{ width: `${(step / 4) * 100}%` }} />
            </div>

            <div className="p-4">
              {/* Step 1: Who */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 font-medium">Select family members:</p>
                  <div className="grid grid-cols-4 gap-3">
                    {FAMILY_MEMBERS.map(m => {
                      const sel = selectedMembers.includes(m.name)
                      return (
                        <button key={m.name} onClick={() => toggleMember(m.name)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all
                            ${sel ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-100 hover:border-gray-200'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                            ${MEMBER_COLORS[m.name] || 'bg-gray-200 text-gray-700'}
                            ${sel ? 'ring-2 ring-offset-1' : ''}`}>
                            {m.name[0]}
                          </div>
                          <span className="text-xs font-medium text-gray-700">{m.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: What type */}
              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 font-medium">What are you logging?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {LOG_TYPES.map(lt => {
                      const Icon = lt.icon
                      const sel = selectedType === lt.id
                      return (
                        <button key={lt.id} onClick={() => setSelectedType(lt.id)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left
                            ${sel ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${lt.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{lt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Enter value */}
              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 font-medium">
                    Enter {LOG_TYPES.find(t => t.id === selectedType)?.label || 'value'}:
                  </p>

                  {selectedType === 'temperature' && (
                    <div>
                      <input type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)}
                        className="w-full border-2 rounded-xl px-4 py-3 text-lg font-medium focus:border-blue-500 outline-none"
                        placeholder="98.6" autoFocus />
                      <p className="text-xs text-gray-400 mt-1">Degrees Fahrenheit</p>
                    </div>
                  )}

                  {selectedType === 'heart_rate' && (
                    <div>
                      <input type="number" value={value} onChange={e => setValue(e.target.value)}
                        className="w-full border-2 rounded-xl px-4 py-3 text-lg font-medium focus:border-blue-500 outline-none"
                        placeholder="72" autoFocus />
                      <p className="text-xs text-gray-400 mt-1">Beats per minute</p>
                    </div>
                  )}

                  {selectedType === 'bp' && (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input type="number" value={bpSystolic} onChange={e => setBpSystolic(e.target.value)}
                          className="w-full border-2 rounded-xl px-4 py-3 text-lg font-medium focus:border-blue-500 outline-none"
                          placeholder="120" autoFocus />
                        <p className="text-xs text-gray-400 mt-1">Systolic</p>
                      </div>
                      <span className="self-center text-2xl text-gray-300 font-light">/</span>
                      <div className="flex-1">
                        <input type="number" value={bpDiastolic} onChange={e => setBpDiastolic(e.target.value)}
                          className="w-full border-2 rounded-xl px-4 py-3 text-lg font-medium focus:border-blue-500 outline-none"
                          placeholder="80" />
                        <p className="text-xs text-gray-400 mt-1">Diastolic</p>
                      </div>
                    </div>
                  )}

                  {selectedType === 'o2' && (
                    <div>
                      <input type="number" value={value} onChange={e => setValue(e.target.value)}
                        className="w-full border-2 rounded-xl px-4 py-3 text-lg font-medium focus:border-blue-500 outline-none"
                        placeholder="98" autoFocus />
                      <p className="text-xs text-gray-400 mt-1">Percentage (SpO2)</p>
                    </div>
                  )}

                  {selectedType === 'weight_height' && (
                    <div className="space-y-3">
                      <div>
                        <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
                          className="w-full border-2 rounded-xl px-4 py-3 text-lg font-medium focus:border-blue-500 outline-none"
                          placeholder="Weight (lbs)" autoFocus />
                      </div>
                      <div>
                        <input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)}
                          className="w-full border-2 rounded-xl px-4 py-3 text-lg font-medium focus:border-blue-500 outline-none"
                          placeholder="Height (inches)" />
                      </div>
                    </div>
                  )}

                  {selectedType === 'dental' && (
                    <div>
                      <input value={value} onChange={e => setValue(e.target.value)}
                        className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                        placeholder="e.g. Tooth #5 wiggly, lost first molar" autoFocus />
                    </div>
                  )}

                  {selectedType === 'symptoms' && (
                    <div>
                      <textarea value={value} onChange={e => setValue(e.target.value)} rows={3}
                        className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none resize-none"
                        placeholder="Describe symptoms: cough, runny nose, headache..." autoFocus />
                    </div>
                  )}

                  {selectedType === 'note' && (
                    <div>
                      <textarea value={value} onChange={e => setValue(e.target.value)} rows={3}
                        className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none resize-none"
                        placeholder="General health note..." autoFocus />
                    </div>
                  )}

                  {/* Optional notes for non-text types */}
                  {!['note', 'symptoms'].includes(selectedType) && (
                    <div>
                      <input value={notes} onChange={e => setNotes(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm text-gray-600 focus:border-blue-400 outline-none"
                        placeholder="Optional notes..." />
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Link to episode */}
              {step === 4 && (
                <div className="space-y-3">
                  {episodes.length > 0 ? (
                    <>
                      <p className="text-sm text-gray-600 font-medium">Link to an active episode?</p>
                      <div className="space-y-2">
                        <button onClick={() => setLinkedEpisode(null)}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all
                            ${!linkedEpisode ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                          <span className="text-sm font-medium text-gray-700">No episode (standalone log)</span>
                        </button>
                        {episodes.map(ep => (
                          <button key={ep.id} onClick={() => setLinkedEpisode(ep.id)}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all
                              ${linkedEpisode === ep.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                            <span className="text-sm font-medium text-gray-700">{ep.name}</span>
                            <div className="flex gap-1 mt-1">
                              {ep.members.map(m => (
                                <span key={m} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{m}</span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No active episodes for selected members.</p>
                      <p className="text-xs text-gray-400 mt-1">This will be saved as a standalone log entry.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t flex gap-2">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Back
                </button>
              )}
              <div className="flex-1" />
              {step < 4 ? (
                <button onClick={advanceStep} disabled={!canAdvance()}
                  className={`px-6 py-2.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors
                    ${canAdvance() ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={save} disabled={saving}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Log
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
