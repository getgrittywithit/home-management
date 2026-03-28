'use client'
import { useState, useEffect } from 'react'
import { X, DollarSign } from 'lucide-react'

interface RevenueEntry { id: number; business: string; amount: string; source: string; logged_at: string }
interface Props { open: boolean; onClose: () => void; onLogged: () => void }

export default function LogRevenueModal({ open, onClose, onLogged }: Props) {
  const [business, setBusiness] = useState<'triton' | 'grit'>('triton')
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recent, setRecent] = useState<RevenueEntry[]>([])
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/parent/revenue?action=recent_revenue&limit=3')
      .then(r => r.json())
      .then(data => setRecent(data.entries || []))
      .catch(() => {})
  }, [open])

  const submit = async () => {
    if (!amount || isNaN(Number(amount))) return
    setSubmitting(true)
    try {
      await fetch('/api/parent/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_revenue', business, amount: Number(amount), source: source.trim(), notes: notes.trim() })
      })
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
      setAmount(''); setSource(''); setNotes('')
      // Refresh recent
      const res = await fetch('/api/parent/revenue?action=recent_revenue&limit=3')
      const data = await res.json()
      setRecent(data.entries || [])
      onLogged()
    } catch {} finally { setSubmitting(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold text-gray-900">Log Revenue</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {showToast && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
              Revenue logged
            </div>
          )}
          {/* Business selector */}
          <div className="flex gap-2">
            {(['triton', 'grit'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBusiness(b)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  business === b ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {b === 'triton' ? 'Triton' : 'Grit Collective'}
              </button>
            ))}
          </div>
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client or Source</label>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Client or source"
              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={submit}
            disabled={!amount || isNaN(Number(amount)) || submitting}
            className="w-full py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
          >
            {submitting ? 'Logging...' : 'Log It'}
          </button>

          {/* Recent entries */}
          {recent.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recent Entries</p>
              <div className="space-y-2">
                {recent.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${e.business === 'triton' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                      <span className="text-gray-600">{new Date(e.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span className="text-gray-800 font-medium">{e.business === 'triton' ? 'Triton' : 'Grit'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">${Number(e.amount).toFixed(2)}</span>
                      {e.source && <span className="text-gray-400 text-xs ml-1">· {e.source}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
