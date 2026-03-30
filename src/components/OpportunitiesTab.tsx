'use client'

import { useState, useEffect } from 'react'
import { Trophy, Star, Check, Clock, DollarSign, ExternalLink, Filter, Loader2 } from 'lucide-react'

interface Opportunity {
  id: number
  title: string
  organization: string | null
  description: string | null
  opportunity_type: string
  subject_tags: string[] | null
  eligible_ages: string[] | null
  deadline_date: string | null
  amount: number | null
  url: string | null
  active: boolean
}

interface SavedOpportunity extends Opportunity {
  save_id: number
  status: string
  opportunity_id: number
}

const FILTER_PILLS = [
  { label: 'All', value: 'all' },
  { label: 'Art', value: 'Art' },
  { label: 'Essay', value: 'Essay' },
  { label: 'STEM', value: 'STEM' },
  { label: 'Scholarships', value: 'Scholarship' },
  { label: 'Competitions', value: 'Competition' },
]

const TYPE_COLORS: Record<string, string> = {
  scholarship: 'bg-emerald-100 text-emerald-700',
  competition: 'bg-purple-100 text-purple-700',
  camp: 'bg-orange-100 text-orange-700',
  program: 'bg-blue-100 text-blue-700',
  award: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  interested: { label: 'Interested', color: 'bg-blue-100 text-blue-700' },
  applying: { label: 'Applying', color: 'bg-amber-100 text-amber-700' },
  submitted: { label: 'Submitted', color: 'bg-green-100 text-green-700' },
  accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700' },
}

export default function OpportunitiesTab({ childName }: { childName: string }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [saves, setSaves] = useState<SavedOpportunity[]>([])
  const [filter, setFilter] = useState('all')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    Promise.all([
      fetch(`/api/opportunities?action=for_kid&kid_name=${childKey}`).then(r => r.json()).catch(() => ({ opportunities: [] })),
      fetch(`/api/opportunities?action=kid_saves&kid_name=${childKey}`).then(r => r.json()).catch(() => ({ saves: [] })),
    ]).then(([oppData, saveData]) => {
      setOpportunities(oppData.opportunities || [])
      setSaves((saveData.saves || []).map((s: any) => ({
        ...s,
        save_id: s.id,
      })))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [childKey])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const savedIds = new Set(saves.map(s => s.opportunity_id))

  const filteredOpps = opportunities.filter(o => {
    if (filter === 'all') return true
    const tags = o.subject_tags || []
    const type = o.opportunity_type || ''
    return tags.some(t => t.toLowerCase().includes(filter.toLowerCase())) ||
           type.toLowerCase().includes(filter.toLowerCase())
  })

  // Split into upcoming deadlines vs no deadline
  const now = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const upcoming = filteredOpps.filter(o => o.deadline_date && o.deadline_date >= now).sort((a, b) => (a.deadline_date || '').localeCompare(b.deadline_date || ''))
  const ongoing = filteredOpps.filter(o => !o.deadline_date || o.deadline_date < now)

  const handleSave = async (oppId: number) => {
    if (savedIds.has(oppId)) return
    setSaving(oppId)
    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', kid_name: childKey, opportunity_id: oppId }),
      })
      const data = await res.json()
      if (data.save) {
        const opp = opportunities.find(o => o.id === oppId)
        if (opp) {
          setSaves(prev => [{ ...opp, save_id: data.save.id, status: 'interested', opportunity_id: oppId }, ...prev])
        }
        showToast('Opportunity saved!')
      } else if (data.already_saved) {
        showToast('Already saved!')
      }
    } catch {
      showToast('Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const updateStatus = async (saveId: number, status: string) => {
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', save_id: saveId, status }),
      })
      setSaves(prev => prev.map(s => s.save_id === saveId ? { ...s, status } : s))
      showToast(`Status updated to ${status}`)
    } catch {
      showToast('Failed to update')
    }
  }

  const formatDeadline = (date: string) => {
    const d = new Date(date + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const daysUntil = (date: string) => {
    const target = new Date(date + 'T00:00:00')
    const today = new Date(now + 'T00:00:00')
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-6 h-6" />
          <h1 className="text-xl font-bold">Opportunities</h1>
        </div>
        <p className="text-amber-100 text-sm">Scholarships, competitions, and programs just for you</p>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_PILLS.map(pill => (
          <button
            key={pill.value}
            onClick={() => setFilter(pill.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === pill.value
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Upcoming Deadlines */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-500" /> Upcoming Deadlines
          </h2>
          <div className="space-y-3">
            {upcoming.map(opp => {
              const isSaved = savedIds.has(opp.id)
              const days = daysUntil(opp.deadline_date!)
              return (
                <div key={opp.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{opp.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[opp.opportunity_type] || TYPE_COLORS.other}`}>
                          {opp.opportunity_type}
                        </span>
                      </div>
                      {opp.organization && <p className="text-sm text-gray-500">{opp.organization}</p>}
                      {opp.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{opp.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                        <span className={`flex items-center gap-1 font-medium ${days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-gray-600'}`}>
                          <Clock className="w-3 h-3" />
                          {formatDeadline(opp.deadline_date!)} ({days}d left)
                        </span>
                        {opp.amount && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <DollarSign className="w-3 h-3" />${opp.amount.toLocaleString()}
                          </span>
                        )}
                        {opp.url && (
                          <a href={opp.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-700">
                            <ExternalLink className="w-3 h-3" /> Details
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSave(opp.id)}
                      disabled={isSaved || saving === opp.id}
                      className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                        isSaved ? 'bg-green-100 text-green-600' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      {saving === opp.id ? <Loader2 className="w-5 h-5 animate-spin" /> :
                       isSaved ? <Check className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ongoing / No Deadline */}
      {ongoing.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-purple-500" /> More Opportunities
          </h2>
          <div className="space-y-3">
            {ongoing.map(opp => {
              const isSaved = savedIds.has(opp.id)
              return (
                <div key={opp.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{opp.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[opp.opportunity_type] || TYPE_COLORS.other}`}>
                          {opp.opportunity_type}
                        </span>
                      </div>
                      {opp.organization && <p className="text-sm text-gray-500">{opp.organization}</p>}
                      {opp.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{opp.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                        {opp.amount && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <DollarSign className="w-3 h-3" />${opp.amount.toLocaleString()}
                          </span>
                        )}
                        {opp.url && (
                          <a href={opp.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-700">
                            <ExternalLink className="w-3 h-3" /> Details
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSave(opp.id)}
                      disabled={isSaved || saving === opp.id}
                      className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                        isSaved ? 'bg-green-100 text-green-600' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      {saving === opp.id ? <Loader2 className="w-5 h-5 animate-spin" /> :
                       isSaved ? <Check className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {filteredOpps.length === 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
          <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No opportunities found{filter !== 'all' ? ` for "${filter}"` : ''}.</p>
          <p className="text-gray-400 text-sm mt-1">Check back soon or ask Mom to add some!</p>
        </div>
      )}

      {/* Saved Opportunities */}
      {saves.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> My Saved Opportunities
          </h2>
          <div className="space-y-3">
            {saves.map(save => {
              const badge = STATUS_BADGES[save.status] || STATUS_BADGES.interested
              return (
                <div key={save.save_id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{save.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      {save.organization && <p className="text-sm text-gray-500">{save.organization}</p>}
                      {save.deadline_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Deadline: {formatDeadline(save.deadline_date)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <select
                        value={save.status}
                        onChange={e => updateStatus(save.save_id, e.target.value)}
                        className="text-xs border rounded px-2 py-1 bg-white"
                      >
                        <option value="interested">Interested</option>
                        <option value="applying">Applying</option>
                        <option value="submitted">Submitted</option>
                        <option value="accepted">Accepted</option>
                        <option value="declined">Declined</option>
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
