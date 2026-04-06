'use client'

import { useState, useEffect } from 'react'
import { Users, Shuffle, Star, CheckCircle2, Calendar, Utensils, Dog, MessageSquare, Loader2, Printer, ClipboardList, ArrowRight, ListTodo } from 'lucide-react'
import ParentPrep from './huddle/ParentPrep'
import HuddleMiniGame from './huddle/HuddleMiniGame'
import HuddleBonusRound from './huddle/HuddleBonusRound'

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
  const [mode, setMode] = useState<'quick' | 'full'>('full')
  const [actionItems, setActionItems] = useState<string[]>([])
  const [actionInput, setActionInput] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  const fetchCurrent = async () => {
    setLoading(true)
    const latest = await fetch('/api/family-huddle?action=get_latest').then(r => r.json()).catch(() => ({}))
    if (latest.huddle) {
      setHuddle(latest.huddle)
      setShares(latest.shares || [])
      setNotes(latest.huddle.notes || '')
      setMode(latest.huddle.mode || 'full')
      // Init share inputs from existing shares (including pre-submitted)
      const inputs: Record<string, { type: string; content: string }> = {}
      for (const s of (latest.shares || [])) {
        inputs[s.kid_name] = { type: s.share_type || 'win', content: s.content || '' }
      }
      setShareInputs(inputs)
      // Normalize date to YYYY-MM-DD (Postgres may return full ISO string)
      const huddleDate = typeof latest.huddle.huddle_date === 'string' ? latest.huddle.huddle_date.slice(0, 10) : latest.huddle.huddle_date
      const agendaRes = await postAction('generate_agenda', { date: huddleDate })
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
      setMode(res.huddle.mode || 'full')
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
    for (const kid of KIDS) {
      const input = shareInputs[kid]
      if (input?.content?.trim()) {
        await postAction('save_share', { huddle_id: huddle.id, kid_name: kid, share_type: input.type, content: input.content })
      }
    }
    if (notes.trim()) await postAction('save_notes', { huddle_id: huddle.id, notes })
    await postAction('complete_huddle', { huddle_id: huddle.id, mode })
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

  const handleToggleMode = async (newMode: 'quick' | 'full') => {
    setMode(newMode)
    if (huddle) {
      await postAction('set_mode', { huddle_id: huddle.id, mode: newMode })
    }
  }

  const handleCreateTodo = async (kidName: string, title: string, shareId?: number) => {
    if (!huddle) return
    await postAction('create_action_item', { huddle_id: huddle.id, kid_name: kidName.toLowerCase(), title, destination: 'my_day', share_id: shareId })
    showToast('Added to your My Day!')
  }

  const handleAddActionItem = async () => {
    if (!actionInput.trim() || !huddle) return
    await postAction('create_action_item', { huddle_id: huddle.id, title: actionInput, destination: 'my_day' })
    setActionItems(prev => [...prev, actionInput])
    setActionInput('')
    showToast('Action item created!')
  }

  const nextHost = huddle ? cap(HOST_ROTATION[(HOST_ROTATION.indexOf(huddle.host_kid) + 1) % HOST_ROTATION.length]) : ''
  const hostDisplay = huddle ? cap(huddle.host_kid) : ''
  const hostEmoji = huddle ? KID_EMOJIS[huddle.host_kid] || '' : ''
  const statusBadge = huddle ? STATUS_BADGES[huddle.status] || STATUS_BADGES.pending : STATUS_BADGES.pending

  // FIX 2: Robust date formatting
  const formatHuddleDate = (d: any) => {
    if (!d) return ''
    try {
      const str = typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)
      const [y, m, day] = str.split('-').map(Number)
      const dateObj = new Date(y, m - 1, day)
      return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    } catch {
      return ''
    }
  }
  const huddleDateStr = huddle ? formatHuddleDate(huddle.huddle_date) : ''

  if (loading) return <div className="p-6 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto relative">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-fade-in">
          {'\u2705'} {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Family Huddle
          </h2>
          {huddle && <p className="text-sm text-gray-500">{huddleDateStr}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* Quick/Full Toggle */}
          {huddle && (
            <div className="flex rounded-lg overflow-hidden border text-xs">
              <button onClick={() => handleToggleMode('quick')}
                className={`px-3 py-1.5 font-medium transition ${mode === 'quick' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Quick Check-In
              </button>
              <button onClick={() => handleToggleMode('full')}
                className={`px-3 py-1.5 font-medium transition ${mode === 'full' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Full Huddle
              </button>
            </div>
          )}
          {huddle && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge.color}`}>{statusBadge.label}</span>}
          {huddle && (
            <button onClick={() => window.open('/printable/weekly', '_blank')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          )}
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

      {/* History View */}
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
                {h.mode && <span className="text-xs text-gray-400">{h.mode === 'quick' ? 'Quick' : 'Full'}</span>}
                {h.game_type && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{h.game_type.replace(/_/g, ' ')}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${(STATUS_BADGES[h.status] || STATUS_BADGES.pending).color}`}>
                  {(STATUS_BADGES[h.status] || STATUS_BADGES.pending).label}
                </span>
                {h.share_count > 0 && <span className="text-xs text-gray-400">{h.share_count} shares</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {view === 'current' && !huddle && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No huddle generated yet this week.</p>
          <p className="text-sm text-gray-400 mt-1">Click &quot;Generate This Week&apos;s Agenda&quot; to get started.</p>
        </div>
      )}

      {/* Current Huddle */}
      {view === 'current' && huddle && (
        <div className="space-y-5">
          {/* Parent Prep — collapsed by default, parent-eyes-only */}
          <ParentPrep huddleId={huddle.id} mode={mode} />

          {/* Action buttons + pre-submit count */}
          <div className="flex gap-2 items-center">
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
            {agenda?.pre_submit_count > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full ml-auto">
                {'\uD83D\uDCDD'} {agenda.pre_submit_count} of 6 kids pre-submitted
              </span>
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

          {/* Mini Game */}
          <HuddleMiniGame huddleId={huddle.id} mode={mode} />

          {/* ═══ PRIORITY CONTENT (shown in both Quick & Full) ═══ */}

          {/* Stars & Shoutouts + Auto Wins */}
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

              {/* Auto-Detected Wins */}
              {agenda.celebrations?.length > 0 ? (
                <div className="mt-4 pt-3 border-t space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">This Week&apos;s Wins</p>
                  {agenda.celebrations.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-amber-50 rounded-lg px-3 py-2">
                      <span>{c.emoji}</span>
                      <span className="font-semibold text-gray-800">{c.kid}:</span>
                      <span className="text-gray-700">{c.text}</span>
                      {c.from && <span className="text-xs text-gray-400 ml-auto">from {c.from}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-400">Everyone&apos;s building &mdash; keep it up!</p>
                </div>
              )}
            </div>
          )}

          {/* Zone Recap (priority in Full; shows in Quick only if someone is below 30%) */}
          {agenda?.zone_recap && (mode === 'full' || agenda.zone_recap.assignments?.some((a: any) => a.completion_pct !== null && a.completion_pct < 30)) && (
            <div className="bg-white rounded-lg border shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                <ClipboardList className="w-4 h-4 text-green-600" /> Zone Recap
              </h3>
              <p className="text-xs text-gray-500 mb-3">{agenda.zone_recap.week_label}</p>
              <div className="space-y-2">
                {agenda.zone_recap.assignments?.map((a: any) => (
                  <div key={a.kid} className="flex items-center gap-3">
                    <span className="font-medium text-gray-900 w-20">{a.kid}</span>
                    <span className="text-sm bg-green-50 text-green-700 px-2 py-0.5 rounded">{a.zone}</span>
                    {a.completion_pct !== null && (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                          <div className={`h-full rounded-full ${a.completion_pct >= 70 ? 'bg-green-500' : a.completion_pct >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(a.completion_pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{a.completion_pct}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {agenda.zone_recap.assignments?.some((a: any) => a.completion_pct !== null && a.completion_pct < 30) && (
                <p className="text-xs text-amber-600 mt-3 italic">
                  Let&apos;s help {agenda.zone_recap.assignments.filter((a: any) => a.completion_pct !== null && a.completion_pct < 30).map((a: any) => a.kid).join(' & ')} catch up this week
                </p>
              )}
            </div>
          )}

          {/* Everyone Shares */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Everyone Shares</h3>
            <p className="text-xs text-gray-500 mb-3">Host calls on each person. Share a WIN or something you&apos;re LOOKING FORWARD TO.</p>
            <div className="space-y-3">
              {KIDS.map(kid => {
                const existing = shares.find((s: any) => s.kid_name === kid)
                const preSubmitted = existing?.pre_submitted
                const input = shareInputs[kid] || { type: existing?.share_type || 'win', content: existing?.content || '' }
                return (
                  <div key={kid} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{KID_EMOJIS[kid]}</span>
                      <span className="font-medium text-gray-900">{cap(kid)}</span>
                      {preSubmitted && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">{'\uD83D\uDCDD'} Pre-submitted</span>}
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
                    <div className="flex gap-2">
                      <input type="text" value={input.content}
                        onChange={e => setShareInputs(prev => ({ ...prev, [kid]: { ...input, content: e.target.value } }))}
                        placeholder={`What did ${cap(kid)} share?`}
                        className="flex-1 border rounded px-3 py-1.5 text-sm" />
                      {input.content?.trim() && (
                        <button
                          onClick={() => handleCreateTodo(kid, `${cap(kid)}: ${input.content}`, existing?.id)}
                          className="text-xs text-indigo-500 hover:text-indigo-700 whitespace-nowrap flex items-center gap-0.5"
                          title="Create To-Do from this share">
                          <ArrowRight className="w-3 h-3" /> To-Do
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ═══ DIVIDER — Full mode only below this line ═══ */}
          {mode === 'full' && (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 border-t border-gray-300" />
                <p className="text-xs text-gray-400 italic whitespace-nowrap">Essentials covered &mdash; everything below is bonus family time</p>
                <div className="flex-1 border-t border-gray-300" />
              </div>

              {/* Belle Care */}
              {agenda?.belle_this_week && (
                <div className="bg-white rounded-lg border shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Dog className="w-4 h-4 text-amber-600" /> Belle Care This Week
                  </h3>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {['monday','tuesday','wednesday','thursday','friday'].map(day => (
                      <div key={day} className="bg-amber-50 px-3 py-1.5 rounded-lg">
                        <span className="text-gray-500 capitalize">{day.slice(0, 3)}: </span>
                        <span className="font-medium text-gray-900">{agenda.belle_this_week[day]}</span>
                      </div>
                    ))}
                    <div className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                      <span className="text-gray-500">Sat &amp; Sun: </span>
                      <span className="font-bold text-green-800">{agenda.belle_this_week.weekend_owner}</span>
                    </div>
                  </div>
                  {agenda.belle_this_week.grooming && (agenda.belle_this_week.grooming.bath || agenda.belle_this_week.grooming.nails) && (
                    <div className="mt-2 flex gap-3 text-xs text-gray-600">
                      {agenda.belle_this_week.grooming.bath && <span>{'\uD83D\uDEC1'} Bath Time Saturday</span>}
                      {agenda.belle_this_week.grooming.nails && <span>{'\uD83D\uDC85'} Nail Trim Sunday</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Meal Plan Preview */}
              {agenda?.meal_plan?.length > 0 && (
                <div className="bg-white rounded-lg border shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Utensils className="w-4 h-4 text-emerald-500" /> Meal Plan This Week
                    {agenda.meal_week && <span className="text-xs text-gray-400 font-normal">(Week {agenda.meal_week})</span>}
                  </h3>
                  <div className="space-y-1.5">
                    {agenda.meal_plan.map((m: any) => (
                      <div key={m.day} className="flex items-center gap-3 text-sm">
                        <span className="w-20 text-gray-500">{m.day}</span>
                        <span className="flex-1 text-gray-700">{m.theme}</span>
                        <span className="text-gray-500">{m.manager}</span>
                        <span className={m.meal ? 'text-green-600 font-medium' : 'text-gray-400'}>{m.meal || '?'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming This Week */}
              <div className="bg-white rounded-lg border shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-blue-500" /> Upcoming This Week
                </h3>
                {(!agenda?.upcoming_events || agenda.upcoming_events.length === 0) ? (
                  <p className="text-sm text-gray-400">No events this week &mdash; enjoy the quiet!</p>
                ) : (
                  <div className="space-y-1.5">
                    {agenda.upcoming_events.map((ev: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500">{ev.date}</span>
                        <span className="text-gray-700">{ev.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Open Requests */}
              <div className="bg-white rounded-lg border shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-blue-500" /> Open Requests & Notes
                </h3>
                {(!agenda?.open_requests || agenda.open_requests.length === 0) ? (
                  <p className="text-sm text-gray-400">All caught up &mdash; no open requests!</p>
                ) : (
                  <div className="space-y-2">
                    {agenda.open_requests.map((req: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm bg-blue-50 rounded-lg px-3 py-2">
                        <span className="font-medium text-blue-700">{cap(req.from)}:</span>
                        <span className="text-gray-700 flex-1">{req.content}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{req.type.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bonus Round */}
              {agenda?.bonus_type && (
                <HuddleBonusRound
                  huddleId={huddle.id}
                  bonusType={huddle.bonus_type || agenda.bonus_type}
                  onCreateTodo={(kid, title) => handleCreateTodo(kid, `Goal: ${title}`)}
                />
              )}
            </>
          )}

          {/* Wrap-Up Notes + Action Items */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Wrap-Up Notes</h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Decisions made, follow-ups, things to remember..."
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button onClick={handleSaveNotes} disabled={saving}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              {saving ? 'Saving...' : 'Save Notes'}
            </button>

            {/* Action Items */}
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <ListTodo className="w-3.5 h-3.5" /> Action Items
              </p>
              {actionItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-gray-700">{item}</span>
                  <span className="text-xs text-gray-400">created</span>
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <input type="text" value={actionInput} onChange={e => setActionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddActionItem()}
                  placeholder="Add an action item..."
                  className="flex-1 border rounded px-3 py-1.5 text-sm" />
                <button onClick={handleAddActionItem} disabled={!actionInput.trim()}
                  className="px-3 py-1.5 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 disabled:opacity-50">
                  + Create Task
                </button>
              </div>
            </div>
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
