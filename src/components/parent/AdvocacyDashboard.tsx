'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Shield, AlertTriangle, FileText, ChevronDown, ChevronUp,
  Check, Clock, Loader2, Calendar, User, ExternalLink, ClipboardList,
} from 'lucide-react'
import ARDPacketBuilder from './ARDPacketBuilder'

interface Gap { id: string; kid_name: string; gap_description: string; clinical_source: string; recommendation: string; priority: string; status: string }
interface Action { id: string; kid_name: string; action_text: string; action_type: string; priority: string; status: string; source: string; due_date: string | null; contact_name: string | null; contact_email: string | null; contact_phone: string | null }
interface Review { kid_name: string; plan_type: string; next_review_date: string }

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}
const PRIORITY_DOTS: Record<string, string> = { critical: 'bg-red-500', urgent: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-amber-400', low: 'bg-gray-300' }
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'text-gray-500' },
  in_progress: { label: 'In Progress', color: 'text-blue-600' },
  requested: { label: 'Requested', color: 'text-indigo-600' },
  waiting: { label: 'Waiting', color: 'text-amber-600' },
  approved: { label: 'Approved', color: 'text-green-600' },
  denied: { label: 'Denied', color: 'text-red-600' },
  implemented: { label: 'Implemented', color: 'text-green-700' },
  done: { label: 'Done', color: 'text-green-600' },
  deferred: { label: 'Deferred', color: 'text-gray-400' },
}
const KID_DISPLAY: Record<string, string> = { amos: 'Amos', zoey: 'Zoey', kaylee: 'Kaylee', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah' }

export default function AdvocacyDashboard() {
  const [loading, setLoading] = useState(true)
  const [urgentActions, setUrgentActions] = useState<Action[]>([])
  const [criticalGaps, setCriticalGaps] = useState<Gap[]>([])
  const [upcomingReviews, setUpcomingReviews] = useState<Review[]>([])
  const [allActions, setAllActions] = useState<Action[]>([])
  const [allGaps, setAllGaps] = useState<Gap[]>([])
  const [kidFilter, setKidFilter] = useState<string>('all')
  const [expandedAction, setExpandedAction] = useState<string | null>(null)
  const [expandedGap, setExpandedGap] = useState<string | null>(null)
  const [view, setView] = useState<'actions' | 'gaps' | 'plans'>('actions')

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, actionsRes, gapsRes] = await Promise.all([
        fetch('/api/advocacy?action=get_advocacy_summary').then(r => r.json()),
        fetch(`/api/advocacy?action=list_actions${kidFilter !== 'all' ? `&kid_name=${kidFilter}` : ''}`).then(r => r.json()),
        fetch(`/api/advocacy?action=list_gaps${kidFilter !== 'all' ? `&kid_name=${kidFilter}` : ''}`).then(r => r.json()),
      ])
      setUrgentActions(summaryRes.urgentActions || [])
      setCriticalGaps(summaryRes.criticalGaps || [])
      setUpcomingReviews(summaryRes.upcomingReviews || [])
      setAllActions(actionsRes.actions || [])
      setAllGaps(gapsRes.gaps || [])
    } catch { /* silent */ }
    setLoading(false)
  }, [kidFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const updateActionStatus = async (id: string, status: string) => {
    setAllActions(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    await fetch('/api/advocacy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_action', id, status }),
    }).catch(() => {})
  }

  const updateGapStatus = async (id: string, status: string) => {
    setAllGaps(prev => prev.map(g => g.id === id ? { ...g, status } : g))
    await fetch('/api/advocacy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_gap', id, status }),
    }).catch(() => {})
  }

  const openActions = allActions.filter(a => a.status !== 'done' && a.status !== 'deferred')
  const openGaps = allGaps.filter(g => g.status !== 'implemented' && g.status !== 'approved')

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-xl">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> Advocacy & Accommodations</h1>
        <p className="text-indigo-200 mt-1">Track plans, identify gaps, prepare for meetings</p>
      </div>

      {/* ARD/IEP Packet Builder — D89 */}
      <ARDPacketBuilder />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{urgentActions.length}</p>
          <p className="text-xs text-gray-500">Urgent Actions</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{criticalGaps.length}</p>
          <p className="text-xs text-gray-500">Critical Gaps</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{openActions.length}</p>
          <p className="text-xs text-gray-500">Open Actions</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{upcomingReviews.length}</p>
          <p className="text-xs text-gray-500">Upcoming Reviews</p>
        </div>
      </div>

      {/* Kid filter + view toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {['all', 'amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah'].map(k => (
            <button key={k} onClick={() => setKidFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${kidFilter === k ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {k === 'all' ? 'All Kids' : KID_DISPLAY[k]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {(['actions', 'gaps', 'plans'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === v ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              {v === 'actions' ? 'Actions' : v === 'gaps' ? 'Gaps' : 'Plans'}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming reviews */}
      {upcomingReviews.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-purple-700 flex items-center gap-1.5 mb-2"><Calendar className="w-4 h-4" /> Upcoming Reviews</h3>
          <div className="space-y-1">
            {upcomingReviews.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-purple-800">{KID_DISPLAY[r.kid_name]}</span>
                <span className="text-purple-600">{r.plan_type.toUpperCase()}</span>
                <span className="text-purple-500 ml-auto">{new Date(r.next_review_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions view */}
      {view === 'actions' && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">{openActions.length} Open Actions</h3>
          {openActions.length === 0 ? (
            <p className="text-sm text-gray-400 bg-white rounded-lg border p-6 text-center">No open actions. Great job!</p>
          ) : openActions.map(a => (
            <div key={a.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedAction(expandedAction === a.id ? null : a.id)}>
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOTS[a.priority]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{a.action_text}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{KID_DISPLAY[a.kid_name]}</span>
                    <span className={`text-xs ${STATUS_LABELS[a.status]?.color || 'text-gray-400'}`}>{STATUS_LABELS[a.status]?.label || a.status}</span>
                    {a.due_date && <span className="text-xs text-gray-400">{new Date(a.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[a.priority]}`}>{a.priority}</span>
                {expandedAction === a.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
              {expandedAction === a.id && (
                <div className="px-4 py-3 border-t bg-gray-50 space-y-2">
                  {a.source && <p className="text-xs text-gray-500">Source: {a.source}</p>}
                  {a.contact_name && (
                    <p className="text-xs text-gray-500">
                      Contact: {a.contact_name}
                      {a.contact_email && <> — <a href={`mailto:${a.contact_email}`} className="text-blue-600">{a.contact_email}</a></>}
                      {a.contact_phone && <> — {a.contact_phone}</>}
                    </p>
                  )}
                  <div className="flex gap-1.5 pt-1">
                    {['not_started', 'in_progress', 'waiting', 'done'].map(s => (
                      <button key={s} onClick={() => updateActionStatus(a.id, s)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${a.status === s ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {STATUS_LABELS[s]?.label || s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Gaps view */}
      {view === 'gaps' && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">{openGaps.length} Identified Gaps</h3>
          {openGaps.length === 0 ? (
            <p className="text-sm text-gray-400 bg-white rounded-lg border p-6 text-center">No open gaps.</p>
          ) : openGaps.map(g => (
            <div key={g.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedGap(expandedGap === g.id ? null : g.id)}>
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${g.priority === 'critical' ? 'text-red-500' : g.priority === 'high' ? 'text-orange-500' : 'text-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{g.gap_description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{KID_DISPLAY[g.kid_name]}</span>
                    <span className={`text-xs ${STATUS_LABELS[g.status]?.color || 'text-gray-400'}`}>{STATUS_LABELS[g.status]?.label || g.status}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[g.priority]}`}>{g.priority}</span>
              </div>
              {expandedGap === g.id && (
                <div className="px-4 py-3 border-t bg-gray-50 space-y-2">
                  <p className="text-xs text-gray-500"><strong>Clinical source:</strong> {g.clinical_source}</p>
                  <p className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded"><strong>Recommendation:</strong> {g.recommendation}</p>
                  <div className="flex gap-1.5 pt-1">
                    {['not_started', 'requested', 'approved', 'denied', 'implemented'].map(s => (
                      <button key={s} onClick={() => updateGapStatus(g.id, s)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${g.status === s ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {STATUS_LABELS[s]?.label || s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Plans view */}
      {view === 'plans' && (
        <PlanOverview kidFilter={kidFilter} />
      )}
    </div>
  )
}

// Sub-component: Plan overview per kid
function PlanOverview({ kidFilter }: { kidFilter: string }) {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = kidFilter !== 'all' ? `/api/advocacy?action=get_plan&kid_name=${kidFilter}` : '/api/advocacy?action=list_plans'
    fetch(url).then(r => r.json()).then(data => {
      setPlans(data.plans || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [kidFilter])

  if (loading) return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>

  if (plans.length === 0) return <p className="text-sm text-gray-400 bg-white rounded-lg border p-6 text-center">No plans found. Run the seed script to populate.</p>

  return (
    <div className="space-y-3">
      {plans.map((plan: any) => (
        <div key={plan.id} className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold text-gray-800">{KID_DISPLAY[plan.kid_name]} — {plan.plan_type.toUpperCase()}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{plan.status}</span>
          </div>
          {plan.qualifying_disability && <p className="text-xs text-gray-500">Disability: {plan.qualifying_disability}</p>}
          {plan.school_name && <p className="text-xs text-gray-500">School: {plan.school_name}</p>}
          {plan.facilitator_name && (
            <p className="text-xs text-gray-500">
              Facilitator: {plan.facilitator_name}
              {plan.facilitator_email && <> — <a href={`mailto:${plan.facilitator_email}`} className="text-blue-600">{plan.facilitator_email}</a></>}
            </p>
          )}
          {plan.next_review_date && (
            <p className="text-xs text-purple-600 mt-1">
              Next review: {new Date(plan.next_review_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {plan.notes && <p className="text-xs text-gray-400 mt-1 italic">{plan.notes}</p>}
        </div>
      ))}
    </div>
  )
}
