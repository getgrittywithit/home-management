'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Star, Settings, ChevronDown, ChevronUp, Mail, Loader2 } from 'lucide-react'
import SenderRules from './SenderRules'

interface Email {
  id: number; gmail_id: string; from_address: string; from_name: string | null
  subject: string | null; snippet: string | null; body_preview?: string | null
  received_at: string; read: boolean; starred: boolean; triaged: boolean
  category: string | null; priority: string | null; has_attachments: boolean
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

  useEffect(() => { fetchInbox() }, [filter])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_inbox' }) })
      const data = await res.json()
      if (data.success) fetchInbox()
      else alert(data.message || 'Sync not available')
    } catch { /* silent */ }
    setSyncing(false)
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
    // Mark read
    await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', email_id: emailId }) }).catch(() => {})
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, read: true } : e))
    // Fetch full detail
    try {
      const res = await fetch(`/api/email?action=get_email&id=${emailId}`)
      setExpandedDetail(await res.json())
    } catch { /* silent */ }
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
        </h2>
        <div className="flex gap-2">
          <button onClick={handleTriageAll} disabled={triaging}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50">
            {triaging ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Triage All
          </button>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} /> Sync
          </button>
          <button onClick={() => setShowRules(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
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

      {/* Email list */}
      {loading ? (
        <div className="text-center text-gray-400 py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : emails.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No emails yet</p>
          <p className="text-sm text-gray-400 mt-1">Click Sync to fetch from Gmail, or emails will appear as they arrive.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {emails.map(email => (
            <div key={email.id}>
              <div onClick={() => handleExpand(email.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${!email.read ? 'bg-blue-50/50' : ''}`}>
                {/* Priority dot */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOTS[email.priority || 'normal']}`} />

                {/* Star */}
                <button onClick={e => { e.stopPropagation(); handleStarToggle(email.id) }}
                  className={`flex-shrink-0 ${email.starred ? 'text-amber-400' : 'text-gray-300 hover:text-gray-400'}`}>
                  <Star className={`w-4 h-4 ${email.starred ? 'fill-amber-400' : ''}`} />
                </button>

                {/* From */}
                <span className={`w-36 truncate text-sm flex-shrink-0 ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {email.from_name || email.from_address}
                </span>

                {/* Subject + snippet */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {email.subject || '(no subject)'}
                  </span>
                  {email.snippet && (
                    <span className="text-sm text-gray-400 ml-2 truncate">{email.snippet}</span>
                  )}
                </div>

                {/* Category badge */}
                {email.category && (
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0 ${catBadgeColor(email.category)}`}>
                    {email.category}
                  </span>
                )}

                {/* Time */}
                <span className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">{relativeTime(email.received_at)}</span>

                {/* Expand icon */}
                {expandedId === email.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>

              {/* Expanded detail */}
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
