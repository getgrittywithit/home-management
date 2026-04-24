'use client'

import { useState } from 'react'
import {
  CheckCircle2, ChevronDown, ChevronUp, Bell, Loader2,
  Sparkles, Home, BookOpen, Dog, Thermometer, PlusCircle, CheckCheck,
} from 'lucide-react'
import { useDashboardData } from '@/context/DashboardDataContext'
import { parseDateLocal } from '@/lib/date-local'

const KID_DISPLAY: Record<string, string> = { amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee' }
const ALL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
const HOMESCHOOL_KIDS = new Set(['amos', 'ellie', 'wyatt', 'hannah'])

interface Bucket { done: number; total: number; hidden?: boolean }
interface TaskRow {
  id: string
  event_id: string
  summary: string
  title: string
  completed: boolean
  category: string
  subject?: string
}
interface KidCompletion {
  name: string
  zone: Bucket
  dailyCare: Bucket
  school: Bucket
  petCare: Bucket
  tasks: TaskRow[]
}

function emptyKid(name: string): KidCompletion {
  return {
    name,
    zone: { done: 0, total: 0 },
    dailyCare: { done: 0, total: 0 },
    school: { done: 0, total: 0, hidden: !HOMESCHOOL_KIDS.has(name) },
    petCare: { done: 0, total: 0 },
    tasks: [],
  }
}

function fracColor(done: number, total: number): string {
  if (total === 0) return 'text-gray-400'
  const pct = (done / total) * 100
  if (pct >= 100) return 'text-green-600'
  if (pct >= 50) return 'text-amber-600'
  if (pct > 0) return 'text-orange-500'
  return 'text-red-500'
}

function fracBg(done: number, total: number): string {
  if (total === 0) return 'bg-gray-200'
  const pct = (done / total) * 100
  if (pct >= 100) return 'bg-green-500'
  if (pct >= 50) return 'bg-amber-500'
  if (pct > 0) return 'bg-orange-400'
  return 'bg-red-400'
}

// Per-category brand colors for the overall progress bar
const CATEGORY_COLORS = {
  zone:      { bar: 'bg-blue-500',    label: 'bg-blue-50 text-blue-700',      border: 'border-blue-200' },
  dailyCare: { bar: 'bg-purple-500',  label: 'bg-purple-50 text-purple-700',  border: 'border-purple-200' },
  school:    { bar: 'bg-emerald-500', label: 'bg-emerald-50 text-emerald-700',border: 'border-emerald-200' },
  petCare:   { bar: 'bg-orange-500',  label: 'bg-orange-50 text-orange-700',  border: 'border-orange-200' },
} as const

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType }> = {
  zone:   { label: 'Zone / Chores', icon: Home },
  care:   { label: 'Daily Care',    icon: Sparkles },
  school: { label: 'School',        icon: BookOpen },
  pet:    { label: 'Pet Care',      icon: Dog },
  other:  { label: 'Other',         icon: Sparkles },
}

export default function KidsChecklistOverview() {
  const { kidsChecklist, loaded, refresh } = useDashboardData()
  const [expandedKid, setExpandedKid] = useState<string | null>(null)
  const [nudgeSent, setNudgeSent] = useState<Record<string, boolean>>({})
  const [toastMsg, setToastMsg] = useState('')
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')

  // Derive list of kids from whichever shape the dashboard context provides
  const checklistKids: any[] = kidsChecklist?.kids || []
  const kids: KidCompletion[] = ALL_KIDS.map(name => {
    const row = checklistKids.find((k: any) => k.name === name)
    if (!row) return emptyKid(name)
    return {
      name,
      zone: row.zone || row.required || { done: 0, total: 0 },
      dailyCare: row.dailyCare || { done: 0, total: 0 },
      school: row.school || { done: 0, total: 0, hidden: !HOMESCHOOL_KIDS.has(name) },
      petCare: row.petCare || { done: 0, total: 0 },
      tasks: row.tasks || [],
    }
  })

  const weekOf = kidsChecklist?.weekOf || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const weekEnd = weekOf ? new Date(parseDateLocal(weekOf).getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const weekStart = weekOf ? parseDateLocal(weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' })

  const flashToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  const toggleExpand = (kidName: string) => {
    setExpandedKid(prev => prev === kidName ? null : kidName)
    setShowAddTask(false)
    setNewTaskText('')
  }

  const sendNudge = async (kidName: string) => {
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Mom says: time to get moving!',
        message: "Check your daily tasks — let's knock them out!",
        source_type: 'parent_nudge',
        source_ref: `nudge-${kidName}-${Date.now()}`,
        icon: '\uD83D\uDC4B',
        target_role: 'kid',
        kid_name: kidName,
      }),
    }).catch(() => {})
    setNudgeSent(prev => ({ ...prev, [kidName]: true }))
    flashToast(`Nudge sent to ${KID_DISPLAY[kidName]}`)
    setTimeout(() => setNudgeSent(prev => ({ ...prev, [kidName]: false })), 5000)
  }

  const toggleTask = async (kidName: string, task: TaskRow) => {
    setActionBusy(`${kidName}-${task.id}`)
    try {
      if (task.category === 'school' && task.id) {
        // Homeschool task — toggle via the homeschool API (which toggles completion state)
        await fetch('/api/homeschool', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle_task',
            task_id: task.id,
            kid_name: kidName.charAt(0).toUpperCase() + kidName.slice(1),
          }),
        })
      } else {
        // Routine checklist task
        await fetch('/api/kids/checklist', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle', child: kidName, eventId: task.event_id, eventSummary: task.summary }),
        })
      }
      refresh?.()
    } finally {
      setActionBusy(null)
    }
  }

  const markAllDone = async (kidName: string, remaining: TaskRow[]) => {
    if (remaining.length === 0) return
    const ok = window.confirm(`Mark all ${remaining.length} remaining task${remaining.length > 1 ? 's' : ''} as complete for ${KID_DISPLAY[kidName]}?`)
    if (!ok) return
    setActionBusy(`markall-${kidName}`)
    try {
      for (const t of remaining) {
        await toggleTask(kidName, t)
      }
      flashToast(`All tasks marked done for ${KID_DISPLAY[kidName]}`)
    } finally {
      setActionBusy(null)
    }
  }

  const triggerSickDay = async (kidName: string) => {
    const ok = window.confirm(`Mark ${KID_DISPLAY[kidName]} as sick today? This reduces the checklist and logs attendance.`)
    if (!ok) return
    setActionBusy(`sick-${kidName}`)
    try {
      await fetch('/api/kids/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flag_sick_day', kid: kidName }),
      }).catch(() => {})
      flashToast(`${KID_DISPLAY[kidName]} marked sick for today`)
      refresh?.()
    } finally {
      setActionBusy(null)
    }
  }

  const addCustomTask = async (kidName: string) => {
    if (!newTaskText.trim()) return
    setActionBusy(`add-${kidName}`)
    try {
      // Reuse the existing `toggle` action — INSERT...ON CONFLICT creates the row
      // as incomplete when it doesn't yet exist. First call creates + sets completed,
      // so we toggle twice: once to create (completed=true), then again to reset.
      const customId = `custom-${Date.now()}`
      // Create the row (first toggle → completed=true)
      await fetch('/api/kids/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', child: kidName, eventId: customId, eventSummary: newTaskText.trim() }),
      })
      // Reset to incomplete so the kid can check it off themselves
      await fetch('/api/kids/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', child: kidName, eventId: customId, eventSummary: newTaskText.trim() }),
      })
      flashToast(`Task added for ${KID_DISPLAY[kidName]}`)
      setNewTaskText('')
      setShowAddTask(false)
      refresh?.()
    } finally {
      setActionBusy(null)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 relative">
      {toastMsg && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
          ✅ {toastMsg}
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 md:p-6 rounded-lg">
        <h1 className="text-xl md:text-2xl font-bold">Kids Daily Tasks</h1>
        <p className="text-emerald-100 text-sm">Week of {weekStart} – {weekEnd}</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="p-3 font-semibold">Kid</th>
              <th className="p-3 font-semibold text-center">🏠 Zone</th>
              <th className="p-3 font-semibold text-center">🧹 Daily Care</th>
              <th className="p-3 font-semibold text-center">📚 School</th>
              <th className="p-3 font-semibold text-center">🐾 Pet Care</th>
              <th className="p-3 font-semibold text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {kids.map(kid => {
              const isExpanded = expandedKid === kid.name
              const totalDone = kid.zone.done + kid.dailyCare.done + (kid.school.hidden ? 0 : kid.school.done) + kid.petCare.done
              const totalTasks = kid.zone.total + kid.dailyCare.total + (kid.school.hidden ? 0 : kid.school.total) + kid.petCare.total
              const overallPct = totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0
              // Segment widths for the combined progress bar (proportional to bucket totals)
              const segments = totalTasks > 0 ? [
                { key: 'zone',      color: CATEGORY_COLORS.zone.bar,      width: (kid.zone.total / totalTasks) * 100,                 doneFrac: kid.zone.total > 0      ? kid.zone.done / kid.zone.total      : 0 },
                { key: 'dailyCare', color: CATEGORY_COLORS.dailyCare.bar, width: (kid.dailyCare.total / totalTasks) * 100,            doneFrac: kid.dailyCare.total > 0 ? kid.dailyCare.done / kid.dailyCare.total : 0 },
                { key: 'school',    color: CATEGORY_COLORS.school.bar,    width: (kid.school.hidden ? 0 : (kid.school.total / totalTasks) * 100), doneFrac: (!kid.school.hidden && kid.school.total > 0) ? kid.school.done / kid.school.total : 0 },
                { key: 'petCare',   color: CATEGORY_COLORS.petCare.bar,   width: (kid.petCare.total / totalTasks) * 100,              doneFrac: kid.petCare.total > 0   ? kid.petCare.done / kid.petCare.total   : 0 },
              ] : []

              return (
                <KidRow
                  key={kid.name}
                  kid={kid}
                  isExpanded={isExpanded}
                  overallPct={overallPct}
                  totalDone={totalDone}
                  totalTasks={totalTasks}
                  segments={segments}
                  nudged={nudgeSent[kid.name] || false}
                  onToggleExpand={() => toggleExpand(kid.name)}
                  onNudge={() => sendNudge(kid.name)}
                  onToggleTask={(t) => toggleTask(kid.name, t)}
                  onMarkAllDone={() => markAllDone(kid.name, kid.tasks.filter(t => !t.completed))}
                  onSickDay={() => triggerSickDay(kid.name)}
                  onAddTask={() => { setShowAddTask(true); setNewTaskText('') }}
                  showAddTask={showAddTask && isExpanded}
                  newTaskText={newTaskText}
                  setNewTaskText={setNewTaskText}
                  onSubmitNewTask={() => addCustomTask(kid.name)}
                  onCancelAddTask={() => { setShowAddTask(false); setNewTaskText('') }}
                  actionBusy={actionBusy}
                  todayLabel={todayLabel}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Single kid row — renders normal cells + (if expanded) a second tr with detail
// ============================================================================

interface KidRowProps {
  kid: KidCompletion
  isExpanded: boolean
  overallPct: number
  totalDone: number
  totalTasks: number
  segments: { key: string; color: string; width: number; doneFrac: number }[]
  nudged: boolean
  onToggleExpand: () => void
  onNudge: () => void
  onToggleTask: (t: TaskRow) => void
  onMarkAllDone: () => void
  onSickDay: () => void
  onAddTask: () => void
  showAddTask: boolean
  newTaskText: string
  setNewTaskText: (v: string) => void
  onSubmitNewTask: () => void
  onCancelAddTask: () => void
  actionBusy: string | null
  todayLabel: string
}

function KidRow({
  kid, isExpanded, overallPct, totalDone, totalTasks, segments, nudged,
  onToggleExpand, onNudge, onToggleTask, onMarkAllDone, onSickDay, onAddTask,
  showAddTask, newTaskText, setNewTaskText, onSubmitNewTask, onCancelAddTask,
  actionBusy, todayLabel,
}: KidRowProps) {
  // Group tasks by category for the detail panel
  const grouped: Record<string, TaskRow[]> = { zone: [], care: [], school: [], pet: [], other: [] }
  for (const t of kid.tasks) {
    const key = grouped[t.category] ? t.category : 'other'
    grouped[key].push(t)
  }

  const remaining = kid.tasks.filter(t => !t.completed)

  return (
    <>
      <tr className={`relative ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
        <td className="p-3 relative">
          {/* Segmented overall progress bar — subtle, behind the row */}
          <div className="absolute left-0 bottom-0 right-0 h-1 flex overflow-hidden">
            {segments.map((s, i) => (
              s.width > 0 && (
                <div key={i} className="h-full relative" style={{ width: `${s.width}%` }}>
                  <div className={`h-full ${s.color} opacity-30`} />
                  <div className={`absolute inset-0 ${s.color}`} style={{ width: `${s.doneFrac * 100}%` }} />
                </div>
              )
            ))}
          </div>
          <button onClick={onToggleExpand}
            className="flex items-center gap-1.5 font-medium text-gray-900 hover:text-indigo-600 relative">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
            {KID_DISPLAY[kid.name] || kid.name}
            {totalTasks > 0 && (
              <span className="text-[10px] text-gray-400 ml-1">{Math.round(overallPct)}%</span>
            )}
          </button>
        </td>
        <BucketCell bucket={kid.zone} />
        <BucketCell bucket={kid.dailyCare} />
        <BucketCell bucket={kid.school} />
        <BucketCell bucket={kid.petCare} />
        <td className="p-3 text-center">
          <button onClick={onNudge} disabled={nudged}
            className={`text-xs px-2 py-1 rounded ${nudged ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
            title="Send nudge notification">
            <Bell className="w-3 h-3 inline mr-0.5" /> {nudged ? 'Sent' : 'Nudge'}
          </button>
        </td>
      </tr>

      {/* Expanded detail row — renders INSIDE tbody directly under this kid */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0 bg-gray-50 border-t border-indigo-100">
            <div className="px-5 py-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{KID_DISPLAY[kid.name]}&apos;s Tasks Today</h4>
                  <p className="text-xs text-gray-500">{todayLabel} · {totalDone}/{totalTasks} complete</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={onMarkAllDone} disabled={remaining.length === 0 || !!actionBusy}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> Mark All Done
                  </button>
                  <button onClick={onNudge} disabled={nudged}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 ${nudged ? 'bg-gray-200 text-gray-400' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
                    <Bell className="w-3 h-3" /> {nudged ? 'Nudged' : 'Nudge'}
                  </button>
                  <button onClick={onSickDay} disabled={!!actionBusy}
                    className="text-xs bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1">
                    <Thermometer className="w-3 h-3" /> Sick Day
                  </button>
                  <button onClick={onAddTask}
                    className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                    <PlusCircle className="w-3 h-3" /> Add Task
                  </button>
                </div>
              </div>

              {/* Add task inline form */}
              {showAddTask && (
                <div className="flex gap-2 bg-white border rounded-lg p-2">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onSubmitNewTask()}
                    placeholder="Task description — e.g. Finish book chapter"
                    className="flex-1 text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    autoFocus
                  />
                  <button onClick={onSubmitNewTask} disabled={!newTaskText.trim()}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">
                    Add
                  </button>
                  <button onClick={onCancelAddTask}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2">
                    Cancel
                  </button>
                </div>
              )}

              {/* Task groups */}
              {totalTasks === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500 bg-white rounded-lg border">
                  No tasks configured for {KID_DISPLAY[kid.name]} today.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['zone', 'care', 'school', 'pet'] as const).map(cat => {
                    const meta = CATEGORY_META[cat]
                    const Icon = meta.icon
                    const list = grouped[cat]
                    // Hide the school column for non-homeschool kids with no data
                    if (cat === 'school' && kid.school.hidden && list.length === 0) return null
                    return (
                      <div key={cat} className="bg-white border rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <Icon className="w-3.5 h-3.5" />
                          {meta.label}
                          <span className="ml-auto font-normal normal-case text-gray-400">
                            {list.filter(t => t.completed).length}/{list.length}
                          </span>
                        </div>
                        {list.length === 0 ? (
                          <p className="text-xs italic text-gray-400">No tasks assigned</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {list.map(task => {
                              const busy = actionBusy === `${kid.name}-${task.id}`
                              return (
                                <li key={task.id}>
                                  <button
                                    onClick={() => onToggleTask(task)}
                                    disabled={busy}
                                    className="w-full flex items-center gap-2 text-left text-sm hover:bg-gray-50 rounded px-1 py-0.5 disabled:opacity-50"
                                  >
                                    <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                                      task.completed
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : 'border-gray-300 hover:border-indigo-400'
                                    }`}>
                                      {task.completed && <CheckCircle2 className="w-3 h-3" />}
                                    </span>
                                    <span className={task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}>
                                      {task.summary}
                                    </span>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function BucketCell({ bucket }: { bucket: Bucket }) {
  if (bucket.hidden) {
    return (
      <td className="p-3 text-center">
        <span className="text-gray-300">—</span>
      </td>
    )
  }
  const { done, total } = bucket
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <td className="p-3 text-center">
      <div className={`font-medium ${fracColor(done, total)}`}>{done}/{total}</div>
      {total > 0 && (
        <div className="w-16 h-1.5 mx-auto mt-1 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${fracBg(done, total)}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </td>
  )
}
