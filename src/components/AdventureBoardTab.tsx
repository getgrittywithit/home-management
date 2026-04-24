'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Send, MessageCircle, ChevronLeft, Plus, X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

const CATEGORIES = ['all', 'outdoors', 'arts', 'food', 'sports', 'animals', 'science', 'music', 'festival', 'market', 'other'] as const
const CATEGORY_EMOJI: Record<string, string> = {
  outdoors: '🏕️', arts: '🎨', food: '🍕', sports: '⚽', animals: '🐾', science: '🔬',
  music: '🎵', festival: '🎪', market: '🛍️', other: '📍',
}
const COST_LABEL: Record<string, string> = { free: 'Free', '$': '$', '$$': '$$', '$$$': '$$$' }
const PERSON_DISPLAY: Record<string, string> = {
  amos: 'Amos', zoey: 'Zoey', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', kaylee: 'Kaylee', lola: 'Mom', levi: 'Dad',
}

interface AdventureEvent {
  id: string; title: string; description: string | null; event_date: string | null
  event_time: string | null; location: string | null; category: string | null
  cost: string; source: string; submitted_by: string | null; status: string
  interest_count: number; interested_people: string[] | null; message_count: number
  latest_decision: string | null; created_at: string
}
interface Interest { id: number; person: string; interest_level: string; comment: string | null; created_at: string }
interface Message { id: number; person: string; message: string; created_at: string }
interface Decision { decision: string; decided_by: string; planned_date: string | null; notes: string | null }

export default function AdventureBoardTab({ childName }: { childName: string }) {
  const kid = childName.toLowerCase()
  const [events, setEvents] = useState<AdventureEvent[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ event: AdventureEvent; interests: Interest[]; messages: Message[]; decision: Decision | null } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)

  // Submit form state
  const [submitTitle, setSubmitTitle] = useState('')
  const [submitDesc, setSubmitDesc] = useState('')
  const [submitDate, setSubmitDate] = useState('')
  const [submitLocation, setSubmitLocation] = useState('')
  const [submitCategory, setSubmitCategory] = useState('other')
  const [submitting, setSubmitting] = useState(false)

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ action: 'get_feed' })
      if (filter !== 'all') params.set('category', filter)
      const res = await fetch(`/api/adventures?${params}`)
      const data = await res.json()
      setEvents(data.events || [])
    } catch { setEvents([]) }
    setLoading(false)
  }, [filter])

  useEffect(() => { loadFeed() }, [loadFeed])

  const loadDetail = async (eventId: string) => {
    setSelectedEvent(eventId)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/adventures?action=get_event&id=${eventId}`)
      const data = await res.json()
      setDetail(data)
    } catch { setDetail(null) }
    setDetailLoading(false)
  }

  const expressInterest = async (eventId: string, level: 'interested' | 'pass') => {
    await fetch('/api/adventures', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'express_interest', event_id: eventId, person: kid, interest_level: level })
    })
    // Refresh both feed and detail
    loadFeed()
    if (selectedEvent === eventId) loadDetail(eventId)
  }

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedEvent || sending) return
    setSending(true)
    await fetch('/api/adventures', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_comment', event_id: selectedEvent, person: kid, message: newMsg.trim() })
    })
    setNewMsg('')
    setSending(false)
    loadDetail(selectedEvent)
  }

  const submitEvent = async () => {
    if (!submitTitle.trim() || submitting) return
    setSubmitting(true)
    await fetch('/api/adventures', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_event', title: submitTitle.trim(), description: submitDesc.trim() || null,
        event_date: submitDate || null, location: submitLocation.trim() || null,
        category: submitCategory, submitted_by: kid, cost: 'free',
      })
    })
    setSubmitting(false)
    setShowSubmit(false)
    setSubmitTitle(''); setSubmitDesc(''); setSubmitDate(''); setSubmitLocation(''); setSubmitCategory('other')
    loadFeed()
  }

  // ── Detail View ──
  if (selectedEvent && detail) {
    const ev = detail.event
    const myInterest = detail.interests.find(i => i.person === kid)
    const interested = detail.interests.filter(i => i.interest_level !== 'pass')
    const passed = detail.interests.filter(i => i.interest_level === 'pass')
    const undecided = ['amos', 'zoey', 'ellie', 'wyatt', 'hannah', 'kaylee', 'lola', 'levi']
      .filter(p => !detail.interests.some(i => i.person === p))

    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedEvent(null); setDetail(null) }} className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800">
          <ChevronLeft className="w-4 h-4" /> Back to Board
        </button>

        {/* Event header */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-lg text-gray-900">{CATEGORY_EMOJI[ev.category || 'other'] || '📍'} {ev.title}</h2>
                {ev.event_date && <p className="text-sm text-gray-600 mt-1">{parseDateLocal(ev.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}{ev.event_time ? ` · ${ev.event_time}` : ''}</p>}
                {ev.location && <p className="text-sm text-gray-500">{ev.location}</p>}
              </div>
              {ev.cost && <span className={`px-2 py-1 rounded-full text-xs font-medium ${ev.cost === 'free' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{COST_LABEL[ev.cost] || ev.cost}</span>}
            </div>
            {ev.description && <p className="text-sm text-gray-700 mt-3">{ev.description}</p>}
            {detail.decision && (
              <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
                detail.decision.decision === 'approved' ? 'bg-green-100 text-green-800' :
                detail.decision.decision === 'maybe' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {detail.decision.decision === 'approved' ? '✅ Approved!' : detail.decision.decision === 'maybe' ? '🤔 Maybe' : '❌ Not this time'}
                {detail.decision.notes && <span className="font-normal"> — {detail.decision.notes}</span>}
              </div>
            )}
          </div>

          {/* Vote buttons */}
          {!detail.decision && (
            <div className="p-4 flex gap-2">
              <button
                onClick={() => expressInterest(ev.id, 'interested')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  myInterest?.interest_level === 'interested'
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-teal-100 hover:text-teal-800'
                }`}
              >
                <ThumbsUp className="w-4 h-4 inline mr-1" />
                {myInterest?.interest_level === 'interested' ? "I'm In!" : 'I Want To Go!'}
              </button>
              <button
                onClick={() => expressInterest(ev.id, 'pass')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  myInterest?.interest_level === 'pass'
                    ? 'bg-gray-400 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <ThumbsDown className="w-4 h-4 inline mr-1" /> Pass
              </button>
            </div>
          )}

          {/* Who's interested */}
          <div className="px-4 pb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">WHO'S INTERESTED?</p>
            <div className="space-y-1">
              {interested.map(i => (
                <div key={i.person} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">🙋</span>
                  <span className="font-medium text-gray-800">{PERSON_DISPLAY[i.person] || i.person}</span>
                  {i.comment && <span className="text-gray-500">— "{i.comment}"</span>}
                </div>
              ))}
              {passed.map(i => (
                <div key={i.person} className="flex items-center gap-2 text-sm text-gray-400">
                  <span>➖</span> <span>{PERSON_DISPLAY[i.person] || i.person} — pass</span>
                </div>
              ))}
              {undecided.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  ❓ {undecided.map(p => PERSON_DISPLAY[p] || p).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Family Chat */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> Family Chat
            </h3>
          </div>
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {detail.messages.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No messages yet — start the conversation!</p>
            )}
            {detail.messages.map(m => (
              <div key={m.id} className={`flex ${m.person === kid ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                  m.person === kid ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {m.person !== kid && <p className="text-xs font-semibold mb-0.5">{PERSON_DISPLAY[m.person] || m.person}</p>}
                  <p className="text-sm">{m.message}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <input
              type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Say something..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <button onClick={sendMessage} disabled={!newMsg.trim() || sending}
              className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Feed View ──
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-500" /> Adventure Board
        </h2>
        <button onClick={() => setShowSubmit(true)} className="bg-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-600 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Idea
        </button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === cat ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-100'
            }`}>
            {cat === 'all' ? '🌟 All' : `${CATEGORY_EMOJI[cat] || ''} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Event cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading adventures...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">🗺️</p>
          <p className="text-gray-500 text-sm">No adventures yet!</p>
          <p className="text-gray-400 text-xs mt-1">Be the first to suggest something fun.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const myVote = ev.interested_people?.includes(kid)
            return (
              <div key={ev.id} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <button onClick={() => loadDetail(ev.id)} className="w-full text-left p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {ev.latest_decision === 'approved' && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">✅ APPROVED</span>}
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {CATEGORY_EMOJI[ev.category || 'other'] || '📍'} {ev.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {ev.event_date && <span>{parseDateLocal(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                        {ev.location && <span>· {ev.location}</span>}
                        {ev.cost && ev.cost !== 'free' && <span>· {ev.cost}</span>}
                        {ev.cost === 'free' && <span className="text-green-600 font-medium">· Free</span>}
                      </div>
                    </div>
                  </div>

                  {/* Interest bar */}
                  {ev.interest_count > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-xs text-teal-600 font-medium">
                        👥 {ev.interested_people?.map(p => PERSON_DISPLAY[p] || p).join(', ')}
                        {ev.interest_count > 1 ? ' want to go!' : ' wants to go!'}
                      </span>
                    </div>
                  )}

                  {ev.message_count > 0 && (
                    <p className="text-xs text-gray-400 mt-1">💬 {ev.message_count} message{ev.message_count > 1 ? 's' : ''}</p>
                  )}
                </button>

                {/* Quick vote buttons (only if no decision yet) */}
                {!ev.latest_decision && (
                  <div className="px-4 pb-3 flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); expressInterest(ev.id, 'interested') }}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        myVote ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                      }`}>
                      {myVote ? "✓ I'm In!" : '🙋 I Want To Go!'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); expressInterest(ev.id, 'pass') }}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-50 text-gray-400 hover:bg-gray-100">
                      Pass
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Submit modal */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center" onClick={() => setShowSubmit(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">🗺️ Suggest an Adventure</h3>
              <button onClick={() => setShowSubmit(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">What is it? *</label>
                <input type="text" value={submitTitle} onChange={e => setSubmitTitle(e.target.value)}
                  placeholder="Tractor Pull, Craft Fair, Hiking Trail..."
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Why do you want to go?</label>
                <input type="text" value={submitDesc} onChange={e => setSubmitDesc(e.target.value)}
                  placeholder="It looks really cool because..."
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">When?</label>
                  <input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Where?</label>
                  <input type="text" value={submitLocation} onChange={e => setSubmitLocation(e.target.value)}
                    placeholder="Boerne, SA..."
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Category</label>
                <select value={submitCategory} onChange={e => setSubmitCategory(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  {CATEGORIES.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{CATEGORY_EMOJI[c] || ''} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <button onClick={submitEvent} disabled={!submitTitle.trim() || submitting}
                className="w-full bg-teal-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Adventure Idea 🗺️'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
