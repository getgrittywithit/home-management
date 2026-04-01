'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDashboardData } from '@/context/DashboardDataContext'
import {
  Flame, Plus, Check, X, ChevronDown, ChevronRight, AlertTriangle,
  SkipForward, Undo2, Trash2, Edit3, Clock, Target, Calendar, Award
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface Habit {
  id: string
  member_name: string
  title: string
  emoji: string
  category: string
  frequency: string
  reminder_time: string | null
  coin_reward: number
  description: string | null
  is_active: boolean
  completion_status: string | null
  completed_at: string | null
  completion_note: string | null
  current_streak: number | null
  longest_streak: number | null
}

interface HabitCompletion {
  completion_date: string
  status: string
  completed_at: string | null
  note: string | null
}

interface HabitDetail {
  id: string
  title: string
  emoji: string
  category: string
  frequency: string
  reminder_time: string | null
  coin_reward: number
  description: string | null
  current_streak: number
  longest_streak: number
  last_completed_date: string | null
  total_completions: number
}

// ── Constants ──────────────────────────────────────────────────────────────
const MEMBERS = ['Lola', 'Levi', 'Amos', 'Ellie', 'Wyatt', 'Hannah', 'Zoey', 'Kaylee']
const MEMBER_COLORS: Record<string, string> = {
  Lola: 'bg-rose-500', Levi: 'bg-blue-600', Amos: 'bg-blue-500', Ellie: 'bg-purple-500',
  Wyatt: 'bg-green-500', Hannah: 'bg-pink-500', Zoey: 'bg-amber-500', Kaylee: 'bg-teal-500',
  lola: 'bg-rose-500', levi: 'bg-blue-600', amos: 'bg-blue-500', ellie: 'bg-purple-500',
  wyatt: 'bg-green-500', hannah: 'bg-pink-500', zoey: 'bg-amber-500', kaylee: 'bg-teal-500',
}

const CATEGORIES = ['morning', 'health', 'school', 'evening', 'personal']
const CATEGORY_LABELS: Record<string, string> = {
  morning: 'Morning Routine', health: 'Health & Meds', school: 'School',
  evening: 'Evening Routine', personal: 'Personal'
}
const CATEGORY_COLORS: Record<string, string> = {
  morning: 'text-amber-600 bg-amber-50', health: 'text-rose-600 bg-rose-50',
  school: 'text-blue-600 bg-blue-50', evening: 'text-indigo-600 bg-indigo-50',
  personal: 'text-emerald-600 bg-emerald-50'
}

const EMOJI_OPTIONS = ['⭐', '💊', '📖', '🏃', '🧹', '🎵', '✏️', '🧘', '💤', '🥤', '🪥', '🐕', '📝', '🙏', '🍎']

function getToday() {
  return new Date().toISOString().split('T')[0]
}

// ── Main Component ─────────────────────────────────────────────────────────

function normalizeHabitKeys(raw: Record<string, any[]>): Record<string, any[]> {
  const normalized: Record<string, any[]> = { ...raw }
  for (const [key, val] of Object.entries(raw)) {
    const cap = key.charAt(0).toUpperCase() + key.slice(1)
    if (!normalized[cap]) normalized[cap] = val as any[]
  }
  return normalized
}

export default function HabitsTab() {
  const [habitsByMember, setHabitsByMember] = useState<Record<string, Habit[]>>({})
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [detailHabit, setDetailHabit] = useState<HabitDetail | null>(null)
  const [detailHistory, setDetailHistory] = useState<HabitCompletion[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const ctx = useDashboardData()

  // Initialize from context if available
  useEffect(() => {
    if (ctx.loaded && ctx.habitsData?.habits_by_member && Object.keys(ctx.habitsData.habits_by_member).length > 0) {
      setHabitsByMember(normalizeHabitKeys(ctx.habitsData.habits_by_member))
      setLoading(false)
    }
  }, [ctx.loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching (used for refresh after mutations + initial if no context) ──
  const fetchAllHabits = useCallback(async () => {
    try {
      const res = await fetch(`/api/habits?action=get_all_habits_today&date=${getToday()}`)
      const data = await res.json()
      setHabitsByMember(normalizeHabitKeys(data.habits_by_member || {}))
    } catch (err) {
      console.error('Failed to load habits:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Direct fetch if context didn't provide data
  useEffect(() => {
    if (ctx.loaded && Object.keys(habitsByMember).length === 0) fetchAllHabits()
  }, [ctx.loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──
  const markComplete = async (habit: Habit) => {
    setActionLoading(habit.id)
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_habit_complete',
          habit_id: habit.id,
          member_name: habit.member_name,
          completion_date: getToday(),
        }),
      })
      await fetchAllHabits()
    } catch (err) {
      console.error('mark_complete error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const markSkipped = async (habit: Habit) => {
    setActionLoading(habit.id)
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_habit_skipped',
          habit_id: habit.id,
          member_name: habit.member_name,
          completion_date: getToday(),
        }),
      })
      await fetchAllHabits()
    } catch (err) {
      console.error('mark_skipped error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const undoCompletion = async (habit: Habit) => {
    setActionLoading(habit.id)
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'undo_habit_completion',
          habit_id: habit.id,
          completion_date: getToday(),
        }),
      })
      await fetchAllHabits()
    } catch (err) {
      console.error('undo error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteHabit = async (habitId: string) => {
    if (!confirm('Delete this habit?')) return
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_habit', habit_id: habitId }),
      })
      setDetailHabit(null)
      await fetchAllHabits()
    } catch (err) {
      console.error('delete error:', err)
    }
  }

  // ── Detail panel ──
  const openDetail = async (habit: Habit) => {
    try {
      const [detailRes, historyRes] = await Promise.all([
        fetch(`/api/habits?action=get_habit_detail&habit_id=${habit.id}`).then(r => r.json()),
        fetch(`/api/habits?action=get_habit_history&habit_id=${habit.id}`).then(r => r.json()),
      ])
      setDetailHabit(detailRes.habit || null)
      setDetailHistory(historyRes.completions || [])
    } catch (err) {
      console.error('openDetail error:', err)
    }
  }

  // ── Helpers ──
  const getMemberStats = (habits: Habit[]) => {
    const total = habits.length
    const done = habits.filter(h => h.completion_status === 'completed').length
    const longestStreak = Math.max(0, ...habits.map(h => h.current_streak || 0))
    const medUndone = habits.filter(
      h => h.category === 'health' && h.emoji === '\uD83D\uDC8A' && h.completion_status !== 'completed'
    )
    return { total, done, longestStreak, medUndone }
  }

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  // Match case-insensitively — DB may store 'amos' while MEMBERS has 'Amos'
  const membersWithHabits = MEMBERS.filter(m =>
    habitsByMember[m]?.length || habitsByMember[m.toLowerCase()]?.length
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Flame className="w-7 h-7" /> Habit Tracker
            </h1>
            <p className="text-orange-100 mt-1">Build daily streaks and earn rewards</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" /> Add Habit
          </button>
        </div>
      </div>

      {/* Family overview rows */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800">Family Overview</h2>
        </div>
        <div className="divide-y">
          {membersWithHabits.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No habits yet. Tap "Add Habit" to get started.
            </div>
          )}
          {membersWithHabits.map(member => {
            const habits = habitsByMember[member] || habitsByMember[member.toLowerCase()] || []
            const { total, done, longestStreak, medUndone } = getMemberStats(habits)
            const isExpanded = expandedMember === member

            return (
              <div key={member}>
                {/* Summary row */}
                <button
                  onClick={() => setExpandedMember(isExpanded ? null : member)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${MEMBER_COLORS[member] || 'bg-gray-400'}`}>
                    {member[0]}
                  </div>
                  <span className="font-medium text-gray-800 flex-1 text-left">{member}</span>

                  {/* Med alerts */}
                  {medUndone.length > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> {medUndone.length} med{medUndone.length > 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Progress */}
                  <span className={`text-sm font-semibold ${done === total ? 'text-green-600' : 'text-gray-600'}`}>
                    {done}/{total}
                  </span>

                  {/* Streak */}
                  {longestStreak > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-orange-600">
                      <Flame className="w-3.5 h-3.5" /> {longestStreak}
                    </span>
                  )}

                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>

                {/* Expanded habit list */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t px-4 py-3 space-y-4">
                    {/* Medication nudge */}
                    {medUndone.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Medication not yet logged</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            {medUndone.map(h => h.title).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Category sections */}
                    {CATEGORIES.map(cat => {
                      const catHabits = habits.filter(h => h.category === cat)
                      if (!catHabits.length) return null
                      return (
                        <div key={cat}>
                          <div className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${CATEGORY_COLORS[cat] || 'text-gray-600 bg-gray-100'}`}>
                            {CATEGORY_LABELS[cat] || cat}
                          </div>
                          <div className="space-y-1.5">
                            {catHabits.map(habit => (
                              <HabitRow
                                key={habit.id}
                                habit={habit}
                                loading={actionLoading === habit.id}
                                onComplete={() => markComplete(habit)}
                                onSkip={() => markSkipped(habit)}
                                onUndo={() => undoCompletion(habit)}
                                onTitleClick={() => openDetail(habit)}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      {detailHabit && (
        <HabitDetailPanel
          habit={detailHabit}
          history={detailHistory}
          onClose={() => setDetailHabit(null)}
          onEdit={() => {
            setEditHabit(detailHabit as any)
            setShowEditModal(true)
          }}
          onDelete={() => deleteHabit(detailHabit.id)}
        />
      )}

      {/* Add modal */}
      {showAddModal && (
        <HabitFormModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchAllHabits() }}
        />
      )}

      {/* Edit modal */}
      {showEditModal && editHabit && (
        <HabitFormModal
          habit={editHabit}
          onClose={() => { setShowEditModal(false); setEditHabit(null) }}
          onSaved={() => { setShowEditModal(false); setEditHabit(null); setDetailHabit(null); fetchAllHabits() }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function HabitRow({
  habit, loading, onComplete, onSkip, onUndo, onTitleClick
}: {
  habit: Habit
  loading: boolean
  onComplete: () => void
  onSkip: () => void
  onUndo: () => void
  onTitleClick: () => void
}) {
  const isDone = habit.completion_status === 'completed'
  const isSkipped = habit.completion_status === 'skipped'
  const isMed = habit.category === 'health' && habit.emoji === '\uD83D\uDC8A'

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
      isDone ? 'bg-green-50' : isSkipped ? 'bg-gray-100' : isMed ? 'bg-rose-50 border border-rose-200' : 'bg-white border border-gray-200'
    }`}>
      <span className="text-lg shrink-0">{habit.emoji}</span>
      <button onClick={onTitleClick} className="flex-1 text-left text-sm font-medium text-gray-800 hover:text-orange-600 truncate">
        {habit.title}
      </button>

      {/* Streak */}
      {(habit.current_streak || 0) > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-orange-500 font-semibold shrink-0">
          <Flame className="w-3.5 h-3.5" /> {habit.current_streak}
        </span>
      )}

      {/* Coin reward hint */}
      {habit.coin_reward > 0 && !isDone && (
        <span className="text-xs text-amber-500 shrink-0">+{habit.coin_reward}</span>
      )}

      {/* Action buttons */}
      {loading ? (
        <div className="w-8 h-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />
        </div>
      ) : isDone ? (
        <button onClick={onUndo} className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200 shrink-0">
          <Check className="w-3.5 h-3.5" /> Done
        </button>
      ) : isSkipped ? (
        <button onClick={onUndo} className="flex items-center gap-1 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-300 shrink-0">
          <SkipForward className="w-3.5 h-3.5" /> Skipped
        </button>
      ) : (
        <div className="flex gap-1 shrink-0">
          <button onClick={onComplete} className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-full hover:bg-orange-600 font-medium">
            Mark Done
          </button>
          <button onClick={onSkip} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-300" title="Skip">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Year Heatmap ───────────────────────────────────────────────────────────
function YearHeatmap({ history }: { history: HabitCompletion[] }) {
  const completedDates = new Set(
    history.filter(h => h.status === 'completed').map(h => h.completion_date?.split('T')[0])
  )
  const skippedDates = new Set(
    history.filter(h => h.status === 'skipped').map(h => h.completion_date?.split('T')[0])
  )

  // Build 365 days ending today
  const today = new Date()
  const days: { date: string; status: 'completed' | 'skipped' | 'none' }[] = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    days.push({
      date: ds,
      status: completedDates.has(ds) ? 'completed' : skippedDates.has(ds) ? 'skipped' : 'none',
    })
  }

  // Arrange into 7 rows x 52 cols (approx)
  const weeks: typeof days[] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => (
              <div
                key={day.date}
                className={`w-3 h-3 rounded-sm ${
                  day.status === 'completed' ? 'bg-green-500' :
                  day.status === 'skipped' ? 'bg-gray-300' :
                  'bg-gray-100'
                }`}
                title={`${day.date}: ${day.status}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-sm inline-block" /> Done</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-300 rounded-sm inline-block" /> Skipped</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 rounded-sm inline-block" /> Missed</span>
      </div>
    </div>
  )
}

// ── Detail Panel ───────────────────────────────────────────────────────────
function HabitDetailPanel({
  habit, history, onClose, onEdit, onDelete
}: {
  habit: HabitDetail
  history: HabitCompletion[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const completionRate = habit.total_completions > 0
    ? Math.round((habit.total_completions / Math.max(1, history.length)) * 100)
    : 0

  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-xl">{habit.emoji}</span> {habit.title}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
            <Edit3 className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-red-50 rounded-lg" title="Delete">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-orange-600">{habit.current_streak}</div>
            <div className="text-xs text-orange-400">Current</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <Award className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-amber-600">{habit.longest_streak}</div>
            <div className="text-xs text-amber-400">Best</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <Target className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-green-600">{completionRate}%</div>
            <div className="text-xs text-green-400">Rate</div>
          </div>
        </div>

        {/* Heatmap */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Calendar className="w-4 h-4" /> Year Heatmap
          </h4>
          <YearHeatmap history={history} />
        </div>

        {/* Recent history */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Clock className="w-4 h-4" /> Recent History
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {history.slice(-20).reverse().map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-gray-50">
                <span className={`w-2 h-2 rounded-full ${h.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-gray-600 flex-1">{h.completion_date?.split('T')[0]}</span>
                <span className={`text-xs font-medium ${h.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                  {h.status}
                </span>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-sm text-gray-400 py-2">No history yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add / Edit Form Modal ──────────────────────────────────────────────────
function HabitFormModal({
  habit, onClose, onSaved
}: {
  habit?: any
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!habit
  const [form, setForm] = useState({
    member_name: habit?.member_name || '',
    title: habit?.title || '',
    emoji: habit?.emoji || '⭐',
    category: habit?.category || 'personal',
    frequency: habit?.frequency || 'daily',
    reminder_time: habit?.reminder_time || '',
    coin_reward: habit?.coin_reward || 0,
    description: habit?.description || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.member_name || !form.title) return
    setSaving(true)
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEdit ? 'update_habit' : 'create_habit',
          habit_id: habit?.id,
          ...form,
          coin_reward: Number(form.coin_reward) || 0,
          reminder_time: form.reminder_time || null,
          description: form.description || null,
        }),
      })
      onSaved()
    } catch (err) {
      console.error('save habit error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">{isEdit ? 'Edit Habit' : 'New Habit'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Member */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Family Member</label>
            <select
              value={form.member_name}
              onChange={e => setForm({ ...form, member_name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
              disabled={isEdit}
            >
              <option value="">Select member...</option>
              {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Habit Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Take Clonidine"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setForm({ ...form, emoji: e })}
                  className={`w-9 h-9 rounded-lg border-2 text-lg flex items-center justify-center transition-colors ${
                    form.emoji === e ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={form.frequency}
              onChange={e => setForm({ ...form, frequency: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          {/* Reminder time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Time (optional)</label>
            <input
              type="time"
              value={form.reminder_time}
              onChange={e => setForm({ ...form, reminder_time: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
            />
          </div>

          {/* Coin reward */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coin Reward</label>
            <input
              type="number"
              min={0}
              value={form.coin_reward}
              onChange={e => setForm({ ...form, coin_reward: parseInt(e.target.value) || 0 })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.member_name || !form.title || saving}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
