'use client'

import { useState } from 'react'
import { MessageCircle, Send, X, Check, Camera, Trash2 } from 'lucide-react'

const SIBLINGS = ['Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah']
const INVOLVED_OPTIONS = [
  ...SIBLINGS.map(s => ({ id: s.toLowerCase(), label: s })),
  { id: 'parent', label: 'A parent' },
  { id: 'pet', label: 'A pet (Belle, Midnight, Spike, Hades)' },
  { id: 'outside', label: 'Someone outside the family' },
  { id: 'just_me', label: 'Just me' },
  { id: 'rather_not', label: "I'd rather not say" },
]

const FEELINGS = [
  { emoji: '\uD83D\uDE0A', label: 'Happy' },
  { emoji: '\uD83D\uDE14', label: 'Sad' },
  { emoji: '\uD83D\uDE20', label: 'Angry' },
  { emoji: '\uD83D\uDE28', label: 'Scared' },
  { emoji: '\uD83D\uDE15', label: 'Confused' },
  { emoji: '\uD83D\uDE22', label: 'Hurt' },
  { emoji: '\uD83E\uDD14', label: 'Thinking' },
  { emoji: '\uD83D\uDE10', label: 'Meh' },
]

const WHEN_OPTIONS = [
  { id: 'just_now', label: 'Just now' },
  { id: 'earlier_today', label: 'Earlier today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This week' },
]

interface KidReportFormProps {
  kidName: string
  onClose: () => void
}

export default function KidReportForm({ kidName, onClose }: KidReportFormProps) {
  const [what, setWhat] = useState('')
  const [involved, setInvolved] = useState<string[]>([])
  const [feeling, setFeeling] = useState('')
  const [when, setWhen] = useState('just_now')
  const [goodBad, setGoodBad] = useState<'good' | 'bad' | 'neutral'>('bad')
  const [photos, setPhotos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const toggleInvolved = (id: string) => {
    setInvolved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || photos.length >= 3) return
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) setPhotos(prev => [...prev, reader.result as string])
    }
    reader.readAsDataURL(file)
    e.target.value = '' // allow re-selecting same file
  }

  const handleSubmit = async () => {
    if (!what.trim()) return
    setSubmitting(true)
    await fetch('/api/kid-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_report',
        submitting_kid: kidName,
        involved_kids: involved.filter(i => !['parent', 'pet', 'outside', 'just_me', 'rather_not'].includes(i)),
        what_happened: what,
        when_happened: when,
        feeling,
        good_bad_neutral: goodBad,
        photos,
      }),
    }).catch(() => {})
    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-xs mx-4" onClick={e => e.stopPropagation()}>
          <div className="text-4xl mb-3">{'\uD83D\uDC9A'}</div>
          <p className="font-semibold text-gray-900">Sent!</p>
          <p className="text-sm text-gray-500 mt-1">Mom or Dad will see this.</p>
          <button onClick={onClose} className="mt-4 text-sm text-indigo-600 hover:text-indigo-700">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md mx-0 md:mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-500" /> Talk to Mom &amp; Dad
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Good / Bad / Neutral */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Is this...</p>
            <div className="flex gap-2">
              {[
                { id: 'good' as const, label: 'Something good', emoji: '\uD83D\uDE0A' },
                { id: 'bad' as const, label: 'Something bad', emoji: '\uD83D\uDE1F' },
                { id: 'neutral' as const, label: 'Just telling you', emoji: '\uD83E\uDD37' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setGoodBad(opt.id)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition ${
                    goodBad === opt.id
                      ? opt.id === 'good' ? 'border-green-400 bg-green-50 text-green-700' :
                        opt.id === 'bad' ? 'border-red-400 bg-red-50 text-red-700' :
                        'border-gray-400 bg-gray-50 text-gray-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* What happened */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">What happened?</label>
            <textarea value={what} onChange={e => setWhat(e.target.value)}
              rows={3} placeholder="Tell us in your own words..."
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>

          {/* Who was involved */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Who was involved? <span className="font-normal text-gray-400">(optional)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {INVOLVED_OPTIONS.filter(o => o.id !== kidName.toLowerCase()).map(opt => (
                <button key={opt.id} onClick={() => toggleInvolved(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    involved.includes(opt.id) ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* How do you feel */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">How do you feel? <span className="font-normal text-gray-400">(optional)</span></label>
            <div className="flex flex-wrap gap-2">
              {FEELINGS.map(f => (
                <button key={f.label} onClick={() => setFeeling(feeling === f.label ? '' : f.label)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition ${
                    feeling === f.label ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  <span>{f.emoji}</span> {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* When */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">When did it happen?</label>
            <div className="flex flex-wrap gap-2">
              {WHEN_OPTIONS.map(w => (
                <button key={w.id} onClick={() => setWhen(w.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    when === w.id ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Photos <span className="font-normal text-gray-400">(optional, up to 3)</span>
            </label>
            {photos.length > 0 && (
              <div className="flex gap-2 mb-2">
                {photos.map((photo, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < 3 && (
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer w-fit">
                <Camera className="w-4 h-4" />
                {photos.length === 0 ? 'Add a photo' : 'Add another'}
                <input type="file" accept="image/*" capture="environment" onChange={handleAddPhoto} className="hidden" />
              </label>
            )}
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={!what.trim() || submitting}
            className="w-full bg-indigo-500 text-white py-3 rounded-lg font-medium hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? 'Sending...' : <><Send className="w-4 h-4" /> Send to Mom &amp; Dad</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// Floating trigger button for kid portal
export function TalkToParentsButton({ kidName }: { kidName: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 left-4 md:left-auto md:right-[4.5rem] z-40 bg-indigo-100 text-indigo-700 px-3 py-2 rounded-full text-xs font-medium shadow-md hover:bg-indigo-200 transition-colors border border-indigo-200 flex items-center gap-1.5">
        <MessageCircle className="w-3.5 h-3.5" /> Talk to Mom &amp; Dad
      </button>
      {open && <KidReportForm kidName={kidName} onClose={() => setOpen(false)} />}
    </>
  )
}
