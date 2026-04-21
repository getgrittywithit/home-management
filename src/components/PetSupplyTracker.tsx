'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, Plus, AlertTriangle, Clock } from 'lucide-react'

interface Purchase { id: string; pet_name: string; item_name: string; qty: number; unit: string; cost_cents?: number; shop?: string; purchased_at: string; notes?: string }
interface SupplyType { id: string; pet_name: string; item_name: string; typical_interval_days: number }
interface Insight { pet_name: string; item_name: string; next_restock_date: string | null; overdue: boolean; last_purchased: string | null }

export default function PetSupplyTracker({ petName }: { petName?: string }) {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [types, setTypes] = useState<SupplyType[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [form, setForm] = useState({ pet: petName || '', item: '', qty: '1', unit: 'bag', cost: '', shop: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = () => {
    const qs = petName ? `&pet_name=${petName}` : ''
    fetch(`/api/pet-supplies?action=list${qs}`).then(r => r.json()).then(d => setPurchases(d.purchases || [])).catch(() => {})
    fetch(`/api/pet-supplies?action=types${qs}`).then(r => r.json()).then(d => setTypes(d.types || [])).catch(() => {})
    fetch(`/api/pet-supplies?action=restock_insights`).then(r => r.json()).then(d => setInsights(d.insights || [])).catch(() => {})
  }
  useEffect(() => { fetchData() }, [petName])

  const submit = async () => {
    if (!form.pet || !form.item || !form.qty) return
    setSaving(true)
    await fetch('/api/pet-supplies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_purchase', pet_name: form.pet, item_name: form.item, qty: parseFloat(form.qty), unit: form.unit, cost_cents: form.cost ? Math.round(parseFloat(form.cost) * 100) : null, shop: form.shop || null, notes: form.notes || null }),
    }).catch(() => {})
    setForm({ ...form, item: '', qty: '1', cost: '', notes: '' })
    setSaving(false)
    fetchData()
  }

  const overdueInsights = insights.filter(i => i.overdue)
  const petInsights = petName ? insights.filter(i => i.pet_name?.toLowerCase() === petName.toLowerCase()) : insights

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
        <ShoppingBag className="w-4 h-4 text-emerald-500" /> Pet Supplies {petName ? `— ${petName}` : ''}
      </h3>

      {overdueInsights.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1">
          {overdueInsights.map((i, idx) => (
            <p key={idx} className="text-xs text-amber-800 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {i.pet_name}: {i.item_name} overdue (expected {i.next_restock_date})
            </p>
          ))}
        </div>
      )}

      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-3 gap-2">
          {!petName && (
            <select value={form.pet} onChange={e => setForm({ ...form, pet: e.target.value })} className="border rounded px-2 py-1.5 col-span-3">
              <option value="">Select pet...</option>
              <option value="belle">Belle</option><option value="spike">Spike</option>
              <option value="hades">Hades</option><option value="midnight">Midnight</option>
            </select>
          )}
          <input value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} placeholder="Item name" list="supply-types"
            className="border rounded px-2 py-1.5 col-span-2" />
          <datalist id="supply-types">
            {types.map(t => <option key={t.id} value={t.item_name} />)}
          </datalist>
          <input value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} type="number" min="0.5" step="0.5" className="border rounded px-2 py-1.5" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="Unit" className="border rounded px-2 py-1.5" />
          <input value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="Cost $" type="number" step="0.01" className="border rounded px-2 py-1.5" />
          <input value={form.shop} onChange={e => setForm({ ...form, shop: e.target.value })} placeholder="Shop" className="border rounded px-2 py-1.5" />
        </div>
        <button onClick={submit} disabled={saving || !form.item}
          className="w-full bg-emerald-500 text-white py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-1">
          <Plus className="w-3 h-3" /> {saving ? 'Logging...' : 'Log Purchase'}
        </button>
      </div>

      {petInsights.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 mb-1">RESTOCK SCHEDULE</p>
          <div className="space-y-1">
            {petInsights.map((i, idx) => (
              <div key={idx} className={`flex items-center justify-between text-xs p-1.5 rounded ${i.overdue ? 'bg-red-50' : 'bg-gray-50'}`}>
                <span className="text-gray-700">{i.item_name}</span>
                <span className={`flex items-center gap-0.5 ${i.overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                  <Clock className="w-3 h-3" /> {i.next_restock_date || 'No data yet'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {purchases.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 mb-1">RECENT PURCHASES</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {purchases.map(p => (
              <div key={p.id} className="flex items-center justify-between text-[10px] p-1.5 bg-gray-50 rounded">
                <div>
                  <span className="text-gray-700 font-medium">{p.item_name}</span>
                  <span className="text-gray-400 ml-1">×{p.qty} {p.unit}</span>
                </div>
                <div className="text-right">
                  {p.cost_cents && <span className="text-emerald-600">${(p.cost_cents / 100).toFixed(2)}</span>}
                  <span className="text-gray-400 ml-1">{new Date(p.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
