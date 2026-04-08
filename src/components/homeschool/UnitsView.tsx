'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, CheckCircle2 } from 'lucide-react'
import { UnitStudy } from './types'

export default function UnitsView({ units: initialUnits }: { units: UnitStudy[] }) {
  const [units, setUnits] = useState(initialUnits)
  const [showAdd, setShowAdd] = useState(false)
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active')
  const [form, setForm] = useState({
    title: '', description: '', subject_tags: [] as string[],
    student_names: [] as string[], start_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
    resources: '',
  })

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch(`/api/homeschool?action=get_units&status=${viewMode}`)
      const data = await res.json()
      setUnits(data.units || [])
    } catch (e) { console.error(e) }
  }, [viewMode])

  useEffect(() => { fetchUnits() }, [fetchUnits])

  const handleCreate = async () => {
    if (!form.title) return
    await fetch('/api/homeschool', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_unit', title: form.title, description: form.description || null,
        subject_tags: form.subject_tags, student_names: form.student_names.length > 0 ? form.student_names : ['Amos','Ellie','Wyatt','Hannah'],
        start_date: form.start_date, resources: form.resources ? form.resources.split('\n').filter(Boolean) : null,
      }),
    })
    setShowAdd(false)
    setForm({ title: '', description: '', subject_tags: [], student_names: [], start_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }), resources: '' })
    fetchUnits()
  }

  const toggleSubject = (s: string) => setForm(prev => ({ ...prev, subject_tags: prev.subject_tags.includes(s) ? prev.subject_tags.filter(x => x !== s) : [...prev.subject_tags, s] }))
  const toggleStudent = (n: string) => setForm(prev => ({ ...prev, student_names: prev.student_names.includes(n) ? prev.student_names.filter(x => x !== n) : [...prev.student_names, n] }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('active')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'active' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Active</button>
          <button onClick={() => setViewMode('completed')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'completed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Completed</button>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700">
          <Plus className="w-4 h-4" /> New Unit
        </button>
      </div>

      {units.length === 0 ? (
        <div className="bg-white rounded-lg border p-6 text-center text-sm text-gray-400">
          {viewMode === 'active' ? 'No active unit studies. Create one to get started!' : 'No completed units yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {units.map(unit => (
            <div key={unit.id} className="bg-white rounded-lg border shadow-sm p-4">
              <div className="flex items-start justify-between">
                <h4 className="font-bold text-gray-900">{unit.title}</h4>
                {viewMode === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              </div>
              {unit.description && <p className="text-sm text-gray-600 mt-1">{unit.description}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(unit.subjects || []).map((s: string) => (
                  <span key={s} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
              {unit.student_names && <p className="text-xs text-gray-400 mt-2">Students: {(unit.student_names || []).map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(', ')}</p>}
              <p className="text-xs text-gray-400 mt-1">Started {new Date(typeof unit.start_date === 'string' ? unit.start_date.slice(0, 10) + 'T12:00:00' : unit.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">New Unit Study</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Ocean Life Unit Study" className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Subject Tags</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['Math','ELAR','Science','Social Studies','Art','PE','Life Skills','Financial Literacy'].map(s => (
                    <button key={s} type="button" onClick={() => toggleSubject(s)}
                      className={`px-2 py-1 rounded text-xs font-medium ${form.subject_tags.includes(s) ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{s}</button>
                  ))}
                </div></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Students</label>
                <div className="flex gap-2 mt-1">
                  {['Amos','Ellie','Wyatt','Hannah'].map(n => (
                    <button key={n} type="button" onClick={() => toggleStudent(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${form.student_names.includes(n) ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{n}</button>
                  ))}
                </div></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Start Date</label>
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Resources (one per line)</label>
                <textarea value={form.resources} onChange={e => setForm(f => ({ ...f, resources: e.target.value }))} rows={3} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={!form.title} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Create Unit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
