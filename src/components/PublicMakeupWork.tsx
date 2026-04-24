'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

const PUBLIC_SCHOOL = ['zoey', 'kaylee']
const KID_DISPLAY: Record<string, string> = { zoey: 'Zoey', kaylee: 'Kaylee' }

export default function PublicMakeupWork() {
  const [selectedKid, setSelectedKid] = useState('zoey')
  const [work, setWork] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ sick_date: '', ab_day: '', subject: '', description: '', due_date: '' })

  const loadWork = (kid: string) => {
    setSelectedKid(kid)
    fetch(`/api/parent/teacher?action=get_public_makeup&kid=${kid}`)
      .then(r => r.json())
      .then(d => { setWork(d.work || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }

  useEffect(() => { loadWork('zoey') }, [])

  const updateStatus = async (id: number, status: string) => {
    setWork(prev => prev.map(w => w.id === id ? { ...w, status } : w))
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_public_makeup_status', id, status })
    })
  }

  const addAssignment = async () => {
    if (!addForm.subject.trim() || !addForm.sick_date) return
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_public_makeup', kid: selectedKid, ...addForm })
    })
    setAddForm({ sick_date: '', ab_day: '', subject: '', description: '', due_date: '' })
    setShowAdd(false)
    loadWork(selectedKid)
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const pending = work.filter(w => w.status === 'pending')
  const completed = work.filter(w => w.status !== 'pending')

  // Group pending by sick_date
  const grouped: Record<string, any[]> = {}
  pending.forEach(w => {
    const key = `${w.sick_date}-${w.ab_day || '?'}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(w)
  })

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">Public School Makeup Work</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-blue-600 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add Assignment
        </button>
      </div>

      <div className="flex gap-1">
        {PUBLIC_SCHOOL.map(k => (
          <button key={k} onClick={() => loadWork(k)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${selectedKid === k ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600'}`}>
            {KID_DISPLAY[k]}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={addForm.sick_date} onChange={e => setAddForm(p => ({ ...p, sick_date: e.target.value }))} className="text-xs border rounded px-2 py-1" />
            <select value={addForm.ab_day} onChange={e => setAddForm(p => ({ ...p, ab_day: e.target.value }))} className="text-xs border rounded px-2 py-1">
              <option value="">A/B?</option><option value="A">Day A</option><option value="B">Day B</option>
            </select>
            <input type="date" value={addForm.due_date} onChange={e => setAddForm(p => ({ ...p, due_date: e.target.value }))} placeholder="Due date" className="text-xs border rounded px-2 py-1" />
          </div>
          <input type="text" value={addForm.subject} onChange={e => setAddForm(p => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="w-full text-xs border rounded px-2 py-1" />
          <input type="text" value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" className="w-full text-xs border rounded px-2 py-1" />
          <div className="flex gap-2">
            <button onClick={addAssignment} className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Add</button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      {!loaded ? (
        <div className="h-16 flex items-center justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" /></div>
      ) : pending.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">No open makeup work</p>
      ) : (
        Object.entries(grouped).map(([key, items]) => {
          const first = items[0]
          const overdue = first.due_date < today
          return (
            <div key={key} className={`border rounded-lg p-3 ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                {first.ab_day && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${first.ab_day === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    Day {first.ab_day}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Absent: {parseDateLocal(first.sick_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                {first.due_date && (
                  <span className={`text-xs ml-auto ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                    Due: {parseDateLocal(first.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {overdue && ' OVERDUE'}
                  </span>
                )}
              </div>
              {items.map(w => (
                <div key={w.id} className="flex items-center justify-between py-1">
                  <div className="text-sm">
                    <span className="font-medium">{w.subject}</span>
                    {w.description && <span className="text-gray-500 ml-1">— {w.description}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => updateStatus(w.id, 'complete')} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Done
                    </button>
                    <button onClick={() => updateStatus(w.id, 'excused')} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200">
                      Excuse
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })
      )}

      {completed.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-400 mb-1">Completed / Excused ({completed.length})</p>
          {completed.slice(0, 5).map(w => (
            <div key={w.id} className="text-xs text-gray-400 py-0.5 flex items-center gap-2">
              <span>{w.status === 'complete' ? '✅' : '🔸'}</span>
              <span>{w.subject} — {parseDateLocal(w.sick_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
