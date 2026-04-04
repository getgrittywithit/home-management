'use client'

import { useState } from 'react'
import {
  FileText, Plus, Trash2, Calendar, CheckCircle, ClipboardList,
  Sparkles, Upload, X, ChevronDown, ChevronUp, ChevronRight,
  Pill, Loader2, ListChecks, CircleDot
} from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface VisitNote {
  id: string
  family_member_name: string
  visit_date: string
  provider_name?: string
  raw_notes?: string
  ai_synopsis?: string
  ai_tasks?: string[] | string
  ai_prescriptions?: string[] | string
  ai_diagnoses?: string[] | string
  ai_followup?: string
}

interface HealthTask {
  id: string
  family_member_name: string
  visit_note_id?: string
  task: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  category?: string
  notes?: string
  completed_at?: string
}

interface HealthVisitNotesProps {
  memberGroup: 'parents' | 'kids'
  visitNotes: any[]
  healthTasks: any[]
  familyMembers: string[]
  providers: Array<{ id: string; name: string }>
  onReload: () => void
  onError: (msg: string) => void
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-600'
}

// ============================================================================
// HELPERS
// ============================================================================

function parseJsonField(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { return JSON.parse(val || '[]') } catch { return [] }
  }
  return []
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function isPastDue(dateStr: string) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HealthVisitNotes({
  memberGroup, visitNotes, healthTasks, familyMembers, providers,
  onReload, onError,
}: HealthVisitNotesProps) {
  const themeColor = memberGroup === 'parents' ? 'blue' : 'teal'

  // Visit Note form state
  const [showAddVisitNote, setShowAddVisitNote] = useState(false)
  const [visitNoteForm, setVisitNoteForm] = useState<{
    family_member_name: string; visit_date: string; provider_name: string; raw_notes: string
  }>({ family_member_name: '', visit_date: '', provider_name: '', raw_notes: '' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [analyzingNotes, setAnalyzingNotes] = useState(false)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  // Health Task form state
  const [showAddTask, setShowAddTask] = useState(false)
  const [taskFilter, setTaskFilter] = useState<'pending' | 'all'>('pending')
  const [taskForm, setTaskForm] = useState<Partial<HealthTask>>({
    family_member_name: '', task: '', due_date: '', priority: 'medium', category: '', notes: ''
  })

  // ============================================================================
  // API HELPER
  // ============================================================================

  const apiCall = async (action: string, data: any) => {
    try {
      const res = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data: { ...data, member_group: memberGroup } }),
      })
      if (!res.ok) throw new Error('Failed')
      return await res.json()
    } catch {
      onError(`Failed to ${action.replace(/_/g, ' ')}`)
      return null
    }
  }

  // ============================================================================
  // VISIT NOTE HANDLERS
  // ============================================================================

  const resetVisitNoteForm = () => {
    setVisitNoteForm({ family_member_name: '', visit_date: '', provider_name: '', raw_notes: '' })
    setUploadFile(null)
    setShowAddVisitNote(false)
  }

  const handleAddVisitNote = async (aiData?: { synopsis: string; diagnoses: string[]; tasks: string[]; prescriptions: string[]; followup: string }) => {
    if (!visitNoteForm.family_member_name?.trim() || !visitNoteForm.visit_date) {
      onError('Please fill in family member name and visit date')
      return
    }
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_visit_note',
          data: {
            family_member_name: visitNoteForm.family_member_name,
            member_group: memberGroup,
            visit_date: visitNoteForm.visit_date,
            provider_name: visitNoteForm.provider_name,
            raw_notes: visitNoteForm.raw_notes,
            ai_synopsis: aiData?.synopsis || null,
            ai_tasks: aiData?.tasks || null,
            ai_prescriptions: aiData?.prescriptions || null,
            ai_diagnoses: aiData?.diagnoses || null,
            ai_followup: aiData?.followup || null
          }
        })
      })
      if (!response.ok) throw new Error('Failed to save visit note')
      const newNote = await response.json()
      // Parse JSONB fields
      newNote.ai_tasks = typeof newNote.ai_tasks === 'string' ? JSON.parse(newNote.ai_tasks) : newNote.ai_tasks
      newNote.ai_prescriptions = typeof newNote.ai_prescriptions === 'string' ? JSON.parse(newNote.ai_prescriptions) : newNote.ai_prescriptions
      newNote.ai_diagnoses = typeof newNote.ai_diagnoses === 'string' ? JSON.parse(newNote.ai_diagnoses) : newNote.ai_diagnoses
      setExpandedNote(newNote.id)

      // Auto-create health tasks from AI tasks
      if (aiData?.tasks && aiData.tasks.length > 0) {
        for (const taskText of aiData.tasks) {
          try {
            await fetch('/api/health', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'add_health_task',
                data: {
                  family_member_name: visitNoteForm.family_member_name,
                  member_group: memberGroup,
                  visit_note_id: newNote.id,
                  task: taskText,
                  priority: 'medium',
                  category: 'doctor-recommended'
                }
              })
            })
          } catch (e) { console.error('Error creating task:', e) }
        }
      }

      resetVisitNoteForm()
      onReload()
    } catch (err) {
      console.error('Error adding visit note:', err)
      onError('Failed to save visit note')
    }
  }

  const handleAnalyzeNotes = async () => {
    if (!visitNoteForm.raw_notes?.trim() && !uploadFile) {
      onError('Please enter or upload visit notes first')
      return
    }
    if (!visitNoteForm.family_member_name?.trim() || !visitNoteForm.visit_date) {
      onError('Please fill in family member name and visit date before analyzing')
      return
    }
    setAnalyzingNotes(true)
    try {
      let aiData = null
      try {
        let response
        if (uploadFile) {
          const formData = new FormData()
          formData.append('file', uploadFile)
          response = await fetch('/api/health/analyze', { method: 'POST', body: formData })
        } else {
          response = await fetch('/api/health/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawNotes: visitNoteForm.raw_notes })
          })
        }
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          console.error('AI analysis error:', errData.error || response.statusText)
        } else {
          aiData = await response.json()
        }
      } catch (analyzeErr) {
        console.error('AI analysis request failed:', analyzeErr)
      }
      // Save the note — with AI results if available, without if AI failed
      await handleAddVisitNote(aiData || undefined)
      if (!aiData) {
        onError('AI analysis unavailable — note saved without AI summary. Check that ANTHROPIC_API_KEY is set in your environment.')
      }
    } catch (err: any) {
      console.error('Error saving visit note:', err)
      onError(err.message || 'Failed to save visit note')
    } finally {
      setAnalyzingNotes(false)
    }
  }

  const handleSaveWithoutAI = async () => {
    await handleAddVisitNote()
  }

  const handleDeleteVisitNote = async (id: string) => {
    if (!confirm('Delete this visit note?')) return
    const result = await apiCall('delete_visit_note', { id })
    if (result !== null) onReload()
  }

  // ============================================================================
  // HEALTH TASK HANDLERS
  // ============================================================================

  const resetTaskForm = () => {
    setTaskForm({ family_member_name: '', task: '', due_date: '', priority: 'medium', category: '', notes: '' })
    setShowAddTask(false)
  }

  const handleAddTask = async () => {
    if (!taskForm.family_member_name?.trim() || !taskForm.task?.trim()) return
    const result = await apiCall('add_health_task', taskForm)
    if (result) {
      resetTaskForm()
      onReload()
    }
  }

  const handleCompleteTask = async (id: string) => {
    const result = await apiCall('complete_health_task', { id })
    if (result) onReload()
  }

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return
    const result = await apiCall('delete_health_task', { id })
    if (result !== null) onReload()
  }

  // ============================================================================
  // FILTERED DATA
  // ============================================================================

  const filteredTasks = healthTasks.filter((t: HealthTask) => {
    if (taskFilter === 'pending') return t.status === 'pending' || t.status === 'in_progress'
    return true
  })

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-purple-600">{visitNotes.length}</p>
          <p className="text-xs text-gray-600 mt-1">Visit Notes</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-amber-600">
            {healthTasks.filter((t: HealthTask) => t.status === 'pending').length}
          </p>
          <p className="text-xs text-gray-600 mt-1">Pending Tasks</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-blue-600">
            {healthTasks.filter((t: HealthTask) => t.status === 'in_progress').length}
          </p>
          <p className="text-xs text-gray-600 mt-1">In Progress</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-green-600">
            {healthTasks.filter((t: HealthTask) => t.status === 'completed').length}
          </p>
          <p className="text-xs text-gray-600 mt-1">Completed</p>
        </div>
      </div>

      {/* ================================================================ */}
      {/* VISIT NOTES SECTION */}
      {/* ================================================================ */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Visit Notes
          </h3>
          <button
            onClick={() => { resetVisitNoteForm(); setShowAddVisitNote(!showAddVisitNote) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              showAddVisitNote
                ? `bg-${themeColor}-100 text-${themeColor}-700`
                : `bg-${themeColor}-500 text-white hover:bg-${themeColor}-600`
            }`}
          >
            <Plus className="w-4 h-4" />
            {showAddVisitNote ? 'Cancel' : 'New Visit Note'}
          </button>
        </div>

        {/* Add Visit Note Form */}
        {showAddVisitNote && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {familyMembers.length > 0 ? (
                <select value={visitNoteForm.family_member_name}
                  onChange={(e) => setVisitNoteForm({ ...visitNoteForm, family_member_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select Family Member *</option>
                  {familyMembers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Family Member Name *" value={visitNoteForm.family_member_name}
                  onChange={(e) => setVisitNoteForm({ ...visitNoteForm, family_member_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
              <input type="date" value={visitNoteForm.visit_date}
                onChange={(e) => setVisitNoteForm({ ...visitNoteForm, visit_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {providers.length > 0 ? (
                <select value={visitNoteForm.provider_name}
                  onChange={(e) => setVisitNoteForm({ ...visitNoteForm, provider_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select Provider</option>
                  {providers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Doctor / Provider" value={visitNoteForm.provider_name}
                  onChange={(e) => setVisitNoteForm({ ...visitNoteForm, provider_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>

            <textarea
              placeholder="Paste or type visit notes here... (or upload a file below)"
              value={visitNoteForm.raw_notes}
              onChange={(e) => setVisitNoteForm({ ...visitNoteForm, raw_notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={6}
            />

            {/* File Upload */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg cursor-pointer transition text-sm font-medium text-gray-700">
                <Upload className="w-4 h-4" />
                Upload File
                <input
                  type="file"
                  accept="image/*,.pdf,.txt"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </label>
              {uploadFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{uploadFile.name}</span>
                  <button onClick={() => setUploadFile(null)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAnalyzeNotes}
                disabled={analyzingNotes || (!visitNoteForm.raw_notes?.trim() && !uploadFile)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  analyzingNotes || (!visitNoteForm.raw_notes?.trim() && !uploadFile)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {analyzingNotes ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Analyze with AI &amp; Save</>
                )}
              </button>
              <button
                onClick={handleSaveWithoutAI}
                disabled={!visitNoteForm.family_member_name || !visitNoteForm.visit_date}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  !visitNoteForm.family_member_name || !visitNoteForm.visit_date
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
                }`}
              >
                Save Without AI
              </button>
              <button onClick={resetVisitNoteForm}
                className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Visit Notes List */}
        {visitNotes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600">No visit notes yet. Click &quot;New Visit Note&quot; to add one.</p>
            <p className="text-gray-400 text-sm mt-1">Paste notes or upload a photo/PDF and let AI analyze them!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visitNotes.map((note: VisitNote) => {
              const isExpanded = expandedNote === note.id
              const aiTasks = parseJsonField(note.ai_tasks)
              const aiPrescriptions = parseJsonField(note.ai_prescriptions)
              const aiDiagnoses = parseJsonField(note.ai_diagnoses)

              return (
                <div key={note.id} className="border rounded-lg overflow-hidden">
                  {/* Note Header */}
                  <div
                    className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                    onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        note.ai_synopsis ? 'bg-purple-100' : 'bg-gray-100'
                      }`}>
                        {note.ai_synopsis ? (
                          <Sparkles className="w-5 h-5 text-purple-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{note.family_member_name}</h4>
                          <span className="text-sm text-gray-500">{formatDate(note.visit_date)}</span>
                        </div>
                        {note.provider_name && <p className="text-sm text-gray-600">{note.provider_name}</p>}
                        {note.ai_synopsis && (
                          <p className="text-sm text-gray-700 mt-1 line-clamp-1">{note.ai_synopsis}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {note.ai_synopsis && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">AI Analyzed</span>
                      )}
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t p-4 space-y-4 bg-gray-50">
                      {/* AI Synopsis */}
                      {note.ai_synopsis && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h5 className="font-semibold text-purple-900 flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4" /> AI Summary
                          </h5>
                          <p className="text-purple-900 text-sm">{note.ai_synopsis}</p>
                        </div>
                      )}

                      {/* Diagnoses */}
                      {aiDiagnoses.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                            <CircleDot className="w-4 h-4 text-blue-600" /> Diagnoses
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {aiDiagnoses.map((d: string, i: number) => (
                              <span key={i} className="text-sm bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tasks */}
                      {aiTasks.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                            <ListChecks className="w-4 h-4 text-amber-600" /> Follow-up Tasks
                          </h5>
                          <ul className="space-y-1">
                            {aiTasks.map((t: string, i: number) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Prescriptions */}
                      {aiPrescriptions.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                            <Pill className="w-4 h-4 text-green-600" /> Prescriptions
                          </h5>
                          <ul className="space-y-1">
                            {aiPrescriptions.map((p: string, i: number) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                <Pill className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Follow-up */}
                      {note.ai_followup && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <h5 className="font-semibold text-amber-900 flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4" /> Next Follow-up
                          </h5>
                          <p className="text-sm text-amber-800">{note.ai_followup}</p>
                        </div>
                      )}

                      {/* Raw Notes */}
                      {note.raw_notes && (
                        <div>
                          <h5 className="font-semibold text-gray-600 text-sm mb-1">Original Notes</h5>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap bg-white rounded p-3 border">
                            {note.raw_notes}
                          </p>
                        </div>
                      )}

                      {/* Delete */}
                      <div className="flex justify-end">
                        <button onClick={() => handleDeleteVisitNote(note.id)}
                          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 transition">
                          <Trash2 className="w-4 h-4" /> Delete Note
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* HEALTH TASKS SECTION */}
      {/* ================================================================ */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-600" />
            Health Tasks
          </h3>
          <button
            onClick={() => { resetTaskForm(); setShowAddTask(!showAddTask) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              showAddTask
                ? `bg-${themeColor}-100 text-${themeColor}-700`
                : `bg-${themeColor}-500 text-white hover:bg-${themeColor}-600`
            }`}
          >
            <Plus className="w-4 h-4" />
            {showAddTask ? 'Cancel' : 'Add Task'}
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(['pending', 'all'] as const).map(f => (
            <button key={f} onClick={() => setTaskFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                taskFilter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f === 'pending' ? 'Active' : 'All'}
            </button>
          ))}
        </div>

        {/* Add Task Form */}
        {showAddTask && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {familyMembers.length > 0 ? (
                <select value={taskForm.family_member_name || ''}
                  onChange={(e) => setTaskForm({ ...taskForm, family_member_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select Family Member *</option>
                  {familyMembers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Family Member *" value={taskForm.family_member_name || ''}
                  onChange={(e) => setTaskForm({ ...taskForm, family_member_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
              <select value={taskForm.priority || 'medium'}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as HealthTask['priority'] })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <input type="text" placeholder="Task description *" value={taskForm.task || ''}
              onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                <input type="date" value={taskForm.due_date || ''}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <input type="text" placeholder="Category (e.g., lab work, referral, follow-up)" value={taskForm.category || ''}
                onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <textarea placeholder="Notes" value={taskForm.notes || ''}
              onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
            <div className="flex gap-2">
              <button onClick={handleAddTask}
                className={`flex-1 bg-${themeColor}-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-${themeColor}-600 transition`}>
                Add Task
              </button>
              <button onClick={resetTaskForm}
                className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600">
              {taskFilter === 'pending'
                ? 'No pending tasks. Tasks from AI-analyzed visit notes will appear here automatically!'
                : 'No tasks found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task: HealthTask) => (
              <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                task.status === 'completed' ? 'bg-green-50 opacity-70' : 'hover:bg-gray-50'
              }`}>
                <button
                  onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
                  className={`mt-0.5 flex-shrink-0 ${
                    task.status === 'completed'
                      ? 'text-green-500'
                      : 'text-gray-300 hover:text-green-500'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.task}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                    {task.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{task.category}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{task.family_member_name}</span>
                    {task.due_date && (
                      <span className={isPastDue(task.due_date) && task.status !== 'completed' ? 'text-red-600 font-semibold' : ''}>
                        Due: {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDeleteTask(task.id)}
                  className="p-1 hover:bg-red-100 rounded transition text-red-400 hover:text-red-600 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
