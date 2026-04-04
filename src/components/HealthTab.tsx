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
        <DailyCareManager
          careItems={kidCareItems}
          onRefresh={async () => {
            try {
              const res = await fetch('/api/kids/health', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_all_care_items' })
              })
              const data = await res.json()
              setKidCareItems(data.careItems || [])
            } catch { /* ignore */ }
          }}
          onError={(msg: string) => setError(msg)}
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
        <CycleManager
          overview={cycleOverview}
          onRefresh={async () => {
            try {
              const res = await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_cycle_overview' }) })
              setCycleOverview(await res.json())
            } catch { /* ignore */ }
          }}
          onError={(msg: string) => setError(msg)}
        />
      )}

      {/* ================================================================== */}
      {/* KID HEALTH REQUESTS (Parent portal — kids memberGroup only) */}
      {/* ================================================================== */}
      {activeSection === 'kid_requests' && memberGroup === 'kids' && (
        <div className="space-y-4">
          {kidRequests.length === 0 ? (
            <div className="bg-white rounded-lg p-8 shadow-sm border text-center text-gray-400">
              No health requests from kids yet.
            </div>
          ) : (
            kidRequests.map(req => {
              const categoryLabels: Record<string, string> = {
                head: '🤕 Head / Headache', stomach: '🤢 Stomach', skin: '🩹 Skin / Rash',
                eyes: '👁️ Eyes / Vision', teeth: '🦷 Teeth / Mouth', ears: '👂 Ears',
                sick: '🤒 Feeling Sick', injury: '🩼 Hurt / Injury', checkup: '✅ Just Need a Checkup',
                other: '❓ Something Else'
              }
              const severityLabels: Record<string, string> = { mild: '😊 Not bad', medium: '😐 Medium', severe: '😟 Really bothering me' }
              const durationLabels: Record<string, string> = { today: 'Today', few_days: 'A few days', week: 'About a week', awhile: 'A while now' }
              const isPending = req.status === 'pending'

              return (
                <div key={req.id} className={`bg-white rounded-lg p-5 shadow-sm border ${isPending ? 'border-amber-300' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        {req.child_name.charAt(0).toUpperCase() + req.child_name.slice(1)}
                      </div>
                      <div className="font-semibold text-gray-900 text-lg">
                        {categoryLabels[req.category] || req.category}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      req.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      req.status === 'handled' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {req.status === 'pending' ? 'Pending' : req.status === 'scheduled' ? 'Appointment Scheduled' : req.status === 'handled' ? 'Handled at Home' : 'Dismissed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-xs text-gray-500">Severity</div>
                      <div>{severityLabels[req.severity] || req.severity}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-xs text-gray-500">Duration</div>
                      <div>{durationLabels[req.duration] || req.duration}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-xs text-gray-500">Submitted</div>
                      <div>{new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                  </div>

                  {req.notes && (
                    <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 mb-3">
                      <span className="font-medium">Kid says:</span> {req.notes}
                    </div>
                  )}

                  {req.parent_response && (
                    <div className="text-sm text-teal-700 bg-teal-50 rounded p-2 mb-3">
                      <span className="font-medium">Your response:</span> {req.parent_response}
                    </div>
                  )}

                  {isPending && (
                    <KidRequestActions
                      requestId={req.id}
                      onUpdate={async (status: string, response: string) => {
                        try {
                          await fetch('/api/kids/health', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'update_request_status', requestId: req.id, status, parent_response: response || null })
                          })
                          setKidRequests(prev => prev.map(r => r.id === req.id ? { ...r, status, parent_response: response } : r))
                        } catch (err) {
                          console.error('Failed to update request:', err)
                          setError('Failed to update request')
                        }
                      }}
                      themeColor={themeColor}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
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

// ============================================================================
// KID REQUEST ACTIONS (inline sub-component)
// ============================================================================

function CycleManager({ overview, onRefresh, onError }: {
  overview: any; onRefresh: () => void; onError: (msg: string) => void
}) {
  const [addingKid, setAddingKid] = useState(false)
  const [selectedKid, setSelectedKid] = useState('')
  const [reportKid, setReportKid] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const ALL_KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']

  const settings = overview?.settings || []
  const irrCounts = overview?.irregularityCounts || {}
  const toDateStr = (d: any): string => {
    if (!d) return ''
    if (typeof d === 'string') return d.slice(0, 10)
    try { return new Date(d).toISOString().slice(0, 10) } catch { return '' }
  }
  const recentLogs = (overview?.recentLogs || []).map((l: any) => ({ ...l, event_date: toDateStr(l.event_date) }))
  const trackedKids = settings.map((s: any) => s.kid_name)
  const availableKids = ALL_KIDS.filter(k => !trackedKids.includes(k))

  const logsByKid: Record<string, any[]> = {}
  recentLogs.forEach((l: any) => {
    if (!logsByKid[l.kid_name]) logsByKid[l.kid_name] = []
    logsByKid[l.kid_name].push(l)
  })

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_cycle_entry', entryId }) })
      onRefresh()
    } catch { onError('Failed to delete entry') }
  }
  const handleToggleMode = async (kid: string, currentMode: string) => {
    const newMode = currentMode === 'full' ? 'learning' : 'full'
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_cycle_mode', child: kid, mode: newMode }) })
      onRefresh()
    } catch { onError('Failed to update mode') }
  }
  const handleAddKid = async () => {
    if (!selectedKid) return
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_kid_to_cycle_tracker', child: selectedKid }) })
      setAddingKid(false); setSelectedKid(''); onRefresh()
    } catch { onError('Failed to add kid') }
  }
  const handleGenerateReport = async (kid: string) => {
    setReportKid(kid); setReportLoading(true); setReportData(null)
    try {
      const res = await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_cycle_report', child: kid }) })
      setReportData(await res.json())
    } catch { onError('Failed to generate report') }
    setReportLoading(false)
  }

  // Build report text
  const buildReportText = (kid: string, data: any) => {
    const s = data.settings
    const logs = (data.logs || []).map((l: any) => ({ ...l, event_date: toDateStr(l.event_date) }))
    const symptoms = (data.symptoms || []).map((sym: any) => ({ ...sym, log_date: toDateStr(sym.log_date) }))
    const capName = kid.charAt(0).toUpperCase() + kid.slice(1)
    const starts = logs.filter((l: any) => l.event_type === 'start').map((l: any) => l.event_date).sort()
    const ends = logs.filter((l: any) => l.event_type === 'end').map((l: any) => l.event_date).sort()

    if (starts.length < 2) return `${capName} — Cycle Summary\n\nNot enough data yet — keep tracking and this report will fill in over time.`

    // Avg cycle length from starts
    let totalGap = 0
    for (let i = 1; i < starts.length; i++) { totalGap += (new Date(starts[i] + 'T12:00:00').getTime() - new Date(starts[i-1] + 'T12:00:00').getTime()) / 86400000 }
    const avgCycle = Math.round(totalGap / (starts.length - 1))

    // Avg period duration from start/end pairs
    let totalDur = 0, durCount = 0
    starts.forEach((st: string) => {
      const end = ends.find((e: string) => e >= st)
      if (end) { totalDur += (new Date(end + 'T12:00:00').getTime() - new Date(st + 'T12:00:00').getTime()) / 86400000 + 1; durCount++ }
    })
    const avgDur = durCount > 0 ? Math.round(totalDur / durCount) : (s?.avg_period_duration || 5)

    const regLabel = s?.cycle_regularity === 'regular' ? 'Regular' : s?.cycle_regularity === 'varies' ? 'Varies' : 'Unknown'

    // Irregularities
    const allIrr: Record<string, number> = {}
    symptoms.forEach((sym: any) => { (sym.irregularities || []).forEach((ir: string) => { allIrr[ir] = (allIrr[ir] || 0) + 1 }) })
    const irrLines = Object.entries(allIrr).map(([k, v]) => `  - ${k} (${v}x)`).join('\n')

    // Common symptoms
    const commonSym = (s?.common_symptoms || []).join(', ')

    // Notes
    const noteLines = symptoms.filter((sym: any) => sym.notes).map((sym: any) => `  ${sym.log_date}: ${sym.notes}`).join('\n')

    let report = `${capName} — Cycle Summary\nDate range: last 6 months\n\n`
    report += `Average cycle length: ${avgCycle} days\nAverage period duration: ${avgDur} days\nCycle regularity: ${regLabel}\n\n`
    report += `Periods logged: ${starts.length}\n`
    if (irrLines) { report += `\nIrregularities reported:\n${irrLines}\n` }
    if (commonSym) { report += `\nMost common symptoms: ${commonSym}\n` }
    if (noteLines) { report += `\nCheck-in notes:\n${noteLines}\n` }
    return report
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">🌸 Cycle Tracker</h3>
        {availableKids.length > 0 && (
          <button onClick={() => setAddingKid(!addingKid)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 transition">
            <Plus className="w-4 h-4" />Add to Tracker
          </button>
        )}
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800">
        Cycle data is private to each child&apos;s profile and is not visible to other kids.
      </div>

      {addingKid && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <select value={selectedKid} onChange={e => setSelectedKid(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
            <option value="">Select child...</option>
            {availableKids.map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
          </select>
          <p className="text-xs text-gray-500">Will start in Learning Mode — informational only, no tracking.</p>
          <div className="flex gap-2">
            <button onClick={handleAddKid} disabled={!selectedKid}
              className="flex-1 bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600 transition disabled:opacity-50">Add</button>
            <button onClick={() => setAddingKid(false)}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">Cancel</button>
          </div>
        </div>
      )}

      {settings.length === 0 ? (
        <div className="bg-white rounded-lg p-8 shadow-sm border text-center text-gray-400">No kids added to cycle tracker yet.</div>
      ) : (
        settings.map((s: any) => {
          const capName = s.kid_name.charAt(0).toUpperCase() + s.kid_name.slice(1)
          const kidLogs = (logsByKid[s.kid_name] || []).slice(0, 6)
          const hasIrregularities = (irrCounts[s.kid_name] || 0) >= 2

          return (
            <div key={s.kid_name} className="bg-white rounded-lg p-5 shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{capName}</h4>
                  {hasIrregularities && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⚠ patterns to review</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.mode === 'full' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.mode === 'full' ? 'Full Tracking' : 'Learning Mode'}
                  </span>
                  <button onClick={() => handleToggleMode(s.kid_name, s.mode)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                    Switch to {s.mode === 'full' ? 'Learning' : 'Full'}
                  </button>
                </div>
              </div>

              {/* Settings summary */}
              {s.mode === 'full' && s.onboarded && (
                <div className="flex gap-3 text-xs text-gray-500 mb-2">
                  {s.cycle_regularity && s.cycle_regularity !== 'unknown' && <span>Regularity: {s.cycle_regularity}</span>}
                  {s.avg_period_duration && <span>Avg duration: ~{s.avg_period_duration}d</span>}
                  {s.common_symptoms?.length > 0 && <span>Symptoms: {s.common_symptoms.join(', ')}</span>}
                </div>
              )}

              {kidLogs.length > 0 ? (
                <div className="space-y-1 mb-3">
                  {kidLogs.map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between text-sm text-gray-600 group">
                      <span>
                        {entry.event_type === 'start' ? '🔴 Started' : '⚪ Ended'}{' '}
                        {new Date(entry.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button onClick={() => handleDeleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition" title="Delete this entry">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-3">No cycles logged yet</p>
              )}

              {/* Generate Report button */}
              {s.mode === 'full' && (
                <button onClick={() => handleGenerateReport(s.kid_name)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                  Generate Report
                </button>
              )}

              {/* Report display */}
              {reportKid === s.kid_name && (reportLoading ? (
                <div className="mt-3 text-sm text-gray-400">Generating report...</div>
              ) : reportData ? (
                <div className="mt-3 bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{buildReportText(s.kid_name, reportData)}</pre>
                  <button onClick={() => { navigator.clipboard.writeText(buildReportText(s.kid_name, reportData)) }}
                    className="mt-2 text-xs text-rose-600 hover:text-rose-700 font-medium">Copy to clipboard</button>
                </div>
              ) : null)}
            </div>
          )
        })
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

function DailyCareManager({ careItems, onRefresh, onError, themeColor }: {
  careItems: any[]; onRefresh: () => void; onError: (msg: string) => void; themeColor: string
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedChild, setSelectedChild] = useState('')
  const [form, setForm] = useState({ itemName: '', instructions: '', timeOfDay: 'both', category: 'medication', endDate: '' })
  const [saving, setSaving] = useState(false)

  const KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']

  // Group items by child
  const byChild: Record<string, any[]> = {}
  careItems.forEach(item => {
    if (!byChild[item.child_name]) byChild[item.child_name] = []
    byChild[item.child_name].push(item)
  })

  const handleAdd = async () => {
    if (!selectedChild || !form.itemName.trim() || !form.instructions.trim()) return
    setSaving(true)
    try {
      await fetch('/api/kids/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_care_item',
          child: selectedChild,
          itemName: form.itemName,
          instructions: form.instructions,
          timeOfDay: form.timeOfDay,
          category: form.category,
          endDate: form.endDate || null,
        })
      })
      setForm({ itemName: '', instructions: '', timeOfDay: 'both', category: 'medication', endDate: '' })
      setShowAddForm(false)
      onRefresh()
    } catch {
      onError('Failed to add care item')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: number) => {
    try {
      await fetch('/api/kids/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_care_item', careItemId: id })
      })
      onRefresh()
    } catch {
      onError('Failed to remove care item')
    }
  }

  const todayStr = (items: any[]) => {
    const morning = items.filter(i => i.time_of_day === 'morning' || i.time_of_day === 'both')
    const morningDone = morning.filter(i => i.morning_done).length
    const evening = items.filter(i => i.time_of_day === 'evening' || i.time_of_day === 'both')
    const eveningDone = evening.filter(i => i.evening_done).length
    const parts = []
    if (morning.length > 0) parts.push(`${morningDone}/${morning.length} morning`)
    if (evening.length > 0) parts.push(`${eveningDone}/${evening.length} evening`)
    return parts.join(' · ')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Daily Care Routines</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-${themeColor}-500 text-white hover:bg-${themeColor}-600 transition`}
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Select child...</option>
            {KIDS.map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
          </select>
          <input type="text" placeholder="Item name (e.g., Focalin)" value={form.itemName}
            onChange={e => setForm({ ...form, itemName: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <input type="text" placeholder="Instructions" value={form.instructions}
            onChange={e => setForm({ ...form, instructions: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <div className="grid grid-cols-3 gap-2">
            <select value={form.timeOfDay} onChange={e => setForm({ ...form, timeOfDay: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="morning">Morning only</option>
              <option value="evening">Evening only</option>
              <option value="both">Morning & Evening</option>
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="medication">Medication</option>
              <option value="skincare">Skincare</option>
              <option value="supplement">Supplement</option>
              <option value="other">Other</option>
            </select>
            <input type="date" placeholder="End date (optional)" value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !selectedChild || !form.itemName.trim()}
              className={`flex-1 bg-${themeColor}-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-${themeColor}-600 transition disabled:opacity-50`}>
              {saving ? 'Adding...' : 'Add Care Item'}
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Per-child cards */}
      {KIDS.map(kid => {
        const items = byChild[kid] || []
        const capName = kid.charAt(0).toUpperCase() + kid.slice(1)
        return (
          <div key={kid} className="bg-white rounded-lg p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{capName}</h4>
              {items.length > 0 && (
                <span className="text-xs text-gray-500">{todayStr(items)} done today</span>
              )}
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-gray-400">No care routines</p>
            ) : (
              <div className="space-y-2">
                {items.map((item: any) => {
                  const timeLabel = item.time_of_day === 'both' ? '☀️🌙' : item.time_of_day === 'morning' ? '☀️' : '🌙'
                  const catLabel = item.category === 'skincare' ? '🧴' : item.category === 'supplement' ? '💊' : '💊'
                  const parsedEnd = item.end_date ? new Date(item.end_date + 'T12:00:00') : null
                  const endStr = parsedEnd && !isNaN(parsedEnd.getTime()) ? ` · Until ${parsedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : (item.end_date ? ' · Ongoing' : '')
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg group">
                      <span className="text-sm">{catLabel} {timeLabel}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">{item.item_name}</span>
                        <span className="text-xs text-gray-500 ml-2">{item.instructions}{endStr}</span>
                      </div>
                      <button onClick={() => handleRemove(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 transition flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function KidRequestActions({ onUpdate }: { requestId: number; onUpdate: (status: string, response: string) => void; themeColor: string }) {
  const [response, setResponse] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAction = async (status: string) => {
    setSaving(true)
    await onUpdate(status, response)
    setSaving(false)
  }

  return (
    <div className="border-t pt-3 mt-3 space-y-2">
      <input
        type="text"
        value={response}
        onChange={e => setResponse(e.target.value)}
        placeholder="Optional note back to kid..."
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="flex gap-2">
        <button onClick={() => handleAction('scheduled')} disabled={saving}
          className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition disabled:opacity-50">
          Appointment Scheduled
        </button>
        <button onClick={() => handleAction('handled')} disabled={saving}
          className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition disabled:opacity-50">
          Handled at Home
        </button>
        <button onClick={() => handleAction('dismissed')} disabled={saving}
          className="flex-1 bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-500 transition disabled:opacity-50">
          Dismiss
        </button>
      </div>
    </div>
  )
}

// AppointmentForm moved to health/HealthAppointments.tsx
// VisitNotes forms moved to health/HealthVisitNotes.tsx
