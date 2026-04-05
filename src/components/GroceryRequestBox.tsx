'use client'

import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'

const CATEGORIES = [
  { value: 'snack', label: 'Snack' },
  { value: 'drink', label: 'Drink' },
  { value: 'meal_ingredient', label: 'Meal Ingredient' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'school_supply', label: 'School Supply' },
  { value: 'pet_supply', label: 'Pet Supply' },
  { value: 'other', label: 'Other' },
]

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
  const [category, setCategory] = useState('snack')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

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

  const statusIcon = (s: string) => s === 'approved' ? '\u2705' : s === 'denied' ? '\u274C' : '\u23F3'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      <h2 className="font-bold text-gray-900 flex items-center gap-2">
        {'\uD83D\uDED2'} Add to Grocery List
      </h2>

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
