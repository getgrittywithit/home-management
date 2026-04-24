'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, ThumbsUp, Clock, CheckCircle2, XCircle, HelpCircle, MessageSquare, ChevronRight, Plus, Send, Calendar, DollarSign, Users } from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

interface HotEvent { id: number; title: string; event_date: string | null; category: string | null; cost: string | null; votes: number }
interface PendingEvent { id: number; title: string; event_date: string | null }
interface ApprovedEvent { id: number; title: string; event_date: string | null; planned_date: string | null }

interface DetailEvent {
  id: number; title: string; description: string | null; event_date: string | null; event_time: string | null
  location: string | null; category: string | null; cost: string | null; source: string | null
  submitted_by: string | null; status: string; created_at: string
}
interface Interest { id: number; person: string; interest_level: string; comment: string | null; created_at: string }
interface Message { id: number; person: string; message: string; created_at: string }
interface Decision { decision: string; decided_by: string; planned_date: string | null; notes: string | null }

const CATEGORY_EMOJI: Record<string, string> = {
  outdoors: '🌳', arts: '🎨', food: '🍕', sports: '⚽', animals: '🐾',
  science: '🔬', music: '🎵', festival: '🎪', market: '🛍️', other: '📌',
}

const COST_LABEL: Record<string, string> = { free: 'Free', '$': 'Under $25', '$$': '$25–75', '$$$': '$75+' }

const PERSON_DISPLAY: Record<string, string> = {
  amos: 'Amos', zoey: 'Zoey', kaylee: 'Kaylee', ellie: 'Ellie',
  wyatt: 'Wyatt', hannah: 'Hannah', lola: 'Mom', levi: 'Dad',
}

function formatDate(d: string | null) {
  if (!d) return ''
  return parseDateLocal(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'America/Chicago' })
}

export default function AdventureBoardParentTab() {
  const [view, setView] = useState<'dashboard' | 'detail' | 'all'>('dashboard')
  const [hot, setHot] = useState<HotEvent[]>([])
  const [pending, setPending] = useState<PendingEvent[]>([])
  const [approved, setApproved] = useState<ApprovedEvent[]>([])
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Detail view
  const [detailEvent, setDetailEvent] = useState<DetailEvent | null>(null)
  const [interests, setInterests] = useState<Interest[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [decision, setDecision] = useState<Decision | null>(null)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [deciding, setDeciding] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  // Submit modal
  const [showSubmit, setShowSubmit] = useState(false)
  const [submitForm, setSubmitForm] = useState({ title: '', description: '', event_date: '', location: '', category: 'outdoors', cost: 'free' })
  const [submitting, setSubmitting] = useState(false)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/adventures?action=get_board_summary')
      const data = await res.json()
      setHot(data.hot || [])
      setPending(data.pending || [])
      setApproved(data.approved || [])
    } catch {}
    setLoading(false)
  }, [])

  const loadAll = useCallback(async () => {
    try {
      const res = await fetch('/api/adventures?action=get_feed')
      const data = await res.json()
      setAllEvents(data.events || [])
    } catch {}
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])

  const openDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/adventures?action=get_event&id=${id}`)
      const data = await res.json()
      setDetailEvent(data.event)
      setInterests(data.interests || [])
      setMessages(data.messages || [])
      setDecision(data.decision || null)
      setDecisionNotes(data.decision?.notes || '')
      setPlannedDate(data.decision?.planned_date || '')
      setView('detail')
    } catch {}
  }

  const handleDecide = async (d: 'approved' | 'maybe' | 'not_this_time') => {
    if (!detailEvent) return
    setDeciding(true)
    try {
      await fetch('/api/adventures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decide', event_id: detailEvent.id, decision: d,
          decided_by: 'parent', planned_date: plannedDate || null, notes: decisionNotes || null,
        }),
      })
      // Refresh detail
      await openDetail(detailEvent.id)
      loadSummary()
    } catch {}
    setDeciding(false)
  }

  const handleSendMsg = async () => {
    if (!newMsg.trim() || !detailEvent) return
    setSendingMsg(true)
    try {
      await fetch('/api/adventures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_comment', event_id: detailEvent.id, person: 'lola', message: newMsg.trim() }),
      })
      setNewMsg('')
      await openDetail(detailEvent.id)
    } catch {}
    setSendingMsg(false)
  }

  const handleSubmit = async () => {
    if (!submitForm.title.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/adventures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_event', ...submitForm, submitted_by: 'lola' }),
      })
      setShowSubmit(false)
      setSubmitForm({ title: '', description: '', event_date: '', location: '', category: 'outdoors', cost: 'free' })
      loadSummary()
    } catch {}
    setSubmitting(false)
  }

  const handleVote = async (eventId: number, level: 'interested' | 'pass') => {
    try {
      await fetch('/api/adventures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'express_interest', event_id: eventId, person: 'lola', interest_level: level }),
      })
      loadSummary()
      if (view === 'all') loadAll()
    } catch {}
  }

  // ─── DETAIL VIEW ──────────────────────────────────
  if (view === 'detail' && detailEvent) {
    const interestedPeople = interests.filter(i => i.interest_level !== 'pass')
    return (
      <div className="space-y-4">
        <button onClick={() => { setView('dashboard'); setDetailEvent(null) }} className="text-sm text-blue-600 hover:underline">← Back to Board</button>

        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{CATEGORY_EMOJI[detailEvent.category || 'other'] || '📌'}</span>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{detailEvent.title}</h2>
              {detailEvent.description && <p className="text-sm text-gray-600 mt-1">{detailEvent.description}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {detailEvent.event_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(detailEvent.event_date)}</span>}
            {detailEvent.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{detailEvent.location}</span>}
            <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{COST_LABEL[detailEvent.cost || 'free'] || detailEvent.cost}</span>
            {detailEvent.submitted_by && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">Added by {PERSON_DISPLAY[detailEvent.submitted_by] || detailEvent.submitted_by}</span>}
          </div>
        </div>

        {/* Decision status or controls */}
        {decision ? (
          <div className={`rounded-xl border p-4 ${decision.decision === 'approved' ? 'bg-green-50 border-green-200' : decision.decision === 'maybe' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 font-semibold">
              {decision.decision === 'approved' && <><CheckCircle2 className="w-5 h-5 text-green-600" />Approved</>}
              {decision.decision === 'maybe' && <><HelpCircle className="w-5 h-5 text-amber-600" />Maybe</>}
              {decision.decision === 'not_this_time' && <><XCircle className="w-5 h-5 text-red-600" />Not This Time</>}
            </div>
            {decision.planned_date && <p className="text-sm mt-1">Planned for: {formatDate(decision.planned_date)}</p>}
            {decision.notes && <p className="text-sm text-gray-600 mt-1">{decision.notes}</p>}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
            <p className="font-semibold text-gray-700">Make a Decision</p>
            <input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Planned date (optional)" />
            <input type="text" value={decisionNotes} onChange={e => setDecisionNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Notes (optional)" />
            <div className="flex gap-2">
              <button onClick={() => handleDecide('approved')} disabled={deciding} className="flex-1 bg-green-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-50">
                ✅ Approve
              </button>
              <button onClick={() => handleDecide('maybe')} disabled={deciding} className="flex-1 bg-amber-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                🤔 Maybe
              </button>
              <button onClick={() => handleDecide('not_this_time')} disabled={deciding} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                ❌ Not Now
              </button>
            </div>
          </div>
        )}

        {/* Who's Interested */}
        {interestedPeople.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1"><Users className="w-4 h-4" /> Who's Interested ({interestedPeople.length})</p>
            <div className="space-y-2">
              {interestedPeople.map(i => (
                <div key={i.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{PERSON_DISPLAY[i.person] || i.person}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{i.interest_level === 'really_want' ? '🔥 Really wants to go!' : '👍 Interested'}</span>
                  {i.comment && <span className="text-gray-500 italic">"{i.comment}"</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Family Chat */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1"><MessageSquare className="w-4 h-4" /> Family Chat ({messages.length})</p>
          {messages.length === 0 && <p className="text-sm text-gray-400">No messages yet</p>}
          <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
            {messages.map(m => (
              <div key={m.id} className={`text-sm p-2 rounded-lg ${m.person === 'lola' ? 'bg-teal-50 ml-8' : 'bg-gray-50 mr-8'}`}>
                <span className="font-semibold text-xs">{PERSON_DISPLAY[m.person] || m.person}</span>
                <p className="text-gray-700">{m.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Say something..." onKeyDown={e => e.key === 'Enter' && handleSendMsg()} />
            <button onClick={handleSendMsg} disabled={sendingMsg || !newMsg.trim()} className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── ALL EVENTS VIEW ──────────────────────────────
  if (view === 'all') {
    if (allEvents.length === 0 && !loading) loadAll()
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('dashboard')} className="text-sm text-blue-600 hover:underline">← Dashboard</button>
          <button onClick={() => setShowSubmit(true)} className="flex items-center gap-1 bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-600">
            <Plus className="w-4 h-4" />Add Event
          </button>
        </div>
        {allEvents.map(ev => (
          <div key={ev.id} onClick={() => openDetail(ev.id)} className="bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <span className="text-xl">{CATEGORY_EMOJI[ev.category || 'other'] || '📌'}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                  {ev.event_date && <span>{formatDate(ev.event_date)}</span>}
                  {ev.location && <span>📍 {ev.location}</span>}
                  <span>{COST_LABEL[ev.cost || 'free'] || ev.cost}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-0.5"><ThumbsUp className="w-3.5 h-3.5" />{ev.interest_count || 0}</span>
                <span className="flex items-center gap-0.5"><MessageSquare className="w-3.5 h-3.5" />{ev.message_count || 0}</span>
                {ev.latest_decision && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ev.latest_decision === 'approved' ? 'bg-green-100 text-green-700' : ev.latest_decision === 'maybe' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {ev.latest_decision === 'approved' ? '✅' : ev.latest_decision === 'maybe' ? '🤔' : '❌'}
                  </span>
                )}
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
        {allEvents.length === 0 && <p className="text-center text-gray-400 py-8">No adventures yet. Add one!</p>}

        {showSubmit && <SubmitModal form={submitForm} setForm={setSubmitForm} submitting={submitting} onSubmit={handleSubmit} onClose={() => setShowSubmit(false)} />}
      </div>
    )
  }

  // ─── DASHBOARD VIEW ──────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-500" />Adventure Board</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowSubmit(true)} className="flex items-center gap-1 bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-600">
            <Plus className="w-4 h-4" />Add
          </button>
          <button onClick={() => { setView('all'); loadAll() }} className="text-sm text-blue-600 hover:underline">View All</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Hot Events — most votes */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <p className="font-semibold text-gray-700 mb-3 flex items-center gap-1">🔥 Hot — Most Votes</p>
            {hot.length === 0 ? (
              <p className="text-sm text-gray-400">No events with votes yet</p>
            ) : (
              <div className="space-y-2">
                {hot.map(ev => (
                  <div key={ev.id} onClick={() => openDetail(ev.id)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <span>{CATEGORY_EMOJI[ev.category || 'other'] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{ev.title}</p>
                      <p className="text-xs text-gray-500">{ev.event_date ? formatDate(ev.event_date) : 'No date'} · {COST_LABEL[ev.cost || 'free'] || ev.cost}</p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-bold text-indigo-600"><ThumbsUp className="w-4 h-4" />{ev.votes}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Decisions */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <p className="font-semibold text-gray-700 mb-3 flex items-center gap-1"><Clock className="w-4 h-4 text-amber-500" /> Needs Your Decision</p>
            {pending.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing pending — you're all caught up!</p>
            ) : (
              <div className="space-y-2">
                {pending.map(ev => (
                  <div key={ev.id} onClick={() => openDetail(ev.id)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50 cursor-pointer border border-amber-100">
                    <span className="text-amber-500">⏳</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{ev.title}</p>
                      <p className="text-xs text-gray-500">{ev.event_date ? formatDate(ev.event_date) : 'No date'}</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Decide</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Approved */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <p className="font-semibold text-gray-700 mb-3 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Upcoming Approved</p>
            {approved.length === 0 ? (
              <p className="text-sm text-gray-400">No approved adventures yet</p>
            ) : (
              <div className="space-y-2">
                {approved.map(ev => (
                  <div key={ev.id} onClick={() => openDetail(ev.id)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-green-50 cursor-pointer">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{ev.title}</p>
                      <p className="text-xs text-gray-500">{ev.planned_date ? `Planned: ${formatDate(ev.planned_date)}` : ev.event_date ? formatDate(ev.event_date) : 'TBD'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showSubmit && <SubmitModal form={submitForm} setForm={setSubmitForm} submitting={submitting} onSubmit={handleSubmit} onClose={() => setShowSubmit(false)} />}
    </div>
  )
}

// ─── Submit Modal ──────────────────────────────
function SubmitModal({ form, setForm, submitting, onSubmit, onClose }: {
  form: { title: string; description: string; event_date: string; location: string; category: string; cost: string }
  setForm: (f: any) => void; submitting: boolean; onSubmit: () => void; onClose: () => void
}) {
  const categories = ['outdoors', 'arts', 'food', 'sports', 'animals', 'science', 'music', 'festival', 'market', 'other']
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Add an Adventure</h3>
        <input type="text" placeholder="What is it?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
        <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input type="text" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Category</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map(c => (
              <button key={c} onClick={() => setForm({ ...form, category: c })} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${form.category === c ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {CATEGORY_EMOJI[c]} {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Cost</p>
          <div className="flex gap-2">
            {Object.entries(COST_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setForm({ ...form, cost: k })} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${form.cost === k ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onSubmit} disabled={!form.title.trim() || submitting} className="flex-1 bg-teal-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
            {submitting ? 'Adding...' : 'Add Adventure'}
          </button>
        </div>
      </div>
    </div>
  )
}
