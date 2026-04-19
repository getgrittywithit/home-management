'use client'

import { useState, useEffect } from 'react'
import { Ruler, Plus, X, TrendingUp } from 'lucide-react'
import { ALL_KIDS, KID_DISPLAY } from '@/lib/constants'

interface Measurement {
  id: number
  kid_name: string
  measure_date: string
  height_inches: number | null
  weight_lbs: number | null
  bmi: number | null
  notes: string | null
}

function toFeetInches(inches: number): string {
  const ft = Math.floor(inches / 12)
  const inn = Math.round(inches % 12)
  return `${ft}'${inn}"`
}

export default function HealthGrowthChart() {
  const [records, setRecords] = useState<Measurement[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedKid, setSelectedKid] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ kid_name: '', measure_date: '', height_inches: '', weight_lbs: '', notes: '' })

  useEffect(() => {
    fetch('/api/health?action=get_growth_measurements')
      .then(r => r.json())
      .then(data => { setRecords(data.measurements || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const addRecord = async () => {
    if (!form.kid_name || (!form.height_inches && !form.weight_lbs)) return
    const res = await fetch('/api/health', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_growth_measurement', data: form })
    }).then(r => r.json()).catch(() => null)
    if (res?.measurement) setRecords(prev => [res.measurement, ...prev])
    setForm({ kid_name: '', measure_date: '', height_inches: '', weight_lbs: '', notes: '' })
    setShowAdd(false)
  }

  const deleteRecord = async (id: number) => {
    await fetch('/api/health', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_growth_measurement', id })
    }).catch(() => null)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const filtered = selectedKid === 'all' ? records : records.filter(r => r.kid_name === selectedKid)

  // Build per-kid summaries
  const kidSummaries = ALL_KIDS.map(kid => {
    const kidRecs = records.filter(r => r.kid_name === kid).sort((a, b) => b.measure_date.localeCompare(a.measure_date))
    if (kidRecs.length === 0) return null
    const latest = kidRecs[0]
    const prev = kidRecs.length > 1 ? kidRecs[1] : null
    const heightChange = latest.height_inches && prev?.height_inches ? latest.height_inches - prev.height_inches : null
    const weightChange = latest.weight_lbs && prev?.weight_lbs ? latest.weight_lbs - prev.weight_lbs : null
    return { kid, latest, heightChange, weightChange, count: kidRecs.length }
  }).filter(Boolean) as { kid: string; latest: Measurement; heightChange: number | null; weightChange: number | null; count: number }[]

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {selectedKid === 'all' && kidSummaries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {kidSummaries.map(s => (
            <button key={s.kid} onClick={() => setSelectedKid(s.kid)} className="bg-white rounded-lg border shadow-sm p-4 text-left hover:border-teal-300 transition">
              <p className="font-bold text-gray-900 text-sm">{KID_DISPLAY[s.kid] || s.kid}</p>
              <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                {s.latest.height_inches && <p>Height: {toFeetInches(s.latest.height_inches)}{s.heightChange ? ` (+${s.heightChange.toFixed(1)}")` : ''}</p>}
                {s.latest.weight_lbs && <p>Weight: {s.latest.weight_lbs} lbs{s.weightChange ? ` (${s.weightChange > 0 ? '+' : ''}${s.weightChange.toFixed(1)})` : ''}</p>}
                <p className="text-gray-400">{s.count} measurement{s.count > 1 ? 's' : ''}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select value={selectedKid} onChange={e => setSelectedKid(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
            <option value="all">All Kids</option>
            {ALL_KIDS.map(kid => <option key={kid} value={kid}>{KID_DISPLAY[kid] || kid}</option>)}
          </select>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-teal-600 flex items-center gap-1">
          <Plus className="w-4 h-4" /> Log Measurement
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">New Growth Measurement</h3>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.kid_name} onChange={e => setForm(p => ({ ...p, kid_name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Select child</option>
              {ALL_KIDS.map(kid => <option key={kid} value={kid}>{KID_DISPLAY[kid] || kid}</option>)}
            </select>
            <input type="date" value={form.measure_date} onChange={e => setForm(p => ({ ...p, measure_date: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" step="0.1" placeholder="Height (inches)" value={form.height_inches} onChange={e => setForm(p => ({ ...p, height_inches: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" step="0.1" placeholder="Weight (lbs)" value={form.weight_lbs} onChange={e => setForm(p => ({ ...p, weight_lbs: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="text" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={addRecord} disabled={!form.kid_name || (!form.height_inches && !form.weight_lbs)} className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-600 disabled:opacity-50">Save</button>
            <button onClick={() => setShowAdd(false)} className="text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Single Kid Detail View with visual bars */}
      {selectedKid !== 'all' && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-500" />
              {KID_DISPLAY[selectedKid] || selectedKid} — Growth History
            </h3>
            <button onClick={() => setSelectedKid('all')} className="text-sm text-teal-600 hover:text-teal-800">View All Kids</button>
          </div>
          {filtered.sort((a, b) => a.measure_date.localeCompare(b.measure_date)).map((rec, i, arr) => {
            const maxH = Math.max(...arr.filter(r => r.height_inches).map(r => r.height_inches!))
            const maxW = Math.max(...arr.filter(r => r.weight_lbs).map(r => r.weight_lbs!))
            const hPct = rec.height_inches ? (rec.height_inches / maxH) * 100 : 0
            const wPct = rec.weight_lbs ? (rec.weight_lbs / maxW) * 100 : 0
            return (
              <div key={rec.id} className="mb-4 pb-4 border-b last:border-0">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{rec.measure_date}</span>
                  <button onClick={() => deleteRecord(rec.id)} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                </div>
                {rec.height_inches && (
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs text-gray-500 w-20">Height</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                      <div className="bg-teal-400 h-4 rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${Math.max(hPct, 15)}%` }}>
                        <span className="text-[10px] text-white font-bold">{toFeetInches(rec.height_inches)}</span>
                      </div>
                    </div>
                  </div>
                )}
                {rec.weight_lbs && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20">Weight</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                      <div className="bg-blue-400 h-4 rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${Math.max(wPct, 15)}%` }}>
                        <span className="text-[10px] text-white font-bold">{rec.weight_lbs} lbs</span>
                      </div>
                    </div>
                  </div>
                )}
                {rec.notes && <p className="text-xs text-gray-400 mt-1 italic">{rec.notes}</p>}
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-center text-gray-400 py-4">No measurements recorded yet.</p>}
        </div>
      )}

      {/* All Kids Table View */}
      {selectedKid === 'all' && filtered.length === 0 && !showAdd && (
        <div className="text-center text-gray-400 py-8">
          <Ruler className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No growth measurements recorded yet.</p>
        </div>
      )}
    </div>
  )
}
