'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Check } from 'lucide-react'

export default function SchoolMakeupCard({ childName }: { childName: string }) {
  const [work, setWork] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const kid = childName.toLowerCase()

  // Only show for public school kids
  if (!['zoey', 'kaylee'].includes(kid)) return null

  useEffect(() => {
    fetch(`/api/parent/teacher?action=get_public_makeup&kid=${kid}&status=pending`)
      .then(r => r.json())
      .then(d => { setWork(d.work || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [kid])

  if (!loaded || work.length === 0) return null

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  const markDone = async (id: number) => {
    setWork(prev => prev.filter(w => w.id !== id))
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_public_makeup_status', id, status: 'complete' })
    })
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-blue-500" /> School Makeup Due
      </h3>
      <div className="space-y-2">
        {work.map(w => {
          const overdue = w.due_date && w.due_date < today
          return (
            <div key={w.id} className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{w.subject}</span>
                {w.due_date && (
                  <span className={`text-xs ml-2 ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                    due {new Date(w.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {overdue && ' ⚠️'}
                  </span>
                )}
              </div>
              <button onClick={() => markDone(w.id)}
                className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Done
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
