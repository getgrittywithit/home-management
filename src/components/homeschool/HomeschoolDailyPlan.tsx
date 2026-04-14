'use client'

import { useState, useEffect, useCallback } from 'react'
import { StudentData } from './types'
import {
  Plus, X, Edit3, Trash2, Copy, Save, ListPlus, Settings, GripVertical,
  Archive, Loader2, HelpCircle, MessageSquare,
} from 'lucide-react'

interface Subject {
  id: string
  kid_name: string
  subject_name: string
  subject_icon: string
  color: string
  sort_order: number
  default_duration_min: number
  curriculum: string | null
  notes: string | null
  is_active: boolean
}

interface DailyTask {
  id: string
  kid_name: string
  subject_id: string | null
  subject_name: string
  subject_icon: string
  task_date: string
  title: string
  description: string | null
  duration_min: number | null
  sort_order: number
  resource_url: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  time_spent_min: number | null
  needs_help: boolean
  help_subject: string | null
  kid_notes: string | null
  parent_feedback: string | null
}

interface Props {
  students: StudentData[]
}

const HOMESCHOOL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah']

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function HomeschoolDailyPlan(_props: Props) {
  const [activeKid, setActiveKid] = useState<string>(HOMESCHOOL_KIDS[0])
  const [date, setDate] = useState<string>(todayIso())
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showSubjectManager, setShowSubjectManager] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [replyDialogFor, setReplyDialogFor] = useState<DailyTask | null>(null)

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [subsRes, tasksRes] = await Promise.all([
        fetch(`/api/homeschool/daily?action=list_subjects&kid_name=${activeKid}`).then((r) => r.json()),
        fetch(`/api/homeschool/daily?action=list_tasks&kid_name=${activeKid}&date=${date}`).then((r) => r.json()),
      ])
      setSubjects(subsRes.subjects || [])
      setTasks(tasksRes.tasks || [])
    } catch (err) {
      console.error('load failed', err)
    } finally {
      setLoading(false)
    }
  }, [activeKid, date])

  useEffect(() => { load() }, [load])

  const applyTemplate = async () => {
    if (tasks.length > 0 && !confirm(`Replace today's ${tasks.length} tasks with a fresh template from ${titleCase(activeKid)}'s subjects?`)) return
    if (tasks.length > 0) {
      // Delete existing first
      for (const t of tasks) {
        await fetch('/api/homeschool/daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete_task', id: t.id }),
        })
      }
    }
    const res = await fetch('/api/homeschool/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'apply_subject_template', kid_name: activeKid, task_date: date }),
    })
    const json = await res.json()
    flashToast(`Created ${json.created || 0} tasks`)
    load()
  }

  const copyFromYesterday = async () => {
    const source = addDays(date, -1)
    const res = await fetch('/api/homeschool/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'copy_from_date',
        kid_name: activeKid,
        source_date: source,
        target_date: date,
      }),
    })
    const json = await res.json()
    flashToast(`Copied ${json.copied || 0} tasks from yesterday`)
    load()
  }

  const deleteTask = async (t: DailyTask) => {
    if (!confirm(`Remove "${t.title}"?`)) return
    await fetch('/api/homeschool/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_task', id: t.id }),
    })
    load()
  }

  const toggleStatus = async (t: DailyTask) => {
    await fetch('/api/homeschool/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_task', id: t.id }),
    })
    load()
  }

  const helpRequests = tasks.filter((t) => t.needs_help)

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Kid selector row */}
      <div className="flex flex-wrap gap-2">
        {HOMESCHOOL_KIDS.map((k) => (
          <button
            key={k}
            onClick={() => setActiveKid(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
              activeKid === k
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Header: date + actions */}
      <div className="rounded-xl border-2 border-teal-200 bg-teal-50/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDate(addDays(date, -1))}
              className="px-2 py-1 rounded text-gray-500 hover:bg-white hover:text-gray-800"
            >
              ←
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded text-sm bg-white"
            />
            <button
              onClick={() => setDate(addDays(date, 1))}
              className="px-2 py-1 rounded text-gray-500 hover:bg-white hover:text-gray-800"
            >
              →
            </button>
            <button
              onClick={() => setDate(todayIso())}
              className="text-xs text-teal-700 hover:text-teal-900 font-medium ml-1"
            >
              Today
            </button>
          </div>
          <div className="text-sm font-semibold text-gray-900 capitalize">
            {titleCase(activeKid)} — {formatDate(date)}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => setShowSubjectManager(true)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Settings className="w-3.5 h-3.5" /> Subjects
            </button>
            <button
              onClick={copyFromYesterday}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Copy className="w-3.5 h-3.5" /> Copy yesterday
            </button>
            <button
              onClick={applyTemplate}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <ListPlus className="w-3.5 h-3.5" /> Use subject template
            </button>
            <button
              onClick={() => { setEditingTask(null); setShowAddTask(true) }}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add task
            </button>
          </div>
        </div>
      </div>

      {/* Help requests banner */}
      {helpRequests.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" /> {titleCase(activeKid)} needs help ({helpRequests.length})
          </h3>
          {helpRequests.map((t) => (
            <div key={t.id} className="bg-white rounded-lg border border-amber-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{t.subject_icon}</span>
                <span className="font-semibold text-gray-900 text-sm">{t.subject_name} — {t.title}</span>
              </div>
              <p className="text-xs text-amber-700">
                <span className="font-semibold">Stuck on:</span> {t.help_subject || '(no detail)'}
              </p>
              {t.kid_notes && (
                <p className="text-xs text-gray-600 mt-0.5">"{t.kid_notes}"</p>
              )}
              <button
                onClick={() => setReplyDialogFor(t)}
                className="mt-2 inline-flex items-center gap-1 text-xs bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-600"
              >
                <MessageSquare className="w-3 h-3" /> Reply
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-500">No tasks yet for {titleCase(activeKid)} on this day.</p>
          <p className="text-xs text-gray-400 mt-1">Click "Use subject template" to create one task per subject, or add tasks manually.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const done = t.status === 'completed'
            const inProgress = t.status === 'in_progress'
            return (
              <div
                key={t.id}
                className={`rounded-lg border p-3 flex items-start gap-3 ${
                  done ? 'bg-gray-50 border-gray-200 opacity-80' :
                  inProgress ? 'bg-blue-50 border-blue-200' :
                  t.needs_help ? 'bg-amber-50 border-amber-200' :
                  'bg-white border-gray-200'
                }`}
              >
                <button
                  onClick={() => toggleStatus(t)}
                  className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    done ? 'bg-green-500 border-green-500' :
                    inProgress ? 'bg-blue-100 border-blue-400' :
                    'bg-white border-gray-300 hover:border-teal-400'
                  }`}
                  aria-label="Toggle status"
                >
                  {done && <span className="text-white text-xs">✓</span>}
                </button>
                <span className="text-xl flex-shrink-0">{t.subject_icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{t.subject_name}</span>
                    {t.duration_min != null && (
                      <span className="text-xs text-gray-500">{t.duration_min}m</span>
                    )}
                    {t.needs_help && <span className="text-xs text-amber-600 font-semibold">🆘 needs help</span>}
                    {done && t.time_spent_min != null && (
                      <span className="text-xs text-green-600">done · {t.time_spent_min}m</span>
                    )}
                  </div>
                  <div className={`text-sm mt-0.5 ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {t.title}
                  </div>
                  {t.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                  )}
                  {t.resource_url && (
                    <div className="text-xs text-blue-600 mt-0.5 truncate">🔗 {t.resource_url}</div>
                  )}
                </div>
                <button
                  onClick={() => { setEditingTask(t); setShowAddTask(true) }}
                  className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  aria-label="Edit"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteTask(t)}
                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Subject manager modal */}
      {showSubjectManager && (
        <SubjectManagerModal
          kidName={activeKid}
          subjects={subjects}
          onClose={() => setShowSubjectManager(false)}
          onChanged={load}
        />
      )}

      {/* Add/Edit task modal */}
      {showAddTask && (
        <TaskFormModal
          kidName={activeKid}
          date={date}
          subjects={subjects}
          task={editingTask}
          onClose={() => { setShowAddTask(false); setEditingTask(null) }}
          onSaved={() => { setShowAddTask(false); setEditingTask(null); load() }}
        />
      )}

      {/* Reply to help request */}
      {replyDialogFor && (
        <ReplyDialog
          task={replyDialogFor}
          onCancel={() => setReplyDialogFor(null)}
          onSent={() => { setReplyDialogFor(null); load() }}
        />
      )}
    </div>
  )
}

function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''
}

// ============================================================================
// Subject Manager Modal
// ============================================================================
function SubjectManagerModal({
  kidName, subjects, onClose, onChanged,
}: {
  kidName: string
  subjects: Subject[]
  onClose: () => void
  onChanged: () => void
}) {
  const [list, setList] = useState(subjects)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📚')
  const [newDuration, setNewDuration] = useState('30')
  const [newCurriculum, setNewCurriculum] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setList(subjects) }, [subjects])

  const addSubject = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await fetch('/api/homeschool/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_subject',
          kid_name: kidName,
          subject_name: newName.trim(),
          subject_icon: newIcon,
          default_duration_min: parseInt(newDuration) || 30,
          curriculum: newCurriculum || null,
          sort_order: list.length + 1,
        }),
      })
      setNewName('')
      setNewIcon('📚')
      setNewDuration('30')
      setNewCurriculum('')
      onChanged()
    } finally { setSaving(false) }
  }

  const archive = async (s: Subject) => {
    if (!confirm(`Archive "${s.subject_name}"? Existing tasks keep their subject name.`)) return
    await fetch('/api/homeschool/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive_subject', id: s.id }),
    })
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 capitalize">{titleCase(kidName)}'s Subjects</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            {list.map((s) => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <GripVertical className="w-4 h-4 text-gray-300" />
                <span className="text-lg">{s.subject_icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{s.subject_name}</div>
                  {s.curriculum && <div className="text-xs text-gray-500 truncate">{s.curriculum}</div>}
                </div>
                <span className="text-xs text-gray-400">{s.default_duration_min}m</span>
                <button
                  onClick={() => archive(s)}
                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                  title="Archive"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Add a subject</h4>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  maxLength={2}
                  className="w-12 text-center px-2 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="📚"
                />
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Subject name"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="30"
                />
              </div>
              <input
                value={newCurriculum}
                onChange={(e) => setNewCurriculum(e.target.value)}
                placeholder="Curriculum / resource (optional)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={addSubject}
                disabled={!newName.trim() || saving}
                className="w-full bg-teal-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
              >
                Add subject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Task Form Modal
// ============================================================================
function TaskFormModal({
  kidName, date, subjects, task, onClose, onSaved,
}: {
  kidName: string
  date: string
  subjects: Subject[]
  task: DailyTask | null
  onClose: () => void
  onSaved: () => void
}) {
  const [subjectId, setSubjectId] = useState<string>(task?.subject_id || subjects[0]?.id || '')
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [duration, setDuration] = useState(task?.duration_min != null ? String(task.duration_min) : '')
  const [resourceUrl, setResourceUrl] = useState(task?.resource_url || '')
  const [saving, setSaving] = useState(false)

  // Auto-set duration default when subject changes (on create only)
  useEffect(() => {
    if (!task && subjectId) {
      const s = subjects.find((x) => x.id === subjectId)
      if (s) setDuration(String(s.default_duration_min))
    }
  }, [subjectId, task, subjects])

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    const payload = {
      subject_id: subjectId || null,
      title: title.trim(),
      description: description.trim() || null,
      duration_min: duration ? parseInt(duration) : null,
      resource_url: resourceUrl.trim() || null,
    }
    try {
      if (task) {
        await fetch('/api/homeschool/daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_task', id: task.id, ...payload }),
        })
      } else {
        await fetch('/api/homeschool/daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_task',
            kid_name: kidName,
            task_date: date,
            ...payload,
          }),
        })
      }
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{task ? 'Edit Task' : 'Add Task'}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              {subjects.length === 0 && <option value="">(no subjects — add one first)</option>}
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.subject_icon} {s.subject_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Task *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Read Olive's Ocean Ch. 8-9"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-teal-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Details (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Take notes, write a journal entry…"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-700">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Resource URL</label>
              <input
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            onClick={save}
            disabled={!title.trim() || saving}
            className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Reply to help request
// ============================================================================
function ReplyDialog({
  task, onCancel, onSent,
}: {
  task: DailyTask
  onCancel: () => void
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
        body: JSON.stringify({
          action: 'parent_reply',
          id: task.id,
          parent_feedback: reply.trim(),
        }),
      })
      onSent()
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-600" /> Reply to {titleCase(task.kid_name)}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{task.subject_icon} {task.subject_name} — {task.title}</p>
        </div>
        <div className="p-5">
          {task.help_subject && (
            <div className="text-xs text-gray-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
              <span className="font-semibold">Stuck on:</span> {task.help_subject}
            </div>
          )}
          <label className="text-xs font-semibold text-gray-700">Your response</label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={4}
            placeholder="Draw what you see on the cam right now — beak, feathers, nest…"
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
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
