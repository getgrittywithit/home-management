'use client'

import { useState, useEffect } from 'react'
import { Users, Shuffle, Trophy, Star, CheckCircle2, Calendar, Utensils, Dog, MessageSquare, ChevronDown, ChevronUp, Clock, Loader2 } from 'lucide-react'

const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
const KID_EMOJIS: Record<string, string> = {
  amos: '\uD83E\uDD89', zoey: '\uD83C\uDF1F', kaylee: '\uD83C\uDFAD',
  ellie: '\uD83D\uDCA1', wyatt: '\u26A1', hannah: '\uD83C\uDF3B',
}
const HOST_ROTATION = ['amos', 'kaylee', 'hannah', 'ellie', 'wyatt', 'zoey']
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  skipped: { label: 'Skipped', color: 'bg-gray-100 text-gray-400' },
}
const SHARE_TYPES = [
  { id: 'win', label: 'Win', emoji: '\uD83C\uDFC6' },
  { id: 'looking_forward', label: 'Looking Forward', emoji: '\uD83D\uDE80' },
  { id: 'shoutout', label: 'Shoutout', emoji: '\uD83D\uDC4F' },
  { id: 'request', label: 'Request', emoji: '\uD83D\uDE4B' },
  { id: 'concern', label: 'Concern', emoji: '\uD83D\uDCAD' },
]
const CAT_COLORS: Record<string, string> = {
  fun: 'bg-purple-100 text-purple-700', would_you_rather: 'bg-blue-100 text-blue-700',
  family_trivia: 'bg-amber-100 text-amber-700', this_or_that: 'bg-pink-100 text-pink-700',
  dream_big: 'bg-teal-100 text-teal-700', gratitude: 'bg-green-100 text-green-700',
  silly: 'bg-orange-100 text-orange-700',
}

const postAction = async (action: string, body: any = {}) => {
  const res = await fetch('/api/family-huddle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) })
  return res.json()
}

export default function FamilyHuddle() {
  const [huddle, setHuddle] = useState<any>(null)
  const [shares, setShares] = useState<any[]>([])
  const [agenda, setAgenda] = useState<any>(null)
  const [view, setView] = useState<'current' | 'history'>('current')
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [shareInputs, setShareInputs] = useState<Record<string, { type: string; content: string }>>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchCurrent = async () => {
    setLoading(true)
    // Try to get latest
    const latest = await fetch('/api/family-huddle?action=get_latest').then(r => r.json()).catch(() => ({}))
    if (latest.huddle) {
      setHuddle(latest.huddle)
      setShares(latest.shares || [])
      setNotes(latest.huddle.notes || '')
      // Fetch agenda data
      const agendaRes = await postAction('generate_agenda', { date: latest.huddle.huddle_date })
      setAgenda(agendaRes.agenda || null)
    }
    setLoading(false)
  }

  const fetchHistory = async () => {
    const res = await fetch('/api/family-huddle?action=get_history').then(r => r.json()).catch(() => ({}))
    setHistory(res.history || [])
  }

  useEffect(() => { fetchCurrent(); fetchHistory() }, [])

  const handleGenerate = async () => {
    setLoading(true)
    const res = await postAction('generate_agenda')
    if (res.huddle) {
      setHuddle(res.huddle)
      setShares(res.shares || [])
      setAgenda(res.agenda || null)
      setNotes(res.huddle.notes || '')
    }
    setLoading(false)
    fetchHistory()
  }

  const handleStart = async () => {
    if (!huddle) return
    await postAction('start_huddle', { huddle_id: huddle.id })
    setHuddle((h: any) => ({ ...h, status: 'in_progress' }))
  }

  const handleComplete = async () => {
    if (!huddle) return
    // Save all pending shares
    for (const kid of KIDS) {
      const input = shareInputs[kid]
      if (input?.content?.trim()) {
        await postAction('save_share', { huddle_id: huddle.id, kid_name: kid, share_type: input.type, content: input.content })
      }
    }
    if (notes.trim()) await postAction('save_notes', { huddle_id: huddle.id, notes })
    await postAction('complete_huddle', { huddle_id: huddle.id })
    setHuddle((h: any) => ({ ...h, status: 'completed' }))
    fetchHistory()
  }

  const handleSkip = async () => {
    if (!huddle) return
    const reason = prompt('Reason for skipping? (optional)')
    await postAction('skip_huddle', { huddle_id: huddle.id, notes: reason })
    setHuddle((h: any) => ({ ...h, status: 'skipped' }))
    fetchHistory()
  }

  const handleReshuffle = async () => {
    if (!huddle) return
    const res = await postAction('reshuffle_icebreaker', { huddle_id: huddle.id })
    if (res.icebreaker) {
      setHuddle((h: any) => ({ ...h, icebreaker_question: res.icebreaker.question, icebreaker_category: res.icebreaker.category }))
    }
  }

  const handleSaveNotes = async () => {
    if (!huddle) return
    setSaving(true)
    await postAction('save_notes', { huddle_id: huddle.id, notes })
    setSaving(false)
  }

  const nextHost = huddle ? cap(HOST_ROTATION[(HOST_ROTATION.indexOf(huddle.host_kid) + 1) % HOST_ROTATION.length]) : ''
  const hostDisplay = huddle ? cap(huddle.host_kid) : ''
  const hostEmoji = huddle ? KID_EMOJIS[huddle.host_kid] || '' : ''
  const statusBadge = huddle ? STATUS_BADGES[huddle.status] || STATUS_BADGES.pending : STATUS_BADGES.pending
  const huddleDateStr = huddle ? new Date(huddle.huddle_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''

  if (loading) return <div className="p-6 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Family Huddle
          </h2>
          {huddle && <p className="text-sm text-gray-500">{huddleDateStr}</p>}
        </div>
        <div className="flex items-center gap-2">
          {huddle && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge.color}`}>{statusBadge.label}</span>}
          <button onClick={() => setView(view === 'history' ? 'current' : 'history')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            {view === 'history' ? 'This Week' : 'History'}
          </button>
          {!huddle && (
            <button onClick={handleGenerate}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 text-sm">
              Generate This Week&apos;s Agenda
            </button>
          )}
        </div>
      </div>

      {view === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No past huddles yet.</p>
          ) : history.map((h: any) => (
            <div key={h.id} className="bg-white rounded-lg border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {new Date(h.huddle_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' \u2014 '} Host: {cap(h.host_kid)} {KID_EMOJIS[h.host_kid] || ''}
                </p>
                {h.icebreaker_question && <p className="text-xs text-gray-500 italic mt-0.5">&quot;{h.icebreaker_question}&quot;</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${(STATUS_BADGES[h.status] || STATUS_BADGES.pending).color}`}>
                  {(STATUS_BADGES[h.status] || STATUS_BADGES.pending).label}
                </span>
                {h.share_count > 0 && <span className="text-xs text-gray-400">{h.share_count} shares</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'current' && !huddle && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No huddle generated yet this week.</p>
          <p className="text-sm text-gray-400 mt-1">Click &quot;Generate This Week&apos;s Agenda&quot; to get started.</p>
        </div>
      )}

      {view === 'current' && huddle && (
        <div className="space-y-5">
          {/* Action buttons */}
          <div className="flex gap-2">
            {huddle.status === 'pending' && (
              <button onClick={handleStart} className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 text-sm">
                Start Huddle
              </button>
            )}
            {huddle.status === 'in_progress' && (
              <button onClick={handleComplete} className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 text-sm">
                Complete Huddle
              </button>
            )}
            {(huddle.status === 'pending' || huddle.status === 'in_progress') && (
              <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600">Skip This Week</button>
            )}
          </div>

          {/* Host Spotlight */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white text-center">
            <p className="text-sm opacity-80 mb-1">This Week&apos;s Host</p>
            <p className="text-3xl font-bold">{hostEmoji} {hostDisplay}!</p>
            <p className="text-sm opacity-70 mt-2">Next week: {nextHost}</p>
          </div>

          {/* Icebreaker */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-5 relative">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[huddle.icebreaker_category] || 'bg-gray-100 text-gray-600'}`}>
                  {huddle.icebreaker_category?.replace(/_/g, ' ')}
                </span>
                <p className="text-lg font-semibold text-gray-900 mt-2">{huddle.icebreaker_question}</p>
              </div>
              <button onClick={handleReshuffle} className="p-2 hover:bg-white/50 rounded-lg transition" title="New question">
                <Shuffle className="w-4 h-4 text-purple-600" />
              </button>
            </div>
          </div>

          {/* Stars & Shoutouts */}
          {agenda?.stars_leaderboard?.length > 0 && (
            <div className="bg-white rounded-lg border shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-500" /> Stars & Shoutouts
              </h3>
              <div className="space-y-2">
                {agenda.stars_leaderboard.map((kid: any, i: number) => (
                  <div key={kid.kid} className="flex items-center gap-3">
                    <span className="w-5 text-center text-sm">{i === 0 ? '\uD83D\uDC51' : `#${i + 1}`}</span>
                    <span className="font-medium text-gray-900 flex-1">{kid.kid} {KID_EMOJIS[kid.kid?.toLowerCase()] || ''}</span>
                    <span className="text-sm text-amber-600 font-semibold">{kid.stars} stars</span>
                    {kid.streak >= 3 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{'\uD83D\uDD25'} {kid.streak}d streak</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meal Plan Preview */}
          {agenda?.meal_plan?.length > 0 && (
            <div className="bg-white rounded-lg border shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Utensils className="w-4 h-4 text-emerald-500" /> This Week&apos;s Meals
              </h3>
              <div className="space-y-1.5">
                {agenda.meal_plan.map((m: any) => (
                  <div key={m.day} className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-gray-500">{m.day}</span>
                    <span className="flex-1 text-gray-700">{m.theme}</span>
                    <span className="text-gray-500">{m.manager}</span>
                    <span className="text-gray-400">{m.meal || '?'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Belle Care */}
          {agenda?.belle_this_week && (
            <div className="bg-white rounded-lg border shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Dog className="w-4 h-4 text-amber-600" /> Belle Care This Week
              </h3>
              <div className="flex flex-wrap gap-3 text-sm">
                {Object.entries(agenda.belle_this_week).filter(([k]) => !['grooming'].includes(k)).map(([day, kid]) => (
                  <div key={day} className="bg-amber-50 px-3 py-1.5 rounded-lg">
                    <span className="text-gray-500 capitalize">{day.slice(0, 3)}: </span>
                    <span className="font-medium text-gray-900">{kid as string}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Requests */}
          {agenda?.open_requests?.length > 0 && (
            <div className="bg-white rounded-lg border shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-blue-500" /> Open Requests
              </h3>
              <div className="space-y-2">
                {agenda.open_requests.map((req: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-blue-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-blue-700">{cap(req.from)}:</span>
                    <span className="text-gray-700">{req.content}</span>
                    <span className="text-xs text-gray-400 ml-auto">{req.type.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Everyone Shares */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Everyone Shares</h3>
            <p className="text-xs text-gray-500 mb-3">Host calls on each person. Share a WIN or something you&apos;re LOOKING FORWARD TO.</p>
            <div className="space-y-3">
              {KIDS.map(kid => {
                const existing = shares.find((s: any) => s.kid_name === kid)
                const input = shareInputs[kid] || { type: 'win', content: existing?.content || '' }
                return (
                  <div key={kid} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{KID_EMOJIS[kid]}</span>
                      <span className="font-medium text-gray-900">{cap(kid)}</span>
                      {existing && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {SHARE_TYPES.map(st => (
                        <button key={st.id} onClick={() => setShareInputs(prev => ({ ...prev, [kid]: { ...input, type: st.id } }))}
                          className={`px-2 py-0.5 rounded text-xs ${input.type === st.id ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {st.emoji} {st.label}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={input.content}
                      onChange={e => setShareInputs(prev => ({ ...prev, [kid]: { ...input, content: e.target.value } }))}
                      placeholder={`What did ${cap(kid)} share?`}
                      className="w-full border rounded px-3 py-1.5 text-sm" />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Wrap-Up Notes */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Wrap-Up Notes</h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Decisions made, follow-ups, things to remember..."
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button onClick={handleSaveNotes} disabled={saving}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>

          {/* Complete button at bottom */}
          {huddle.status === 'in_progress' && (
            <button onClick={handleComplete}
              className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 text-sm">
              Complete Huddle
            </button>
          )}
        </div>
      )}
    </div>
  )
}
