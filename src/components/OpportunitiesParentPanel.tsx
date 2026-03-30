'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Trophy, Plus, Archive, RotateCcw, ChevronDown, ChevronUp,
  Clock, ExternalLink, Edit2, X, Users, User, Loader2,
  Bookmark, AlertCircle, CheckCircle2, MessageSquare, Eye
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
  is_archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string | null
  save_count: number
  kid_names: string[] | null
}

interface KidOverview {
  kid_name: string
  status_counts: Record<string, number>
  next_deadline: string | null
  next_deadline_title: string | null
  recent: { title: string; status: string; updated_at: string }[]
}

interface KidSave {
  id: number
  opportunity_id: number
  kid_name: string
  status: string
  notes: string | null
  parent_notes: string | null
  title: string
  category: string
  deadline: string | null
  deadline_type: string
  award_description: string | null
  sponsor_org: string | null
}

interface FormData {
  title: string
  description: string
  category: string
  grade_min: string
  grade_max: string
  deadline: string
  deadline_type: string
  application_url: string
  sponsor_org: string
  award_description: string
  notes: string
}

const EMPTY_FORM: FormData = {
  title: '', description: '', category: 'competition',
  grade_min: '', grade_max: '', deadline: '', deadline_type: 'fixed',
  application_url: '', sponsor_org: '', award_description: '', notes: ''
}

const CATEGORIES = ['essay', 'art', 'stem', 'scholarship', 'competition', 'community', 'writing']
const DEADLINE_TYPES = ['fixed', 'rolling', 'annual', 'tbd']
const ALL_KIDS = ['Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah']

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

// ── Component ──────────────────────────────────────────────────────────────
export default function OpportunitiesParentPanel() {
  const [view, setView] = useState<'by_kid' | 'by_opportunity'>('by_kid')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [kidOverviews, setKidOverviews] = useState<KidOverview[]>([])
  const [expandedKid, setExpandedKid] = useState<string | null>(null)
  const [kidSaves, setKidSaves] = useState<KidSave[]>([])
  const [loadingKid, setLoadingKid] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState<number | null>(null)
  const [parentNoteTarget, setParentNoteTarget] = useState<{ kidName: string; oppId: number } | null>(null)
  const [parentNoteText, setParentNoteText] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [oppRes, overviewRes] = await Promise.all([
        fetch('/api/opportunities?action=get_all_opportunities&include_archived=true').then(r => r.json()),
        fetch('/api/opportunities?action=parent_overview').then(r => r.json()),
      ])
      setOpportunities(oppRes.opportunities || [])
      setKidOverviews(overviewRes.overview || [])
    } catch {
      // silent
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Load kid activity on expand ──────────────────────────────────────────
  const loadKidActivity = async (kidName: string) => {
    if (expandedKid === kidName) {
      setExpandedKid(null)
      return
    }
    setExpandedKid(kidName)
    setLoadingKid(kidName)
    try {
      const res = await fetch(`/api/opportunities?action=get_kid_activity&kid_name=${kidName}`)
      const data = await res.json()
      setKidSaves(data.saves || [])
    } catch {
      setKidSaves([])
    } finally {
      setLoadingKid(null)
    }
  }

  // ── Modal ────────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingOpp(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (opp: Opportunity) => {
    setEditingOpp(opp)
    setForm({
      title: opp.title || '',
      description: opp.description || '',
      category: opp.category || 'competition',
      grade_min: opp.grade_min != null ? String(opp.grade_min) : '',
      grade_max: opp.grade_max != null ? String(opp.grade_max) : '',
      deadline: opp.deadline ? opp.deadline.split('T')[0] : '',
      deadline_type: opp.deadline_type || 'fixed',
      application_url: opp.application_url || '',
      sponsor_org: opp.sponsor_org || '',
      award_description: opp.award_description || '',
      notes: opp.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { showToast('Title is required'); return }
    setSubmitting(true)
    try {
      const payload: any = {
        action: editingOpp ? 'edit_opportunity' : 'add_opportunity',
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        grade_min: form.grade_min ? parseInt(form.grade_min, 10) : null,
        grade_max: form.grade_max ? parseInt(form.grade_max, 10) : null,
        deadline: form.deadline || null,
        deadline_type: form.deadline_type,
        application_url: form.application_url.trim() || null,
        sponsor_org: form.sponsor_org.trim() || null,
        award_description: form.award_description.trim() || null,
        notes: form.notes.trim() || null,
      }
      if (editingOpp) payload.opportunity_id = editingOpp.id

      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showToast(editingOpp ? 'Opportunity updated' : 'Opportunity added')
      setShowModal(false)
      fetchAll()
    } catch (e: any) {
      showToast(e.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Archive / Restore ────────────────────────────────────────────────────
  const handleArchive = async (oppId: number) => {
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive_opportunity', opportunity_id: oppId }),
      })
      showToast('Archived')
      setConfirmArchive(null)
      fetchAll()
    } catch {
      showToast('Failed to archive')
    }
  }

  const handleRestore = async (oppId: number) => {
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore_opportunity', opportunity_id: oppId }),
      })
      showToast('Restored')
      fetchAll()
    } catch {
      showToast('Failed to restore')
    }
  }

  // ── Parent Note ──────────────────────────────────────────────────────────
  const handleParentNote = async () => {
    if (!parentNoteTarget) return
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parent_add_note',
          kid_name: parentNoteTarget.kidName,
          opportunity_id: parentNoteTarget.oppId,
          note: parentNoteText,
        }),
      })
      showToast('Note saved')
      setParentNoteTarget(null)
      setParentNoteText('')
      if (expandedKid) loadKidActivity(expandedKid)
    } catch {
      showToast('Failed to save note')
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeOpps = opportunities.filter(o => !o.is_archived)
  const archivedOpps = opportunities.filter(o => o.is_archived)

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  // ── Format helpers ───────────────────────────────────────────────────────
  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    const dt = new Date(d + (d.includes('T') ? '' : 'T00:00:00'))
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const totalSaves = (ov: KidOverview) => Object.values(ov.status_counts).reduce((a, b) => a + b, 0)

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
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-7 h-7" />
              <h1 className="text-2xl font-bold">Opportunities</h1>
            </div>
            <p className="text-amber-100 text-sm">Manage scholarships, competitions, and programs for the kids</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Opportunity
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('by_kid')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'by_kid' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1" /> By Kid
        </button>
        <button
          onClick={() => setView('by_opportunity')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'by_opportunity' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Trophy className="w-4 h-4 inline mr-1" /> By Opportunity
        </button>
      </div>

      {/* ── BY KID VIEW ─────────────────────────────────────────────────── */}
      {view === 'by_kid' && (
        <div className="space-y-3">
          {ALL_KIDS.map(kidName => {
            const ov = kidOverviews.find(o => o.kid_name.toLowerCase() === kidName.toLowerCase())
            const isExpanded = expandedKid === kidName

            return (
              <div key={kidName} className="bg-white rounded-lg border shadow-sm">
                <button
                  onClick={() => loadKidActivity(kidName)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{kidName}</h3>
                      {ov ? (
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span>{totalSaves(ov)} saved</span>
                          {ov.status_counts.applying && (
                            <span className="text-amber-600">{ov.status_counts.applying} applying</span>
                          )}
                          {ov.status_counts.submitted && (
                            <span className="text-green-600">{ov.status_counts.submitted} submitted</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No saves yet</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {ov?.next_deadline && (
                      <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Next: {fmtDate(ov.next_deadline)}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded kid detail */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4">
                    {loadingKid === kidName ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                      </div>
                    ) : kidSaves.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">No saved opportunities</p>
                    ) : (
                      <div className="space-y-2 mt-3">
                        {kidSaves.map(save => (
                          <div key={save.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-gray-900 truncate">{save.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[save.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {save.status}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[save.category] || 'bg-gray-100 text-gray-600'}`}>
                                  {save.category}
                                </span>
                              </div>
                              {save.deadline && save.deadline_type !== 'rolling' && save.deadline_type !== 'tbd' && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  Deadline: {fmtDate(save.deadline)}
                                </p>
                              )}
                              {save.notes && (
                                <p className="text-xs text-gray-500 mt-1 italic">Kid notes: {save.notes}</p>
                              )}
                              {save.parent_notes && (
                                <p className="text-xs text-amber-700 mt-1">Parent note: {save.parent_notes}</p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setParentNoteTarget({ kidName: save.kid_name, oppId: save.opportunity_id })
                                setParentNoteText(save.parent_notes || '')
                              }}
                              className="text-xs text-gray-400 hover:text-orange-500 p-1"
                              title="Add parent note"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── BY OPPORTUNITY VIEW ─────────────────────────────────────────── */}
      {view === 'by_opportunity' && (
        <div className="space-y-3">
          {activeOpps.length === 0 ? (
            <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
              <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No opportunities yet.</p>
              <button onClick={openAddModal} className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium">
                + Add your first opportunity
              </button>
            </div>
          ) : (
            activeOpps.map(opp => (
              <div key={opp.id} className="bg-white rounded-lg border shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{opp.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[opp.category] || 'bg-gray-100 text-gray-600'}`}>
                        {opp.category}
                      </span>
                      {opp.grade_min != null && opp.grade_max != null && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          Grades {opp.grade_min}-{opp.grade_max}
                        </span>
                      )}
                    </div>
                    {opp.sponsor_org && <p className="text-sm text-gray-500">{opp.sponsor_org}</p>}
                    {opp.award_description && <p className="text-sm text-emerald-600 mt-0.5">{opp.award_description}</p>}
                    {opp.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{opp.description}</p>}

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      {opp.deadline && opp.deadline_type !== 'tbd' && (
                        <span>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {opp.deadline_type === 'rolling' ? 'Rolling' : fmtDate(opp.deadline)}
                        </span>
                      )}
                      {opp.deadline_type === 'tbd' && <span>Deadline TBD</span>}
                      {opp.application_url && (
                        <a href={opp.application_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Link
                        </a>
                      )}
                    </div>

                    {/* Kids tracking this */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">Tracking:</span>
                      {opp.save_count > 0 && opp.kid_names ? (
                        opp.kid_names.map(name => (
                          <span key={name} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full capitalize">
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-300">No kids tracking</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => openEditModal(opp)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {confirmArchive === opp.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleArchive(opp.id)}
                          className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmArchive(null)}
                          className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmArchive(opp.id)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Archived Section */}
          {archivedOpps.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
              >
                <Archive className="w-4 h-4" />
                Archived ({archivedOpps.length})
                {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showArchived && (
                <div className="space-y-2">
                  {archivedOpps.map(opp => (
                    <div key={opp.id} className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-500">{opp.title}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[opp.category] || 'bg-gray-100 text-gray-600'}`}>
                          {opp.category}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRestore(opp.id)}
                        className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PARENT NOTE MODAL ───────────────────────────────────────────── */}
      {parentNoteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Parent Note</h3>
              <button onClick={() => setParentNoteTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Note for <strong className="capitalize">{parentNoteTarget.kidName}</strong> — they will see this on the opportunity card.
            </p>
            <textarea
              value={parentNoteText}
              onChange={e => setParentNoteText(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. This one looks great for you — deadline is next week!"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setParentNoteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleParentNote}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT MODAL ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingOpp ? 'Edit Opportunity' : 'Add Opportunity'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g. Scholastic Art & Writing Awards"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="What is this opportunity about?"
                />
              </div>

              {/* Category + Sponsor row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor / Organization</label>
                  <input
                    type="text"
                    value={form.sponsor_org}
                    onChange={e => setForm(f => ({ ...f, sponsor_org: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g. Alliance for Young Artists"
                  />
                </div>
              </div>

              {/* Grade range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Grade</label>
                  <input
                    type="number"
                    value={form.grade_min}
                    onChange={e => setForm(f => ({ ...f, grade_min: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    min="1" max="12"
                    placeholder="e.g. 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Grade</label>
                  <input
                    type="number"
                    value={form.grade_max}
                    onChange={e => setForm(f => ({ ...f, grade_max: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    min="1" max="12"
                    placeholder="e.g. 12"
                  />
                </div>
              </div>

              {/* Deadline + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={form.deadline_type === 'rolling' || form.deadline_type === 'tbd'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Type</label>
                  <select
                    value={form.deadline_type}
                    onChange={e => setForm(f => ({ ...f, deadline_type: e.target.value, ...(e.target.value === 'rolling' || e.target.value === 'tbd' ? { deadline: '' } : {}) }))}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {DEADLINE_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Award */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Award Description</label>
                <input
                  type="text"
                  value={form.award_description}
                  onChange={e => setForm(f => ({ ...f, award_description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g. $1,000 scholarship, Gold Medal recognition"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application / Info URL</label>
                <input
                  type="url"
                  value={form.application_url}
                  onChange={e => setForm(f => ({ ...f, application_url: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="https://..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes (parent only)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Private notes about this opportunity..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingOpp ? 'Update' : 'Add Opportunity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
