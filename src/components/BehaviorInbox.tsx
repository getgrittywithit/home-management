'use client'

import { useState, useEffect } from 'react'
import {
  MessageCircle, Check, MessageSquare, Zap, Star, Loader2,
  ChevronDown, ChevronUp, X, Archive, Flag, Undo2,
} from 'lucide-react'

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

const BEHAVIOR_TYPES = [
  'mean_verbal', 'bullying', 'physical', 'defiance', 'destruction',
  'disrespect', 'lying', 'rough_pet', 'mean_outside',
  'positive', 'helpful_sibling', 'kind_pet', 'good_public', 'conflict_resolution',
]

const TYPE_LABELS: Record<string, string> = {
  mean_verbal: 'Mean to sibling (verbal)', bullying: 'Bullying', physical: 'Physical altercation',
  defiance: 'Deliberate defiance', destruction: 'Property destruction', disrespect: 'Disrespect',
  lying: 'Lying', rough_pet: 'Rough with pet', mean_outside: 'Mean to outsider',
  positive: 'Positive behavior', helpful_sibling: 'Helpful to sibling',
  kind_pet: 'Kind to pet', good_public: 'Good in public', conflict_resolution: 'Conflict resolution',
}

const TIER_DEFAULTS: Record<string, number> = {
  mean_verbal: 2, bullying: 3, physical: 3, defiance: 2, destruction: 3,
  disrespect: 2, lying: 2, rough_pet: 2, mean_outside: 1,
  positive: 0, helpful_sibling: 0, kind_pet: 0, good_public: 0, conflict_resolution: 0,
}

const TIER_COLORS: Record<number, string> = {
  0: 'bg-green-100 text-green-700 border-green-200',
  1: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  2: 'bg-orange-100 text-orange-700 border-orange-200',
  3: 'bg-red-100 text-red-700 border-red-200',
  4: 'bg-purple-100 text-purple-700 border-purple-200',
}

const TIER_LABELS: Record<number, string> = {
  0: 'Positive Catch', 1: 'Heads Up', 2: 'Consequence', 3: 'Serious', 4: 'Family Meeting',
}

const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']

// D81 CHECKIN-6: clean, parent-friendly status labels
const STATUS_META: Record<string, { label: string; color: string }> = {
  new:           { label: 'New',        color: 'bg-red-100 text-red-700' },
  acknowledged:  { label: 'Seen',       color: 'bg-gray-100 text-gray-600' },
  talk_first:    { label: 'Talk first', color: 'bg-blue-100 text-blue-700' },
  escalated:     { label: 'Responded',  color: 'bg-orange-100 text-orange-700' },
  responded:     { label: 'Responded',  color: 'bg-emerald-100 text-emerald-700' },
  dismissed:     { label: 'Dismissed',  color: 'bg-gray-100 text-gray-500' },
}

// D81 CHECKIN-2: genuine relative time from created_at
function formatCheckinTime(createdAt: string | null): string {
  if (!createdAt) return ''
  const then = new Date(createdAt)
  if (isNaN(then.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  // < 24 hours → relative only
  if (diffDay < 1) {
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`
    return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  }
  // ≥ 24 hours → absolute only
  return then.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function BehaviorInbox() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'new' | 'all' | 'good' | 'bad'>('new')
  const [showDismissed, setShowDismissed] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [escalateForm, setEscalateForm] = useState<{
    reportId: number; behaviorType: string; tier: number;
    gemDeduction: number; starDeduction: number; note: string
  } | null>(null)
  const [awardForm, setAwardForm] = useState<{ reportId: number; kidName: string; stars: number; reason: string } | null>(null)
  const [flagForm, setFlagForm] = useState<{ reportId: number; kidName: string; note: string; starDeduction: number } | null>(null)
  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2500) }

  const loadReports = async () => {
    const params = new URLSearchParams()
    params.set('action', 'get_reports')
    if (filter === 'new') params.set('status', 'new')
    if (showDismissed) params.set('include_dismissed', '1')
    const res = await fetch(`/api/kid-reports?${params.toString()}`).then(r => r.json()).catch(() => ({}))
    let items: any[] = res.reports || []
    if (filter === 'good') items = items.filter(r => r.good_bad_neutral === 'good')
    if (filter === 'bad') items = items.filter(r => r.good_bad_neutral === 'bad')
    setReports(items)
    setLoading(false)
  }

  useEffect(() => { loadReports() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter, showDismissed])

  const handleAcknowledge = async (id: number) => {
    await fetch('/api/kid-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acknowledge_report', id }),
    }).catch(() => {})
    showToast('Marked as seen')
    loadReports()
  }

  const handleTalkFirst = async (id: number) => {
    await fetch('/api/kid-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'flag_talk_first', id }),
    }).catch(() => {})
    showToast('Added to your My Day — talk to this kid')
    loadReports()
  }

  const handleDismiss = async (id: number) => {
    await fetch('/api/kid-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss_report', id }),
    }).catch(() => {})
    showToast('Dismissed')
    loadReports()
  }

  const handleUndismiss = async (id: number) => {
    await fetch('/api/kid-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'undismiss_report', id }),
    }).catch(() => {})
    showToast('Restored')
    loadReports()
  }

  const openAwardStars = (report: any) => {
    setAwardForm({
      reportId: report.id,
      kidName: report.submitting_kid,
      stars: 5,
      reason: report.what_happened?.slice(0, 120) || '',
    })
  }

  const handleAwardStars = async () => {
    if (!awardForm) return
    const { reportId, kidName, stars, reason } = awardForm
    await fetch('/api/kid-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'award_stars_from_report', id: reportId, kid_name: kidName, stars, reason }),
    }).catch(() => {})
    setAwardForm(null)
    showToast(`⭐ ${stars} star${stars === 1 ? '' : 's'} → ${cap(kidName)}`)
    loadReports()
  }

  const openFlag = (report: any) => {
    setFlagForm({
      reportId: report.id,
      kidName: report.submitting_kid,
      note: '',
      starDeduction: 0,
    })
  }

  const handleFlag = async () => {
    if (!flagForm) return
    await fetch('/api/kid-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'quick_flag_report',
        id: flagForm.reportId,
        kid_name: flagForm.kidName,
        note: flagForm.note || null,
        star_deduction: flagForm.starDeduction,
      }),
    }).catch(() => {})
    setFlagForm(null)
    showToast(`Flag logged${flagForm.starDeduction > 0 ? ` (−${flagForm.starDeduction} stars)` : ''}`)
    loadReports()
  }

  const startEscalate = (report: any) => {
    setEscalateForm({
      reportId: report.id, behaviorType: 'defiance', tier: 2,
      gemDeduction: 10, starDeduction: 0, note: '',
    })
  }

  const handleEscalate = async () => {
    if (!escalateForm) return
    const tier = escalateForm.tier
    await fetch('/api/kid-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'escalate_to_behavior_event', id: escalateForm.reportId,
        behavior_type: escalateForm.behaviorType, severity_tier: tier,
        gem_deduction: tier >= 2 ? escalateForm.gemDeduction : 0,
        star_deduction: tier >= 3 ? escalateForm.starDeduction : 0,
        parent_note: escalateForm.note,
      }),
    }).catch(() => {})
    setEscalateForm(null)
    showToast(`Behavior event logged (Level ${tier})`)
    loadReports()
  }

  const handleQuickPositive = async (kidName: string) => {
    await fetch('/api/behavior-events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'quick_positive_catch', kid_name: kidName, description: 'Caught being good!' }),
    }).catch(() => {})
    showToast(`+5 gems to ${cap(kidName)}!`)
  }

  const TAG_COLORS: Record<string, string> = {
    good: 'bg-green-100 text-green-700',
    bad: 'bg-red-100 text-red-700',
    neutral: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-4">
      {toastMsg && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
          ✅ {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-500" /> Family Check-Ins
        </h3>
        <div className="flex items-center gap-1">
          <div className="relative group">
            <button className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 flex items-center gap-1">
              <Star className="w-3 h-3" /> Quick +5 Gems
            </button>
            <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 py-1 w-32">
              {KIDS.map(kid => (
                <button key={kid} onClick={() => handleQuickPositive(kid)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-green-50">{cap(kid)}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {([
            { id: 'new' as const, label: 'New' },
            { id: 'all' as const, label: 'All' },
            { id: 'bad' as const, label: 'Bad' },
            { id: 'good' as const, label: 'Good' },
          ]).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === f.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{f.label}</button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDismissed}
            onChange={(e) => setShowDismissed(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300"
          />
          Show dismissed
        </label>
      </div>

      {loading && <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>}

      {!loading && reports.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>No reports yet.</p>
        </div>
      )}

      {/* Report cards */}
      {reports.map((r: any) => {
        const isExpanded = expandedId === r.id
        const tagColor = TAG_COLORS[r.good_bad_neutral] || TAG_COLORS.neutral
        const statusMeta = STATUS_META[r.status] || { label: cap(r.status), color: 'bg-gray-100 text-gray-500' }
        const isDismissed = !!r.dismissed_at
        const relTime = formatCheckinTime(r.created_at)
        const moodEmoji = r.good_bad_neutral === 'good' ? '😊' : r.good_bad_neutral === 'bad' ? '😟' : '🤷'
        const moodLabel = r.good_bad_neutral === 'good' ? 'Good' : r.good_bad_neutral === 'bad' ? 'Concern' : 'Info'

        return (
          <div
            key={r.id}
            className={`bg-white rounded-lg border shadow-sm overflow-hidden ${isDismissed ? 'opacity-60' : ''}`}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50"
            >
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${tagColor}`}>
                {moodEmoji} {moodLabel}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 leading-snug">
                  <span className="font-semibold text-indigo-700">From: {cap(r.submitting_kid)}</span>
                  <span className="text-gray-400 mx-1.5">·</span>
                  <span className="text-gray-500">{relTime}</span>
                </p>
                <p className="text-sm text-gray-700 mt-0.5 truncate">
                  {r.what_happened}
                </p>
              </div>
              {r.status === 'new' && !isDismissed && (
                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-2" />
              )}
              {isExpanded
                ? <ChevronUp className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t space-y-3">
                <p className="text-sm text-gray-700 mt-3">{r.what_happened}</p>

                <div className="text-xs text-gray-500 space-y-0.5">
                  {r.involved_kids?.length > 0 && (
                    <p><span className="font-semibold">Involved:</span> {(r.involved_kids as string[]).map(cap).join(', ')}</p>
                  )}
                  {r.feeling && <p><span className="font-semibold">Feeling:</span> {r.feeling}</p>}
                  <p className="flex items-center gap-2 pt-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                    {r.stars_awarded_total > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {r.stars_awarded_total} awarded
                      </span>
                    )}
                    {isDismissed && (
                      <span className="text-gray-400">
                        Dismissed {formatCheckinTime(r.dismissed_at)}
                      </span>
                    )}
                  </p>
                </div>

                {!isDismissed ? (
                  <div className="flex gap-2 flex-wrap pt-2">
                    <button
                      onClick={() => openAwardStars(r)}
                      className="flex items-center gap-1 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-xs font-medium hover:bg-amber-200"
                    >
                      <Star className="w-3.5 h-3.5" /> +Stars
                    </button>
                    <button
                      onClick={() => openFlag(r)}
                      className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200"
                    >
                      <Flag className="w-3.5 h-3.5" /> Flag
                    </button>
                    {r.status === 'new' && (
                      <>
                        <button
                          onClick={() => handleAcknowledge(r.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                        >
                          <Check className="w-3.5 h-3.5" /> Seen
                        </button>
                        <button
                          onClick={() => handleTalkFirst(r.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Talk First
                        </button>
                        <button
                          onClick={() => startEscalate(r)}
                          className="flex items-center gap-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200"
                        >
                          <Zap className="w-3.5 h-3.5" /> Log Event
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDismiss(r.id)}
                      className="ml-auto flex items-center gap-1 px-3 py-2 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-100"
                    >
                      <Archive className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleUndismiss(r.id)}
                      className="flex items-center gap-1 px-3 py-2 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Restore
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* D81 — Award Stars modal */}
      {awardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAwardForm(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                Award stars to {cap(awardForm.kidName)}
              </h4>
              <button onClick={() => setAwardForm(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Star picker 1..10 */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Stars</label>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 10 }).map((_, i) => {
                  const val = i + 1
                  const active = awardForm.stars >= val
                  return (
                    <button
                      key={val}
                      onClick={() => setAwardForm(f => f ? { ...f, stars: val } : f)}
                      className="p-1"
                      aria-label={`${val} stars`}
                    >
                      <Star
                        className={`w-6 h-6 ${active ? 'text-amber-500 fill-amber-400' : 'text-gray-300'}`}
                      />
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-600 mt-1">{awardForm.stars} star{awardForm.stars === 1 ? '' : 's'}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Reason</label>
              <textarea
                value={awardForm.reason}
                onChange={e => setAwardForm(f => f ? { ...f, reason: e.target.value } : f)}
                rows={2}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setAwardForm(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleAwardStars}
                className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 flex items-center justify-center gap-1">
                <Star className="w-4 h-4" />
                Award Stars
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D81 — Flag (quick behavior log) modal */}
      {flagForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setFlagForm(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-500" /> Log behavior concern
              </h4>
              <button onClick={() => setFlagForm(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">For</label>
              <select
                value={flagForm.kidName}
                onChange={e => setFlagForm(f => f ? { ...f, kidName: e.target.value } : f)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                {KIDS.map(k => <option key={k} value={k}>{cap(k)}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">What happened</label>
              <textarea
                value={flagForm.note}
                onChange={e => setFlagForm(f => f ? { ...f, note: e.target.value } : f)}
                rows={3}
                placeholder="Optional context for your records"
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Remove stars? (optional)</label>
              <div className="flex gap-1.5">
                {[0, 1, 3, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => setFlagForm(f => f ? { ...f, starDeduction: v } : f)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${
                      flagForm.starDeduction === v
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {v === 0 ? 'None' : `−${v}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setFlagForm(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleFlag}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 flex items-center justify-center gap-1">
                <Flag className="w-4 h-4" />
                Log & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Form Modal (existing full flow, kept for power use) */}
      {escalateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEscalateForm(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-gray-900">Log Behavior Event</h4>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Behavior Type</label>
              <select value={escalateForm.behaviorType}
                onChange={e => {
                  const bt = e.target.value
                  const tier = TIER_DEFAULTS[bt] ?? 2
                  setEscalateForm(f => f ? { ...f, behaviorType: bt, tier, gemDeduction: tier >= 2 ? 10 : 0, starDeduction: tier >= 3 ? 5 : 0 } : f)
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {BEHAVIOR_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Severity Tier</label>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map(t => (
                  <button key={t} onClick={() => setEscalateForm(f => f ? { ...f, tier: t, gemDeduction: t >= 2 ? 10 : 0, starDeduction: t >= 3 ? 5 : 0 } : f)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border ${escalateForm.tier === t ? TIER_COLORS[t] : 'bg-white text-gray-400 border-gray-200'}`}>
                    L{t}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{TIER_LABELS[escalateForm.tier]}</p>
            </div>

            {escalateForm.tier >= 2 && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-600">Gem deduction</label>
                  <input type="number" value={escalateForm.gemDeduction} min={0} max={25}
                    onChange={e => setEscalateForm(f => f ? { ...f, gemDeduction: parseInt(e.target.value) || 0 } : f)}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                {escalateForm.tier >= 3 && (
                  <div className="flex-1">
                    <label className="text-xs text-gray-600">Star deduction</label>
                    <input type="number" value={escalateForm.starDeduction} min={0} max={10}
                      onChange={e => setEscalateForm(f => f ? { ...f, starDeduction: parseInt(e.target.value) || 0 } : f)}
                      className="w-full border rounded px-2 py-1.5 text-sm" />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs text-gray-600">Parent note (optional)</label>
              <input type="text" value={escalateForm.note} onChange={e => setEscalateForm(f => f ? { ...f, note: e.target.value } : f)}
                placeholder="Context..." className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>

            <div className="flex gap-2">
              <button onClick={handleEscalate}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600">
                Log Event
              </button>
              <button onClick={() => setEscalateForm(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
