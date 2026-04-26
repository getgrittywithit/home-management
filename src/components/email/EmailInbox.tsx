'use client'

import { useState, useEffect } from 'react'
import {
  RefreshCw, Star, Settings, ChevronDown, ChevronUp, Mail, Loader2, Archive,
  ClipboardList, Ban, ExternalLink, Plus, X, Clock, AlertTriangle, CheckCircle2, Zap,
} from 'lucide-react'
import SenderRules from './SenderRules'

interface Email {
  id: number; gmail_id: string; from_address: string; from_name: string | null
  subject: string | null; snippet: string | null; body_preview?: string | null
  received_at: string; read: boolean; starred: boolean; triaged: boolean
  category: string | null; priority: string | null; has_attachments: boolean
  snoozed_until?: string | null
  task_created_id?: number | null
  account_email?: string | null
}

interface ActionNeededEmail extends Email {
  action_items: string[]
  deadline: string | null
  urgency: 'high' | 'medium' | 'low'
  suggested_action: string | null
}

interface GmailAccount {
  email: string
  account_label: string | null
  is_primary: boolean
  is_active: boolean
  last_sync_at: string | null
  connected_at: string
}

interface TriageResult {
  category: string; priority: string; confidence: number
  suggested_action: string | null; calendar_suggestion: any
  action_details?: { action_items?: string[]; urgency?: string; source?: string } | null
}

interface CategoryCount { category: string; unread: string; total: string }

const CATEGORIES = [
  { id: 'all', label: 'All', color: 'bg-gray-500' },
  { id: 'school_urgent', label: 'School 🚨', color: 'bg-red-500' },
  { id: 'school_normal', label: 'School', color: 'bg-blue-500' },
  { id: 'medical', label: 'Medical', color: 'bg-rose-500' },
  { id: 'triton_lead', label: 'Triton Lead', color: 'bg-amber-600' },
  { id: 'triton_ops', label: 'Triton', color: 'bg-amber-500' },
  { id: 'finance', label: 'Finance', color: 'bg-emerald-500' },
  { id: 'household', label: 'Household', color: 'bg-indigo-500' },
  { id: 'kids_tech', label: 'Kids Tech', color: 'bg-sky-500' },
  { id: 'family', label: 'Family', color: 'bg-purple-500' },
  { id: 'subscriptions', label: 'Subs', color: 'bg-gray-400' },
  { id: 'noise', label: 'Noise', color: 'bg-gray-300' },
]

const BOARD_MAP: Record<string, { board: string; column: string }> = {
  school_urgent: { board: 'school', column: 'inbox' },
  school_normal: { board: 'school', column: 'inbox' },
  school: { board: 'school', column: 'inbox' },
  medical: { board: 'medical', column: 'inbox' },
  triton_lead: { board: 'triton', column: 'leads' },
  triton_ops: { board: 'triton', column: 'leads' },
  triton: { board: 'triton', column: 'leads' },
  household: { board: 'household', column: 'inbox' },
  finance: { board: 'personal', column: 'inbox' },
  kids_tech: { board: 'personal', column: 'inbox' },
  family: { board: 'personal', column: 'inbox' },
}

const PRIORITY_DOTS: Record<string, string> = {
  urgent: 'bg-red-500', high: 'bg-orange-400',
  normal: 'bg-gray-300', low: 'bg-gray-200', archive: 'bg-gray-100',
}

const ACTION_LABELS: Record<string, string> = {
  reply_needed: 'Reply needed', schedule_event: 'Schedule event', pay_bill: 'Pay bill',
  file_only: 'File only', archive: 'Archive', rule_matched: 'Auto-categorized',
  auto_archive: 'Auto-archive', call: 'Call', read_only: 'Read only', none: 'No action',
}

type TaskForm = {
  email: Email | ActionNeededEmail
  title: string
  board: string
  column_name: string
  notes: string
  due_date: string  // YYYY-MM-DD
  priority: 'urgent' | 'high' | 'normal' | 'low'
}

export default function EmailInbox() {
  const [emails, setEmails] = useState<Email[]>([])
  const [actionNeeded, setActionNeeded] = useState<ActionNeededEmail[]>([])
  const [counts, setCounts] = useState<CategoryCount[]>([])
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedDetail, setExpandedDetail] = useState<{ email: Email; triage: TriageResult | null } | null>(null)
  const [showRules, setShowRules] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [triaging, setTriaging] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<GmailAccount[]>([])
  const [connected, setConnected] = useState<boolean | null>(null)
  const [accountSyncing, setAccountSyncing] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState<TaskForm | null>(null)
  const [taskSubmitting, setTaskSubmitting] = useState(false)
  // P0-1: per-account sync errors (with needs_reauth flag) so we can
  // render an actionable "Re-authorize" CTA instead of silent failure.
  const [syncErrors, setSyncErrors] = useState<Record<string, { message: string; needs_reauth: boolean }>>({})

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/auth/gmail?action=status')
      const data = await res.json()
      setAccounts(data.accounts || [])
      setConnected(data.accounts?.length > 0)
      return data.accounts?.length > 0
    } catch {
      setConnected(false)
      return false
    }
  }

  const fetchInbox = async (cat?: string) => {
    const catParam = (cat || filter) !== 'all' ? `&category=${cat || filter}` : ''
    try {
      const [inboxRes, actionRes] = await Promise.all([
        fetch(`/api/email?action=get_inbox${catParam}`).then(r => r.json()),
        fetch(`/api/email?action=get_action_needed`).then(r => r.json()),
      ])
      setEmails(inboxRes.emails || [])
      setCounts(inboxRes.counts || [])
      setActionNeeded(actionRes.emails || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    // Check URL params for OAuth result
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const connectedEmail = params.get('gmail_connected')
      const gmailError = params.get('gmail_error')
      const gmailErrorDetail = params.get('gmail_error_detail')
      if (connectedEmail) {
        setStatusMsg(`Connected ${connectedEmail}! Syncing your inbox...`)
        setTimeout(() => setStatusMsg(null), 5000)
        window.history.replaceState({}, '', window.location.pathname)
      } else if (gmailError) {
        const detail = gmailErrorDetail ? ` — ${gmailErrorDetail}` : ''
        setStatusMsg(`Gmail connection failed: ${gmailError}${detail}`)
        setTimeout(() => setStatusMsg(null), 20000)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    fetchAccounts().then(isConnected => {
      fetchInbox()
      if (isConnected) handleSync(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (connected) fetchInbox() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter])

  const handleSync = async (silent = false, accountEmail?: string) => {
    if (accountEmail) setAccountSyncing(accountEmail)
    else if (!silent) setSyncing(true)
    try {
      const res = await fetch('/api/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_inbox', ...(accountEmail ? { account_email: accountEmail } : {}) }),
      })
      const data = await res.json()
      // P0-1: capture per-account error state so we can render an
      // actionable Re-authorize CTA. Successful accounts are removed
      // from the error map.
      if (Array.isArray(data?.accounts)) {
        setSyncErrors(prev => {
          const next = { ...prev }
          for (const a of data.accounts) {
            if (a.error) next[a.email] = { message: a.error, needs_reauth: !!a.needs_reauth }
            else delete next[a.email]
          }
          return next
        })
      }
      if (data.success) {
        fetchInbox()
        fetchAccounts()
      }
    } catch { /* silent */ }
    if (accountEmail) setAccountSyncing(null)
    else if (!silent) setSyncing(false)
  }

  const handleDisconnect = async (email: string) => {
    if (!confirm(`Disconnect ${email}? You can reconnect later.`)) return
    try {
      await fetch('/api/auth/gmail', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', email }),
      })
      fetchAccounts()
    } catch { /* silent */ }
  }

  const formatLastSync = (iso: string | null): string => {
    if (!iso) return 'Never synced'
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    return `${Math.floor(mins / 1440)}d ago`
  }

  const isRecentSync = (iso: string | null): boolean => {
    if (!iso) return false
    return Date.now() - new Date(iso).getTime() < 60 * 60 * 1000
  }

  const handleBulkClear = async (categories: string[]) => {
    await fetch('/api/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_archive_by_category', categories }),
    }).catch(() => {})
    fetchInbox()
  }

  const handleTriageAll = async () => {
    setTriaging(true)
    try {
      await fetch('/api/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'triage_batch' }),
      })
      fetchInbox()
    } catch { /* silent */ }
    setTriaging(false)
  }

  const handleStarToggle = async (emailId: number) => {
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, starred: !e.starred } : e))
    await fetch('/api/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'star_email', email_id: emailId }),
    }).catch(() => {})
  }

  const handleExpand = async (emailId: number) => {
    if (expandedId === emailId) { setExpandedId(null); setExpandedDetail(null); return }
    setExpandedId(emailId)
    await fetch('/api/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', email_id: emailId }),
    }).catch(() => {})
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, read: true } : e))
    try {
      const res = await fetch(`/api/email?action=get_email&id=${emailId}`)
      setExpandedDetail(await res.json())
    } catch { /* silent */ }
  }

  // D82 Stage E — open pre-filled Create Task modal
  const openCreateTask = (email: Email | ActionNeededEmail, firstActionItem?: string) => {
    const cat = email.category || 'family'
    const mapping = BOARD_MAP[cat] || { board: 'personal', column: 'inbox' }
    const deadline = (email as ActionNeededEmail).deadline || ''
    const priority = (email.priority === 'urgent' ? 'urgent'
      : email.priority === 'high' ? 'high'
      : email.priority === 'low' ? 'low' : 'normal') as TaskForm['priority']

    setTaskForm({
      email,
      title: firstActionItem || email.subject || 'Email task',
      board: mapping.board,
      column_name: mapping.column,
      notes: `From: ${email.from_name || email.from_address}\n\n${email.snippet || ''}`,
      due_date: deadline || '',
      priority,
    })
  }

  const handleCreateTaskSubmit = async () => {
    if (!taskForm) return
    setTaskSubmitting(true)
    try {
      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: taskForm.title.trim(),
          description: taskForm.notes,
          source_type: 'email',
          source_id: taskForm.email.gmail_id,
          source_preview: `From: ${taskForm.email.from_name || taskForm.email.from_address}\n${taskForm.email.snippet || ''}`,
          category: taskForm.email.category || 'family',
          priority: taskForm.priority,
          board: taskForm.board,
          column_name: taskForm.column_name,
          due_date: taskForm.due_date || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      const actionItemId = data?.item?.id || data?.id || data?.action_item?.id
      if (actionItemId) {
        await fetch('/api/email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'link_task', email_id: taskForm.email.id, action_item_id: actionItemId }),
        }).catch(() => {})
      }
      setTaskForm(null)
      fetchInbox()
    } catch { /* silent */ }
    setTaskSubmitting(false)
  }

  const handleSnooze = async (emailId: number) => {
    await fetch('/api/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'snooze_email', email_id: emailId }),
    }).catch(() => {})
    fetchInbox()
  }

  const handleArchive = async (emailId: number) => {
    await fetch('/api/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive_email', email_id: emailId }),
    }).catch(() => {})
    setEmails(prev => prev.filter(e => e.id !== emailId))
    setActionNeeded(prev => prev.filter(e => e.id !== emailId))
  }

  const handleJunk = async (email: Email) => {
    await Promise.all([
      fetch('/api/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive_email', email_id: email.id }),
      }),
      fetch('/api/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_sender_rule',
          sender_pattern: `%${email.from_address.split('@')[1]}`,
          sender_name: email.from_name || email.from_address,
          default_category: 'noise',
          default_priority: 'low',
          auto_archive: true,
        }),
      }),
    ]).catch(() => {})
    setEmails(prev => prev.filter(e => e.id !== email.id))
  }

  const getUnread = (cat: string) => {
    if (cat === 'all') return counts.reduce((s, c) => s + parseInt(c.unread || '0'), 0)
    return parseInt(counts.find(c => c.category === cat)?.unread || '0')
  }

  const relativeTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    if (mins < 10080) return `${Math.floor(mins / 1440)}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatDeadline = (dl: string | null): string => {
    if (!dl) return ''
    const d = new Date(dl)
    if (isNaN(d.getTime())) return dl
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const catBadgeColor = (cat: string | null) => CATEGORIES.find(c => c.id === cat)?.color || 'bg-gray-300'

  if (showRules) return <SenderRules onBack={() => { setShowRules(false); fetchInbox() }} />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-5 h-5" /> Email
          {connected && (
            <span className="text-xs font-normal text-gray-400 ml-2">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
              {actionNeeded.length > 0 && (
                <span className="ml-2 inline-block px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                  {actionNeeded.length} need{actionNeeded.length === 1 ? 's' : ''} action
                </span>
              )}
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          {connected && (
            <>
              <button onClick={handleTriageAll} disabled={triaging}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50">
                {triaging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} Triage All
              </button>
              <button onClick={() => handleSync(false)} disabled={syncing}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} /> Sync Now
              </button>
            </>
          )}
          <button onClick={() => setShowRules(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* OAuth status message */}
      {statusMsg && (
        <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
          statusMsg.includes('failed') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {statusMsg}
        </div>
      )}

      {/* Connect Gmail */}
      {connected === false && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Mail className="w-12 h-12 text-indigo-200 mx-auto mb-4" />
          <p className="text-gray-700 font-semibold text-lg">Connect Gmail</p>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Connect your Gmail account to see your inbox here. Emails are automatically sorted
            by School, Medical, Triton, Finance, and more. Action items are extracted so you never miss a deadline.
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <a href="/api/auth/gmail?action=connect"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition">
              <ExternalLink className="w-4 h-4" /> Connect Gmail Account
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Read access only. Your data stays in your database.
          </p>
        </div>
      )}

      {/* Connected accounts panel */}
      {connected && accounts.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Connected Gmail Accounts</h3>
            <a href="/api/auth/gmail?action=connect"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
              <Plus className="w-3 h-3" /> Connect Another
            </a>
          </div>

          {/* P0-1: stale-sync banner. Triggers when ANY account hasn't
              synced in >24h or hit a needs_reauth error. The Re-authorize
              link reuses the same OAuth connect flow per account. */}
          {(Object.values(syncErrors).some(e => e.needs_reauth)
            || accounts.some(a => a.is_active && a.last_sync_at && (Date.now() - new Date(a.last_sync_at).getTime()) > 24 * 60 * 60 * 1000)) && (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
              <p className="font-semibold mb-1">⚠️ Email sync is behind</p>
              <p className="text-xs">
                One or more accounts need re-authorization (Google access tokens expire after a few hours and require a refresh — if Google revoked the refresh token, you&rsquo;ll need to re-connect once).
              </p>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {accounts.map((acc) => {
              const recent = isRecentSync(acc.last_sync_at)
              const stale = !!acc.last_sync_at && (Date.now() - new Date(acc.last_sync_at).getTime()) > 24 * 60 * 60 * 1000
              const err = syncErrors[acc.email]
              const dotColor = !acc.is_active ? 'bg-gray-300'
                : err?.needs_reauth ? 'bg-red-500'
                : stale || !recent ? 'bg-amber-400'
                : 'bg-green-500'
              return (
                <div key={acc.email} className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${err?.needs_reauth ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50/60'}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {acc.account_label || acc.email}
                      </span>
                      {acc.is_primary && (
                        <span className="text-[9px] px-1 py-0.5 bg-indigo-100 text-indigo-700 rounded uppercase tracking-wide">primary</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">{acc.email}</div>
                    <div className="text-[10px] text-gray-400">{formatLastSync(acc.last_sync_at)}</div>
                    {err?.needs_reauth && (
                      <a
                        href={`/api/auth/gmail?action=connect&email=${encodeURIComponent(acc.email)}`}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:text-red-900 underline"
                      >
                        Re-authorize Google →
                      </a>
                    )}
                    {err && !err.needs_reauth && (
                      <div className="mt-1 text-[10px] text-red-600 truncate" title={err.message}>
                        Sync error: {err.message}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleSync(false, acc.email)} disabled={accountSyncing === acc.email}
                    title="Sync this account"
                    className="p-1 rounded hover:bg-white text-gray-500 hover:text-blue-600 disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${accountSyncing === acc.email ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => handleDisconnect(acc.email)} title="Disconnect"
                    className="p-1 rounded hover:bg-white text-gray-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* D82 Stage D — Action Needed section */}
      {actionNeeded.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-red-700 flex items-center gap-2 uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4" /> Action Needed ({actionNeeded.length})
          </h3>
          <div className="space-y-2">
            {actionNeeded.map(email => (
              <div key={email.id} className="bg-white rounded-lg border-l-4 border-red-400 border-y border-r border-y-gray-100 border-r-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm truncate">
                        {email.from_name || email.from_address}
                      </span>
                      {email.category && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${catBadgeColor(email.category)}`}>
                          {CATEGORIES.find(c => c.id === email.category)?.label || email.category}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">{relativeTime(email.received_at)}</span>
                    </div>
                    <div className="text-sm text-gray-700 mt-0.5">{email.subject || '(no subject)'}</div>
                  </div>
                </div>

                {/* Action items */}
                {email.action_items.length > 0 && (
                  <ul className="mt-2 ml-10 space-y-1">
                    {email.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span className="flex-1">{item}</span>
                        <button
                          onClick={() => openCreateTask(email, item)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold uppercase"
                        >
                          → Task
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Deadline */}
                {email.deadline && (
                  <div className="ml-10 mt-1.5 flex items-center gap-1 text-xs text-amber-700 font-medium">
                    <Clock className="w-3 h-3" /> Due {formatDeadline(email.deadline)}
                  </div>
                )}

                {/* Actions */}
                <div className="ml-10 mt-3 flex gap-2 flex-wrap">
                  <button
                    onClick={() => openCreateTask(email, email.action_items[0])}
                    disabled={!!email.task_created_id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:bg-emerald-500"
                  >
                    {email.task_created_id
                      ? <><CheckCircle2 className="w-3 h-3" /> Task created</>
                      : <><ClipboardList className="w-3 h-3" /> Create Task</>}
                  </button>
                  <button
                    onClick={() => handleSnooze(email.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200"
                  >
                    <Clock className="w-3 h-3" /> Snooze 24h
                  </button>
                  <button
                    onClick={() => handleArchive(email.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter chips */}
      {(connected || emails.length > 0) && (
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => {
            const unread = getUnread(cat.id)
            return (
              <button key={cat.id} onClick={() => setFilter(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  filter === cat.id ? `${cat.color} text-white` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {cat.label}
                {unread > 0 && (
                  <span className={`text-xs rounded-full px-1.5 ${filter === cat.id ? 'bg-white/30' : 'bg-red-100 text-red-600'}`}>
                    {unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* D93: Bulk clear buttons */}
      {connected && emails.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(() => {
            const noiseCount = emails.filter(e => e.category === 'noise').length
            const subsCount = emails.filter(e => e.category === 'subscriptions').length
            return (
              <>
                {noiseCount > 0 && (
                  <button onClick={() => handleBulkClear(['noise'])}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600">
                    Clear Noise ({noiseCount})
                  </button>
                )}
                {subsCount > 0 && (
                  <button onClick={() => handleBulkClear(['subscriptions'])}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600">
                    Clear Subs ({subsCount})
                  </button>
                )}
                {(noiseCount + subsCount) > 5 && (
                  <button onClick={() => handleBulkClear(['noise', 'subscriptions'])}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">
                    Clear All Junk ({noiseCount + subsCount})
                  </button>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Email list */}
      {loading ? (
        <div className="text-center text-gray-400 py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : connected !== false && emails.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500 text-sm">
            {syncing ? 'Syncing your inbox...' : 'No emails yet. Click Sync Now to pull from Gmail.'}
          </p>
        </div>
      ) : emails.length > 0 ? (
        <div className="bg-white rounded-lg border divide-y">
          {emails.map(email => (
            <div key={email.id}>
              <div onClick={() => handleExpand(email.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${!email.read ? 'bg-blue-50/50' : ''}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOTS[email.priority || 'normal']}`} />

                <button onClick={e => { e.stopPropagation(); handleStarToggle(email.id) }}
                  className={`flex-shrink-0 ${email.starred ? 'text-amber-400' : 'text-gray-300 hover:text-gray-400'}`}>
                  <Star className={`w-4 h-4 ${email.starred ? 'fill-amber-400' : ''}`} />
                </button>

                <span className={`w-36 truncate text-sm flex-shrink-0 ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {email.from_name || email.from_address}
                </span>

                <div className="flex-1 min-w-0 truncate">
                  <span className={`text-sm ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {email.subject || '(no subject)'}
                  </span>
                  {email.snippet && (
                    <span className="text-sm text-gray-400 ml-2">{email.snippet}</span>
                  )}
                </div>

                {email.task_created_id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold flex-shrink-0">
                    ✓ task
                  </span>
                )}

                {email.category && (
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0 ${catBadgeColor(email.category)}`}>
                    {email.category}
                  </span>
                )}

                <span className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">{relativeTime(email.received_at)}</span>
                {expandedId === email.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>

              {/* Expanded detail with quick actions */}
              {expandedId === email.id && expandedDetail && (
                <div className="px-6 py-4 bg-gray-50 border-t space-y-3">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {expandedDetail.email.body_preview || expandedDetail.email.snippet || 'No preview available.'}
                  </div>

                  {expandedDetail.triage && (
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap text-xs">
                        <span className={`px-2 py-1 rounded ${catBadgeColor(expandedDetail.triage.category)} text-white`}>
                          {expandedDetail.triage.category}
                        </span>
                        <span className="px-2 py-1 rounded bg-gray-200 text-gray-700">
                          Priority: {expandedDetail.triage.priority}
                        </span>
                        {expandedDetail.triage.suggested_action && expandedDetail.triage.suggested_action !== 'none' && (
                          <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700">
                            {ACTION_LABELS[expandedDetail.triage.suggested_action] || expandedDetail.triage.suggested_action}
                          </span>
                        )}
                      </div>
                      {expandedDetail.triage.action_details?.action_items && expandedDetail.triage.action_details.action_items.length > 0 && (
                        <ul className="text-xs text-gray-700 space-y-0.5">
                          {expandedDetail.triage.action_details.action_items.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-indigo-400">→</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200 flex-wrap">
                    <button onClick={(e) => { e.stopPropagation(); openCreateTask(email) }}
                      disabled={!!email.task_created_id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:bg-emerald-100 disabled:text-emerald-700 transition">
                      <ClipboardList className="w-3 h-3" />
                      {email.task_created_id ? 'Task created' : 'Create Task'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleSnooze(email.id) }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition">
                      <Clock className="w-3 h-3" /> Snooze
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleArchive(email.id) }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                      <Archive className="w-3 h-3" /> Archive
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleJunk(email) }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition">
                      <Ban className="w-3 h-3" /> Junk
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* D82 Stage E — Create Task Modal */}
      {taskForm && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !taskSubmitting && setTaskForm(null)}
        >
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                Create Task from Email
              </h3>
              <button onClick={() => !taskSubmitting && setTaskForm(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                <input
                  value={taskForm.title}
                  onChange={e => setTaskForm(f => f ? { ...f, title: e.target.value } : f)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Board</label>
                  <select
                    value={taskForm.board}
                    onChange={e => setTaskForm(f => f ? { ...f, board: e.target.value } : f)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                  >
                    <option value="personal">Personal</option>
                    <option value="triton">Triton</option>
                    <option value="school">School</option>
                    <option value="medical">Medical</option>
                    <option value="household">Household</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm(f => f ? { ...f, priority: e.target.value as TaskForm['priority'] } : f)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Due date</label>
                <input
                  type="date"
                  value={taskForm.due_date}
                  onChange={e => setTaskForm(f => f ? { ...f, due_date: e.target.value } : f)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={taskForm.notes}
                  onChange={e => setTaskForm(f => f ? { ...f, notes: e.target.value } : f)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setTaskForm(null)}
                disabled={taskSubmitting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTaskSubmit}
                disabled={taskSubmitting || !taskForm.title.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
              >
                {taskSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
