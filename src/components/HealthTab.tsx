'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Heart, AlertCircle, Loader2, ClipboardList, X
} from 'lucide-react'
import HealthProviders from './health/HealthProviders'
import HealthMedications from './health/HealthMedications'
import HealthAppointments from './health/HealthAppointments'
import HealthVisitNotes from './health/HealthVisitNotes'
import HealthDailyCare from './health/HealthDailyCare'
import HealthCycleTracker from './health/HealthCycleTracker'
import HealthOverview from './health/HealthOverview'
import HealthMoodActivity from './health/HealthMoodActivity'
import HealthDentalManager from './health/HealthDentalManager'
import HealthImmunizations from './health/HealthImmunizations'
import HealthGrowthChart from './health/HealthGrowthChart'
import ShareWithProviderModal from './health/ShareWithProviderModal'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type InsuranceStatus = 'active' | 'pending' | 'uninsured' | 'terminated'

interface InsurancePlan {
  id: string
  plan_name: string
  plan_type: 'private' | 'medicaid'
  member_group: 'parents' | 'kids'
  // P1-D
  status: InsuranceStatus
  application_id?: string | null
  application_submitted_date?: string | null
  decision_expected_date?: string | null
  application_notes?: string | null
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
// P1-D: insurance status banner — shows above the tab content when the
// member group's insurance is mid-application or fully uninsured. Click
// jumps to the Providers tab so Lola can update the status when the
// decision letter arrives.
// ============================================================================
function InsuranceStatusBanner({
  plan, memberGroup, onJump,
}: {
  plan: InsurancePlan
  memberGroup: 'parents' | 'kids'
  onJump: () => void
}) {
  const isPending = plan.status === 'pending'
  const wrap = isPending
    ? 'bg-amber-50 border-amber-300 text-amber-900'
    : 'bg-red-50 border-red-300 text-red-900'
  const fmt = (iso?: string | null) => {
    if (!iso) return null
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const groupNoun = memberGroup === 'kids' ? "Kids'" : "Parents'"
  return (
    <div className={`border rounded-lg p-4 flex items-start gap-3 ${wrap}`}>
      <span className="text-lg leading-none mt-0.5">{isPending ? '⏳' : '⚠️'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">
          {groupNoun} insurance: {isPending ? 'application submitted (pending decision)' : 'no active coverage'}
        </p>
        <p className="text-sm mt-0.5 opacity-90">
          {plan.application_id && <>App #{plan.application_id} · </>}
          {plan.application_submitted_date && <>Submitted {fmt(plan.application_submitted_date)} · </>}
          {plan.decision_expected_date && <>Decision expected ~{fmt(plan.decision_expected_date)}</>}
          {!plan.application_id && !plan.application_submitted_date && plan.application_notes && plan.application_notes}
        </p>
      </div>
      <button
        onClick={onJump}
        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded ${
          isPending ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        Update status →
      </button>
    </div>
  )
}

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

      {/* P1-D: top-of-tab insurance status banner. Surfaces pending /
          uninsured states so Lola doesn't have to remember the kids are
          mid-application every time she's about to authorize a doctor
          visit. Hidden when status is 'active' or null. */}
      {insurancePlan && (insurancePlan.status === 'pending' || insurancePlan.status === 'uninsured') && (
        <InsuranceStatusBanner
          plan={insurancePlan}
          memberGroup={memberGroup}
          onJump={() => setActiveSection('insurance')}
        />
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
          { id: 'immunizations', label: '💉 Vaccines', show: memberGroup === 'kids' },
          { id: 'growth', label: '📏 Growth', show: memberGroup === 'kids' },
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
        <HealthDentalManager
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
        <HealthMoodActivity />
      )}

      {/* ================================================================== */}
      {/* IMMUNIZATIONS (Parent portal — kids memberGroup only) */}
      {/* ================================================================== */}
      {activeSection === 'immunizations' && memberGroup === 'kids' && (
        <HealthImmunizations />
      )}

      {/* ================================================================== */}
      {/* GROWTH CHART (Parent portal — kids memberGroup only) */}
      {/* ================================================================== */}
      {activeSection === 'growth' && memberGroup === 'kids' && (
        <HealthGrowthChart />
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
        <ShareWithProviderModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  )
}

// DentalManager extracted to health/HealthDentalManager.tsx
// CycleManager extracted to health/HealthCycleTracker.tsx
// DailyCareManager extracted to health/HealthDailyCare.tsx
// MoodActivity extracted to health/HealthMoodActivity.tsx
// ShareWithProviderModal extracted to health/ShareWithProviderModal.tsx
// KidRequestActions + Overview moved to health/HealthOverview.tsx
