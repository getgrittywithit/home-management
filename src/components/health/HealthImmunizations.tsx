'use client'

import { useState, useEffect } from 'react'
import { Syringe, Plus, X, AlertTriangle, Check, Calendar } from 'lucide-react'
import { ALL_KIDS, KID_DISPLAY } from '@/lib/constants'

interface Vaccination {
  id: number
  kid_name: string
  vaccine_name: string
  dose_number: number
  date_administered: string | null
  provider: string | null
  lot_number: string | null
  next_due_date: string | null
  notes: string | null
}

export default function HealthImmunizations() {
  const [records, setRecords] = useState<Vaccination[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedKid, setSelectedKid] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    kid_name: '', vaccine_name: '', dose_number: '1', date_administered: '', provider: '', lot_number: '', next_due_date: '', notes: ''
  })

  useEffect(() => {
    fetch('/api/health?action=get_vaccinations')
      .then(r => r.json())
      .then(data => { setRecords(data.vaccinations || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const addRecord = async () => {
    if (!form.kid_name || !form.vaccine_name) return
    const res = await fetch('/api/health', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_vaccination', data: form })
    }).then(r => r.json()).catch(() => null)
    if (res?.vaccination) {
      setRecords(prev => [res.vaccination, ...prev])
    }
    setForm({ kid_name: '', vaccine_name: '', dose_number: '1', date_administered: '', provider: '', lot_number: '', next_due_date: '', notes: '' })
    setShowAdd(false)
  }

  const deleteRecord = async (id: number) => {
    await fetch('/api/health', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_vaccination', id })
    }).catch(() => null)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const filtered = selectedKid === 'all' ? records : records.filter(r => r.kid_name === selectedKid)
  const grouped = ALL_KIDS.reduce((acc, kid) => {
    const kidRecords = filtered.filter(r => r.kid_name === kid)
    if (kidRecords.length > 0) acc[kid] = kidRecords
    return acc
  }, {} as Record<string, Vaccination[]>)

  const today = new Date().toISOString().slice(0, 10)
  const overdue = records.filter(r => r.next_due_date && r.next_due_date < today)

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>

  return (
    <div className="space-y-6">
      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Overdue Vaccinations ({overdue.length})</h3>
            <ul className="text-sm text-amber-800 mt-1 space-y-1">
              {overdue.map(r => (
                <li key={r.id}>{(KID_DISPLAY[r.kid_name] || r.kid_name)} — {r.vaccine_name} (due {r.next_due_date})</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={selectedKid}
            onChange={e => setSelectedKid(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Kids</option>
            {ALL_KIDS.map(kid => (
              <option key={kid} value={kid}>{KID_DISPLAY[kid] || kid}</option>
            ))}
          </select>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-teal-600 flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">New Vaccination Record</h3>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.kid_name} onChange={e => setForm(p => ({ ...p, kid_name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Select child</option>
              {ALL_KIDS.map(kid => <option key={kid} value={kid}>{KID_DISPLAY[kid] || kid}</option>)}
            </select>
            <input type="text" placeholder="Vaccine name (e.g., Tdap, MMR)" value={form.vaccine_name} onChange={e => setForm(p => ({ ...p, vaccine_name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Dose #" value={form.dose_number} onChange={e => setForm(p => ({ ...p, dose_number: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" min="1" />
            <input type="date" placeholder="Date administered" value={form.date_administered} onChange={e => setForm(p => ({ ...p, date_administered: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="text" placeholder="Provider" value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="text" placeholder="Lot number (optional)" value={form.lot_number} onChange={e => setForm(p => ({ ...p, lot_number: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" placeholder="Next due date" value={form.next_due_date} onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="text" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={addRecord} disabled={!form.kid_name || !form.vaccine_name} className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-600 disabled:opacity-50">Save</button>
            <button onClick={() => setShowAdd(false)} className="text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Records by Kid */}
      {Object.keys(grouped).length === 0 && !showAdd && (
        <div className="text-center text-gray-400 py-8">
          <Syringe className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No vaccination records yet.</p>
        </div>
      )}

      {Object.entries(grouped).map(([kid, recs]) => (
        <div key={kid} className="bg-white rounded-lg border shadow-sm">
          <div className="px-5 py-3 border-b bg-gray-50 rounded-t-lg">
            <h3 className="font-bold text-gray-900">{KID_DISPLAY[kid] || kid}</h3>
          </div>
          <div className="divide-y">
            {recs.sort((a, b) => (b.date_administered || '').localeCompare(a.date_administered || '')).map(rec => {
              const isOverdue = rec.next_due_date && rec.next_due_date < today
              const isUpcoming = rec.next_due_date && rec.next_due_date >= today && rec.next_due_date <= new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
              return (
                <div key={rec.id} className="px-5 py-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{rec.vaccine_name}</span>
                      {rec.dose_number > 1 && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Dose {rec.dose_number}</span>}
                      {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">OVERDUE</span>}
                      {isUpcoming && !isOverdue && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Due soon</span>}
                      {!rec.next_due_date && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Check className="w-3 h-3" /> Complete</span>}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4">
                      {rec.date_administered && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {rec.date_administered}</span>}
                      {rec.provider && <span>{rec.provider}</span>}
                      {rec.lot_number && <span>Lot: {rec.lot_number}</span>}
                    </div>
                    {rec.next_due_date && <p className="text-xs text-gray-400 mt-0.5">Next due: {rec.next_due_date}</p>}
                    {rec.notes && <p className="text-xs text-gray-500 mt-1 italic">{rec.notes}</p>}
                  </div>
                  <button onClick={() => deleteRecord(rec.id)} className="text-gray-300 hover:text-red-500 ml-2 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
