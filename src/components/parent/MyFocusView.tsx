'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2, Clock, AlertTriangle, Inbox, Plus, Calendar,
  Loader2, ChevronRight, Mail, Wrench, X, ArrowRight,
} from 'lucide-react'

type Task = {
  id: number; title: string; description: string | null
  source_type: string; source_id: string | null; board: string
  column_name: string; priority: string; due_date: string | null
  assigned_to: string | null; notes: string | null; status: string
  created_at: string
}

const BOARD_ICONS: Record<string, string> = {
  personal: '📋', triton: '🔧', school: '🏫', medical: '🏥', household: '🏠',
}
const BOARD_COLORS: Record<string, string> = {
  personal: 'bg-blue-100 text-blue-700', triton: 'bg-amber-100 text-amber-700',
  school: 'bg-indigo-100 text-indigo-700', medical: 'bg-rose-100 text-rose-700',
  household: 'bg-emerald-100 text-emerald-700',
}
const SOURCE_ICONS: Record<string, string> = {
  email: '📧', manual: '✏️', triton: '🔧', friend_request: '🏠',
}

function fmtDate(d: string | null): string {
  if (!d) return ''
  const date = new Date(d + 'T12:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(d: string | null): boolean {
  if (!d) return false
  return new Date(d + 'T23:59:59') < new Date()
}

function isToday(d: string | null): boolean {
  if (!d) return false
  return d === new Date().toLocaleDateString('en-CA')
}

export default function MyFocusView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBoard, setNewBoard] = useState('personal')
  const [newDue, setNewDue] = useState('')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/action-items?action=list')
      const data = await res.json()
      setTasks((data.items || []).filter((t: Task) => t.status !== 'done' && t.status !== 'dismissed'))
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDone = async (id: number) => {
    await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', id }),
    }).catch(() => {})
    setTasks(prev => prev.filter(t => t.id !== id))
    flash('Done!')
  }

  const handleSnooze = async (id: number, toDate?: string) => {
    const due = toDate || new Date(Date.now() + 86400000).toLocaleDateString('en-CA')
    await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, due_date: due }),
    }).catch(() => {})
    setTasks(prev => prev.map(t => t.id === id ? { ...t, due_date: due } : t))
    flash(`Snoozed to ${fmtDate(due)}`)
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    const colMap: Record<string, string> = { triton: 'leads', personal: 'inbox', school: 'inbox', medical: 'inbox', household: 'inbox' }
    await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create', title: newTitle.trim(), board: newBoard,
        column_name: colMap[newBoard] || 'inbox',
        due_date: newDue || null, source_type: 'manual',
      }),
    }).catch(() => {})
    setNewTitle(''); setNewDue(''); setShowAdd(false); setAdding(false)
    flash('Task added')
    load()
  }

  const todayStr = new Date().toLocaleDateString('en-CA')
  const overdue = tasks.filter(t => t.due_date && isOverdue(t.due_date) && !isToday(t.due_date))
  const doToday = tasks.filter(t => (t.due_date && isToday(t.due_date)) || (!t.due_date && t.priority === 'urgent'))
  const upcoming = tasks.filter(t => t.due_date && !isOverdue(t.due_date) && !isToday(t.due_date))
  const inbox = tasks.filter(t => !t.due_date && t.priority !== 'urgent')

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      {loading && <div className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>}

      {!loading && (
        <>
          {/* Overdue */}
          {overdue.length > 0 && (
            <Section title="Overdue" count={overdue.length} icon={<AlertTriangle className="w-4 h-4" />} color="text-red-700" bgColor="bg-red-50">
              {overdue.map(t => <TaskCard key={t.id} task={t} onDone={() => handleDone(t.id)} onSnooze={(d) => handleSnooze(t.id, d)} />)}
            </Section>
          )}

          {/* Do Today */}
          <Section title="Do Today" count={doToday.length} icon={<Clock className="w-4 h-4" />} color="text-amber-700" bgColor="bg-amber-50">
            {doToday.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">Nothing due today — nice!</p>
            ) : doToday.map(t => <TaskCard key={t.id} task={t} onDone={() => handleDone(t.id)} onSnooze={(d) => handleSnooze(t.id, d)} />)}
          </Section>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <Section title="Upcoming" count={upcoming.length} icon={<Calendar className="w-4 h-4" />} color="text-blue-700" bgColor="bg-blue-50">
              {upcoming.map(t => <TaskCard key={t.id} task={t} onDone={() => handleDone(t.id)} onSnooze={(d) => handleSnooze(t.id, d)} compact />)}
            </Section>
          )}

          {/* Inbox */}
          {inbox.length > 0 && (
            <Section title="Inbox — needs sorting" count={inbox.length} icon={<Inbox className="w-4 h-4" />} color="text-gray-600" bgColor="bg-gray-50">
              {inbox.map(t => <TaskCard key={t.id} task={t} onDone={() => handleDone(t.id)} onSnooze={(d) => handleSnooze(t.id, d)} showSetDate />)}
            </Section>
          )}

          {/* Quick Add */}
          {showAdd ? (
            <div className="bg-white rounded-lg border p-4 space-y-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title..."
                onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus
                className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="flex gap-2">
                <select value={newBoard} onChange={e => setNewBoard(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs bg-white">
                  <option value="personal">Personal</option><option value="triton">Triton</option>
                  <option value="school">School</option><option value="medical">Medical</option>
                  <option value="household">Household</option>
                </select>
                <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" />
                <button onClick={handleAdd} disabled={adding || !newTitle.trim()}
                  className="ml-auto px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-2 py-1.5 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, count, icon, color, bgColor, children }: {
  title: string; count: number; icon: React.ReactNode; color: string; bgColor: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${color} mb-2`}>
        {icon} {title} ({count})
      </div>
      <div className={`${bgColor} rounded-lg border space-y-0`}>
        {children}
      </div>
    </div>
  )
}

function TaskCard({ task: t, onDone, onSnooze, compact, showSetDate }: {
  task: Task; onDone: () => void; onSnooze: (d?: string) => void; compact?: boolean; showSetDate?: boolean
}) {
  const boardMeta = BOARD_COLORS[t.board] || BOARD_COLORS.personal
  const boardIcon = BOARD_ICONS[t.board] || '📋'
  const sourceIcon = SOURCE_ICONS[t.source_type] || ''
  const overdue = isOverdue(t.due_date)
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA')

  return (
    <div className={`flex items-start gap-3 px-4 py-3 bg-white/80 border-b last:border-b-0 ${overdue ? 'border-l-4 border-l-red-400' : ''}`}>
      <button onClick={onDone} title="Mark done"
        className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex-shrink-0 transition-colors" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 leading-snug">
          {sourceIcon && <span className="mr-1">{sourceIcon}</span>}
          {t.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${boardMeta}`}>
            {boardIcon} {t.board}
          </span>
          {t.due_date && (
            <span className={`text-[10px] font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
              {overdue ? 'Due ' : ''}{fmtDate(t.due_date)}
            </span>
          )}
          {t.priority === 'urgent' && <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-700 font-semibold">Urgent</span>}
          {t.priority === 'high' && <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-700 font-semibold">High</span>}
        </div>
      </div>
      {!compact && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {showSetDate ? (
            <button onClick={() => {
              const d = prompt('Due date (YYYY-MM-DD):')
              if (d) onSnooze(d)
            }} className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">
              Set Date
            </button>
          ) : (
            <button onClick={() => onSnooze(tomorrow)} title="Tomorrow"
              className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium flex items-center gap-0.5">
              <ArrowRight className="w-3 h-3" /> Tomorrow
            </button>
          )}
        </div>
      )}
    </div>
  )
}
