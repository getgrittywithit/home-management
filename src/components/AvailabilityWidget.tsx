'use client'

import { useState, useEffect } from 'react'

const STATUSES = [
  { value: 'available', label: 'Available', dot: 'bg-green-500', ring: 'ring-green-300 bg-green-50' },
  { value: 'busy', label: 'Give Me 10 Min', dot: 'bg-amber-500', ring: 'ring-amber-300 bg-amber-50' },
  { value: 'out', label: 'Busy', dot: 'bg-red-500', ring: 'ring-red-300 bg-red-50' },
]

export default function AvailabilityWidget() {
  const [status, setStatus] = useState('available')
  const [note, setNote] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/parent/availability')
      .then(r => r.json())
      .then(data => {
        if (data.lola) {
          setStatus(data.lola.status || 'available')
          setNote(data.lola.note || '')
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const save = async (newStatus: string, newNote?: string) => {
    const s = newStatus || status
    const n = newNote !== undefined ? newNote : note
    setStatus(s)
    await fetch('/api/parent/availability', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_status', parent_name: 'lola', status: s, note: n || null })
    }).catch(() => {})
  }

  if (!loaded) return null

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 flex items-center gap-4 flex-wrap">
      <span className="text-sm font-medium text-gray-700">Today I'm:</span>
      <div className="flex gap-2">
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => save(s.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              status === s.value ? `ring-2 ${s.ring}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            {s.label}
          </button>
        ))}
      </div>
      {status !== 'available' && (
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          onBlur={() => save(status, note)}
          placeholder="Note (visible to kids)..."
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
      )}
    </div>
  )
}
