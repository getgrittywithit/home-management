'use client'

import { useState, useEffect } from 'react'
import {
  Users, Phone, MapPin, Plus, Search, Loader2, ChevronDown, ChevronUp,
  X, Check, FileText, DollarSign, Wrench, AlertTriangle, ExternalLink,
} from 'lucide-react'

type Client = {
  id: string; name: string; nickname: string | null; phone: string | null
  email: string | null; address: string | null; source: string | null
  notes: string | null; total_jobs: number; total_revenue: number
  status: string; created_at: string
}

type Job = {
  id: number; client_name: string; client_display_name?: string
  job_description: string | null; status: string; category: string | null
  estimated_amount: number | null; invoiced_amount: number | null
  paid_amount: number | null; client_phone?: string; created_at: string
}

type Stats = {
  revenue_mtd: number; revenue_ytd: number; avg_job: number
  by_status: { status: string; c: number }[]
  follow_up_needed: Job[]
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

const SOURCES = ['google', 'thumbtack', 'homeadvisor', 'angi', 'yelp', 'referral', 'repeat', 'word_of_mouth', 'email', 'phone']
const JOB_CATEGORIES = ['drywall', 'electrical', 'plumbing', 'general', 'painting', 'assembly', 'carpentry', 'flooring', 'other']

function fmt(n: number | null) { return n != null ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—' }

export default function TritonCRM() {
  const [view, setView] = useState<'clients' | 'pipeline' | 'stats'>('clients')
  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddClient, setShowAddClient] = useState(false)
  const [showAddJob, setShowAddJob] = useState(false)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function load() {
    setLoading(true)
    const [c, j, s] = await Promise.all([
      fetch(`/api/triton?action=list_clients${search ? '&q=' + encodeURIComponent(search) : ''}`).then(r => r.json()).catch(() => ({ clients: [] })),
      fetch('/api/triton?action=list_jobs').then(r => r.json()).catch(() => ({ jobs: [] })),
      fetch('/api/triton?action=job_stats').then(r => r.json()).catch(() => null),
    ])
    setClients(c.clients || [])
    setJobs(j.jobs || [])
    setStats(s)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      {/* Header + tabs */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-amber-600" /> Triton CRM
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setShowAddClient(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700">
            <Plus className="w-3 h-3" /> Client
          </button>
          <button onClick={() => setShowAddJob(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
            <Plus className="w-3 h-3" /> Job
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(['clients', 'pipeline', 'stats'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}>{v === 'clients' ? 'Clients' : v === 'pipeline' ? 'Pipeline' : 'Stats'}</button>
        ))}
      </div>

      {loading && <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>}

      {!loading && view === 'clients' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              placeholder="Search clients..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          {clients.length === 0 ? (
            <div className="bg-white rounded-lg border p-6 text-center text-gray-400 text-sm">No clients yet.</div>
          ) : clients.map(c => (
            <div key={c.id} className="bg-white rounded-lg border shadow-sm">
              <button onClick={() => setExpandedClient(expandedClient === c.id ? null : c.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{c.name}{c.nickname ? ` (${c.nickname})` : ''}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {c.total_jobs} job{c.total_jobs !== 1 ? 's' : ''} · {fmt(c.total_revenue)} revenue
                    {c.source && <span className="ml-2 text-gray-400">via {c.source}</span>}
                  </div>
                </div>
                {c.phone && (
                  <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="text-blue-600 hover:text-blue-800">
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                {expandedClient === c.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedClient === c.id && (
                <div className="px-4 pb-3 border-t text-sm space-y-2 pt-2">
                  {c.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="w-3.5 h-3.5" /> <a href={`tel:${c.phone}`} className="text-blue-600">{c.phone}</a></div>}
                  {c.address && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-3.5 h-3.5" /> {c.address}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600"><ExternalLink className="w-3 h-3" /></a>
                    </div>
                  )}
                  {c.notes && <p className="text-gray-500 text-xs italic">{c.notes}</p>}
                  <div className="pt-2 space-y-1">
                    {jobs.filter(j => j.client_display_name === c.name || j.client_name === c.name).map(j => {
                      const sm = STATUS_LABELS[j.status] || STATUS_LABELS.lead
                      return (
                        <div key={j.id} className="flex items-center gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded ${sm.color} font-semibold`}>{sm.label}</span>
                          <span className="text-gray-700 truncate flex-1">{j.job_description || 'No description'}</span>
                          {j.paid_amount && <span className="text-green-600 font-semibold">{fmt(j.paid_amount)}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && view === 'pipeline' && (
        <div className="space-y-3">
          {Object.keys(STATUS_LABELS).filter(s => s !== 'cancelled').map(status => {
            const sm = STATUS_LABELS[status]
            const statusJobs = jobs.filter(j => j.status === status)
            if (statusJobs.length === 0) return null
            return (
              <div key={status}>
                <h4 className="text-xs font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <span className={`px-1.5 py-0.5 rounded ${sm.color}`}>{sm.label}</span>
                  <span className="text-gray-400">({statusJobs.length})</span>
                </h4>
                <div className="space-y-1">
                  {statusJobs.map(j => (
                    <div key={j.id} className="flex items-center gap-3 px-3 py-2 bg-white border rounded-lg text-sm">
                      <span className="font-medium text-gray-900 flex-1 truncate">{j.client_display_name || j.client_name}</span>
                      <span className="text-gray-500 truncate max-w-[200px]">{j.job_description || ''}</span>
                      {j.estimated_amount && <span className="text-xs text-gray-400">{fmt(j.estimated_amount)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && view === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border p-4 text-center">
              <div className="text-xs text-gray-500 uppercase font-semibold">Revenue MTD</div>
              <div className="text-xl font-bold text-green-600">{fmt(stats.revenue_mtd)}</div>
            </div>
            <div className="bg-white rounded-lg border p-4 text-center">
              <div className="text-xs text-gray-500 uppercase font-semibold">Revenue YTD</div>
              <div className="text-xl font-bold text-green-600">{fmt(stats.revenue_ytd)}</div>
            </div>
            <div className="bg-white rounded-lg border p-4 text-center">
              <div className="text-xs text-gray-500 uppercase font-semibold">Avg Job</div>
              <div className="text-xl font-bold text-gray-900">{fmt(stats.avg_job)}</div>
            </div>
          </div>

          {stats.follow_up_needed.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-red-700 flex items-center gap-1 mb-2">
                <AlertTriangle className="w-4 h-4" /> Follow-Up Needed ({stats.follow_up_needed.length})
              </h4>
              <div className="space-y-1">
                {stats.follow_up_needed.map(j => {
                  const sm = STATUS_LABELS[j.status] || STATUS_LABELS.lead
                  return (
                    <div key={j.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 rounded-lg text-sm">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${sm.color}`}>{sm.label}</span>
                      <span className="font-medium text-gray-900">{j.client_display_name || j.client_name}</span>
                      <span className="text-gray-500 text-xs truncate flex-1">{j.job_description || ''}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && <AddClientModal onClose={() => setShowAddClient(false)} onSaved={() => { setShowAddClient(false); flash('Client added'); load() }} />}

      {/* Add Job Modal */}
      {showAddJob && <AddJobModal clients={clients} onClose={() => setShowAddJob(false)} onSaved={() => { setShowAddJob(false); flash('Job created'); load() }} />}
    </div>
  )
}

function AddClientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    await fetch('/api/triton', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_client', name: name.trim(), phone: phone||null, email: email||null, address: address||null, source: source||null, notes: notes||null }),
    }).catch(() => {})
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">New Client</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Client name *" className="w-full px-3 py-2 border rounded-lg text-sm" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="px-3 py-2 border rounded-lg text-sm" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <select value={source} onChange={e => setSource(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Source</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes" className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddJobModal({ clients, onClose, onSaved }: { clients: Client[]; onClose: () => void; onSaved: () => void }) {
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState('')
  const [est, setEst] = useState('')
  const [address, setAddress] = useState('')
  const [source, setSource] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const name = clientId ? clients.find(c => c.id === clientId)?.name || clientName : clientName
    if (!name.trim()) return
    setSaving(true)
    await fetch('/api/triton', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_job', client_id: clientId || null, client_name: name.trim(),
        job_description: desc || null, category: category || null,
        estimated_amount: est ? parseFloat(est) : null, job_address: address || null, source: source || null,
      }),
    }).catch(() => {})
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">New Job</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {clients.length > 0 && (
            <select value={clientId} onChange={e => { setClientId(e.target.value); const c = clients.find(x => x.id === e.target.value); if (c) { setClientName(c.name); setAddress(c.address || '') } }}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Select existing client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name *" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Job description" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Category</option>
              {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" step="0.01" value={est} onChange={e => setEst(e.target.value)} placeholder="Estimate $" className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Job address" className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving || !clientName.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
