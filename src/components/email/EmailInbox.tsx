'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Star, Settings, ChevronDown, ChevronUp, Mail, Loader2, Archive, ClipboardList, Ban, ExternalLink, Plus, X } from 'lucide-react'
import SenderRules from './SenderRules'

interface Email {
  id: number; gmail_id: string; from_address: string; from_name: string | null
  subject: string | null; snippet: string | null; body_preview?: string | null
  received_at: string; read: boolean; starred: boolean; triaged: boolean
  category: string | null; priority: string | null; has_attachments: boolean
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
}

interface CategoryCount { category: string; unread: string; total: string }

const CATEGORIES = [
  { id: 'all', label: 'All', color: 'bg-gray-500' },
  { id: 'school', label: 'School', color: 'bg-blue-500' },
  { id: 'medical', label: 'Medical', color: 'bg-red-500' },
  { id: 'triton', label: 'Triton', color: 'bg-amber-600' },
  { id: 'finance', label: 'Finance', color: 'bg-green-500' },
  { id: 'family', label: 'Family', color: 'bg-purple-500' },
  { id: 'subscriptions', label: 'Subs', color: 'bg-gray-400' },
  { id: 'junk', label: 'Junk', color: 'bg-gray-300' },
]

const PRIORITY_DOTS: Record<string, string> = {
  urgent: 'bg-red-500', normal: 'bg-gray-300', low: 'bg-gray-200', archive: 'bg-gray-100',
}

const ACTION_LABELS: Record<string, string> = {
  reply_needed: 'Reply needed', schedule_event: 'Schedule event', pay_bill: 'Pay bill',
  file_only: 'File only', archive: 'Archive', rule_matched: 'Auto-categorized', none: 'No action',
}

export default function EmailInbox() {
  const [emails, setEmails] = useState<Email[]>([])
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
  const [taskCreating, setTaskCreating] = useState<number | null>(null)
  const [accountSyncing, setAccountSyncing] = useState<string | null>(null)

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
      const res = await fetch(`/api/email?action=get_inbox${catParam}`)
      const data = await res.json()
      setEmails(data.emails || [])
      setCounts(data.counts || [])
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
      if (connectedEmail) {
        setStatusMsg(`Connected ${connectedEmail}! Syncing your inbox...`)
        setTimeout(() => setStatusMsg(null), 5000)
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
      } else if (gmailError) {
        setStatusMsg(`Gmail connection failed: ${gmailError}. Try again.`)
        setTimeout(() => setStatusMsg(null), 8000)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    fetchAccounts().then(isConnected => {
      fetchInbox()
      if (isConnected) {
        handleSync(true)
      }
    })
  }, [])

  useEffect(() => { if (connected) fetchInbox() }, [filter])

  const handleSync = async (silent = false, accountEmail?: string) => {
    if (accountEmail) setAccountSyncing(accountEmail)
    else if (!silent) setSyncing(true)
    try {
      const res = await fetch('/api/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_inbox', ...(accountEmail ? { account_email: accountEmail } : {}) }),
      })
      const data = await res.json()
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
    return Date.now() - new Date(iso).getTime() < 60 * 60 * 1000 // within 1h
  }

  const handleTriageAll = async () => {
    setTriaging(true)
    try {
      await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'triage_batch' }) })
      fetchInbox()
    } catch { /* silent */ }
    setTriaging(false)
  }

  const handleStarToggle = async (emailId: number) => {
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, starred: !e.starred } : e))
    await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'star_email', email_id: emailId }) }).catch(() => {})
  }

  const handleExpand = async (emailId: number) => {
    if (expandedId === emailId) { setExpandedId(null); setExpandedDetail(null); return }
    setExpandedId(emailId)
    await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', email_id: emailId }) }).catch(() => {})
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, read: true } : e))
    try {
      const res = await fetch(`/api/email?action=get_email&id=${emailId}`)
      setExpandedDetail(await res.json())
    } catch { /* silent */ }
  }

  const handleCreateTask = async (email: Email) => {
    setTaskCreating(email.id)
    try {
      await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: email.subject || 'Email task',
          description: email.snippet || '',
          source_type: 'email',
          source_id: email.gmail_id,
          source_preview: `From: ${email.from_name || email.from_address}\n${email.snippet || ''}`,
          category: email.category || 'family',
          priority: email.priority === 'urgent' ? 'urgent' : email.priority === 'low' ? 'low' : 'normal',
          board: email.category === 'triton' ? 'triton' : email.category === 'school' ? 'school' : email.category === 'medical' ? 'medical' : 'personal',
        }),
      })
    } catch { /* silent */ }
    setTaskCreating(null)
  }

  const handleArchive = async (emailId: number) => {
    await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', email_id: emailId }) }).catch(() => {})
    setEmails(prev => prev.filter(e => e.id !== emailId))
  }

  const handleJunk = async (email: Email) => {
    // Mark as read + add sender to junk rules
    await Promise.all([
      fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', email_id: email.id }) }),
      fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_sender_rule',
          sender_pattern: `%${email.from_address.split('@')[1]}`,
          sender_name: email.from_name || email.from_address,
          default_category: 'junk',
          default_priority: 'low',
          auto_archive: true,
        }) }),
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
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          {connected && (
            <>
              <button onClick={handleTriageAll} disabled={triaging}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50">
                {triaging ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Triage All
              </button>
              <button onClick={() => handleSync(false)} disabled={syncing}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} /> Sync All
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

      {/* Connect Gmail (no accounts yet) */}
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
            Starts with read-only access. Your data stays in your database.
          </p>
        </div>
      )}

      {/* Connected accounts panel */}
      {connected && accounts.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Connected Gmail Accounts</h3>
            <a
              href="/api/auth/gmail?action=connect"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="w-3 h-3" /> Connect Another
            </a>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {accounts.map((acc) => {
              const recent = isRecentSync(acc.last_sync_at)
              const dotColor = !acc.is_active ? 'bg-gray-300' : recent ? 'bg-green-500' : 'bg-amber-400'
              return (
                <div
                  key={acc.email}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
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
                  </div>
                  <button
                    onClick={() => handleSync(false, acc.email)}
                    disabled={accountSyncing === acc.email}
                    title="Sync this account"
                    className="p-1 rounded hover:bg-white text-gray-500 hover:text-blue-600 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${accountSyncing === acc.email ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleDisconnect(acc.email)}
                    title="Disconnect"
                    className="p-1 rounded hover:bg-white text-gray-400 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
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

      {/* Email list */}
      {loading ? (
        <div className="text-center text-gray-400 py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : connected !== false && emails.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500 text-sm">
            {syncing ? 'Syncing your inbox...' : 'No emails yet. Click Sync to pull from Gmail.'}
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

                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {email.subject || '(no subject)'}
                  </span>
                  {email.snippet && (
                    <span className="text-sm text-gray-400 ml-2 truncate">{email.snippet}</span>
                  )}
                </div>

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
                    <div className="flex gap-3 flex-wrap text-xs">
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
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <button onClick={(e) => { e.stopPropagation(); handleCreateTask(email) }}
                      disabled={taskCreating === email.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition">
                      <ClipboardList className="w-3 h-3" />
                      {taskCreating === email.id ? 'Creating...' : 'Create Task'}
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
    </div>
  )
}
