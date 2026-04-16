'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard, RefreshCw, Loader2, Check, AlertTriangle, Building2,
  Split, Eye, EyeOff, X, Plus,
} from 'lucide-react'

type Transaction = {
  id: string; date: string; merchant_name: string | null; description: string
  amount: number; entity: string; category_name: string | null
  category_emoji: string | null; category_slug: string | null
  is_reviewed: boolean; is_split: boolean; plaid_transaction_id: string | null
}

type PlaidAccount = {
  id: number; institution_name: string; account_names: string[] | null
  status: string; last_synced_at: string | null
}

const ENTITY_LABELS: Record<string, { label: string; color: string }> = {
  personal: { label: 'Personal', color: 'bg-blue-100 text-blue-700' },
  triton: { label: 'Triton', color: 'bg-amber-100 text-amber-700' },
  grit_collective: { label: 'Grit', color: 'bg-purple-100 text-purple-700' },
  split: { label: 'Split', color: 'bg-gray-100 text-gray-600' },
}

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }
function fmtDate(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
function currentMonthKey() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}` }

export default function TransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<PlaidAccount[]>([])
  const [configured, setConfigured] = useState(false)
  const [needsReview, setNeedsReview] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [month] = useState(currentMonthKey())
  const [showReviewedOnly, setShowReviewedOnly] = useState<boolean | null>(null)
  const [toast, setToast] = useState('')

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function load() {
    setLoading(true)
    const [acctRes, txnRes] = await Promise.all([
      fetch('/api/plaid?action=get_accounts').then(r => r.json()).catch(() => ({ accounts: [], configured: false })),
      fetch(`/api/plaid?action=get_transactions&month=${month}${showReviewedOnly === false ? '&reviewed=false' : showReviewedOnly === true ? '&reviewed=true' : ''}`).then(r => r.json()).catch(() => ({ transactions: [], needs_review: 0 })),
    ])
    setAccounts(acctRes.accounts || [])
    setConfigured(acctRes.configured)
    setTransactions(txnRes.transactions || [])
    setNeedsReview(txnRes.needs_review || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [showReviewedOnly])

  const handleSync = async () => {
    setSyncing(true)
    await fetch('/api/plaid', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_transactions' }),
    }).catch(() => {})
    setSyncing(false)
    flash('Synced')
    load()
  }

  const handleConfirm = async (id: string) => {
    await fetch('/api/plaid', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_transaction', id, is_reviewed: true }),
    }).catch(() => {})
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, is_reviewed: true } : t))
    setNeedsReview(prev => Math.max(0, prev - 1))
  }

  const handleEntityToggle = async (id: string, entity: string) => {
    await fetch('/api/plaid', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_transaction', id, entity }),
    }).catch(() => {})
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, entity } : t))
  }

  const handleHide = async (id: string) => {
    await fetch('/api/plaid', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_transaction', id, is_hidden: true }),
    }).catch(() => {})
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const unreviewed = transactions.filter(t => !t.is_reviewed)
  const reviewed = transactions.filter(t => t.is_reviewed)

  return (
    <div className="space-y-4 p-1">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      {/* Connected accounts panel */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" /> Connected Banks
          </h3>
          <div className="flex gap-2">
            {configured && (
              <button onClick={handleSync} disabled={syncing}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} /> Sync Now
              </button>
            )}
          </div>
        </div>
        {accounts.length > 0 ? (
          <div className="space-y-1">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${a.status === 'active' ? 'bg-green-500' : 'bg-amber-400'}`} />
                <span className="font-medium text-gray-900">{a.institution_name}</span>
                {a.account_names && <span className="text-gray-500 text-xs">{(a.account_names as string[]).join(', ')}</span>}
              </div>
            ))}
          </div>
        ) : !configured ? (
          <p className="text-sm text-gray-500">Add PLAID_CLIENT_ID + PLAID_SECRET to Vercel env vars to connect banks.</p>
        ) : (
          <p className="text-sm text-gray-500">No banks connected yet. Use Plaid Link to add one.</p>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-600" /> Transactions
          {needsReview > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
              {needsReview} need review
            </span>
          )}
        </h2>
        <div className="flex gap-1">
          {[{ v: null, l: 'All' }, { v: false, l: 'Unreviewed' }, { v: true, l: 'Confirmed' }].map(f => (
            <button key={String(f.v)} onClick={() => setShowReviewedOnly(f.v as any)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                showReviewedOnly === f.v ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{f.l}</button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>}

      {!loading && transactions.length === 0 && (
        <div className="bg-white rounded-lg border p-6 text-center text-gray-400 text-sm">
          No transactions this month. Connect a bank and sync to get started.
        </div>
      )}

      {/* Needs Review */}
      {unreviewed.length > 0 && showReviewedOnly !== true && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Needs Review ({unreviewed.length})
          </h4>
          {unreviewed.map(t => (
            <TxnRow key={t.id} txn={t} onConfirm={() => handleConfirm(t.id)}
              onEntityToggle={(e) => handleEntityToggle(t.id, e)} onHide={() => handleHide(t.id)} />
          ))}
        </div>
      )}

      {/* Confirmed */}
      {reviewed.length > 0 && showReviewedOnly !== false && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Confirmed ({reviewed.length})
          </h4>
          {reviewed.map(t => (
            <TxnRow key={t.id} txn={t} onHide={() => handleHide(t.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TxnRow({ txn: t, onConfirm, onEntityToggle, onHide }: {
  txn: Transaction
  onConfirm?: () => void
  onEntityToggle?: (entity: string) => void
  onHide?: () => void
}) {
  const eMeta = ENTITY_LABELS[t.entity] || ENTITY_LABELS.personal
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 bg-white border rounded-lg ${!t.is_reviewed ? 'border-l-4 border-l-amber-400' : ''}`}>
      <span className="text-xs text-gray-400 w-14 flex-shrink-0">{fmtDate(t.date)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {t.merchant_name || t.description || '(unknown)'}
        </div>
        {t.description && t.merchant_name && (
          <div className="text-[11px] text-gray-400 truncate">{t.description}</div>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{fmt(t.amount)}</span>
      {t.category_emoji && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 flex-shrink-0">
          {t.category_emoji} {t.category_slug || ''}
        </span>
      )}
      {onEntityToggle ? (
        <select
          value={t.entity}
          onChange={e => onEntityToggle(e.target.value)}
          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border-0 ${eMeta.color} flex-shrink-0`}
        >
          <option value="personal">Personal</option>
          <option value="triton">Triton</option>
          <option value="grit_collective">Grit</option>
        </select>
      ) : (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${eMeta.color} flex-shrink-0`}>
          {eMeta.label}
        </span>
      )}
      {onConfirm && !t.is_reviewed && (
        <button onClick={onConfirm} title="Confirm"
          className="p-1 text-gray-400 hover:text-green-600">
          <Check className="w-4 h-4" />
        </button>
      )}
      {onHide && (
        <button onClick={onHide} title="Hide"
          className="p-1 text-gray-300 hover:text-red-500">
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
