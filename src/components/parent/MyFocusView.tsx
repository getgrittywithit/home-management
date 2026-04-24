'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2, Clock, AlertTriangle, Inbox, Plus, Calendar, Mail,
  Loader2, ArrowRight, X, Wrench, Home, Users, Star,
} from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

const BOARD_ICONS: Record<string, string> = { personal: '📋', triton: '🔧', school: '🏫', medical: '🏥', household: '🏠' }
const CATEGORY_COLORS: Record<string, string> = {
  household: 'text-emerald-700', school: 'text-indigo-700', medical: 'text-rose-700',
  finance: 'text-green-700', business: 'text-amber-700', homeschool: 'text-teal-700',
}

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

export default function MyFocusView() {
  const [data, setData] = useState<any>(null)
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
      const res = await fetch('/api/parent/my-focus?action=get_focus_view')
      setData(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCompleteTask = async (id: number) => {
    await fetch('/api/parent/my-focus', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_task', id }),
    }).catch(() => {})
    flash('Done!')
    load()
  }

  const handleSnoozeTask = async (id: number) => {
    await fetch('/api/parent/my-focus', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'snooze_task', id, days: 1 }),
    }).catch(() => {})
    flash('Snoozed → tomorrow')
    load()
  }

  const handleToggleChecklist = async (id: string) => {
    await fetch('/api/parent/my-focus', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_checklist_item', id }),
    }).catch(() => {})
    load()
  }

  const handleBulkClear = async (cats: string[]) => {
    await fetch('/api/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_archive_by_category', categories: cats }),
    }).catch(() => {})
    flash('Cleared!')
    load()
  }

  const handleAddTask = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    await fetch('/api/parent/my-focus', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_task', title: newTitle.trim(), board: newBoard, due_date: newDue || null }),
    }).catch(() => {})
    setNewTitle(''); setNewDue(''); setShowAdd(false); setAdding(false)
    flash('Task added')
    load()
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-1">
        <div className="skeleton h-8 w-64" />
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
      </div>
    )
  }

  if (!data) return <div className="text-center py-8 text-gray-400">Failed to load.</div>

  const d = data

  return (
    <div className="max-w-3xl mx-auto space-y-5 p-1">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🐙 Lola's {d.day_label}</h1>
        {d.attention_count > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            You've got <span className="font-semibold text-red-600">{d.attention_count} thing{d.attention_count === 1 ? '' : 's'}</span> that need{d.attention_count === 1 ? 's' : ''} you today.
          </p>
        )}
      </div>

      {/* 🔴 Needs Attention */}
      {d.attention_count > 0 && (
        <Section title="Needs Attention" count={d.attention_count} icon={<AlertTriangle className="w-4 h-4" />} color="text-red-700" bg="bg-red-50 border-red-200">
          {d.attention_items.map((item: any) => (
            <TaskRow key={item.id} item={item} onDone={() => handleCompleteTask(item.id)} onSnooze={() => handleSnoozeTask(item.id)} />
          ))}
        </Section>
      )}

      {/* 📅 Today's Schedule */}
      <Section title="Today's Schedule" count={d.events_count} icon={<Calendar className="w-4 h-4" />} color="text-blue-700" bg="bg-blue-50 border-blue-200">
        {d.events_count === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-2">No appointments today</p>
        ) : d.events_today.map((e: any, i: number) => (
          <div key={i} className="px-4 py-2 bg-white/80 border-b last:border-b-0 text-sm">
            <span className="font-medium text-gray-900">
              {e.start_time ? new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : 'All day'}
            </span>
            <span className="ml-2 text-gray-700">{e.title}</span>
            {e.location && <span className="text-gray-400 ml-1 text-xs">· {e.location}</span>}
          </div>
        ))}
      </Section>

      {/* ✅ Quick Wins */}
      {d.quick_wins_count > 0 && (
        <Section title="Quick Wins" count={d.quick_wins_count} icon={<Star className="w-4 h-4" />} color="text-emerald-700" bg="bg-emerald-50 border-emerald-200">
          {d.quick_wins.map((item: any) => (
            <TaskRow key={item.id} item={item} onDone={() => handleCompleteTask(item.id)} onSnooze={() => handleSnoozeTask(item.id)} />
          ))}
        </Section>
      )}

      {/* 📋 Today's Checklist */}
      {d.checklist_total > 0 && (
        <Section title="Today's Checklist" count={d.checklist_total} done={d.checklist_done} icon={<CheckCircle2 className="w-4 h-4" />} color="text-indigo-700" bg="bg-indigo-50 border-indigo-200">
          {d.checklist.map((item: any) => (
            <button key={item.id} onClick={() => handleToggleChecklist(item.id)}
              className="w-full flex items-center gap-3 px-4 py-2 bg-white/80 border-b last:border-b-0 text-left hover:bg-white text-sm">
              <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
              }`}>
                {item.completed && <CheckCircle2 className="w-3 h-3" />}
              </span>
              <span className={item.completed ? 'line-through text-gray-400' : 'text-gray-900'}>
                {item.task_label}
              </span>
              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[item.category] || 'text-gray-500'}`}>
                {item.category}
              </span>
            </button>
          ))}
        </Section>
      )}

      {/* 💬 Needs Response (unanswered messages + pending requests) */}
      {(d.unanswered_count > 0 || d.pending_count > 0) && (
        <Section title="Needs Your Response" count={(d.unanswered_count || 0) + (d.pending_count || 0)} icon={<Mail className="w-4 h-4" />} color="text-pink-700" bg="bg-pink-50 border-pink-200">
          {(d.unanswered_messages || []).map((msg: any) => (
            <div key={msg.id} className="px-4 py-2 bg-white/80 border-b last:border-b-0 text-sm flex items-center gap-2">
              <span className="text-pink-500">💬</span>
              <span className="font-medium text-gray-900">{cap(msg.from_kid)}:</span>
              <span className="text-gray-600 truncate flex-1">{msg.message?.substring(0, 60)}</span>
            </div>
          ))}
          {(d.pending_requests || []).map((req: any, i: number) => (
            <div key={i} className="px-4 py-2 bg-white/80 border-b last:border-b-0 text-sm flex items-center gap-2">
              <span className="text-amber-500">{req.type === 'grocery' ? '🛒' : req.type === 'calendar' ? '📅' : '❤️'}</span>
              <span className="font-medium text-gray-900">{cap(req.kid_name || '')}:</span>
              <span className="text-gray-600 truncate flex-1">{req.title}</span>
            </div>
          ))}
        </Section>
      )}

      {/* 👨‍👩‍👧‍👦 Kid Check-in */}
      <Section title="Kid Check-in" count={d.kids?.length || 6} icon={<Users className="w-4 h-4" />} color="text-purple-700" bg="bg-purple-50 border-purple-200">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
          {(d.kids || []).map((kid: any) => {
            const pct = kid.tasks_total > 0 ? Math.round((kid.tasks_done / kid.tasks_total) * 100) : null
            const mood = pct === null ? '—' : pct >= 75 ? '😊' : pct >= 40 ? '😐' : '😟'
            const isLow = pct !== null && pct < 30 && kid.tasks_total > 0
            return (
              <div key={kid.kid_name} className={`bg-white rounded-lg px-3 py-2 text-xs ${isLow ? 'border-2 border-amber-300' : 'border'}`}>
                <div className="font-semibold text-gray-900">{mood} {kid.kid_name.charAt(0).toUpperCase() + kid.kid_name.slice(1)}</div>
                <div className="text-gray-500">
                  {pct !== null ? `${kid.tasks_done}/${kid.tasks_total} tasks` : 'No tasks'}
                  {kid.streak_days > 0 && <span className="ml-1">🔥{kid.streak_days}d</span>}
                </div>
                {isLow && <div className="text-amber-600 font-medium mt-0.5">⚠️ Low completion</div>}
              </div>
            )
          })}
        </div>
      </Section>

      {/* 🏠 Household */}
      <Section title="Household Today" icon={<Home className="w-4 h-4" />} color="text-gray-700" bg="bg-gray-50 border-gray-200">
        <div className="px-4 py-2 text-sm text-gray-700">
          Belle: {d.household?.belle || '—'} · Dinner: {d.household?.dinner || '—'} · Zone Week {d.household?.zone_week || '?'}
        </div>
      </Section>

      {/* 📧 Email */}
      <Section title={`Email (${d.email_important} important · ${d.email_clearable} clearable)`} icon={<Mail className="w-4 h-4" />} color="text-gray-700" bg="bg-gray-50 border-gray-200">
        <div className="px-4 py-2 flex gap-2 flex-wrap">
          {d.email_noise > 0 && (
            <button onClick={() => handleBulkClear(['noise'])}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600">
              Clear Noise ({d.email_noise})
            </button>
          )}
          {d.email_subs > 0 && (
            <button onClick={() => handleBulkClear(['subscriptions'])}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600">
              Clear Subs ({d.email_subs})
            </button>
          )}
          <button onClick={() => window.dispatchEvent(new CustomEvent('tabChange', { detail: { tab: 'email' } }))}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50">
            Open Email →
          </button>
        </div>
      </Section>

      {/* 🔧 Triton */}
      {d.triton_active > 0 && (
        <Section title={`Triton (${d.triton_active} active)`} icon={<Wrench className="w-4 h-4" />} color="text-amber-700" bg="bg-amber-50 border-amber-200">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('tabChange', { detail: { tab: 'boards' } }))}
            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-amber-100 rounded-lg transition-colors text-left flex items-center justify-between"
          >
            <span>{d.triton_active} job{d.triton_active === 1 ? '' : 's'} in pipeline</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
          </button>
        </Section>
      )}

      {/* + Add Task */}
      {showAdd ? (
        <div className="bg-white rounded-xl border p-4 space-y-2">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What needs doing?"
            onKeyDown={e => e.key === 'Enter' && handleAddTask()} autoFocus
            className="w-full px-3 py-2 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <select value={newBoard} onChange={e => setNewBoard(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs bg-white">
              <option value="personal">Personal</option><option value="triton">Triton</option>
              <option value="school">School</option><option value="medical">Medical</option>
              <option value="household">Household</option>
            </select>
            <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" />
            <button onClick={handleAddTask} disabled={adding || !newTitle.trim()}
              className="ml-auto px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
              {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-2 py-1.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
          <Plus className="w-4 h-4" /> Add a task
        </button>
      )}
    </div>
  )
}

function Section({ title, count, done, icon, color, bg, children }: {
  title: string; count?: number; done?: number; icon: React.ReactNode; color: string; bg: string; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border overflow-hidden ${bg}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wide ${color}`}>
        {icon} {title}
        {count !== undefined && <span className="ml-auto font-normal normal-case text-xs opacity-70">{done !== undefined ? `${done}/${count}` : count}</span>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function TaskRow({ item, onDone, onSnooze }: { item: any; onDone: () => void; onSnooze: () => void }) {
  const overdue = item.due_date && new Date(item.due_date) < new Date(new Date().toLocaleDateString('en-CA'))
  return (
    <div className={`flex items-start gap-3 px-4 py-2.5 bg-white/80 border-b last:border-b-0 ${overdue ? 'border-l-4 border-l-red-400' : ''}`}>
      <button onClick={onDone} title="Done"
        className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{item.title}</div>
        <div className="text-[11px] text-gray-500 mt-0.5">
          {item.board && <span className="mr-2">{BOARD_ICONS[item.board] || '📋'} {item.board}</span>}
          {item.due_date && <span className={overdue ? 'text-red-600 font-medium' : ''}>
            {overdue ? 'Overdue' : 'Due'} {parseDateLocal(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>}
          {item.source_type === 'email' && <span className="ml-2">📧</span>}
        </div>
      </div>
      <button onClick={onSnooze} title="Tomorrow"
        className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium flex items-center gap-0.5 flex-shrink-0">
        <ArrowRight className="w-3 h-3" /> Tomorrow
      </button>
    </div>
  )
}
