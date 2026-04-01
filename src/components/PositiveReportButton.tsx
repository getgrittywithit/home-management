'use client'

import { useState } from 'react'
import { Sparkles, X, Heart, Shield, Users, Zap, Sprout, Eye } from 'lucide-react'

interface PositiveReportButtonProps {
  kidName: string
  source: 'self' | 'sibling' | 'parent'
  onSubmit?: () => void
}

const CATEGORIES = [
  { id: 'kindness', label: 'Was kind to someone', icon: '💛' },
  { id: 'patience', label: 'Stayed calm in a tough moment', icon: '😌' },
  { id: 'helping', label: 'Helped someone without asking', icon: '🤝' },
  { id: 'bravery', label: 'Was brave or did something hard', icon: '💪' },
  { id: 'accountability', label: 'Said sorry / took ownership', icon: '🙏' },
  { id: 'growth', label: 'Tried something new', icon: '🌱' },
]

const ALL_KIDS = ['Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah']

export default function PositiveReportButton({ kidName, source, onSubmit }: PositiveReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'who' | 'what' | 'note'>('who')
  const [targetKid, setTargetKid] = useState(source === 'self' ? kidName : '')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const label = source === 'self' ? 'I Did Something Good' :
    source === 'sibling' ? 'I Saw Something Good' : 'Caught Being Good'
  const icon = source === 'self' ? '🌟' : source === 'sibling' ? '👀' : '🌟'

  const handleSubmit = async () => {
    if (!targetKid || !category) return
    setSubmitting(true)
    await fetch('/api/positive-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_report',
        kid_name: targetKid,
        category,
        note: note || null,
        source,
        submitted_by: kidName,
      }),
    }).catch(() => {})
    setSubmitting(false)
    setSubmitted(true)
    setTimeout(() => { setOpen(false); setSubmitted(false); setStep('who'); setCategory(''); setNote(''); setTargetKid(source === 'self' ? kidName : '') }, 2000)
    onSubmit?.()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-sm font-medium transition-colors"
      >
        <span>{icon}</span> {label}
      </button>
    )
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
        <div className="text-4xl mb-2">✨</div>
        <p className="font-semibold text-green-800">
          {source === 'parent' ? 'Noted! They\'ll see a notification.' : 'Submitted! Mom will review it.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-amber-800">{icon} {label}</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Step 1: Who (for sibling/parent reports) */}
      {source !== 'self' && step === 'who' && (
        <div>
          <p className="text-sm text-gray-700 mb-2">Who did something great?</p>
          <div className="flex flex-wrap gap-2">
            {ALL_KIDS.filter(k => k.toLowerCase() !== kidName.toLowerCase()).map(kid => (
              <button
                key={kid}
                onClick={() => { setTargetKid(kid.toLowerCase()); setStep('what') }}
                className="px-4 py-2 rounded-lg border border-amber-200 bg-white text-sm font-medium hover:bg-amber-100"
              >
                {kid}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: What */}
      {(source === 'self' || step === 'what' || step === 'note') && step !== 'who' ? null : null}
      {((source === 'self' && step === 'who') || step === 'what') && (
        <div>
          <p className="text-sm text-gray-700 mb-2">What happened?</p>
          <div className="space-y-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.id); setStep('note') }}
                className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm ${
                  category === cat.id ? 'border-amber-400 bg-amber-100' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Note + Submit */}
      {step === 'note' && (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-700 mb-1">Tell us more (optional)</p>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What happened?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  )
}
