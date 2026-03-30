'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Trophy, Star, Clock, ExternalLink, Filter, Loader2,
  Bookmark, BookMarked, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface Opportunity {
  id: number
  title: string
  description: string | null
  category: string
  grade_min: number | null
  grade_max: number | null
  deadline: string | null
  deadline_type: string
  application_url: string | null
  sponsor_org: string | null
  award_description: string | null
  notes: string | null
  is_active: boolean
  // joined from kid_opportunity_saves via LEFT JOIN
  save_id: number | null
  save_status: string | null
  kid_notes: string | null
  parent_notes: string | null
  // computed
  days_until_deadline: number | null
  urgency_level: string
}

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Art', value: 'art' },
  { label: 'Essay', value: 'essay' },
  { label: 'STEM', value: 'stem' },
  { label: 'Scholarship', value: 'scholarship' },
  { label: 'Competition', value: 'competition' },
  { label: 'Community', value: 'community' },
  { label: 'Writing', value: 'writing' },
]

const STATUS_OPTIONS = [
  { value: 'saved', label: 'Saved' },
  { value: 'interested', label: 'Interested' },
  { value: 'applying', label: 'Applying' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'completed', label: 'Completed' },
]

const STATUS_COLORS: Record<string, string> = {
  saved: 'bg-blue-100 text-blue-700',
  interested: 'bg-indigo-100 text-indigo-700',
  applying: 'bg-amber-100 text-amber-700',
  submitted: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  withdrawn: 'bg-gray-100 text-gray-500',
}

const CATEGORY_COLORS: Record<string, string> = {
  essay: 'bg-blue-100 text-blue-700',
  art: 'bg-purple-100 text-purple-700',
  stem: 'bg-cyan-100 text-cyan-700',
  scholarship: 'bg-emerald-100 text-emerald-700',
  competition: 'bg-orange-100 text-orange-700',
  community: 'bg-pink-100 text-pink-700',
  writing: 'bg-violet-100 text-violet-700',
}

function deadlineChipColor(days: number | null, deadlineType: string): string {
  if (deadlineType === 'rolling') return 'bg-gray-100 text-gray-600'
  if (deadlineType === 'tbd') return 'bg-gray-100 text-gray-500'
  if (days === null) return 'bg-gray-100 text-gray-500'
  if (days <= 3) return 'bg-red-100 text-red-700'
  if (days <= 7) return 'bg-orange-100 text-orange-700'
  if (days <= 30) return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

function deadlineLabel(opp: Opportunity): string {
  if (opp.deadline_type === 'rolling') return 'Rolling'
  if (opp.deadline_type === 'tbd') return 'TBD'
  if (!opp.deadline) return 'No deadline'
  const d = new Date(opp.deadline + (opp.deadline.includes('T') ? '' : 'T00:00:00'))
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (opp.days_until_deadline !== null && opp.days_until_deadline >= 0) {
    return `${label} (${opp.days_until_deadline}d)`
  }
  return label
}

// ── Component ──────────────────────────────────────────────────────────────
export default function OpportunitiesTab({ childName }: { childName: string }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [category, setCategory] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [mySavedOpen, setMySavedOpen] = useState(true)
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  const [kidGrade, setKidGrade] = useState<number | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const fetchOpportunities = useCallback(async () => {
    try {
      const params = new URLSearchParams({ action: 'list', kid_name: childName })
      if (category) params.set('category', category)
      const res = await fetch(`/api/opportunities?${params}`)
      const data = await res.json()
      setOpportunities(data.opportunities || [])
      setKidGrade(data.kid_grade ?? null)
    } catch {
      setOpportunities([])
    } finally {
      setLoaded(true)
    }
  }, [childName, category])

  useEffect(() => { fetchOpportunities() }, [fetchOpportunities])

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleSave = async (oppId: number) => {
    setSaving(oppId)
    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_opportunity', kid_name: childName, opportunity_id: oppId }),
      })
      const data = await res.json()
      if (data.already_saved) {
        showToast('Already saved!')
      } else {
        showToast('Saved!')
        fetchOpportunities()
      }
    } catch {
      showToast('Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const handleUnsave = async (oppId: number) => {
    setSaving(oppId)
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unsave_opportunity', kid_name: childName, opportunity_id: oppId }),
      })
      showToast('Removed from saved')
      fetchOpportunities()
    } catch {
      showToast('Failed to remove')
    } finally {
      setSaving(null)
    }
  }

  const handleStatusChange = async (oppId: number, newStatus: string) => {
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', kid_name: childName, opportunity_id: oppId, new_status: newStatus }),
      })
      showToast(`Status: ${newStatus}`)
      fetchOpportunities()
    } catch {
      showToast('Failed to update')
    }
  }

  const handleSaveNotes = async (oppId: number) => {
    try {
      // We update notes via update_status with current status, but actually notes are on the save record.
      // The API doesn't have a dedicated kid-notes update, so we use the kid_notes field directly.
      // For now we'll save via a simple approach — update notes through the save record.
      // Let's add notes update through update_status note param
      const opp = opportunities.find(o => o.id === oppId)
      if (!opp) return
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          kid_name: childName,
          opportunity_id: oppId,
          new_status: opp.save_status || 'saved',
          note: noteText,
        }),
      })
      showToast('Notes saved')
      setEditingNotes(null)
      fetchOpportunities()
    } catch {
      showToast('Failed to save notes')
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const mySaved = opportunities.filter(o => o.save_id && o.save_status && o.save_status !== 'withdrawn')
  const allOpps = opportunities.filter(o => !o.save_id || o.save_status === 'withdrawn' || !o.save_status)

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  // ── Card renderer ────────────────────────────────────────────────────────
  const renderCard = (opp: Opportunity, isSaved: boolean) => {
    const isOutsideGrade = kidGrade !== null && (
      (opp.grade_min !== null && kidGrade < opp.grade_min) ||
      (opp.grade_max !== null && kidGrade > opp.grade_max)
    )

    return (
      <div key={opp.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">{opp.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[opp.category] || 'bg-gray-100 text-gray-600'}`}>
                {opp.category}
              </span>
              {isOutsideGrade && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  Save for later
                </span>
              )}
              {isSaved && opp.save_status && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[opp.save_status] || 'bg-gray-100 text-gray-600'}`}>
                  {opp.save_status.charAt(0).toUpperCase() + opp.save_status.slice(1)}
                </span>
              )}
            </div>

            {/* Sponsor */}
            {opp.sponsor_org && (
              <p className="text-sm text-gray-500">{opp.sponsor_org}</p>
            )}

            {/* Award */}
            {opp.award_description && (
              <p className="text-sm text-emerald-600 font-medium mt-0.5">{opp.award_description}</p>
            )}

            {/* Description */}
            {opp.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{opp.description}</p>
            )}

            {/* Deadline + links row */}
            <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
              <span className={`px-2 py-0.5 rounded-full font-medium ${deadlineChipColor(opp.days_until_deadline, opp.deadline_type)}`}>
                <Clock className="w-3 h-3 inline mr-1" />
                {deadlineLabel(opp)}
              </span>
              {opp.application_url && (
                <a
                  href={opp.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                >
                  <ExternalLink className="w-3 h-3" /> Apply / Details
                </a>
              )}
            </div>

            {/* Parent notes */}
            {opp.parent_notes && (
              <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-800">
                <strong>Note from Mom:</strong> {opp.parent_notes}
              </div>
            )}

            {/* Status selector for saved items */}
            {isSaved && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <select
                  value={opp.save_status || 'saved'}
                  onChange={e => handleStatusChange(opp.id, e.target.value)}
                  className="text-xs border rounded px-2 py-1 bg-white"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                {/* Notes toggle */}
                <button
                  onClick={() => {
                    if (editingNotes === opp.id) {
                      setEditingNotes(null)
                    } else {
                      setEditingNotes(opp.id)
                      setNoteText(opp.kid_notes || '')
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  {editingNotes === opp.id ? 'Cancel' : opp.kid_notes ? 'Edit notes' : 'Add notes'}
                </button>
              </div>
            )}

            {/* Notes editor */}
            {isSaved && editingNotes === opp.id && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Your notes..."
                  className="flex-1 text-sm border rounded px-2 py-1"
                />
                <button
                  onClick={() => handleSaveNotes(opp.id)}
                  className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
                >
                  Save
                </button>
              </div>
            )}

            {/* Show existing kid notes */}
            {isSaved && opp.kid_notes && editingNotes !== opp.id && (
              <p className="mt-1 text-xs text-gray-500 italic">My notes: {opp.kid_notes}</p>
            )}
          </div>

          {/* Save/Unsave button */}
          <button
            onClick={() => isSaved ? handleUnsave(opp.id) : handleSave(opp.id)}
            disabled={saving === opp.id}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
              isSaved
                ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                : 'bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500'
            }`}
            title={isSaved ? 'Remove from saved' : 'Save opportunity'}
          >
            {saving === opp.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSaved ? (
              <BookMarked className="w-5 h-5" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
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
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat.value
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* My Saved Section (pinned at top) */}
      {mySaved.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <button
            onClick={() => setMySavedOpen(!mySavedOpen)}
            className="w-full flex items-center justify-between p-4"
          >
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
              My Saved ({mySaved.length})
            </h2>
            {mySavedOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {mySavedOpen && (
            <div className="px-4 pb-4 space-y-3">
              {mySaved.map(opp => renderCard(opp, true))}
            </div>
          )}
        </div>
      )}

      {/* All Opportunities */}
      {allOpps.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 px-1">
            <Trophy className="w-5 h-5 text-orange-500" /> Browse Opportunities
          </h2>
          {allOpps.map(opp => renderCard(opp, false))}
        </div>
      ) : mySaved.length === 0 ? (
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
          <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No opportunities yet — ask Mom to add some!</p>
        </div>
      ) : null}

      {/* If we have saved but no unsaved shown */}
      {allOpps.length === 0 && mySaved.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
          <p className="text-gray-400 text-sm">You have saved all available opportunities. Check back later for more!</p>
        </div>
      )}
    </div>
  )
}
