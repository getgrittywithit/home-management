'use client'

import { useState, useEffect } from 'react'
import {
  Clock, Plus, Loader2, X, Check, Trash2, Bell, BellOff, Edit3,
} from 'lucide-react'

type Reminder = {
  id: string; reminder_type: string; title: string; message: string | null
  schedule_time: string; days_of_week: number[]; active: boolean
  target_role: string; kid_name: string | null; last_fired_at: string | null
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TYPE_EMOJIS: Record<string, string> = {
  med_am: '💊', med_pm: '💊', chore_am: '🏠', meal_pick: '🍽️',
  belle_pm: '🐕', bedtime: '🌙', lights_out: '😴', custom: '⏰',
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function ReminderManager() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [toast, setToast] = useState('')

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_reminders' }),
    }).then(r => r.json()).catch(() => ({ reminders: [] }))
    setReminders(res.reminders || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(r: Reminder) {
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_reminder', id: r.id, active: !r.active }),
    }).catch(() => {})
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x))
  }

  async function deleteReminder(id: string) {
    if (!confirm('Delete this reminder?')) return
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_reminder', id }),
    }).catch(() => {})
    flash('Deleted')
    load()
  }

  async function fireNow() {
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_reminders' }),
    }).catch(() => {})
    flash('Checked reminders')
  }

  const grouped: Record<string, Reminder[]> = {}
  for (const r of reminders) {
    const key = r.reminder_type.startsWith('med') ? 'Medication' :
      ['chore_am', 'belle_pm', 'bedtime', 'lights_out'].includes(r.reminder_type) ? 'Household' :
      r.reminder_type === 'meal_pick' ? 'Meals' : 'Custom'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" /> Reminders
        </h3>
        <div className="flex gap-2">
          <button onClick={fireNow} className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">
            Check Now
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>}

      {!loading && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{group}</h4>
              <div className="space-y-1.5">
                {items.map(r => (
                  <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${r.active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                    <span className="text-lg">{TYPE_EMOJIS[r.reminder_type] || '⏰'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">{r.title}</div>
                      <div className="text-xs text-gray-500">
                        {fmtTime(r.schedule_time)} · {r.days_of_week.length === 7 ? 'Every day' : r.days_of_week.map(d => DAY_LABELS[d]).join(', ')}
                      </div>
                    </div>
                    <button onClick={() => setEditing(r)} className="p-1 text-gray-400 hover:text-gray-700">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleActive(r)} className="p-1 text-gray-400 hover:text-gray-700">
                      {r.active ? <Bell className="w-3.5 h-3.5 text-green-500" /> : <BellOff className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                    {r.reminder_type === 'custom' && (
                      <button onClick={() => deleteReminder(r.id)} className="p-1 text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editing) && (
        <ReminderModal
          reminder={editing}
          onClose={() => { setShowAdd(false); setEditing(null) }}
          onSaved={() => { setShowAdd(false); setEditing(null); flash(editing ? 'Updated' : 'Created'); load() }}
        />
      )}
    </div>
  )
}

function ReminderModal({ reminder, onClose, onSaved }: { reminder: Reminder | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(reminder?.title || '')
  const [message, setMessage] = useState(reminder?.message || '')
  const [time, setTime] = useState(reminder?.schedule_time?.slice(0, 5) || '08:00')
  const [days, setDays] = useState<number[]>(reminder?.days_of_week || [0,1,2,3,4,5,6])
  const [saving, setSaving] = useState(false)

  const toggleDay = (d: number) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reminder
        ? { action: 'update_reminder', id: reminder.id, title: title.trim(), message: message || null, schedule_time: time, days_of_week: days }
        : { action: 'create_reminder', title: title.trim(), message: message || null, schedule_time: time, days_of_week: days, reminder_type: 'custom' }
      ),
    }).catch(() => {})
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{reminder ? 'Edit Reminder' : 'New Reminder'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *"
            className="w-full px-3 py-2 border rounded-lg text-sm" autoFocus />
          <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message (optional)"
            className="w-full px-3 py-2 border rounded-lg text-sm" />
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Days</label>
            <div className="flex gap-1">
              {DAY_LABELS.map((label, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium ${
                    days.includes(i) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving || !title.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {reminder ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
