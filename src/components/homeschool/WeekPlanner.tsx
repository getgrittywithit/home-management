'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Loader2, Trash2, Copy } from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
type KidId = 'amos' | 'ellie' | 'wyatt' | 'hannah'

const HOMESCHOOL_KIDS: { id: KidId; label: string; grade: string; accent: string }[] = [
  { id: 'amos',   label: 'Amos',   grade: '10th', accent: 'from-blue-500 to-indigo-500' },
  { id: 'ellie',  label: 'Ellie',  grade: '6th',  accent: 'from-pink-500 to-rose-500' },
  { id: 'wyatt',  label: 'Wyatt',  grade: '4th',  accent: 'from-emerald-500 to-teal-500' },
  { id: 'hannah', label: 'Hannah', grade: '3rd',  accent: 'from-amber-500 to-orange-500' },
]

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type TaskRow = {
  id: string
  kid_name: KidId
  task_date: string  // 'YYYY-MM-DD'
  subject_id: string | null
  subject_name: string
  subject_icon: string | null
  title: string
  description: string | null
  duration_min: number | null
  sort_order: number
  resource_url: string | null
  is_required: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
}

type Subject = {
  id: string
  kid_name: KidId
  subject_name: string
  subject_icon: string | null
  default_duration_min: number | null
  sort_order: number
  color: string | null
}

type Template = {
  id: string
  kid_name: KidId
  subject: string
  task_label: string
  task_description: string | null
  duration_min: number | null
}

// ----------------------------------------------------------------------------
// Date helpers (Chicago-local)
// ----------------------------------------------------------------------------
function todayChicagoIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function mondayOf(iso: string): string {
  const d = parseDateLocal(iso)
  const day = d.getDay() // 0=Sun..6=Sat
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-CA')
}

function addDays(iso: string, days: number): string {
  const d = parseDateLocal(iso)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA')
}

function fmtDayHeader(iso: string): string {
  return parseDateLocal(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtRange(startIso: string): string {
  // D166 BUG 1: toLocaleDateString('en-US', { day, year }) without a month
  // produces an ugly fallback like "2026 (day: 26)" in some engines. Format
  // the same-month end as "day, year" manually to avoid that branch.
  const start = parseDateLocal(startIso)
  const end = parseDateLocal(addDays(startIso, 6))
  const sameMonthYear =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = sameMonthYear
    ? `${end.getDate()}, ${end.getFullYear()}`
    : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} – ${endStr}`
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------
export default function WeekPlanner() {
  const [weekStart, setWeekStart] = useState<string>(() => mondayOf(todayChicagoIso()))
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ kid: KidId; date: string } | null>(null)
  const [showReplicator, setShowReplicator] = useState(false)

  // Precompute the 7 day columns
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const today = todayChicagoIso()

  const fetchWeek = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/homeschool/daily?action=week_grid&start=${weekStart}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load week')
      setTasks(json.tasks || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/homeschool/daily?action=list_all_subjects')
      const json = await res.json()
      setSubjects(json.subjects || [])
    } catch { /* non-fatal */ }
  }, [])

  const fetchTemplates = useCallback(async () => {
    // homeschool_tasks is the task library (~90 rows). Single endpoint returns
    // templates for all 4 homeschool kids in one call.
    try {
      const res = await fetch('/api/homeschool/daily?action=list_library_tasks')
      if (!res.ok) return
      const json = await res.json()
      setTemplates(json.tasks || [])
    } catch { /* non-fatal — modal just won't show template quick-picks */ }
  }, [])

  useEffect(() => { fetchWeek() }, [fetchWeek])
  useEffect(() => { fetchSubjects(); fetchTemplates() }, [fetchSubjects, fetchTemplates])

  // Index tasks by `${kid}|${date}` for O(1) cell lookups
  const tasksByCell = useMemo(() => {
    const m: Record<string, TaskRow[]> = {}
    for (const t of tasks) {
      const key = `${t.kid_name}|${t.task_date}`
      if (!m[key]) m[key] = []
      m[key].push(t)
    }
    return m
  }, [tasks])

  const deleteTask = async (id: string) => {
    // Optimistic: drop from local state, revert on failure
    const prev = tasks
    setTasks(tasks.filter(t => t.id !== id))
    try {
      const res = await fetch('/api/homeschool/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_task', id }),
      })
      if (!res.ok) throw new Error('delete failed')
    } catch {
      setTasks(prev)
      setError('Failed to delete task')
    }
  }

  const handleCreated = () => {
    setModal(null)
    fetchWeek()
  }

  return (
    <div className="space-y-4">
      {/* Nav bar */}
      <div className="bg-white rounded-lg border shadow-sm p-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="px-2 py-1.5 rounded hover:bg-gray-100 text-gray-600"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setWeekStart(mondayOf(today))}
          className="text-xs px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600"
        >
          Today
        </button>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="px-2 py-1.5 rounded hover:bg-gray-100 text-gray-600"
          aria-label="Next week"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-2 text-gray-800 font-semibold">
          <CalendarIcon className="w-4 h-4 text-teal-600" />
          Week of {fmtRange(weekStart)}
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-teal-500" />}
        <button
          onClick={() => setShowReplicator(true)}
          disabled={tasks.length === 0}
          className="ml-auto text-xs px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
          title={tasks.length === 0 ? 'Add some tasks first' : 'Copy this week’s pattern forward'}
        >
          <Copy className="w-3.5 h-3.5" /> Copy to future weeks
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-2">{error}</div>
      )}

      {/* Grid */}
      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 bg-gray-50 border-b border-r text-left p-2 text-xs font-semibold text-gray-500 w-28">
                Kid
              </th>
              {days.map((iso, i) => {
                const isToday = iso === today
                return (
                  <th
                    key={iso}
                    className={`border-b text-left p-2 text-xs font-semibold w-[14%] ${
                      isToday ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div>{DOW_LABELS[i]}</div>
                    <div className="text-[11px] font-normal opacity-75">{fmtDayHeader(iso)}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {HOMESCHOOL_KIDS.map(kid => (
              <tr key={kid.id} className="align-top">
                <td className={`sticky left-0 bg-gradient-to-br ${kid.accent} text-white border-r p-2 text-sm font-semibold`}>
                  <div>{kid.label}</div>
                  <div className="text-[11px] opacity-80">{kid.grade}</div>
                </td>
                {days.map(iso => {
                  const cellTasks = tasksByCell[`${kid.id}|${iso}`] || []
                  const isToday = iso === today
                  return (
                    <td
                      key={iso}
                      className={`border-b border-r p-1.5 align-top ${isToday ? 'bg-teal-50/40' : ''}`}
                    >
                      <div className="space-y-1">
                        {cellTasks.map(t => (
                          <TaskPill key={t.id} task={t} onDelete={deleteTask} />
                        ))}
                        <button
                          onClick={() => setModal({ kid: kid.id, date: iso })}
                          className="w-full text-xs text-gray-400 hover:text-teal-600 hover:bg-teal-50 border border-dashed border-gray-200 hover:border-teal-300 rounded py-1 flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <AddTaskModal
          kid={modal.kid}
          date={modal.date}
          subjects={subjects.filter(s => s.kid_name === modal.kid)}
          templates={templates.filter(t => t.kid_name === modal.kid)}
          onClose={() => setModal(null)}
          onCreated={handleCreated}
        />
      )}

      {showReplicator && (
        <ReplicateWeekModal
          weekStart={weekStart}
          taskCount={tasks.length}
          onClose={() => setShowReplicator(false)}
          onDone={() => { setShowReplicator(false); fetchWeek() }}
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Task pill (inline with delete-on-hover)
// ----------------------------------------------------------------------------
function TaskPill({ task, onDelete }: { task: TaskRow; onDelete: (id: string) => void }) {
  return (
    <div className="group relative bg-gray-50 hover:bg-white border border-gray-200 rounded px-1.5 py-1 text-xs">
      <div className="flex items-center gap-1">
        <span>{task.subject_icon || '📚'}</span>
        <span className="flex-1 truncate font-medium text-gray-800">{task.title}</span>
        {task.duration_min ? <span className="text-gray-400 text-[10px]">{task.duration_min}m</span> : null}
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow"
        aria-label="Delete task"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Add Task Modal
// ----------------------------------------------------------------------------
function AddTaskModal({
  kid, date, subjects, templates, onClose, onCreated,
}: {
  kid: KidId
  date: string
  subjects: Subject[]
  templates: Template[]
  onClose: () => void
  onCreated: () => void
}) {
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState<number | ''>(subjects[0]?.default_duration_min ?? '')
  const [resourceUrl, setResourceUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const selectedSubject = subjects.find(s => s.id === subjectId)

  // When subject changes, reset duration to that subject's default (if the user
  // hasn't typed a custom number yet).
  useEffect(() => {
    if (selectedSubject && (duration === '' || !duration)) {
      setDuration(selectedSubject.default_duration_min ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId])

  const matchingTemplates = templates.filter(t =>
    selectedSubject && t.subject.toLowerCase() === selectedSubject.subject_name.toLowerCase()
  )

  const applyTemplate = (t: Template) => {
    setTitle(t.task_label)
    if (t.task_description) setDescription(t.task_description)
    if (t.duration_min) setDuration(t.duration_min)
  }

  const save = async () => {
    setErr(null)
    if (!title.trim()) { setErr('Title required'); return }
    if (!selectedSubject) { setErr('Subject required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/homeschool/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_task',
          kid_name: kid,
          task_date: date,
          subject_id: subjectId,
          title: title.trim(),
          description: description.trim() || null,
          duration_min: duration === '' ? null : Number(duration),
          resource_url: resourceUrl.trim() || null,
          is_required: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      onCreated()
    } catch (e: any) {
      setErr(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const kidLabel = HOMESCHOOL_KIDS.find(k => k.id === kid)!.label
  const dateLabel = parseDateLocal(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Add task for {kidLabel}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Subject */}
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Subject</span>
            {subjects.length === 0 ? (
              <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                No subjects set up for {kidLabel}. Add one in Curriculum &amp; TEFA first.
              </div>
            ) : (
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className="mt-1 block w-full rounded border-gray-300 text-sm py-1.5 px-2"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.subject_icon || '📚'}  {s.subject_name}
                  </option>
                ))}
              </select>
            )}
          </label>

          {/* Template quick-picks */}
          {selectedSubject && (
            <div>
              <span className="text-xs font-semibold text-gray-600">Quick-pick from library</span>
              {matchingTemplates.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {matchingTemplates.slice(0, 6).map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="text-[11px] px-2 py-1 border border-gray-200 rounded hover:bg-teal-50 hover:border-teal-300 text-gray-700"
                      title={t.task_description || ''}
                    >
                      {t.task_label}
                      {t.duration_min ? <span className="text-gray-400 ml-1">· {t.duration_min}m</span> : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
                  No library templates for <strong>{selectedSubject.subject_name}</strong> yet — type a title below.
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Title</span>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Book Buddy: ch 4"
              className="mt-1 block w-full rounded border-gray-300 text-sm py-1.5 px-2"
              autoFocus
            />
          </label>

          {/* Duration */}
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Duration (min)</span>
            <input
              type="number"
              min={0}
              value={duration}
              onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 block w-32 rounded border-gray-300 text-sm py-1.5 px-2"
            />
            {selectedSubject?.default_duration_min && (
              <span className="text-[11px] text-gray-400 mt-0.5 block">
                default for {selectedSubject.subject_name}: {selectedSubject.default_duration_min}m
              </span>
            )}
          </label>

          {/* Description */}
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Description <span className="font-normal text-gray-400">(optional)</span></span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Instructions or context the kid will see"
              className="mt-1 block w-full rounded border-gray-300 text-sm py-1.5 px-2"
            />
          </label>

          {/* Resource URL */}
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Resource URL <span className="font-normal text-gray-400">(optional)</span></span>
            <input
              type="url"
              value={resourceUrl}
              onChange={e => setResourceUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 block w-full rounded border-gray-300 text-sm py-1.5 px-2"
            />
          </label>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-2">{err}</div>
          )}
        </div>

        <div className="p-3 border-t flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || subjects.length === 0}
            className="px-3 py-1.5 rounded text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Replicate Week Modal (T-CURR-2)
// ----------------------------------------------------------------------------
function ReplicateWeekModal({
  weekStart, taskCount, onClose, onDone,
}: {
  weekStart: string
  taskCount: number
  onClose: () => void
  onDone: () => void
}) {
  const [weeks, setWeeks] = useState<number>(4)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<{ copied: number; weeks_forward: number } | null>(null)

  const run = async () => {
    setErr(null)
    setResult(null)
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
      setErr('Enter 1–52 weeks')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/homeschool/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replicate_week',
          source_start: weekStart,
          weeks_forward: weeks,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Copy failed')
      setResult({ copied: json.copied, weeks_forward: json.weeks_forward })
    } catch (e: any) {
      setErr(e.message || 'Copy failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
            <Copy className="w-4 h-4 text-teal-600" /> Copy week forward
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-sm text-gray-700">
          <p>
            Copy this week&rsquo;s <strong>{taskCount}</strong> task{taskCount === 1 ? '' : 's'} (week of{' '}
            <strong>{fmtRange(weekStart)}</strong>) forward, preserving each kid&rsquo;s weekday pattern.
          </p>

          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Number of weeks</span>
            <input
              type="number"
              min={1}
              max={52}
              value={weeks}
              onChange={e => setWeeks(Number(e.target.value))}
              className="mt-1 block w-24 rounded border-gray-300 text-sm py-1.5 px-2"
            />
            <span className="text-[11px] text-gray-500 mt-1 block">
              e.g. 16 = whole summer through August
            </span>
          </label>

          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            Heads up: if those future weeks already have tasks, the pattern is added on top — not merged
            or replaced. You&rsquo;ll see duplicates.
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-2">{err}</div>
          )}
          {result && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded p-2">
              ✅ Wrote {result.copied} task{result.copied === 1 ? '' : 's'} across {result.weeks_forward} week{result.weeks_forward === 1 ? '' : 's'}.
            </div>
          )}
        </div>

        <div className="p-3 border-t flex gap-2 justify-end">
          {result ? (
            <button
              onClick={onDone}
              className="px-3 py-1.5 rounded text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={saving || taskCount === 0}
                className="px-3 py-1.5 rounded text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Copy {weeks} week{weeks === 1 ? '' : 's'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
