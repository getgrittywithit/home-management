'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Plus, Trash2, Loader2, X, Check, DollarSign, Send,
} from 'lucide-react'

type Client = { id: string; name: string }
type LineItem = { description: string; qty: number; unit_price: number; total: number }

interface Props {
  clients: Client[]
  jobId?: number
  clientId?: string
  existingEstimate?: any
  onClose: () => void
  onSaved: () => void
}

export default function EstimateBuilder({ clients, jobId, clientId, existingEstimate, onClose, onSaved }: Props) {
  const [selectedClient, setSelectedClient] = useState(clientId || '')
  const [lines, setLines] = useState<LineItem[]>(
    existingEstimate?.line_items || [{ description: '', qty: 1, unit_price: 0, total: 0 }]
  )
  const [notes, setNotes] = useState(existingEstimate?.notes || '')
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'estimate' | 'invoice'>(existingEstimate ? 'invoice' : 'estimate')

  const updateLine = (i: number, field: string, value: any) => {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l
      const updated = { ...l, [field]: value }
      if (field === 'qty' || field === 'unit_price') {
        updated.total = (updated.qty || 0) * (updated.unit_price || 0)
      }
      return updated
    }))
  }

  const addLine = () => setLines(prev => [...prev, { description: '', qty: 1, unit_price: 0, total: 0 }])
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i))

  const subtotal = lines.reduce((s, l) => s + (l.total || 0), 0)

  const handleSave = async (status: string) => {
    if (lines.length === 0 || !lines.some(l => l.description.trim())) return
    setSaving(true)
    const validLines = lines.filter(l => l.description.trim())

    if (mode === 'estimate') {
      await fetch('/api/triton', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_estimate',
          job_id: jobId || null,
          client_id: selectedClient || null,
          line_items: validLines,
          notes: notes || null,
        }),
      }).catch(() => {})
    } else {
      await fetch('/api/triton', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_invoice',
          job_id: jobId || null,
          client_id: selectedClient || null,
          estimate_id: existingEstimate?.id || null,
          line_items: validLines,
          notes: notes || null,
        }),
      }).catch(() => {})
    }

    setSaving(false)
    onSaved()
  }

  const handleMarkPaid = async (method: string) => {
    if (!existingEstimate?.invoice_id) return
    setSaving(true)
    await fetch('/api/triton', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_paid', invoice_id: existingEstimate.invoice_id, payment_method: method }),
    }).catch(() => {})
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            {mode === 'estimate' ? 'New Estimate' : 'Invoice'}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setMode('estimate')}
              className={`px-2 py-1 rounded text-xs font-medium ${mode === 'estimate' ? 'bg-amber-100 text-amber-700' : 'text-gray-400'}`}>Estimate</button>
            <button onClick={() => setMode('invoice')}
              className={`px-2 py-1 rounded text-xs font-medium ${mode === 'invoice' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400'}`}>Invoice</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-2"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Client */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Client</label>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Line Items */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Line Items</label>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-0 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wide px-2 py-1.5">
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Rate</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1" />
              </div>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-0 border-t px-2 py-1">
                  <div className="col-span-5 pr-1">
                    <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)}
                      placeholder="Description" className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div className="col-span-2 px-1">
                    <input type="number" min="0" value={line.qty} onChange={e => updateLine(i, 'qty', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border rounded text-sm text-center" />
                  </div>
                  <div className="col-span-2 px-1">
                    <input type="number" min="0" step="0.01" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border rounded text-sm text-right" />
                  </div>
                  <div className="col-span-2 flex items-center justify-end text-sm font-medium text-gray-900 pr-1">
                    ${line.total.toFixed(2)}
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addLine}
              className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              <Plus className="w-3 h-3" /> Add Line Item
            </button>
          </div>

          {/* Subtotal */}
          <div className="flex justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-500">Subtotal</div>
              <div className="text-xl font-bold text-gray-900">${subtotal.toFixed(2)}</div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Scope of work, special instructions..."
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>

        <div className="px-5 py-4 border-t flex gap-2 flex-wrap">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
          </button>
          {mode === 'estimate' && (
            <button onClick={() => { setMode('invoice'); handleSave('sent') }} disabled={saving}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1">
              <Send className="w-4 h-4" /> → Create Invoice
            </button>
          )}
          {mode === 'invoice' && (
            <div className="ml-auto flex gap-1">
              {['cash', 'check', 'zelle', 'venmo', 'card'].map(m => (
                <button key={m} onClick={() => handleMarkPaid(m)} disabled={saving}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                  💰 Paid ({m})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
