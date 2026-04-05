'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface HealthDailyCareProps {
  careItems: any[]
  onRefresh: () => void
  onError: (msg: string) => void
  themeColor: string
}

export default function HealthDailyCare({ careItems, onRefresh, onError, themeColor }: HealthDailyCareProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedChild, setSelectedChild] = useState('')
  const [form, setForm] = useState({ itemName: '', instructions: '', timeOfDay: 'both', category: 'medication', endDate: '' })
  const [saving, setSaving] = useState(false)

  const KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']

  const byChild: Record<string, any[]> = {}
  careItems.forEach(item => {
    if (!byChild[item.child_name]) byChild[item.child_name] = []
    byChild[item.child_name].push(item)
  })

  const handleAdd = async () => {
    if (!selectedChild || !form.itemName.trim() || !form.instructions.trim()) return
    setSaving(true)
    try {
      await fetch('/api/kids/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_care_item', child: selectedChild,
          itemName: form.itemName, instructions: form.instructions,
          timeOfDay: form.timeOfDay, category: form.category, endDate: form.endDate || null,
        })
      })
      setForm({ itemName: '', instructions: '', timeOfDay: 'both', category: 'medication', endDate: '' })
      setShowAddForm(false)
      onRefresh()
    } catch { onError('Failed to add care item') }
    finally { setSaving(false) }
  }

  const handleRemove = async (id: number) => {
    try {
      await fetch('/api/kids/health', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_care_item', careItemId: id })
      })
      onRefresh()
    } catch { onError('Failed to remove care item') }
  }

  const todayStr = (items: any[]) => {
    const morning = items.filter(i => i.time_of_day === 'morning' || i.time_of_day === 'both')
    const morningDone = morning.filter(i => i.morning_done).length
    const evening = items.filter(i => i.time_of_day === 'evening' || i.time_of_day === 'both')
    const eveningDone = evening.filter(i => i.evening_done).length
    const parts = []
    if (morning.length > 0) parts.push(`${morningDone}/${morning.length} morning`)
    if (evening.length > 0) parts.push(`${eveningDone}/${evening.length} evening`)
    return parts.join(' · ')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Daily Care Routines</h3>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-${themeColor}-500 text-white hover:bg-${themeColor}-600 transition`}>
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Select child...</option>
            {KIDS.map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
          </select>
          <input type="text" placeholder="Item name (e.g., Focalin)" value={form.itemName}
            onChange={e => setForm({ ...form, itemName: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <input type="text" placeholder="Instructions" value={form.instructions}
            onChange={e => setForm({ ...form, instructions: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <div className="grid grid-cols-3 gap-2">
            <select value={form.timeOfDay} onChange={e => setForm({ ...form, timeOfDay: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="morning">Morning only</option>
              <option value="evening">Evening only</option>
              <option value="both">Morning & Evening</option>
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="medication">Medication</option>
              <option value="skincare">Skincare</option>
              <option value="supplement">Supplement</option>
              <option value="other">Other</option>
            </select>
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !selectedChild || !form.itemName.trim()}
              className={`flex-1 bg-${themeColor}-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-${themeColor}-600 transition disabled:opacity-50`}>
              {saving ? 'Adding...' : 'Add Care Item'}
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">Cancel</button>
          </div>
        </div>
      )}

      {KIDS.map(kid => {
        const items = byChild[kid] || []
        const capName = kid.charAt(0).toUpperCase() + kid.slice(1)
        return (
          <div key={kid} className="bg-white rounded-lg p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{capName}</h4>
              {items.length > 0 && <span className="text-xs text-gray-500">{todayStr(items)} done today</span>}
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-gray-400">No care routines</p>
            ) : (
              <div className="space-y-2">
                {items.map((item: any) => {
                  const timeLabel = item.time_of_day === 'both' ? '☀️🌙' : item.time_of_day === 'morning' ? '☀️' : '🌙'
                  const catLabel = item.category === 'skincare' ? '🧴' : '💊'
                  const parsedEnd = item.end_date ? new Date(item.end_date + 'T12:00:00') : null
                  const endStr = parsedEnd && !isNaN(parsedEnd.getTime()) ? ` · Until ${parsedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : (item.end_date ? ' · Ongoing' : '')
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg group">
                      <span className="text-sm">{catLabel} {timeLabel}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">{item.item_name}</span>
                        <span className="text-xs text-gray-500 ml-2">{item.instructions}{endStr}</span>
                      </div>
                      <button onClick={() => handleRemove(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 transition flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
