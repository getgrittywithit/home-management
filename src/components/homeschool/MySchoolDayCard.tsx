'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Check, Clock, Play, HelpCircle, MessageSquare, X, Link as LinkIcon, Loader2 } from 'lucide-react'

interface DailyTask {
  id: string
  kid_name: string
  subject_name: string
  subject_icon: string
  title: string
  description: string | null
  duration_min: number | null
  sort_order: number
  resource_url: string | null
  is_required: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  time_spent_min: number | null
  kid_notes: string | null
  parent_feedback: string | null
  needs_help: boolean
  help_subject: string | null
  started_at: string | null
  completed_at: string | null
}

interface Totals {
  total: number
  completed: number
  in_progress: number
  needs_help: number
  total_min: number
  spent_min: number
}

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function MySchoolDayCard({ kidName }: { kidName: string }) {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [helpDialogFor, setHelpDialogFor] = useState<DailyTask | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const kidKey = kidName.toLowerCase()

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/homeschool/daily?action=list_tasks&kid_name=${kidKey}&date=${todayIso()}`)
      const json = await res.json()
      setTasks(json.tasks || [])
      setTotals(json.totals || null)
    } catch (err) {
      console.error('list_tasks failed', err)
    } finally {
      setLoading(false)
    }
  }, [kidKey])

  useEffect(() => { load() }, [load])

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 1800)
  }

  const toggleTask = async (task: DailyTask) => {
    const next =
      task.status === 'pending' ? 'in_progress' :
      task.status === 'in_progress' ? 'completed' :
      'pending'
    await fetch('/api/homeschool/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_task', id: task.id, target_status: next }),
    })
    if (next === 'completed') flashToast(`✓ ${task.subject_name} done!`)
    load()
  }

  const startFocusTimer = async (task: DailyTask) => {
    // Mark in_progress + open focus timer (legacy /api/homeschool start_focus_session is
    // tied to student_id/subject_id. For now we mark the task in_progress; full focus
    // timer integration lands in Phase C.)
    await fetch('/api/homeschool/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_task', id: task.id, target_status: 'in_progress' }),
    })
    flashToast('Timer started')
    load()
  }

  if (loading) {
    return (
      <div className="rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50 p-5 text-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/40 p-5 text-center">
        <BookOpen className="w-8 h-8 text-teal-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-teal-900">No school plan for today yet</p>
        <p className="text-xs text-teal-600 mt-1">Ask Mom to set up your day!</p>
      </div>
    )
  }

  const done = totals?.completed || 0
  const total = totals?.total || tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const remaining = tasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped')
  const completed = tasks.filter((t) => t.status === 'completed')
  const current = remaining.find((t) => t.status === 'in_progress') || remaining[0]
  const others = remaining.filter((t) => t.id !== current?.id)
  const minutesLeft = remaining.reduce((s, t) => s + (t.duration_min || 0), 0)
  const finished = done === total

  return (
    <div className="rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50 overflow-hidden">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Header + progress */}
      <div className="px-5 pt-4 pb-3 border-b border-teal-100">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-teal-700" />
          <h2 className="text-lg font-bold text-teal-900">My School Day</h2>
          <span className="text-xs text-teal-600 ml-auto">{todayLabel()}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-700 mb-1.5">
          <span className="font-semibold">{done} of {total} done</span>
          {!finished && minutesLeft > 0 && (
            <>
              <span className="text-gray-400">·</span>
              <span>~{minutesLeft} min left</span>
            </>
          )}
          {finished && <span className="text-green-600 font-semibold ml-1">🎉 All done — great work!</span>}
        </div>
        <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-teal-100">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-green-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Completed collapsed strip */}
      {completed.length > 0 && (
        <div className="px-5 py-3 bg-white/60 border-b border-teal-100 space-y-1">
          {completed.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-xs text-gray-500">
              <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <span className="text-base mr-1">{t.subject_icon}</span>
              <span className="line-through truncate">{t.subject_name} — {t.title}</span>
              {t.time_spent_min != null && <span className="ml-auto text-gray-400">{t.time_spent_min}m</span>}
            </div>
          ))}
        </div>
      )}

      {/* Current task highlighted */}
      {current && (
        <div className="px-5 py-4 bg-white border-b border-teal-100">
          <div className="flex items-start gap-3">
            <button
              onClick={() => toggleTask(current)}
              className="mt-0.5 w-6 h-6 rounded-full border-2 border-teal-400 bg-white flex items-center justify-center flex-shrink-0 hover:bg-teal-100"
              aria-label="Toggle"
            >
              {current.status === 'in_progress' && <Play className="w-3 h-3 text-teal-600 fill-teal-600" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl">{current.subject_icon}</span>
                <span className="font-bold text-gray-900">{current.subject_name}</span>
                {current.duration_min != null && (
                  <span className="text-xs text-gray-500 flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> {current.duration_min}m
                  </span>
                )}
                {current.status === 'in_progress' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-semibold uppercase">
                    In Progress
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-800 mt-1 font-medium">{current.title}</p>
              {current.description && (
                <p className="text-xs text-gray-600 mt-1">{current.description}</p>
              )}
              {current.resource_url && (
                <a
                  href={current.resource_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  <LinkIcon className="w-3 h-3" /> Open resource
                </a>
              )}
              {current.parent_feedback && (
                <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2 text-xs">
                  <div className="font-semibold text-green-700 mb-0.5">Mom/Dad said:</div>
                  <div className="text-green-800">{current.parent_feedback}</div>
                </div>
              )}
              {current.needs_help && (
                <div className="mt-2 text-xs text-amber-700 italic">Waiting for Mom/Dad…</div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => startFocusTimer(current)}
                  className="inline-flex items-center gap-1 bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-teal-700"
                >
                  <Play className="w-3 h-3" /> Start
                </button>
                <button
                  onClick={() => toggleTask(current)}
                  className="inline-flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700"
                >
                  <Check className="w-3 h-3" /> Mark Done
                </button>
                <button
                  onClick={() => setHelpDialogFor(current)}
                  className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-200"
                >
                  <HelpCircle className="w-3 h-3" /> I Need Help
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remaining tasks */}
      {others.length > 0 && (
        <div className="divide-y divide-teal-100/60">
          {others.map((t) => {
            const expanded = expandedId === t.id
            return (
              <div key={t.id}>
                <div
                  className="px-5 py-3 flex items-center gap-3 hover:bg-white/50 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : t.id)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTask(t) }}
                    className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex-shrink-0 hover:border-teal-400"
                    aria-label="Toggle"
                  />
                  <span className="text-lg">{t.subject_icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 font-medium truncate">{t.subject_name}</div>
                    <div className="text-xs text-gray-500 truncate">{t.title}</div>
                  </div>
                  {t.duration_min != null && (
                    <span className="text-[11px] text-gray-400">{t.duration_min}m</span>
                  )}
                  {t.needs_help && <span className="text-xs text-amber-600">🆘</span>}
                </div>
                {expanded && (
                  <div className="px-5 pb-3 pl-[68px] space-y-1.5 text-xs text-gray-600">
                    {t.description && <p>{t.description}</p>}
                    {t.resource_url && (
                      <a
                        href={t.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <LinkIcon className="w-3 h-3" /> Open resource
                      </a>
                    )}
                    {t.parent_feedback && (
                      <div className="rounded border border-green-200 bg-green-50 p-2">
                        <span className="font-semibold text-green-700">Mom/Dad said: </span>
                        <span className="text-green-800">{t.parent_feedback}</span>
                      </div>
                    )}
                    <button
                      onClick={() => setHelpDialogFor(t)}
                      className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-medium"
                    >
                      <HelpCircle className="w-3 h-3" /> Ask for help
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer summary */}
      <div className="px-5 py-2.5 bg-white/40 border-t border-teal-100 text-[11px] text-gray-500 text-center">
        Keep going{kidName ? `, ${kidName}` : ''}! 💪
      </div>

      {/* Help dialog */}
      {helpDialogFor && (
        <HelpDialog
          task={helpDialogFor}
          onClose={() => setHelpDialogFor(null)}
          onSent={() => { setHelpDialogFor(null); load() }}
        />
      )}
    </div>
  )
}

function HelpDialog({ task, onClose, onSent }: { task: DailyTask; onClose: () => void; onSent: () => void }) {
  const [helpText, setHelpText] = useState(task.help_subject || '')
  const [note, setNote] = useState(task.kid_notes || '')
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!helpText.trim()) return
    setSending(true)
    try {
      await fetch('/api/homeschool/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_help',
          id: task.id,
          help_subject: helpText.trim(),
          kid_notes: note.trim() || null,
        }),
      })
      onSent()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900">I Need Help</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
            <span className="text-lg mr-1">{task.subject_icon}</span>
            <span className="font-semibold text-gray-900">{task.subject_name}</span>
            <div className="text-xs text-gray-600 mt-0.5">{task.title}</div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">What are you stuck on?</label>
            <input
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="I don't understand..."
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">More details (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            onClick={send}
            disabled={!helpText.trim() || sending}
            className="flex-1 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <MessageSquare className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send to Mom & Dad'}
          </button>
        </div>
      </div>
    </div>
  )
}
