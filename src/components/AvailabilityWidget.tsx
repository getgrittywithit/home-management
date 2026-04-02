'use client'

import { useState, useEffect } from 'react'

const STATUSES = [
  { value: 'available', label: 'Available', dot: 'bg-green-500', ring: 'ring-green-300 bg-green-50' },
  { value: 'busy', label: 'Give Me 10 Min', dot: 'bg-amber-500', ring: 'ring-amber-300 bg-amber-50' },
  { value: 'out', label: 'Busy', dot: 'bg-red-500', ring: 'ring-red-300 bg-red-50' },
]

interface ParentStatus {
  name: string
  display: string
  status: string
  note: string
}

export default function AvailabilityWidget() {
  const [parents, setParents] = useState<ParentStatus[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/parent/availability').then(r => r.json()).catch(() => ({})),
      fetch('/api/family-members').then(r => r.json()).catch(() => ({ parents: [] })),
    ]).then(([avail, members]) => {
      const parentList = members.parents?.length
        ? members.parents
        : [{ name: 'mom', display: 'Mom' }, { name: 'dad', display: 'Dad' }]
      setParents(parentList.map((p: any) => ({
        name: p.name,
        display: p.display,
        status: avail[p.name]?.status || 'available',
        note: avail[p.name]?.note || '',
      })))
      setLoaded(true)
    })
  }, [])

  const save = async (parentName: string, newStatus: string, newNote?: string) => {
    setParents(prev => prev.map(p =>
      p.name === parentName ? { ...p, status: newStatus, ...(newNote !== undefined ? { note: newNote } : {}) } : p
    ))
    const parent = parents.find(p => p.name === parentName)
    await fetch('/api/parent/availability', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_status', parent_name: parentName, status: newStatus, note: newNote !== undefined ? newNote : (parent?.note || null) })
    }).catch(() => {})
  }

  if (!loaded) return null

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
      {parents.map(parent => (
        <div key={parent.name} className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700 w-20">{parent.display}:</span>
          <div className="flex gap-2">
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => save(parent.name, s.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  parent.status === s.value ? `ring-2 ${s.ring}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                {s.label}
              </button>
            ))}
          </div>
          {parent.status !== 'available' && (
            <input type="text" value={parent.note} onChange={e => setParents(prev => prev.map(p => p.name === parent.name ? { ...p, note: e.target.value } : p))}
              onBlur={() => save(parent.name, parent.status, parent.note)}
              placeholder="Note (visible to kids)..."
              className="flex-1 min-w-[200px] border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          )}
        </div>
      ))}
    </div>
  )
}
