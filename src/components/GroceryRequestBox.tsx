'use client'

import { useState, useEffect } from 'react'
import { Send, Plus, List, X } from 'lucide-react'
import { GROCERY_REQUEST_CATEGORIES, GROCERY_CATEGORY_LABELS } from '@/lib/constants'

// P1-C: dropdown is bound to the canonical enum from constants.ts so the
// kid form, parent display, and DB CHECK constraint all share one source.
const CATEGORIES = GROCERY_REQUEST_CATEGORIES.map(value => ({ value, label: GROCERY_CATEGORY_LABELS[value] }))

interface GroceryRequest {
  id: number
  item_name: string
  category: string
  quantity: string | null
  reason: string | null
  status: string
  parent_note: string | null
  created_at: string
}

export default function GroceryRequestBox({ kidName }: { kidName: string }) {
  const [requests, setRequests] = useState<GroceryRequest[]>([])
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState<string>('meal_cooking')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkItems, setBulkItems] = useState<Array<{ name: string; category: string }>>([])
  const [bulkInput, setBulkInput] = useState('')

  const kid = kidName.toLowerCase()

  useEffect(() => {
    fetch(`/api/grocery?action=kid_requests&kid=${kid}`)
      .then(r => r.json())
      .then(data => setRequests(data.requests || []))
      .catch(() => {})
  }, [kid])

  const handleSubmit = async () => {
    if (!itemName.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_grocery_request', kidName: kid,
          itemName: itemName.trim(), category,
          quantity: quantity || undefined, reason: reason || undefined,
        }),
      })
      const data = await res.json()
      if (data.success && data.request) {
        setRequests(prev => [data.request, ...prev])
        setItemName(''); setQuantity(''); setReason('')
        setToast('Sent to Mom!')
        setTimeout(() => setToast(''), 2500)
      }
    } catch { /* silent */ }
    setSending(false)
  }

  const addBulkItem = () => {
    if (!bulkInput.trim()) return
    setBulkItems(prev => [...prev, { name: bulkInput.trim(), category }])
    setBulkInput('')
  }

  const removeBulkItem = (idx: number) => {
    setBulkItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleBulkSubmit = async () => {
    if (bulkItems.length === 0) return
    setSending(true)
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_bulk_grocery_requests', kidName: kid,
          items: bulkItems.map(i => ({ name: i.name, category: i.category })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setRequests(prev => [...(data.requests || []), ...prev])
        setBulkItems([])
        setBulkMode(false)
        setToast(`${data.count} items sent to Mom!`)
        setTimeout(() => setToast(''), 3000)
      }
    } catch { /* silent */ }
    setSending(false)
  }

  const statusIcon = (s: string) => s === 'approved' ? '\u2705' : s === 'denied' ? '\u274C' : '\u23F3'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          {'\uD83D\uDED2'} Add to Grocery List
        </h2>
        <button onClick={() => setBulkMode(!bulkMode)}
          className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-700 font-medium">
          {bulkMode ? <><Send className="w-3 h-3" /> Single</> : <><List className="w-3 h-3" /> Bulk Add</>}
        </button>
      </div>

      {bulkMode ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input type="text" value={bulkInput} onChange={e => setBulkInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addBulkItem()}
              placeholder="Type item, hit Enter or +"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-32">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button onClick={addBulkItem} disabled={!bulkInput.trim()}
              className="px-2 py-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 disabled:opacity-40">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {bulkItems.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
              {bulkItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-gray-800">{item.name}</span>
                  <span className="text-xs text-gray-400">{CATEGORIES.find(c => c.value === item.category)?.label || item.category}</span>
                  <button onClick={() => removeBulkItem(i)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleBulkSubmit} disabled={bulkItems.length === 0 || sending}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition disabled:opacity-50">
            <Send className="w-4 h-4" /> Send {bulkItems.length} item{bulkItems.length !== 1 ? 's' : ''} to Mom {'\uD83D\uDCE9'}
          </button>
          {toast && <div className="text-center text-sm text-emerald-600 font-medium">{toast}</div>}
        </div>
      ) : (
      <div className="space-y-2">
        <input type="text" value={itemName} onChange={e => setItemName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="What do you need?"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />

        <div className="flex gap-2">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none flex-1">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input type="text" value={quantity} onChange={e => setQuantity(e.target.value)}
            placeholder="How many?"
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none w-28" />
        </div>

        <input type="text" value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Why? (optional)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />

        <button onClick={handleSubmit} disabled={!itemName.trim() || sending}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition disabled:opacity-50">
          <Send className="w-4 h-4" /> Send to Mom {'\uD83D\uDCE9'}
        </button>

        {toast && (
          <div className="text-center text-sm text-emerald-600 font-medium">{toast}</div>
        )}
      </div>
      )}

      {/* Recent requests */}
      {requests.length > 0 && (
        <div className="border-t pt-3 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Recent Requests</p>
          {requests.slice(0, 5).map(req => (
            <div key={req.id} className="flex items-start gap-2 text-sm">
              <span>{statusIcon(req.status)}</span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-800">{req.item_name}</span>
                <span className="text-gray-400 text-xs ml-1">({req.status})</span>
                {req.parent_note && (
                  <p className="text-xs text-gray-500 italic">&quot;{req.parent_note}&quot;</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
