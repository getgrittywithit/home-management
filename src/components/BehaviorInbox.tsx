'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Check, MessageSquare, Zap, Star, Filter, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

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

export default function BehaviorInbox() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'good' | 'bad'>('new')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [escalateForm, setEscalateForm] = useState<{ reportId: number; behaviorType: string; tier: number; gemDeduction: number; starDeduction: number; note: string } | null>(null)
  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2500) }

  const loadReports = async () => {
    const params = filter === 'new' ? '?status=new' : filter === 'good' ? '?action=get_reports&status=all' : '?action=get_reports'
    const res = await fetch(`/api/kid-reports${params}`).then(r => r.json()).catch(() => ({}))
    let items = res.reports || []
    if (filter === 'good') items = items.filter((r: any) => r.good_bad_neutral === 'good')
    if (filter === 'bad') items = items.filter((r: any) => r.good_bad_neutral === 'bad')
    setReports(items)
    setLoading(false)
  }

  useEffect(() => { loadReports() }, [filter])

  const handleAcknowledge = async (id: number) => {
    await fetch('/api/kid-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acknowledge_report', id }) }).catch(() => {})
    showToast('Report acknowledged')
    loadReports()
  }

  const handleTalkFirst = async (id: number) => {
    await fetch('/api/kid-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'flag_talk_first', id }) }).catch(() => {})
    showToast('Added to your My Day — talk to this kid')
    loadReports()
  }

  const startEscalate = (report: any) => {
    setEscalateForm({
      reportId: report.id,
      behaviorType: 'defiance',
      tier: 2,
      gemDeduction: 10,
      starDeduction: 0,
      note: '',
    })
  }

  const handleEscalate = async () => {
    if (!escalateForm) return
    const tier = escalateForm.tier
    await fetch('/api/kid-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'escalate_to_behavior_event', id: escalateForm.reportId,
        behavior_type: escalateForm.behaviorType, severity_tier: tier,
        gem_deduction: tier >= 2 ? escalateForm.gemDeduction : 0,
        star_deduction: tier >= 3 ? escalateForm.starDeduction : 0,
        parent_note: escalateForm.note,
      }) }).catch(() => {})
    setEscalateForm(null)
    showToast(`Behavior event logged (Level ${tier})`)
    loadReports()
  }

  const handleQuickPositive = async (kidName: string, desc?: string) => {
    await fetch('/api/behavior-events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'quick_positive_catch', kid_name: kidName, description: desc || 'Caught being good!' }) }).catch(() => {})
    showToast(`+5 gems to ${cap(kidName)}!`)
  }

  const TAG_COLORS: Record<string, string> = { good: 'bg-green-100 text-green-700', bad: 'bg-red-100 text-red-700', neutral: 'bg-gray-100 text-gray-600' }

  return (
    <div className="space-y-4">
      {toastMsg && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{'\u2705'} {toastMsg}</div>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-500" /> Family Check-Ins
        </h3>
        <div className="flex items-center gap-1">
          {/* Quick Positive Catch */}
          <div className="relative group">
            <button className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 flex items-center gap-1">
              <Star className="w-3 h-3" /> Quick +5 Gems
            </button>
            <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 py-1 w-32">
              {['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah'].map(kid => (
                <button key={kid} onClick={() => handleQuickPositive(kid)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-green-50">{cap(kid)}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {[
          { id: 'new' as const, label: 'New' },
          { id: 'all' as const, label: 'All' },
          { id: 'bad' as const, label: 'Bad' },
          { id: 'good' as const, label: 'Good' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === f.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{f.label}</button>
        ))}
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
        return (
          <div key={r.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColor}`}>
                {r.good_bad_neutral === 'good' ? '\uD83D\uDE0A Good' : r.good_bad_neutral === 'bad' ? '\uD83D\uDE1F Bad' : '\uD83E\uDD37 Info'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  <span className="text-indigo-600">{cap(r.submitting_kid)}</span>: {r.what_happened?.substring(0, 60)}
                </p>
                <p className="text-xs text-gray-400">{r.when_happened?.replace(/_/g, ' ')} &bull; {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
              </div>
              {r.status === 'new' && <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />}
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t space-y-3">
                <p className="text-sm text-gray-700 mt-3">{r.what_happened}</p>
                {r.involved_kids?.length > 0 && (
                  <p className="text-xs text-gray-500">Involved: {(r.involved_kids as string[]).map(cap).join(', ')}</p>
                )}
                {r.feeling && <p className="text-xs text-gray-500">Feeling: {r.feeling}</p>}

                {r.status === 'new' && (
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleAcknowledge(r.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">
                      <Check className="w-3.5 h-3.5" /> Acknowledge
                    </button>
                    <button onClick={() => handleTalkFirst(r.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200">
                      <MessageSquare className="w-3.5 h-3.5" /> Talk First
                    </button>
                    <button onClick={() => startEscalate(r)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200">
                      <Zap className="w-3.5 h-3.5" /> Log Event
                    </button>
                  </div>
                )}
                {r.status !== 'new' && (
                  <p className="text-xs text-gray-400 capitalize">Status: {r.status?.replace(/_/g, ' ')} {r.parent_action ? `(${r.parent_action.replace(/_/g, ' ')})` : ''}</p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Escalate Form Modal */}
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
