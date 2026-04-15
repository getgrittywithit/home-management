'use client'

import { useState } from 'react'
import { Star, Bell, Thermometer, CheckSquare, FileText, X, Send, Zap, Loader2 } from 'lucide-react'

const HOMESCHOOL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah']
const ALL_KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
const PRAISE_CATEGORIES = [
  { id: 'kindness',  emoji: '💛', label: 'Kindness' },
  { id: 'courage',   emoji: '🦁', label: 'Courage' },
  { id: 'honesty',   emoji: '⭐', label: 'Honesty' },
  { id: 'teamwork',  emoji: '🤝', label: 'Teamwork' },
  { id: 'gratitude', emoji: '🙏', label: 'Gratitude' },
  { id: 'resilience',emoji: '💪', label: 'Resilience' },
]

type ActionKey = 'praise' | 'nudge' | 'sick' | 'greenlight' | 'note'

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

export default function QuickActionsBar() {
  const [openAction, setOpenAction] = useState<ActionKey | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2500)
  }

  const close = () => setOpenAction(null)

  return (
    <>
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className="w-4 h-4 text-violet-600" />
          <h3 className="text-sm font-bold text-violet-900">Quick Actions</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickButton icon={Star} label="Log Praise" color="amber" onClick={() => setOpenAction('praise')} />
          <QuickButton icon={Bell} label="Send Nudge" color="blue" onClick={() => setOpenAction('nudge')} />
          <QuickButton icon={Thermometer} label="Mark Sick Day" color="orange" onClick={() => setOpenAction('sick')} />
          <QuickButton icon={CheckSquare} label="Post Greenlight" color="green" onClick={() => setOpenAction('greenlight')} />
          <QuickButton icon={FileText} label="Leave Note" color="indigo" onClick={() => setOpenAction('note')} />
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {openAction === 'praise' && <PraiseModal onClose={close} onDone={flashToast} />}
      {openAction === 'nudge' && <NudgeModal onClose={close} onDone={flashToast} />}
      {openAction === 'sick' && <SickDayModal onClose={close} onDone={flashToast} />}
      {openAction === 'greenlight' && <GreenlightModal onClose={close} onDone={flashToast} />}
      {openAction === 'note' && <NoteModal onClose={close} onDone={flashToast} />}
    </>
  )
}

function QuickButton({
  icon: Icon, label, color, onClick,
}: {
  icon: any; label: string; color: 'amber' | 'blue' | 'orange' | 'green' | 'indigo'; onClick: () => void
}) {
  const colors: Record<string, string> = {
    amber: 'bg-white border-amber-200 text-amber-800 hover:bg-amber-50',
    blue: 'bg-white border-blue-200 text-blue-800 hover:bg-blue-50',
    orange: 'bg-white border-orange-200 text-orange-800 hover:bg-orange-50',
    green: 'bg-white border-green-200 text-green-800 hover:bg-green-50',
    indigo: 'bg-white border-indigo-200 text-indigo-800 hover:bg-indigo-50',
  }
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all active:scale-95 ${colors[color]}`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )
}

// ============================================================================
// Shared modal frame
// ============================================================================
function ModalFrame({
  title, icon, onClose, children,
}: {
  title: string; icon: any; onClose: () => void; children: React.ReactNode
}) {
  const Icon = icon
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gray-700" />
            <h3 className="font-bold text-gray-900">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ============================================================================
// Praise modal — POSTs to /api/positive-reports submit_report (source=parent)
// ============================================================================
function PraiseModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [kid, setKid] = useState(ALL_KIDS[0])
  const [category, setCategory] = useState(PRAISE_CATEGORIES[0].id)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!note.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/positive-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_report',
          kid_name: kid,
          category,
          note: note.trim(),
          source: 'parent',
          submitted_by: 'parent',
        }),
      })
      if (res.ok) {
        onDone(`Praised ${titleCase(kid)} — ${category}`)
        onClose()
      } else {
        onDone('Save failed')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame title="Log Praise" icon={Star} onClose={onClose}>
      <div className="p-5 space-y-3">
        <p className="text-xs text-gray-500">
          Parent-submitted praise auto-approves and awards <span className="font-semibold text-amber-600">+2 points</span>.
        </p>
        <div>
          <label className="text-xs font-semibold text-gray-700">Kid</label>
          <select
            value={kid}
            onChange={(e) => setKid(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white capitalize"
          >
            {ALL_KIDS.map((k) => <option key={k} value={k}>{titleCase(k)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Category</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {PRAISE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`text-xs px-2 py-1.5 rounded-lg border-2 font-medium ${
                  category === c.id ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">What did they do?</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Helped clean up without being asked…"
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
        <button
          onClick={save}
          disabled={!note.trim() || saving}
          className="flex-1 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
          Log praise
        </button>
      </div>
    </ModalFrame>
  )
}

// ============================================================================
// Nudge modal — POSTs to /api/homeschool/daily nudge_kid (D69)
// ============================================================================
function NudgeModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [kid, setKid] = useState(HOMESCHOOL_KIDS[0])
  const [context, setContext] = useState('school')
  const [customMsg, setCustomMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const defaultMessages: Record<string, string> = {
    school: 'Time to start your school day! Open your My Day card to see today\u2019s plan.',
    chores: 'Time to do your zone chores today!',
    belle: 'Belle needs her walk + food. Check your Belle duty.',
    bedtime: 'Evening routine starts now — hygiene, meds, tidy up.',
  }

  const send = async () => {
    setSaving(true)
    try {
      const message = customMsg.trim() || defaultMessages[context]
      const res = await fetch('/api/homeschool/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nudge_kid', kid_name: kid, message }),
      })
      if (res.ok) {
        onDone(`⏰ Nudged ${titleCase(kid)}`)
        onClose()
      } else {
        onDone('Send failed')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame title="Send Nudge" icon={Bell} onClose={onClose}>
      <div className="p-5 space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-700">Kid</label>
          <select
            value={kid}
            onChange={(e) => setKid(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white capitalize"
          >
            {ALL_KIDS.map((k) => <option key={k} value={k}>{titleCase(k)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Context</label>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {(['school','chores','belle','bedtime'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setContext(c)}
                className={`text-xs px-2 py-1.5 rounded-lg border-2 font-medium capitalize ${
                  context === c ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Message (optional — uses default if blank)</label>
          <textarea
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            rows={2}
            placeholder={defaultMessages[context]}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
        <button
          onClick={send}
          disabled={saving}
          className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Send nudge
        </button>
      </div>
    </ModalFrame>
  )
}

// ============================================================================
// Sick Day modal — POSTs to /api/kids/checklist confirm_sick_day
// ============================================================================
function SickDayModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [kid, setKid] = useState(ALL_KIDS[0])
  const [saving, setSaving] = useState(false)

  const markSick = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/kids/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_sick_day',
          kid_name: kid,
          date: todayIso(),
        }),
      })
      if (res.ok) {
        onDone(`🤒 ${titleCase(kid)} marked sick`)
        onClose()
      } else {
        onDone('Save failed')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame title="Mark Sick Day" icon={Thermometer} onClose={onClose}>
      <div className="p-5 space-y-3">
        <p className="text-xs text-gray-600">
          Confirms a sick day for today. Reduces task load, pauses ADHD meds where configured,
          and auto-logs attendance as sick.
        </p>
        <div>
          <label className="text-xs font-semibold text-gray-700">Which kid?</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {ALL_KIDS.map((k) => (
              <button
                key={k}
                onClick={() => setKid(k)}
                className={`text-xs px-2 py-2 rounded-lg border-2 font-semibold capitalize ${
                  kid === k ? 'border-orange-400 bg-orange-50 text-orange-800' : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
        <button
          onClick={markSick}
          disabled={saving}
          className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Thermometer className="w-4 h-4" />}
          Confirm sick day
        </button>
      </div>
    </ModalFrame>
  )
}

// ============================================================================
// Greenlight modal — POSTs to /api/kids/messages post_greenlight
// ============================================================================
function GreenlightModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const post = async () => {
    if (!message.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/kids/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post_greenlight', message: message.trim() }),
      })
      if (res.ok) {
        onDone('✅ Greenlight posted to all kid portals')
        onClose()
      } else {
        onDone('Post failed')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame title="Post Greenlight" icon={CheckSquare} onClose={onClose}>
      <div className="p-5 space-y-3">
        <p className="text-xs text-gray-600">
          A greenlight is a short positive message shown on every kid\u2019s portal.
          Replaces any existing greenlight. Use it to signal the house is calm and the
          day is moving smoothly.
        </p>
        <div>
          <label className="text-xs font-semibold text-gray-700">Message (max 200 chars)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="Great morning, team! Keep it going."
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <div className="text-right text-[10px] text-gray-400 mt-0.5">{message.length}/200</div>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
        <button
          onClick={post}
          disabled={!message.trim() || saving}
          className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
          Post greenlight
        </button>
      </div>
    </ModalFrame>
  )
}

// ============================================================================
// Note modal — POSTs to /api/kids/messages create_announcement
// ============================================================================
function NoteModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [target, setTarget] = useState('all')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const send = async () => {
    if (!message.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/kids/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_announcement',
          message: message.trim(),
          type: 'note',
          target_kid: target,
        }),
      })
      if (res.ok) {
        onDone(`📝 Note sent to ${target === 'all' ? 'all kids' : titleCase(target)}`)
        onClose()
      } else {
        onDone('Send failed')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame title="Leave a Note" icon={FileText} onClose={onClose}>
      <div className="p-5 space-y-3">
        <p className="text-xs text-gray-600">
          Posts a note to the kid\u2019s Messages tab. Use for reminders, instructions,
          or small encouragements that don\u2019t need a reply.
        </p>
        <div>
          <label className="text-xs font-semibold text-gray-700">Send to</label>
          <div className="grid grid-cols-4 gap-1.5 mt-1">
            <button
              onClick={() => setTarget('all')}
              className={`text-xs px-2 py-1.5 rounded-lg border-2 font-semibold ${
                target === 'all' ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              All kids
            </button>
            {ALL_KIDS.map((k) => (
              <button
                key={k}
                onClick={() => setTarget(k)}
                className={`text-xs px-2 py-1.5 rounded-lg border-2 font-semibold capitalize ${
                  target === k ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Please remember to…"
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
        <button
          onClick={send}
          disabled={!message.trim() || saving}
          className="flex-1 bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send note
        </button>
      </div>
    </ModalFrame>
  )
}
