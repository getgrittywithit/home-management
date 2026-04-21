'use client'

import { useState } from 'react'
import { Timer, Save } from 'lucide-react'
import { HOMESCHOOL_KIDS, KID_DISPLAY } from '@/lib/constants'

export default function IXLManualLog() {
  const [kid, setKid] = useState('amos')
  const [minutes, setMinutes] = useState('')
  const [skills, setSkills] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await fetch('/api/school/ixl-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kid_name: kid, minutes_spent: parseInt(minutes) || null, skills_worked_on: skills || null, notes: notes || null }),
    }).catch(() => {})
    setSaved(true)
    setTimeout(() => { setSaved(false); setMinutes(''); setSkills(''); setNotes('') }, 2000)
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
        <Timer className="w-4 h-4 text-blue-500" /> Log IXL Time
      </h3>
      <div className="space-y-2">
        <div className="flex gap-2">
          <select value={kid} onChange={e => setKid(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs">
            {[...HOMESCHOOL_KIDS].map(k => <option key={k} value={k}>{KID_DISPLAY[k]}</option>)}
          </select>
          <input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="Min"
            className="w-16 border rounded-lg px-2 py-1.5 text-xs" />
        </div>
        <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Skills worked on (e.g., Q.5, D.3)"
          className="w-full border rounded-lg px-3 py-1.5 text-xs" />
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
          className="w-full border rounded-lg px-3 py-1.5 text-xs" />
        <button onClick={handleSave} disabled={!minutes}
          className="w-full bg-blue-500 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-1">
          {saved ? <><Save className="w-3 h-3" /> Saved!</> : 'Log IXL Time'}
        </button>
      </div>
    </div>
  )
}
