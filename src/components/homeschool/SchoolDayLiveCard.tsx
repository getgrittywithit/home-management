'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, HelpCircle, Bell, Loader2, MessageSquare, X, Star } from 'lucide-react'

interface KidSummary {
  kid_name: string
  total: number
  completed: number
  in_progress: number
  needs_help: number
  total_min: number
  spent_min: number
  last_completed_at: string | null
  last_activity_at: string | null
}

interface CurrentTask {
  kid_name: string
  id: string
  title: string
  subject_name: string
  subject_icon: string
  status: 'in_progress' | 'pending'
}

interface HelpRequest {
  kid_name: string
  id: string
  title: string
  subject_name: string
  subject_icon: string
  help_subject: string | null
  kid_notes: string | null
  help_requested_at: string | null
}

interface WeekRow {
  kid_name: string
  task_date: string
  total: number
  completed: number
  needs_help: number
}

const HOMESCHOOL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah']

function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''
}

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function minutesSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function getMondayIso(): string {
  const d = new Date()
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + mondayOffset)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function SchoolDayLiveCard() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Record<string, KidSummary>>({})
  const [current, setCurrent] = useState<Record<string, CurrentTask>>({})
  const [help, setHelp] = useState<Record<string, HelpRequest>>({})
  const [week, setWeek] = useState<WeekRow[]>([])
  const [replyFor, setReplyFor] = useState<HelpRequest | null>(null)
  const [nudging, setNudging] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const date = todayIso()
      const start = getMondayIso()
      const [summaryRes, weekRes] = await Promise.all([
        fetch(`/api/homeschool/daily?action=daily_summary&date=${date}`).then((r) => r.json()),
        fetch(`/api/homeschool/daily?action=week_summary&start=${start}`).then((r) => r.json()),
      ])
      const byKid: Record<string, KidSummary> = {}
      for (const row of summaryRes.per_kid || []) byKid[row.kid_name] = row
      setSummary(byKid)
      setCurrent(summaryRes.current || {})
      setHelp(summaryRes.help || {})
      setWeek(weekRes.rows || [])
    } catch (err) {
      console.error('load school day failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const nudge = async (kid: string) => {
    setNudging(kid)
    try {
      await fetch('/api/homeschool/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nudge_kid', kid_name: kid }),
      })
      flashToast(`⏰ Nudged ${titleCase(kid)}`)
    } finally {
      setNudging(null)
    }
  }

  const todayLabel = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const start = getMondayIso()
  const weekDates = Array.from({ length: 5 }, (_, i) => addDaysIso(start, i))

  const weekCellClass = (kid: string, dateIso: string): string => {
    const row = week.find((w) => w.kid_name === kid && w.task_date === dateIso)
    if (!row || row.total === 0) return 'bg-gray-100 border-gray-200'
    if (row.needs_help > 0) return 'bg-amber-300 border-amber-400'
    if (row.completed === row.total) return 'bg-green-400 border-green-500'
    if (row.completed > 0) return 'bg-blue-300 border-blue-400'
    return 'bg-red-200 border-red-300'
  }

  return (
    <div className="rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50 p-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-5 h-5 text-teal-700" />
        <h3 className="text-sm font-bold text-teal-900 flex-1">School Day — {todayLabel}</h3>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />}
      </div>

      {/* Per-kid progress rows */}
      <div className="space-y-2">
        {HOMESCHOOL_KIDS.map((kid) => {
          const s = summary[kid]
          const total = s?.total || 0
          const done = s?.completed || 0
          const pct = total > 0 ? Math.round((done / total) * 100) : 0
          const minutesLeft = Math.max(0, (s?.total_min || 0) - (s?.spent_min || 0))
          const cur = current[kid]
          const h = help[kid]
          const idleMins = minutesSince(s?.last_activity_at || null)

          // Status color dot
          let statusColor = 'bg-gray-300'
          let statusNote = ''
          if (total === 0) {
            statusColor = 'bg-gray-300'
            statusNote = 'No plan set'
          } else if (done === total) {
            statusColor = 'bg-green-500'
            statusNote = `🎉 Finished${s?.last_completed_at ? ' at ' + new Date(s.last_completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''}`
          } else if (h) {
            statusColor = 'bg-amber-500'
            statusNote = `🆘 Needs help: ${h.subject_name}`
          } else if (cur?.status === 'in_progress') {
            statusColor = 'bg-green-500'
            statusNote = `▶️ Working on: ${cur.subject_icon} ${cur.subject_name}`
          } else if (done > 0) {
            statusColor = 'bg-yellow-400'
            statusNote = cur ? `Next: ${cur.subject_icon} ${cur.subject_name}` : ''
          } else if (idleMins != null && idleMins < 10080) {
            // Has activity but no tasks started today — hmm, edge case
            statusColor = 'bg-red-500'
            statusNote = 'Not started'
          } else {
            statusColor = 'bg-red-500'
            statusNote = '⚠️ Hasn\u2019t opened portal today'
          }

          return (
            <div key={kid} className="rounded-lg bg-white border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
                <span className="text-sm font-semibold text-gray-900 capitalize">{kid}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-gradient-to-r from-teal-400 to-green-400' : 'bg-gray-200'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                    {done}/{total || '?'} done
                  </span>
                  {total > 0 && done < total && (
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">~{minutesLeft}m left</span>
                  )}
                </div>
              </div>
              {statusNote && (
                <div className="text-[11px] text-gray-600 ml-4">{statusNote}</div>
              )}

              {/* Quick actions */}
              <div className="flex flex-wrap gap-1.5 mt-2 ml-4">
                {h && (
                  <button
                    onClick={() => setReplyFor(h)}
                    className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-semibold px-2 py-1 rounded hover:bg-amber-600"
                  >
                    <MessageSquare className="w-2.5 h-2.5" /> Reply to help
                  </button>
                )}
                {total === 0 || (total > 0 && done === 0) ? (
                  <button
                    onClick={() => nudge(kid)}
                    disabled={nudging === kid}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    <Bell className="w-2.5 h-2.5" /> Nudge
                  </button>
                ) : null}
                {done === total && total > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-700 px-2 py-1 rounded">
                    <Star className="w-2.5 h-2.5 fill-green-700" /> Review
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Weekly grid */}
      <div className="mt-4 pt-3 border-t border-teal-100">
        <h4 className="text-[10px] font-bold uppercase tracking-wide text-teal-800 mb-1.5">This Week at a Glance</h4>
        <div className="space-y-1">
          {HOMESCHOOL_KIDS.map((kid) => (
            <div key={kid} className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-600 w-12 capitalize">{kid}</span>
              <div className="flex gap-1">
                {weekDates.map((dateIso, i) => {
                  const row = week.find((w) => w.kid_name === kid && w.task_date === dateIso)
                  const label = ['M', 'T', 'W', 'Th', 'F'][i]
                  const pctForCell =
                    row && row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0
                  return (
                    <div
                      key={dateIso}
                      title={row ? `${label}: ${row.completed}/${row.total} done${row.needs_help > 0 ? ' · needs help' : ''}` : `${label}: no plan`}
                      className={`w-5 h-5 rounded border text-[8px] font-bold flex items-center justify-center text-gray-700 ${weekCellClass(kid, dateIso)}`}
                    >
                      {pctForCell === 100 ? '✓' : label}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-2 text-[9px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400 inline-block" /> done</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-300 inline-block" /> in progress</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-300 inline-block" /> needs help</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-200 inline-block" /> not started</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-gray-100 border border-gray-200 inline-block" /> no plan</span>
        </div>
      </div>

      {/* Help request reply modal */}
      {replyFor && (
        <HelpReplyModal
          help={replyFor}
          onClose={() => setReplyFor(null)}
          onSent={() => { setReplyFor(null); load() }}
        />
      )}
    </div>
  )
}

function HelpReplyModal({
  help, onClose, onSent,
}: {
  help: HelpRequest
  onClose: () => void
  onSent: () => void
}) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      await fetch('/api/homeschool/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parent_reply', id: help.id, parent_feedback: reply.trim() }),
      })
      onSent()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-600" /> Reply to {titleCase(help.kid_name)}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-lg">{help.subject_icon}</span>
              <span className="font-semibold text-gray-900">{help.subject_name}</span>
              <span className="text-gray-500">— {help.title}</span>
            </div>
            {help.help_subject && <div className="text-amber-800"><span className="font-semibold">Stuck on:</span> {help.help_subject}</div>}
            {help.kid_notes && <div className="text-gray-600 italic mt-0.5">"{help.kid_notes}"</div>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Your reply</label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              placeholder="Try breaking it into smaller steps…"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            onClick={send}
            disabled={!reply.trim() || sending}
            className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </div>
    </div>
  )
}
