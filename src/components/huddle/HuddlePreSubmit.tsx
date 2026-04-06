'use client'

import { useState } from 'react'
import { Users, Check } from 'lucide-react'

const SHARE_TYPES = [
  { id: 'win', label: 'Win', emoji: '\uD83C\uDFC6' },
  { id: 'looking_forward', label: 'Looking Forward', emoji: '\uD83D\uDE80' },
  { id: 'shoutout', label: 'Shoutout', emoji: '\uD83D\uDC4F' },
  { id: 'request', label: 'Request', emoji: '\uD83D\uDE4B' },
  { id: 'concern', label: 'Concern', emoji: '\uD83D\uDCAD' },
]

interface HuddlePreSubmitProps {
  kidName: string
}

export default function HuddlePreSubmit({ kidName }: HuddlePreSubmitProps) {
  const [shareType, setShareType] = useState('win')
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!content.trim()) return
    await fetch('/api/family-huddle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pre_submit_share', kid_name: kidName, share_type: shareType, content }),
    })
    setSaved(true)
  }

  // Only show on Saturday & Sunday
  const now = new Date()
  const chicagoDay = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' })).getDay()
  if (chicagoDay !== 0 && chicagoDay !== 6) return null

  if (saved) return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
      <Check className="w-4 h-4 text-green-600" />
      <span className="text-sm text-green-800 font-medium">Share saved for tomorrow&apos;s huddle!</span>
    </div>
  )

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-indigo-500" />
        <span className="font-semibold text-sm text-gray-900">Huddle Prep</span>
        <span className="text-xs text-gray-500">Family Huddle is {chicagoDay === 6 ? 'tomorrow' : 'today'}!</span>
      </div>
      <p className="text-xs text-gray-600">Got a win, request, or something you&apos;re looking forward to? Prep your share now.</p>
      <div className="flex gap-1 flex-wrap">
        {SHARE_TYPES.map(st => (
          <button key={st.id} onClick={() => setShareType(st.id)}
            className={`px-2 py-0.5 rounded text-xs ${shareType === st.id ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 border'}`}>
            {st.emoji} {st.label}
          </button>
        ))}
      </div>
      <input type="text" value={content} onChange={e => setContent(e.target.value)}
        placeholder="What do you want to share?"
        className="w-full border rounded px-3 py-1.5 text-sm" />
      <button onClick={handleSave} disabled={!content.trim()}
        className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">
        Save for {chicagoDay === 6 ? 'Tomorrow' : 'Today'}
      </button>
    </div>
  )
}
