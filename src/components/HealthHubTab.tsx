'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity, Heart, Thermometer, Droplets, Wind, Scale, Smile, StickyNote,
  Plus, X, Check, ChevronRight, ChevronDown, Clock, AlertTriangle,
  User, Users, Calendar, Pill, RefreshCw, Loader2, Eye,
  CircleDot, Shield, TrendingUp, Filter
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface FamilyMember {
  name: string
  role: 'parent' | 'child'
  avatar?: string
}

const FAMILY_MEMBERS: FamilyMember[] = [
  { name: 'Lola', role: 'parent' },
  { name: 'Levi', role: 'parent' },
  { name: 'Amos', role: 'child' },
  { name: 'Zoey', role: 'child' },
  { name: 'Kaylee', role: 'child' },
  { name: 'Ellie', role: 'child' },
  { name: 'Wyatt', role: 'child' },
  { name: 'Hannah', role: 'child' },
]

interface Episode {
  id: string
  name: string
  type: string
  members: string[]
  start_date: string
  resolved: boolean
  resolved_date?: string
  logs?: EpisodeLog[]
  meds?: EpisodeMed[]
}

interface EpisodeLog {
  id: string
  episode_id: string
  member: string
  type: string
  value: string
  notes?: string
  created_at: string
}

interface EpisodeMed {
  id: string
  episode_id: string
  member: string
  med_name: string
  dose: string
  frequency: string
  doses_given?: { time: string; given_by?: string }[]
}

interface TimelineEntry {
  id: string
  member: string
  type: string
  value: string
  notes?: string
  episode_id?: string
  created_at: string
}

interface ToothState {
  id: string
  member: string
  tooth_number: number
  row: 'upper' | 'lower'
  state: 'present' | 'wiggly' | 'lost' | 'permanent'
  updated_at: string
}

interface VitalReading {
  id: string
  member: string
  type: string
  systolic?: number
  diastolic?: number
  heart_rate?: number
  value?: string
  created_at: string
}

interface MedAdherence {
  id: string
  member: string
  med_name: string
  date: string
  status: 'taken' | 'late' | 'missed' | 'no-data'
  time?: string
}

interface ChronicMed {
  member: string
  med_name: string
  dose: string
  pill_count: number
  refill_date?: string
  adherence: MedAdherence[]
  streak: number
}

const EPISODE_TYPES = [
  'Cold/Flu', 'Stomach Bug', 'Allergies', 'Injury', 'Fever', 'Ear Infection',
  'Strep', 'COVID', 'RSV', 'Hand Foot Mouth', 'Pink Eye', 'Other'
]

const TYPE_COLORS: Record<string, string> = {
  'Cold/Flu': 'bg-blue-100 text-blue-700',
  'Stomach Bug': 'bg-amber-100 text-amber-700',
  'Allergies': 'bg-purple-100 text-purple-700',
  'Injury': 'bg-red-100 text-red-700',
  'Fever': 'bg-orange-100 text-orange-700',
  'Ear Infection': 'bg-yellow-100 text-yellow-700',
  'Strep': 'bg-pink-100 text-pink-700',
  'COVID': 'bg-rose-100 text-rose-700',
  'RSV': 'bg-teal-100 text-teal-700',
  'Hand Foot Mouth': 'bg-lime-100 text-lime-700',
  'Pink Eye': 'bg-cyan-100 text-cyan-700',
  'Other': 'bg-gray-100 text-gray-700',
}

const LOG_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'temperature': Thermometer,
  'heart_rate': Heart,
  'bp': Activity,
  'o2': Wind,
  'weight_height': Scale,
  'dental': CircleDot,
  'symptoms': AlertTriangle,
  'note': StickyNote,
}

const TIMELINE_FILTERS = ['All', 'Vitals', 'Dental', 'Episodes', 'Milestones', 'Notes']

// ============================================================================
// SUB-TABS
// ============================================================================

const SUB_TABS = [
  { id: 'episodes', label: 'Episodes', icon: Shield },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'dental', label: 'Dental', icon: CircleDot },
  { id: 'vitals', label: 'Vitals', icon: Heart },
  { id: 'adherence', label: 'Adherence', icon: Pill },
]

// ============================================================================
// HELPER: Member Avatar
// ============================================================================

function MemberAvatar({ name, size = 'md', selected, onClick }: {
  name: string; size?: 'sm' | 'md' | 'lg'; selected?: boolean; onClick?: () => void
}) {
  const colors: Record<string, string> = {
    Lola: 'bg-rose-200 text-rose-700',
    Levi: 'bg-blue-200 text-blue-700',
    Amos: 'bg-green-200 text-green-700',
    Zoey: 'bg-purple-200 text-purple-700',
    Kaylee: 'bg-pink-200 text-pink-700',
    Ellie: 'bg-amber-200 text-amber-700',
    Wyatt: 'bg-cyan-200 text-cyan-700',
    Hannah: 'bg-lime-200 text-lime-700',
  }
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-sm'
  return (
    <button
      onClick={onClick}
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold transition-all
        ${colors[name] || 'bg-gray-200 text-gray-700'}
        ${selected ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      title={name}
    >
      {name[0]}
    </button>
  )
}

// ============================================================================
// EPISODES SUB-TAB
// ============================================================================

function EpisodesSection() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [newEp, setNewEp] = useState({ name: '', type: 'Cold/Flu', members: [] as string[], start_date: new Date().toISOString().slice(0, 10) })

  // Episode detail forms
  const [showAddLog, setShowAddLog] = useState(false)
  const [showAddMed, setShowAddMed] = useState(false)
  const [logForm, setLogForm] = useState({ member: '', type: 'temperature', value: '', notes: '' })
  const [medForm, setMedForm] = useState({ member: '', med_name: '', dose: '', frequency: 'every 4-6 hours' })

  const fetchEpisodes = useCallback(async () => {
    try {
      const res = await fetch('/api/health-hub?action=get_episodes')
      const data = await res.json()
      setEpisodes(data.episodes || [])
    } catch { /* empty */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchEpisodes() }, [fetchEpisodes])

  const createEpisode = async () => {
    if (!newEp.name || newEp.members.length === 0) return
    try {
      await fetch('/api/health-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_episode', ...newEp })
      })
      setShowCreate(false)
      setNewEp({ name: '', type: 'Cold/Flu', members: [], start_date: new Date().toISOString().slice(0, 10) })
      fetchEpisodes()
    } catch { /* empty */ }
  }

  const resolveEpisode = async (id: string) => {
    try {
      await fetch('/api/health-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_episode', id })
      })
      setSelectedEpisode(null)
      fetchEpisodes()
    } catch { /* empty */ }
  }

  const addLogToEpisode = async () => {
    if (!selectedEpisode || !logForm.member || !logForm.value) return
    try {
      await fetch('/api/health-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_episode_log', episode_id: selectedEpisode.id, ...logForm })
      })
      setShowAddLog(false)
      setLogForm({ member: '', type: 'temperature', value: '', notes: '' })
      // Refresh episode detail
      const res = await fetch(`/api/health-hub?action=get_episode&id=${selectedEpisode.id}`)
      const data = await res.json()
      if (data.episode) setSelectedEpisode(data.episode)
    } catch { /* empty */ }
  }

  const addMedToEpisode = async () => {
    if (!selectedEpisode || !medForm.member || !medForm.med_name) return
    try {
      await fetch('/api/health-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_episode_med', episode_id: selectedEpisode.id, ...medForm })
      })
      setShowAddMed(false)
      setMedForm({ member: '', med_name: '', dose: '', frequency: 'every 4-6 hours' })
      const res = await fetch(`/api/health-hub?action=get_episode&id=${selectedEpisode.id}`)
      const data = await res.json()
      if (data.episode) setSelectedEpisode(data.episode)
    } catch { /* empty */ }
  }

  const logDose = async (medId: string) => {
    try {
      await fetch('/api/health-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_dose', med_id: medId, time: new Date().toISOString() })
      })
      if (selectedEpisode) {
        const res = await fetch(`/api/health-hub?action=get_episode&id=${selectedEpisode.id}`)
        const data = await res.json()
        if (data.episode) setSelectedEpisode(data.episode)
      }
    } catch { /* empty */ }
  }

  const dayCount = (start: string) => {
    const diff = Date.now() - new Date(start).getTime()
    return Math.max(1, Math.ceil(diff / 86400000))
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  // Episode detail view
  if (selectedEpisode) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedEpisode(null)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          &larr; Back to Episodes
        </button>
        <div className="bg-white rounded-lg border p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedEpisode.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[selectedEpisode.type] || 'bg-gray-100 text-gray-700'}`}>
                  {selectedEpisode.type}
                </span>
                <span className="text-xs text-gray-500">Day {dayCount(selectedEpisode.start_date)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedEpisode.members.map(m => <MemberAvatar key={m} name={m} size="sm" />)}
            </div>
          </div>

          {/* Per-member logs */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-700">Logs</h4>
              <button onClick={() => { setShowAddLog(true); setLogForm(f => ({ ...f, member: selectedEpisode.members[0] || '' })) }}
                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Log
              </button>
            </div>
            {(selectedEpisode.logs || []).length === 0 && (
              <p className="text-sm text-gray-400 italic">No logs yet. Add one to start tracking.</p>
            )}
            {(selectedEpisode.logs || []).map(log => {
              const Icon = LOG_TYPE_ICONS[log.type] || StickyNote
              return (
                <div key={log.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                  <Icon className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{log.member}</span>
                      <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{log.value}</p>
                    {log.notes && <p className="text-xs text-gray-500 mt-0.5">{log.notes}</p>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Meds */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-700">Medications</h4>
              <button onClick={() => { setShowAddMed(true); setMedForm(f => ({ ...f, member: selectedEpisode.members[0] || '' })) }}
                className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Med
              </button>
            </div>
            {(selectedEpisode.meds || []).length === 0 && (
              <p className="text-sm text-gray-400 italic">No medications added.</p>
            )}
            {(selectedEpisode.meds || []).map(med => (
              <div key={med.id} className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{med.med_name}</span>
                    <span className="text-xs text-gray-500 ml-2">{med.dose} - {med.frequency}</span>
                    <span className="text-xs text-gray-400 ml-2">({med.member})</span>
                  </div>
                  <button onClick={() => logDose(med.id)}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Dose Given
                  </button>
                </div>
                {med.doses_given && med.doses_given.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {med.doses_given.slice(-5).map((d, i) => (
                      <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resolve */}
          {!selectedEpisode.resolved && (
            <button onClick={() => resolveEpisode(selectedEpisode.id)}
              className="w-full mt-2 bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 text-sm font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Resolve Episode
            </button>
          )}
        </div>

        {/* Add Log Modal */}
        {showAddLog && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAddLog(false)}>
            <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">Add Log Entry</h4>
                <button onClick={() => setShowAddLog(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Member</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedEpisode.members.map(m => (
                      <MemberAvatar key={m} name={m} size="sm" selected={logForm.member === m}
                        onClick={() => setLogForm(f => ({ ...f, member: m }))} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                  <select value={logForm.type} onChange={e => setLogForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="temperature">Temperature</option>
                    <option value="heart_rate">Heart Rate</option>
                    <option value="bp">Blood Pressure</option>
                    <option value="o2">O2 Saturation</option>
                    <option value="symptoms">Symptoms</option>
                    <option value="note">Note</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Value</label>
                  <input value={logForm.value} onChange={e => setLogForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 101.2F, Headache, etc." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Notes (optional)</label>
                  <input value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Additional notes" />
                </div>
                <button onClick={addLogToEpisode}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                  Save Log
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Med Modal */}
        {showAddMed && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAddMed(false)}>
            <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">Add Medication</h4>
                <button onClick={() => setShowAddMed(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Member</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedEpisode.members.map(m => (
                      <MemberAvatar key={m} name={m} size="sm" selected={medForm.member === m}
                        onClick={() => setMedForm(f => ({ ...f, member: m }))} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Medication Name</label>
                  <input value={medForm.med_name} onChange={e => setMedForm(f => ({ ...f, med_name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Tylenol, Amoxicillin" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Dose</label>
                  <input value={medForm.dose} onChange={e => setMedForm(f => ({ ...f, dose: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 5ml, 1 tablet" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Frequency</label>
                  <input value={medForm.frequency} onChange={e => setMedForm(f => ({ ...f, frequency: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. every 4-6 hours" />
                </div>
                <button onClick={addMedToEpisode}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                  Add Medication
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Episodes list view
  const active = episodes.filter(e => !e.resolved)
  const resolved = episodes.filter(e => e.resolved)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">Active Episodes</h3>
        <button onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Episode
        </button>
      </div>

      {active.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-green-700 font-medium">Everyone is healthy!</p>
          <p className="text-sm text-green-600">No active illness episodes.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {active.map(ep => (
          <button key={ep.id} onClick={() => setSelectedEpisode(ep)}
            className="bg-white border rounded-lg p-4 text-left hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">{ep.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[ep.type] || 'bg-gray-100 text-gray-700'}`}>
                  {ep.type}
                </span>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Day {dayCount(ep.start_date)}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {ep.members.map(m => <MemberAvatar key={m} name={m} size="sm" />)}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <ChevronRight className="w-3 h-3" /> Tap for details
            </div>
          </button>
        ))}
      </div>

      {resolved.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            {resolved.length} resolved episode{resolved.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2">
            {resolved.map(ep => (
              <div key={ep.id} className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between opacity-60">
                <div>
                  <span className="text-sm font-medium text-gray-700">{ep.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 ${TYPE_COLORS[ep.type] || 'bg-gray-100 text-gray-700'}`}>
                    {ep.type}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{ep.resolved_date ? new Date(ep.resolved_date).toLocaleDateString() : 'Resolved'}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Create Episode Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-lg">New Episode</h4>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Episode Name</label>
                <input value={newEp.name} onChange={e => setNewEp(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. March Cold, Stomach Bug" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {EPISODE_TYPES.map(t => (
                    <button key={t} onClick={() => setNewEp(f => ({ ...f, type: t }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${newEp.type === t ? TYPE_COLORS[t] + ' border-transparent font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Who is sick?</label>
                <div className="flex flex-wrap gap-2">
                  {FAMILY_MEMBERS.map(m => (
                    <MemberAvatar key={m.name} name={m.name} size="md"
                      selected={newEp.members.includes(m.name)}
                      onClick={() => setNewEp(f => ({
                        ...f,
                        members: f.members.includes(m.name)
                          ? f.members.filter(x => x !== m.name)
                          : [...f.members, m.name]
                      }))} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Start Date</label>
                <input type="date" value={newEp.start_date} onChange={e => setNewEp(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={createEpisode}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium">
                Create Episode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TIMELINE SUB-TAB
// ============================================================================

function TimelineSection() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMember, setFilterMember] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('All')

  useEffect(() => {
    fetch('/api/health-hub?action=get_timeline')
      .then(r => r.json())
      .then(data => setEntries(data.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = entries.filter(e => {
    if (filterMember && e.member !== filterMember) return false
    if (filterType === 'All') return true
    if (filterType === 'Vitals') return ['temperature', 'heart_rate', 'bp', 'o2', 'weight_height'].includes(e.type)
    if (filterType === 'Dental') return e.type === 'dental'
    if (filterType === 'Episodes') return !!e.episode_id
    if (filterType === 'Notes') return e.type === 'note'
    if (filterType === 'Milestones') return e.type === 'milestone'
    return true
  })

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="space-y-4">
      {/* Member selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button onClick={() => setFilterMember(null)}
          className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${!filterMember ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          All Family
        </button>
        {FAMILY_MEMBERS.map(m => (
          <MemberAvatar key={m.name} name={m.name} size="sm"
            selected={filterMember === m.name}
            onClick={() => setFilterMember(filterMember === m.name ? null : m.name)} />
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {TIMELINE_FILTERS.map(f => (
          <button key={f} onClick={() => setFilterType(f)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterType === f ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Entries */}
      {filtered.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No timeline entries yet.</p>
        </div>
      )}
      <div className="space-y-2">
        {filtered.map(entry => {
          const Icon = LOG_TYPE_ICONS[entry.type] || StickyNote
          return (
            <div key={entry.id} className="bg-white border rounded-lg p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <MemberAvatar name={entry.member} size="sm" />
                  <span className="text-sm font-medium text-gray-800">{entry.value}</span>
                </div>
                {entry.notes && <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>}
                {entry.episode_id && (
                  <span className="inline-block text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mt-1">Linked to episode</span>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(entry.created_at).toLocaleDateString()}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// DENTAL SUB-TAB
// ============================================================================

const TOOTH_STATES = [
  { value: 'present', label: 'Present', color: 'border-gray-300 bg-white' },
  { value: 'wiggly', label: 'Wiggly', color: 'border-yellow-400 bg-yellow-200' },
  { value: 'lost', label: 'Lost', color: 'border-gray-400 bg-gray-300' },
  { value: 'permanent', label: 'Permanent', color: 'border-green-400 bg-green-200' },
]

function DentalSection() {
  const [selectedMember, setSelectedMember] = useState('Hannah')
  const [teeth, setTeeth] = useState<ToothState[]>([])
  const [loading, setLoading] = useState(true)
  const [editTooth, setEditTooth] = useState<{ number: number; row: 'upper' | 'lower' } | null>(null)

  const childMembers = FAMILY_MEMBERS.filter(m => m.role === 'child')

  const fetchTeeth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/health-hub?action=get_teeth&member=${selectedMember}`)
      const data = await res.json()
      setTeeth(data.teeth || [])
    } catch { /* empty */ }
    setLoading(false)
  }, [selectedMember])

  useEffect(() => { fetchTeeth() }, [fetchTeeth])

  const getToothState = (num: number, row: 'upper' | 'lower'): string => {
    const t = teeth.find(t => t.tooth_number === num && t.row === row)
    return t?.state || 'present'
  }

  const updateTooth = async (num: number, row: 'upper' | 'lower', state: string) => {
    try {
      await fetch('/api/health-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_tooth', member: selectedMember, tooth_number: num, row, state })
      })
      setEditTooth(null)
      fetchTeeth()
    } catch { /* empty */ }
  }

  // Determine tooth count based on member age approximation
  const toothCount = 10 // Using primary teeth count (10 per row) for kids
  const toothNumbers = Array.from({ length: toothCount }, (_, i) => i + 1)

  const renderToothRow = (row: 'upper' | 'lower') => (
    <div className="flex justify-center gap-1.5 flex-wrap">
      {toothNumbers.map(num => {
        const state = getToothState(num, row)
        const stateInfo = TOOTH_STATES.find(s => s.value === state) || TOOTH_STATES[0]
        const isEditing = editTooth?.number === num && editTooth?.row === row
        return (
          <div key={`${row}-${num}`} className="relative">
            <button
              onClick={() => setEditTooth(isEditing ? null : { number: num, row })}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all hover:scale-110 ${stateInfo.color}`}
              title={`Tooth ${num} - ${state}`}
            >
              {num}
            </button>
            {isEditing && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white border rounded-lg shadow-lg p-2 z-10 w-32">
                {TOOTH_STATES.map(s => (
                  <button key={s.value} onClick={() => updateTooth(num, row, s.value)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-50 flex items-center gap-2 ${state === s.value ? 'font-bold' : ''}`}>
                    <span className={`w-3 h-3 rounded-full border ${s.color}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {childMembers.map(m => (
          <MemberAvatar key={m.name} name={m.name} size="md"
            selected={selectedMember === m.name}
            onClick={() => setSelectedMember(m.name)} />
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="bg-white border rounded-lg p-5 space-y-6">
          <h4 className="font-bold text-gray-800 text-center">{selectedMember}&apos;s Dental Map</h4>

          {/* Legend */}
          <div className="flex justify-center gap-3 flex-wrap">
            {TOOTH_STATES.map(s => (
              <div key={s.value} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={`w-4 h-4 rounded-full border-2 ${s.color}`} />
                {s.label}
              </div>
            ))}
          </div>

          {/* Upper row */}
          <div>
            <p className="text-xs text-gray-400 text-center mb-2">Upper</p>
            {renderToothRow('upper')}
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-200" />

          {/* Lower row */}
          <div>
            <p className="text-xs text-gray-400 text-center mb-2">Lower</p>
            {renderToothRow('lower')}
          </div>

          <p className="text-xs text-gray-400 text-center">Tap a tooth to change its state. Changes are saved and logged automatically.</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// VITALS SUB-TAB
// ============================================================================

function VitalsSection() {
  const [memberData, setMemberData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [memberVitals, setMemberVitals] = useState<any[]>([])
  const [memberLoading, setMemberLoading] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [logMember, setLogMember] = useState('')
  const [form, setForm] = useState({ systolic: '', diastolic: '', heart_rate: '' })

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/health-hub?action=get_family_vitals_summary')
      const data = await res.json()
      setMemberData(data.members || [])
    } catch { /* empty */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  const selectMember = async (name: string) => {
    if (selectedMember === name) {
      setSelectedMember(null)
      return
    }
    setSelectedMember(name)
    setMemberLoading(true)
    try {
      const res = await fetch(`/api/health-hub?action=get_member_vitals&member_name=${name}&limit=30`)
      const data = await res.json()
      setMemberVitals(data.logs || [])
    } catch { /* empty */ }
    setMemberLoading(false)
  }

  const openLogForm = (memberName: string) => {
    setLogMember(memberName)
    setForm({ systolic: '', diastolic: '', heart_rate: '' })
    setShowLogForm(true)
  }

  const logVitals = async () => {
    if (!logMember) return
    try {
      await fetch('/api/health-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_vitals',
          member: logMember,
          systolic: Number(form.systolic) || undefined,
          diastolic: Number(form.diastolic) || undefined,
          heart_rate: Number(form.heart_rate) || undefined,
        })
      })
      setShowLogForm(false)
      setForm({ systolic: '', diastolic: '', heart_rate: '' })
      // Refresh
      fetchSummary()
      if (selectedMember === logMember) {
        const res = await fetch(`/api/health-hub?action=get_member_vitals&member_name=${logMember}&limit=30`)
        const data = await res.json()
        setMemberVitals(data.logs || [])
      }
    } catch { /* empty */ }
  }

  const bpColor = (sys?: number, dia?: number) => {
    if (!sys || !dia) return 'text-gray-500'
    if (sys >= 140 || dia >= 90) return 'text-red-600'
    if (sys >= 120) return 'text-amber-600'
    return 'text-green-600'
  }

  const bpBgColor = (sys?: number, dia?: number) => {
    if (!sys || !dia) return ''
    if (sys >= 140 || dia >= 90) return 'bg-red-50'
    if (sys >= 120) return 'bg-amber-50'
    return 'bg-green-50'
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  // Selected member detail view
  if (selectedMember) {
    const member = memberData.find(m => m.name === selectedMember)
    return (
      <div className="space-y-4">
        {/* Back + filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSelectedMember(null)}
            className="text-sm text-blue-600 hover:underline">&larr; All Members</button>
          <div className="flex-1" />
          <button onClick={() => openLogForm(selectedMember)}
            className="bg-red-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-600 flex items-center gap-1.5">
            <Heart className="w-4 h-4" /> Log Vitals
          </button>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <MemberAvatar name={selectedMember} size="lg" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedMember}&apos;s Vitals</h3>
              {member?.overdue_types?.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Overdue: {member.overdue_types.join(', ')}
                </span>
              )}
            </div>
          </div>

          {memberLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : memberVitals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No vitals recorded for {selectedMember}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Type</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Value</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {memberVitals.map((v, i) => {
                    const isBP = v.log_type === 'blood_pressure'
                    const displayValue = isBP && v.value_systolic && v.value_diastolic
                      ? `${v.value_systolic}/${v.value_diastolic} mmHg`
                      : v.value_numeric
                        ? `${v.value_numeric} ${v.value_unit || ''}`
                        : v.value_text || '---'
                    const colorClass = isBP ? bpColor(v.value_systolic, v.value_diastolic) : 'text-gray-800'
                    const rowBg = isBP ? bpBgColor(v.value_systolic, v.value_diastolic) : ''
                    return (
                      <tr key={v.id || i} className={`border-b border-gray-50 ${rowBg}`}>
                        <td className="py-2 text-gray-600">{new Date(v.logged_at).toLocaleDateString()}</td>
                        <td className="py-2 text-gray-600 capitalize">{(v.log_type || '').replace(/_/g, ' ')}</td>
                        <td className={`py-2 font-medium ${colorClass}`}>{displayValue}</td>
                        <td className="py-2 text-gray-500 text-xs max-w-[200px] truncate">{v.notes || ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Log Vitals Modal */}
        {showLogForm && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowLogForm(false)}>
            <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">Log Vitals for {logMember}</h4>
                <button onClick={() => setShowLogForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Systolic</label>
                    <input type="number" value={form.systolic} onChange={e => setForm(f => ({ ...f, systolic: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="120" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Diastolic</label>
                    <input type="number" value={form.diastolic} onChange={e => setForm(f => ({ ...f, diastolic: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="80" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Heart Rate (bpm)</label>
                  <input type="number" value={form.heart_rate} onChange={e => setForm(f => ({ ...f, heart_rate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="72" />
                </div>
                <button onClick={logVitals}
                  className="w-full bg-red-500 text-white py-2.5 rounded-lg hover:bg-red-600 font-medium">
                  Save Reading
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // All members grid view
  return (
    <div className="space-y-4">
      {/* Person filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          className="text-xs px-3 py-1.5 rounded-full font-medium bg-red-500 text-white"
        >
          All
        </button>
        {FAMILY_MEMBERS.map(m => (
          <button
            key={m.name}
            onClick={() => selectMember(m.name)}
            className="text-xs px-3 py-1.5 rounded-full font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Member cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {memberData.map(member => {
          const hasReadings = member.recent_vitals && member.recent_vitals.length > 0
          const hasOverdue = member.overdue_types && member.overdue_types.length > 0
          return (
            <div key={member.name} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MemberAvatar name={member.name} size="md" onClick={() => selectMember(member.name)} />
                  <div>
                    <h4 className="font-bold text-gray-800">{member.name}</h4>
                    {hasOverdue && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => openLogForm(member.name)}
                  className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Log Vitals
                </button>
              </div>

              {!hasReadings ? (
                <p className="text-sm text-gray-400 italic text-center py-3">No vitals recorded</p>
              ) : (
                <div className="space-y-1.5">
                  {member.recent_vitals.slice(0, 3).map((v: any, i: number) => {
                    const isBP = v.log_type === 'blood_pressure'
                    const displayValue = isBP && v.value_systolic && v.value_diastolic
                      ? `${v.value_systolic}/${v.value_diastolic}`
                      : v.value_numeric
                        ? `${v.value_numeric} ${v.value_unit || ''}`
                        : v.value_text || '---'
                    const colorClass = isBP ? bpColor(v.value_systolic, v.value_diastolic) : 'text-gray-700'
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 text-xs capitalize">{(v.log_type || '').replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${colorClass}`}>{displayValue}</span>
                          <span className="text-xs text-gray-400">{new Date(v.logged_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => selectMember(member.name)}
                className="mt-3 w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
              >
                View Full History &rarr;
              </button>
            </div>
          )
        })}
      </div>

      {/* Log Vitals Modal */}
      {showLogForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowLogForm(false)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold">Log Vitals for {logMember}</h4>
              <button onClick={() => setShowLogForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Systolic</label>
                  <input type="number" value={form.systolic} onChange={e => setForm(f => ({ ...f, systolic: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="120" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Diastolic</label>
                  <input type="number" value={form.diastolic} onChange={e => setForm(f => ({ ...f, diastolic: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="80" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Heart Rate (bpm)</label>
                <input type="number" value={form.heart_rate} onChange={e => setForm(f => ({ ...f, heart_rate: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="72" />
              </div>
              <button onClick={logVitals}
                className="w-full bg-red-500 text-white py-2.5 rounded-lg hover:bg-red-600 font-medium">
                Save Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ADHERENCE SUB-TAB
// ============================================================================

const CHRONIC_MEDS = [
  { member: 'Amos', med_name: 'Focalin', dose: '10mg' },
  { member: 'Wyatt', med_name: 'Focalin', dose: '5mg' },
  { member: 'Amos', med_name: 'Clonidine', dose: '0.1mg' },
  { member: 'Wyatt', med_name: 'Clonidine', dose: '0.1mg' },
  { member: 'Lola', med_name: 'Amphetamine Salts', dose: '20mg' },
]

function AdherenceSection() {
  const [adherenceData, setAdherenceData] = useState<ChronicMed[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAdherence = useCallback(async () => {
    try {
      const res = await fetch('/api/health-hub?action=get_adherence')
      const data = await res.json()
      setAdherenceData(data.meds || [])
    } catch { /* empty */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAdherence() }, [fetchAdherence])

  const logDose = async (member: string, med_name: string) => {
    try {
      await fetch('/api/health-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_adherence_dose', member, med_name, date: new Date().toISOString().slice(0, 10), time: new Date().toISOString() })
      })
      fetchAdherence()
    } catch { /* empty */ }
  }

  // Build a month grid from adherence data
  const renderMonthGrid = (adherence: MedAdherence[]) => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Start on Monday
    let startDow = firstDay.getDay() - 1 // 0=Mon
    if (startDow < 0) startDow = 6

    const cells: { date: string; status: string }[] = []
    // Fill empty cells for offset
    for (let i = 0; i < startDow; i++) {
      cells.push({ date: '', status: 'empty' })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const entry = adherence.find(a => a.date === dateStr)
      const isFuture = new Date(dateStr) > today
      cells.push({
        date: dateStr,
        status: isFuture ? 'future' : (entry?.status || 'no-data')
      })
    }

    const statusColors: Record<string, string> = {
      'taken': 'bg-green-400',
      'late': 'bg-amber-400',
      'missed': 'bg-red-400',
      'no-data': 'bg-gray-200',
      'future': 'bg-gray-100',
      'empty': '',
    }

    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-gray-400 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, i) => (
            <div key={i}
              className={`w-full aspect-square rounded-sm ${cell.date ? statusColors[cell.status] : ''}`}
              title={cell.date ? `${cell.date}: ${cell.status}` : ''}
            />
          ))}
        </div>
      </div>
    )
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  // Merge API data with our known chronic meds
  const mergedMeds = CHRONIC_MEDS.map(cm => {
    const found = adherenceData.find(a => a.member === cm.member && a.med_name === cm.med_name)
    return {
      ...cm,
      pill_count: found?.pill_count ?? 30,
      refill_date: found?.refill_date,
      adherence: found?.adherence || [],
      streak: found?.streak ?? 0,
    }
  })

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-800">Medication Adherence</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mergedMeds.map((med, idx) => {
          const needsRefill = med.pill_count <= 7
          return (
            <div key={idx} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MemberAvatar name={med.member} size="sm" />
                  <div>
                    <h4 className="font-semibold text-sm text-gray-800">{med.med_name}</h4>
                    <p className="text-xs text-gray-500">{med.dose}</p>
                  </div>
                </div>
                {med.streak > 0 && (
                  <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3" />
                    {med.streak}d streak
                  </div>
                )}
              </div>

              {/* Month grid */}
              {renderMonthGrid(med.adherence)}

              {/* Legend */}
              <div className="flex gap-2 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400" /> Taken</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Late</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Missed</span>
              </div>

              {/* Pill count + refill */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="text-xs text-gray-500">
                  <Pill className="w-3 h-3 inline mr-1" />
                  {med.pill_count} pills left
                  {needsRefill && (
                    <span className="ml-1.5 text-red-600 font-semibold">Refill needed!</span>
                  )}
                </div>
                <button onClick={() => logDose(med.member, med.med_name)}
                  className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Log Dose
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN HEALTH HUB TAB
// ============================================================================

export default function HealthHubTab() {
  const [activeSubTab, setActiveSubTab] = useState('episodes')

  const renderSubTab = () => {
    switch (activeSubTab) {
      case 'episodes': return <EpisodesSection />
      case 'timeline': return <TimelineSection />
      case 'dental': return <DentalSection />
      case 'vitals': return <VitalsSection />
      case 'adherence': return <AdherenceSection />
      default: return <EpisodesSection />
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Health Hub</h1>
            <p className="text-red-100">Family health tracking, episodes, dental, vitals, and medications</p>
          </div>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="bg-white border rounded-lg p-1 flex gap-1 overflow-x-auto">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeSubTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors flex-1 justify-center
                ${isActive ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Sub-tab content */}
      <div>
        {renderSubTab()}
      </div>
    </div>
  )
}
