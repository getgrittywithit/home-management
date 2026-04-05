'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Heart, AlertCircle, Plus, X, Trash2, Loader2, ClipboardList, CheckCircle
} from 'lucide-react'
import MoodHistoryCard from './MoodHistoryCard'
import HealthProviders from './health/HealthProviders'
import HealthMedications from './health/HealthMedications'
import HealthAppointments from './health/HealthAppointments'
import HealthVisitNotes from './health/HealthVisitNotes'
import MedMoodTimeline from './health/MedMoodTimeline'
import HealthDailyCare from './health/HealthDailyCare'
import HealthCycleTracker from './health/HealthCycleTracker'
import HealthOverview from './health/HealthOverview'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface InsurancePlan {
  id: string
  plan_name: string
  plan_type: 'private' | 'medicaid'
  member_group: 'parents' | 'kids'
  subscriber_name?: string
  member_id?: string
  group_number?: string
  plan_phone?: string
  plan_website?: string
  copay_primary?: string
  copay_specialist?: string
  copay_urgent_care?: string
  copay_er?: string
  deductible?: string
  out_of_pocket_max?: string
  pharmacy_coverage?: string
  dental_coverage?: string
  vision_coverage?: string
  network_type?: string
  coverage_start_date?: string
  coverage_end_date?: string
  notes?: string
}

interface HealthProfile {
  id: string
  family_member_name: string
  member_group: 'parents' | 'kids'
  primary_doctor?: string
  primary_doctor_phone?: string
  pharmacy_name?: string
  pharmacy_phone?: string
  blood_type?: string
  allergies?: string
  chronic_conditions?: string
  emergency_contact?: string
  emergency_phone?: string
  notes?: string
}

interface HealthProvider {
  id: string
  name: string
  specialty?: string
  practice_name?: string
  phone?: string
  fax?: string
  address?: string
  accepts_insurance?: string
  portal_url?: string
  notes?: string
  member_group?: string
}

interface BenefitRule {
  id: string
  rule_category: 'referral' | 'prior_auth' | 'coverage' | 'formulary' | 'network'
  rule_title: string
  rule_description: string
  applies_to?: string
}

interface Appointment {
  id: string
  family_member_name: string
  member_group: 'parents' | 'kids'
  provider_id?: string
  provider_name?: string
  appointment_type: 'checkup' | 'specialist' | 'dental' | 'vision' | 'urgent' | 'followup' | 'lab' | 'imaging'
  appointment_date: string
  location?: string
  reason?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  copay_amount?: string
  referral_needed: boolean
  referral_status?: string
}

interface Medication {
  id: string
  family_member_name: string
  member_group: 'parents' | 'kids'
  medication_name: string
  dosage?: string
  frequency?: string
  prescribing_doctor?: string
  pharmacy?: string
  start_date?: string
  end_date?: string
  refill_date?: string
  refills_remaining?: number
  purpose?: string
  side_effects?: string
  is_active: boolean
  notes?: string
}

interface VisitNote {
  id: string
  appointment_id?: string
  family_member_name: string
  member_group: 'parents' | 'kids'
  visit_date: string
  provider_name?: string
  raw_notes?: string
  ai_synopsis?: string
  ai_tasks?: string[]
  ai_prescriptions?: string[]
  ai_diagnoses?: string[]
  ai_followup?: string
}

interface HealthTask {
  id: string
  family_member_name: string
  member_group: 'parents' | 'kids'
  visit_note_id?: string
  task: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  category?: string
  notes?: string
  completed_at?: string
}

interface HealthTabProps {
  memberGroup: 'parents' | 'kids'
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Constants moved to extracted sub-tab components

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HealthTab({ memberGroup }: HealthTabProps) {
  const [activeSection, setActiveSection] = useState('insurance')
  const [insurancePlan, setInsurancePlan] = useState<InsurancePlan | null>(null)
  const [providers, setProviders] = useState<HealthProvider[]>([])
  const [healthProfiles, setHealthProfiles] = useState<HealthProfile[]>([])
  const [benefitRules, setBenefitRules] = useState<BenefitRule[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [visitNotes, setVisitNotes] = useState<VisitNote[]>([])
  const [healthTasks, setHealthTasks] = useState<HealthTask[]>([])
  const [kidRequests, setKidRequests] = useState<any[]>([])
  const [kidCareItems, setKidCareItems] = useState<any[]>([])
  const [dentalOverview, setDentalOverview] = useState<any>(null)
  const [activityMoodOverview, setActivityMoodOverview] = useState<any>(null)
  const [cycleOverview, setCycleOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states moved to extracted sub-tab components

  // Share with Provider modal
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportKid, setExportKid] = useState('amos')
  const [exportRange, setExportRange] = useState(30)
  const [exporting, setExporting] = useState(false)

  const themeColor = memberGroup === 'parents' ? 'blue' : 'teal'
  const themeClasses = memberGroup === 'parents'
    ? 'from-blue-500 to-indigo-600'
    : 'from-teal-500 to-green-600'

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadData()
  }, [memberGroup])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/health?group=${memberGroup}`)
      if (!response.ok) throw new Error('Failed to fetch health data')

      const data = await response.json()
      setInsurancePlan(data.insurancePlan)
      setProviders(data.providers || [])
      setBenefitRules(data.benefitRules || [])

      // Auto-populate health profiles for all kids if any are missing
      let profiles: HealthProfile[] = data.healthProfiles || []
      if (memberGroup === 'kids') {
        const KIDS_NAMES = ['Amos', 'Ellie', 'Wyatt', 'Hannah', 'Zoey', 'Kaylee']
        const existingNames = new Set(profiles.map((p: HealthProfile) => p.family_member_name.toLowerCase()))
        const missing = KIDS_NAMES.filter(name => !existingNames.has(name.toLowerCase()))
        if (missing.length > 0) {
          const created: HealthProfile[] = []
          for (const name of missing) {
            try {
              const res = await fetch('/api/health', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_health_profile', data: { family_member_name: name, member_group: 'kids' } })
              })
              if (res.ok) {
                const newProfile = await res.json()
                created.push(newProfile)
              }
            } catch { /* ignore individual failures */ }
          }
          profiles = [...profiles, ...created]
        }
      }
      setHealthProfiles(profiles)
      setAppointments(data.appointments || [])
      setMedications(data.medications || [])
      setVisitNotes(data.visitNotes || [])
      setHealthTasks(data.healthTasks || [])

      // Load kid health requests and care items for parent portal
      if (memberGroup === 'kids') {
        try {
          const [reqRes, careRes] = await Promise.all([
            fetch('/api/kids/health', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get_all_requests' })
            }),
            fetch('/api/kids/health', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get_all_care_items' })
            })
          ])
          const reqData = await reqRes.json()
          setKidRequests(reqData.requests || [])
          const careData = await careRes.json()
          setKidCareItems(careData.careItems || [])
          // Load dental, activity/mood, and cycle overviews
          const [dentalRes, activityRes, cycleRes] = await Promise.all([
            fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_dental_overview' }) }),
            fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_activity_mood_overview' }) }),
            fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_cycle_overview' }) }),
          ])
          setDentalOverview(await dentalRes.json())
          setActivityMoodOverview(await activityRes.json())
          setCycleOverview(await cycleRes.json())
        } catch { /* tables may not exist yet */ }
      }
    } catch (err) {
      console.error('Error loading health data:', err)
      setError('Failed to load health data')
    } finally {
      setLoading(false)
    }
  }

  // Helper functions and filters moved to extracted sub-tab components

  const familyMembers = healthProfiles.map(p => p.family_member_name)

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/health/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kid_name: exportKid, date_range: exportRange }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      setShowExportModal(false)
    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to generate PDF')
    }
    setExporting(false)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">Loading health information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r ${themeClasses} text-white p-6 rounded-lg shadow-lg`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {memberGroup === 'parents' ? (
              <Shield className="w-8 h-8 flex-shrink-0 mt-1" />
            ) : (
              <Heart className="w-8 h-8 flex-shrink-0 mt-1" />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {memberGroup === 'parents' ? 'Parents' : 'Kids'} Health Management
              </h1>
              <p className="text-opacity-90 mt-1">
                {memberGroup === 'parents'
                  ? 'Insurance, benefits, and health records for adults'
                  : 'Insurance, pediatric care, and health profiles for children'}
              </p>
            </div>
          </div>
          {memberGroup === 'kids' && (
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shrink-0"
            >
              <ClipboardList className="w-4 h-4" />
              Share with Provider
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Sub-Navigation — 8 tabs matching health/ sub-tab structure */}
      <div className="flex gap-2 overflow-x-auto border-b pb-2 mb-4">
        {[
          { id: 'kid_requests', label: '📊 Overview', show: memberGroup === 'kids' },
          { id: 'medications', label: '💊 Medications', show: true },
          { id: 'insurance', label: '🏥 Providers', show: true },
          { id: 'appointments', label: '📅 Appointments', show: true },
          { id: 'daily_care', label: '🩺 Daily Care', show: memberGroup === 'kids' },
          { id: 'activity_mood', label: '💛 Mood & Activity', show: memberGroup === 'kids' },
          { id: 'notes', label: '📋 Visit Notes', show: true },
          { id: 'cycle', label: '🌙 Cycle Tracker', show: memberGroup === 'kids' },
        ].filter(t => t.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-3 py-2 rounded-t whitespace-nowrap text-sm font-medium transition-colors ${
              activeSection === tab.id
                ? 'bg-white border-b-2 border-teal-500 text-teal-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'kid_requests' && kidRequests.filter((r: any) => r.status === 'pending').length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{kidRequests.filter((r: any) => r.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* INSURANCE & BENEFITS SECTION (Phase 1 - unchanged) */}
      {/* ================================================================== */}
      {activeSection === 'insurance' && (
        <HealthProviders
          memberGroup={memberGroup}
          insurancePlan={insurancePlan}
          providers={providers}
          healthProfiles={healthProfiles}
          benefitRules={benefitRules}
          onReload={loadData}
          onError={setError}
        />
      )}

      {/* ================================================================== */}
      {/* APPOINTMENTS SECTION — Extracted to HealthAppointments */}
      {/* ================================================================== */}
      {activeSection === 'appointments' && (
        <HealthAppointments
          memberGroup={memberGroup}
          appointments={appointments}
          familyMembers={familyMembers}
          providers={providers}
          onReload={loadData}
          onError={setError}
        />
      )}

      {/* ================================================================== */}
      {/* MEDICATIONS SECTION — Extracted to HealthMedications */}
      {/* ================================================================== */}
      {activeSection === 'medications' && (
        <HealthMedications
          memberGroup={memberGroup}
          medications={medications}
          familyMembers={familyMembers}
          onReload={loadData}
          onError={setError}
        />
      )}

      {/* ================================================================== */}
      {/* VISIT NOTES — Extracted to HealthVisitNotes */}
      {/* ================================================================== */}
      {activeSection === 'notes' && (
        <HealthVisitNotes
          memberGroup={memberGroup}
          visitNotes={visitNotes}
          healthTasks={healthTasks}
          familyMembers={familyMembers}
          providers={providers}
          onReload={loadData}
          onError={setError}
        />
      )}

      {activeSection === 'daily_care' && memberGroup === 'kids' && (
        <HealthDailyCare
          careItems={kidCareItems}
          onRefresh={async () => {
            try {
              const res = await fetch('/api/kids/health', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_all_care_items' })
              })
              setKidCareItems((await res.json()).careItems || [])
            } catch { /* ignore */ }
          }}
          onError={setError}
          themeColor={themeColor}
        />
      )}

      {/* ================================================================== */}
      {/* DENTAL MANAGER (Parent portal — kids memberGroup only) */}
      {/* ================================================================== */}
      {activeSection === 'dental' && memberGroup === 'kids' && dentalOverview && (
        <DentalManager
          overview={dentalOverview}
          onRefresh={async () => {
            try {
              const res = await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_dental_overview' }) })
              setDentalOverview(await res.json())
            } catch { /* ignore */ }
          }}
          onError={(msg: string) => setError(msg)}
        />
      )}

      {/* ================================================================== */}
      {/* ACTIVITY & MOOD OVERVIEW (Parent portal — kids memberGroup only) */}
      {/* ================================================================== */}
      {activeSection === 'activity_mood' && memberGroup === 'kids' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Activity & Mood Overview</h3>

          {/* Med-Mood Correlation Timeline (MED-MOOD-1) */}
          <MedMoodTimeline />

          {/* Mood Check-In History */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-xl font-bold mb-4">Mood Check-In History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['Amos', 'Ellie', 'Wyatt', 'Hannah', 'Zoey', 'Kaylee'].map(kid => (
                <MoodHistoryCard key={kid} childName={kid} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* CYCLE TRACKER MANAGER (Parent portal — kids memberGroup only) */}
      {/* ================================================================== */}
      {activeSection === 'cycle' && memberGroup === 'kids' && (
        <HealthCycleTracker
          overview={cycleOverview}
          onRefresh={async () => {
            try {
              const res = await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_cycle_overview' }) })
              setCycleOverview(await res.json())
            } catch { /* ignore */ }
          }}
          onError={setError}
        />
      )}

      {/* ================================================================== */}
      {/* KID HEALTH REQUESTS (Parent portal — kids memberGroup only) */}
      {/* ================================================================== */}
      {activeSection === 'kid_requests' && memberGroup === 'kids' && (
        <HealthOverview
          kidRequests={kidRequests}
          onUpdateRequest={async (id, status, response) => {
            try {
              await fetch('/api/kids/health', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_request_status', requestId: id, status, parent_response: response || null })
              })
              setKidRequests(prev => prev.map((r: any) => r.id === id ? { ...r, status, parent_response: response } : r))
            } catch (err) {
              console.error('Failed to update request:', err)
              setError('Failed to update request')
            }
          }}
          themeColor={themeColor}
        />
      )}

      {/* Share with Provider Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                Share with Provider
              </h3>
              <button onClick={() => setShowExportModal(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Select Child</label>
              <select value={exportKid} onChange={e => setExportKid(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah'].map(k => (
                  <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Date Range</label>
              <div className="flex gap-2">
                {[7, 30, 90].map(r => (
                  <button key={r} onClick={() => setExportRange(r)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      exportRange === r ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    Last {r} Days
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleExportPDF} disabled={exporting}
              className="w-full bg-teal-500 text-white py-3 rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {exporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <>Generate PDF</>}
            </button>
            <p className="text-xs text-gray-500 text-center">PDF opens in a new tab. Print or save to share with your provider.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function DentalManager({ overview, onRefresh, onError }: {
  overview: any; onRefresh: () => void; onError: (msg: string) => void
}) {
  const [noteForm, setNoteForm] = useState({ child: '', note: '' })
  const [showNoteForm, setShowNoteForm] = useState(false)
  const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']

  const byKid: Record<string, any[]> = {}
  overview.items?.forEach((item: any) => {
    if (!byKid[item.child_name]) byKid[item.child_name] = []
    byKid[item.child_name].push(item)
  })

  const streakMap: Record<string, any> = {}
  overview.streaks?.forEach((s: any) => { streakMap[s.child_name] = s })

  const notesByKid: Record<string, any[]> = {}
  overview.notes?.forEach((n: any) => {
    if (!notesByKid[n.child_name]) notesByKid[n.child_name] = []
    notesByKid[n.child_name].push(n)
  })

  const handleAddNote = async () => {
    if (!noteForm.child || !noteForm.note.trim()) return
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_dental_note', child: noteForm.child, note: noteForm.note }) })
      setNoteForm({ child: '', note: '' }); setShowNoteForm(false); onRefresh()
    } catch { onError('Failed to add dental note') }
  }

  const handleDeleteNote = async (noteId: number) => {
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_dental_note', noteId }) })
      onRefresh()
    } catch { onError('Failed to delete note') }
  }

  const handleToggleItem = async (itemId: number, enabled: boolean) => {
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_dental_items', dentalItemId: itemId, enabled }) })
      onRefresh()
    } catch { onError('Failed to update item') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">🦷 Dental Manager</h3>
        <button onClick={() => setShowNoteForm(!showNoteForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-500 text-white hover:bg-cyan-600 transition">
          <Plus className="w-4 h-4" />Add Note
        </button>
      </div>

      {showNoteForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <select value={noteForm.child} onChange={e => setNoteForm(f => ({ ...f, child: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="">Select child...</option>
            {KIDS.map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
          </select>
          <input type="text" placeholder="Dental note (e.g., 2 cavities filled Jan 2026)" value={noteForm.note}
            onChange={e => setNoteForm(f => ({ ...f, note: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          <div className="flex gap-2">
            <button onClick={handleAddNote} disabled={!noteForm.child || !noteForm.note.trim()}
              className="flex-1 bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-cyan-600 transition disabled:opacity-50">Add Note</button>
            <button onClick={() => setShowNoteForm(false)}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">Cancel</button>
          </div>
        </div>
      )}

      {KIDS.map(kid => {
        const items = byKid[kid] || []
        const streak = streakMap[kid]
        const notes = notesByKid[kid] || []
        const capName = kid.charAt(0).toUpperCase() + kid.slice(1)
        return (
          <div key={kid} className="bg-white rounded-lg p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{capName}</h4>
              {streak && (
                <span className="text-sm">
                  {streak.current_streak > 0 ? `🔥 ${streak.current_streak}-day streak` : 'No streak yet'}
                  {streak.longest_streak > 0 && streak.longest_streak > streak.current_streak && (
                    <span className="text-xs text-gray-500 ml-1">(best: {streak.longest_streak})</span>
                  )}
                </span>
              )}
            </div>
            {notes.length > 0 && (
              <div className="mb-2 space-y-1">
                {notes.map((n: any) => (
                  <div key={n.id} className="flex items-center justify-between text-sm text-gray-600 bg-cyan-50 rounded px-3 py-1.5 group">
                    <span>📝 {n.note}</span>
                    <button onClick={() => handleDeleteNote(n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 ? (
              <div className="space-y-1">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <button onClick={() => handleToggleItem(item.id, !item.enabled)}
                      className={`w-4 h-4 rounded border flex-shrink-0 ${item.enabled ? 'bg-cyan-500 border-cyan-500' : 'bg-gray-200 border-gray-300'}`}>
                      {item.enabled && <CheckCircle className="w-4 h-4 text-white" />}
                    </button>
                    <span className={item.enabled ? 'text-gray-900' : 'text-gray-400 line-through'}>
                      {item.time_of_day === 'morning' ? '☀️' : '🌙'} {item.item_name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No dental items configured</p>
            )}
          </div>
        )
      })}

    </div>
  )
}

// CycleManager moved to health/HealthCycleTracker.tsx
// DailyCareManager moved to health/HealthDailyCare.tsx
// KidRequestActions + Overview moved to health/HealthOverview.tsx
