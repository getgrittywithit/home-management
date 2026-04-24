'use client'

import { useState, useEffect } from 'react'
import {
  Wrench, DollarSign, Loader2, Plus, ChevronDown, ChevronUp, X, Check, FileText,
} from 'lucide-react'
import EstimateBuilder from './EstimateBuilder'
import { parseDateLocal } from '@/lib/date-local'

type Job = {
  id: number; client_name: string; job_description: string | null
  status: string; estimated_amount: number | null; invoiced_amount: number | null
  paid_amount: number | null; materials_cost: number | null
  labor_hours: number | null; labor_rate: number | null
  source: string | null; notes: string | null; created_at: string
  completed_at: string | null; paid_at: string | null
}

type Summary = {
  revenue: number; materials: number; labor: number; profit: number
  active_jobs: Job[]; completed_jobs: Job[]
  triton_transactions: any[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-gray-100 text-gray-600' },
  estimated: { label: 'Estimated', color: 'bg-blue-100 text-blue-700' },
  scheduled: { label: 'Scheduled', color: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  invoiced: { label: 'Invoiced', color: 'bg-purple-100 text-purple-700' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}
const STATUSES = ['lead', 'estimated', 'scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled']

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

function currentMonthKey() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}` }

export default function TritonDashboard() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)
  const [showEstimate, setShowEstimate] = useState(false)
  const [expandedJob, setExpandedJob] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function load() {
    setLoading(true)
    try {
      const [sumRes, cliRes] = await Promise.all([
        fetch(`/api/plaid?action=get_triton_summary&month=${currentMonthKey()}`).then(r => r.json()),
        fetch('/api/triton?action=list_clients').then(r => r.json()).catch(() => ({ clients: [] })),
      ])
      setData(sumRes)
      setClients((cliRes.clients || []).map((c: any) => ({ id: c.id, name: c.name })))
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>
  if (!data) return <div className="text-center py-8 text-gray-400">Failed to load Triton data.</div>

  return (
    <div className="space-y-4 p-1">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      {/* P&L summary */}
      <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
          <Wrench className="w-5 h-5 text-amber-600" /> Triton — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div><div className="text-xs text-gray-500 uppercase font-semibold">Revenue</div><div className="text-lg font-bold text-green-600">{fmt(data.revenue)}</div></div>
          <div><div className="text-xs text-gray-500 uppercase font-semibold">Materials</div><div className="text-lg font-bold text-red-600">-{fmt(data.materials)}</div></div>
          <div><div className="text-xs text-gray-500 uppercase font-semibold">Labor</div><div className="text-lg font-bold text-red-600">-{fmt(data.labor)}</div></div>
          <div><div className="text-xs text-gray-500 uppercase font-semibold">Profit</div><div className={`text-lg font-bold ${data.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(data.profit)}</div></div>
        </div>
      </div>

      {/* Active jobs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Active Jobs ({data.active_jobs.length})
          </h3>
          <button onClick={() => setShowEstimate(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
            <FileText className="w-3 h-3" /> Estimate
          </button>
          <button onClick={() => setShowAddJob(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700">
            <Plus className="w-3 h-3" /> New Job
          </button>
        </div>
        {data.active_jobs.length === 0 ? (
          <div className="bg-white rounded-lg border p-4 text-center text-sm text-gray-400">No active jobs</div>
        ) : (
          <div className="space-y-1.5">
            {data.active_jobs.map(j => (
              <JobRow key={j.id} job={j} expanded={expandedJob === j.id}
                onToggle={() => setExpandedJob(expandedJob === j.id ? null : j.id)}
                onUpdate={(updates) => updateJob(j.id, updates)} />
            ))}
          </div>
        )}
      </div>

      {/* Completed this month */}
      {data.completed_jobs.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
            Completed This Month ({data.completed_jobs.length})
          </h3>
          <div className="space-y-1.5">
            {data.completed_jobs.map(j => (
              <div key={j.id} className="flex items-center gap-3 px-3 py-2 bg-white border rounded-lg text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span className="font-medium text-gray-900">{j.client_name}</span>
                {j.job_description && <span className="text-gray-500 truncate flex-1">{j.job_description}</span>}
                {j.paid_amount && <span className="font-semibold text-green-600">{fmt(j.paid_amount)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials from transactions */}
      {data.triton_transactions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
            Materials This Month ({data.triton_transactions.length})
          </h3>
          <div className="space-y-1">
            {data.triton_transactions.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2 bg-white border rounded-lg text-sm">
                <span className="text-xs text-gray-400 w-12">{parseDateLocal(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span className="flex-1 truncate text-gray-700">{t.merchant_name || t.description}</span>
                <span className="font-semibold text-gray-900">{fmt(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddJob && <AddJobModal onClose={() => setShowAddJob(false)} onSaved={() => { setShowAddJob(false); flash('Job created'); load() }} />}
      {showEstimate && <EstimateBuilder clients={clients} onClose={() => setShowEstimate(false)} onSaved={() => { setShowEstimate(false); flash('Estimate saved'); load() }} />}
    </div>
  )

  async function updateJob(id: number, updates: Record<string, any>) {
    await fetch('/api/plaid', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_triton_job', id, ...updates }),
    }).catch(() => {})
    load()
  }
}

function JobRow({ job: j, expanded, onToggle, onUpdate }: {
  job: Job; expanded: boolean; onToggle: () => void
  onUpdate: (updates: Record<string, any>) => void
}) {
  const meta = STATUS_LABELS[j.status] || STATUS_LABELS.lead
  return (
    <div className="bg-white border rounded-lg">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${meta.color}`}>{meta.label}</span>
        <span className="font-medium text-gray-900 flex-1">{j.client_name}</span>
        {j.estimated_amount && <span className="text-xs text-gray-500">{fmt(j.estimated_amount)}</span>}
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t space-y-2 text-sm">
          {j.job_description && <p className="text-gray-600 mt-2">{j.job_description}</p>}
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => onUpdate({ status: s, ...(s === 'paid' ? { paid_at: new Date().toISOString() } : s === 'completed' ? { completed_at: new Date().toISOString() } : {}) })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${j.status === s ? STATUS_LABELS[s].color : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                {STATUS_LABELS[s].label}
              </button>
            ))}
          </div>
          {j.notes && <p className="text-xs text-gray-500 italic">{j.notes}</p>}
        </div>
      )}
    </div>
  )
}

function AddJobModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [clientName, setClientName] = useState('')
  const [desc, setDesc] = useState('')
  const [est, setEst] = useState('')
  const [source, setSource] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!clientName.trim()) return
    setSaving(true)
    await fetch('/api/plaid', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_triton_job', client_name: clientName.trim(),
        job_description: desc || null, estimated_amount: est ? parseFloat(est) : null,
        source: source || null,
      }),
    }).catch(() => {})
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">New Triton Job</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name *"
            className="w-full px-3 py-2 border rounded-lg text-sm" autoFocus />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Job description"
            className="w-full px-3 py-2 border rounded-lg text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" value={est} onChange={e => setEst(e.target.value)} placeholder="Estimate $"
              className="w-full px-3 py-2 border rounded-lg text-sm" />
            <select value={source} onChange={e => setSource(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Source</option>
              <option value="email">Email</option><option value="phone">Phone</option>
              <option value="referral">Referral</option><option value="google">Google</option>
              <option value="thumbtack">Thumbtack</option>
            </select>
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving || !clientName.trim()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
