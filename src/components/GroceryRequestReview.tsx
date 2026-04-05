'use client'

import { useState, useEffect } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'

interface GroceryRequest {
  id: number
  kid_name: string
  item_name: string
  category: string
  quantity: string | null
  reason: string | null
  status: string
  parent_note: string | null
  reviewed_at: string | null
  created_at: string
}

const CAT_LABELS: Record<string, string> = {
  snack: 'Snack', drink: 'Drink', meal_ingredient: 'Meal Ingredient',
  personal_care: 'Personal Care', school_supply: 'School Supply',
  pet_supply: 'Pet Supply', other: 'Other', general: 'General',
}

export default function GroceryRequestReview() {
  const [pending, setPending] = useState<GroceryRequest[]>([])
  const [reviewed, setReviewed] = useState<GroceryRequest[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [noteFor, setNoteFor] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')

  const fetchRequests = () => {
    fetch('/api/grocery?action=kid_requests&status=pending')
      .then(r => r.json())
      .then(data => setPending(data.requests || []))
      .catch(() => {})
  }

  const fetchHistory = () => {
    fetch('/api/grocery?action=kid_requests&status=all')
      .then(r => r.json())
      .then(data => setReviewed((data.requests || []).filter((r: GroceryRequest) => r.status !== 'pending')))
      .catch(() => {})
  }

  useEffect(() => { fetchRequests() }, [])

  const handleReview = async (requestId: number, decision: 'approved' | 'denied') => {
    const parentNote = noteFor === requestId ? noteText : undefined
    try {
      await fetch('/api/grocery', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review_grocery_request', requestId, decision, parentNote }),
      })
      setPending(prev => prev.filter(r => r.id !== requestId))
      setNoteFor(null); setNoteText('')
      if (showHistory) fetchHistory()
    } catch { /* silent */ }
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          {'\uD83D\uDCCB'} Kid Grocery Requests
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length} pending</span>
          )}
        </h3>
      </div>

      {pending.length === 0 && (
        <p className="text-sm text-gray-400">No pending requests.</p>
      )}

      {pending.map(req => (
        <div key={req.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{cap(req.kid_name)}:</span>
                <span className="text-gray-800">&quot;{req.item_name}&quot;</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{CAT_LABELS[req.category] || req.category}</span>
              </div>
              {req.reason && <p className="text-xs text-gray-500 mt-0.5">{req.reason}</p>}
              {req.quantity && <p className="text-xs text-gray-400">Qty: {req.quantity}</p>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setNoteFor(noteFor === req.id ? null : req.id)}
                className="text-xs text-gray-400 hover:text-gray-600 px-1">note</button>
              <button onClick={() => handleReview(req.id, 'approved')}
                className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition" title="Approve">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => handleReview(req.id, 'denied')}
                className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition" title="Deny">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {noteFor === req.id && (
            <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note (optional)..."
              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300" />
          )}
        </div>
      ))}

      <button onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory() }}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
        {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showHistory ? 'Hide history' : 'Show review history'}
      </button>

      {showHistory && reviewed.length > 0 && (
        <div className="space-y-1 text-sm">
          {reviewed.slice(0, 10).map(req => (
            <div key={req.id} className="flex items-center gap-2 text-gray-500">
              <span>{req.status === 'approved' ? '\u2705' : '\u274C'}</span>
              <span className="font-medium">{cap(req.kid_name)}</span>
              <span>{req.item_name}</span>
              {req.parent_note && <span className="text-xs italic text-gray-400">&mdash; {req.parent_note}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
