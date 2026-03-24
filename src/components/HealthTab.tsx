'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Heart, Building2, Phone, MapPin, Globe, DollarSign, AlertCircle,
  Plus, X, Edit2, Trash2, User, Pill, Calendar, FileText, ChevronRight,
  CheckCircle, Clock, Stethoscope, Loader2, RefreshCw, AlertTriangle,
  ArrowRight, Eye, EyeOff
} from 'lucide-react'

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

interface HealthTabProps {
  memberGroup: 'parents' | 'kids'
}

// ============================================================================
// CONSTANTS
// ============================================================================

const categoryColors: Record<string, string> = {
  'referral': 'bg-blue-100 text-blue-800',
  'prior_auth': 'bg-orange-100 text-orange-800',
  'coverage': 'bg-green-100 text-green-800',
  'formulary': 'bg-purple-100 text-purple-800',
  'network': 'bg-pink-100 text-pink-800'
}

const appointmentTypeLabels: Record<string, string> = {
  'checkup': 'Check-up',
  'specialist': 'Specialist',
  'dental': 'Dental',
  'vision': 'Vision',
  'urgent': 'Urgent Care',
  'followup': 'Follow-up',
  'lab': 'Lab Work',
  'imaging': 'Imaging'
}

const appointmentTypeColors: Record<string, string> = {
  'checkup': 'bg-green-100 text-green-800',
  'specialist': 'bg-blue-100 text-blue-800',
  'dental': 'bg-cyan-100 text-cyan-800',
  'vision': 'bg-indigo-100 text-indigo-800',
  'urgent': 'bg-red-100 text-red-800',
  'followup': 'bg-amber-100 text-amber-800',
  'lab': 'bg-purple-100 text-purple-800',
  'imaging': 'bg-pink-100 text-pink-800'
}

const statusColors: Record<string, string> = {
  'scheduled': 'bg-blue-100 text-blue-800',
  'completed': 'bg-green-100 text-green-800',
  'cancelled': 'bg-gray-100 text-gray-600',
  'no_show': 'bg-red-100 text-red-800'
}

const statusLabels: Record<string, string> = {
  'scheduled': 'Scheduled',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'no_show': 'No Show'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Phase 1 form states
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [editingProfile, setEditingProfile] = useState<string | null>(null)

  // Phase 2 form states
  const [showAddAppointment, setShowAddAppointment] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null)
  const [showAddMedication, setShowAddMedication] = useState(false)
  const [editingMedication, setEditingMedication] = useState<string | null>(null)
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [medFilter, setMedFilter] = useState<'active' | 'all'>('active')

  const [providerForm, setProviderForm] = useState<Partial<HealthProvider>>({
    name: '', specialty: '', practice_name: '', phone: '', address: '', notes: ''
  })

  const [profileForm, setProfileForm] = useState<Partial<HealthProfile>>({
    family_member_name: '', primary_doctor: '', primary_doctor_phone: '',
    pharmacy_name: '', pharmacy_phone: '', blood_type: '', allergies: '',
    chronic_conditions: '', emergency_contact: '', emergency_phone: '', notes: ''
  })

  const [appointmentForm, setAppointmentForm] = useState<Partial<Appointment>>({
    family_member_name: '', provider_name: '', appointment_type: 'checkup',
    appointment_date: '', location: '', reason: '', status: 'scheduled',
    notes: '', copay_amount: '', referral_needed: false, referral_status: ''
  })

  const [medicationForm, setMedicationForm] = useState<Partial<Medication>>({
    family_member_name: '', medication_name: '', dosage: '', frequency: '',
    prescribing_doctor: '', pharmacy: '', start_date: '', end_date: '',
    refill_date: '', refills_remaining: undefined, purpose: '', side_effects: '',
    is_active: true, notes: ''
  })

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
      setHealthProfiles(data.healthProfiles || [])
      setBenefitRules(data.benefitRules || [])
      setAppointments(data.appointments || [])
      setMedications(data.medications || [])
    } catch (err) {
      console.error('Error loading health data:', err)
      setError('Failed to load health data')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // PHASE 1 HANDLERS (unchanged)
  // ============================================================================

  const handleAddProvider = async () => {
    if (!providerForm.name?.trim()) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_provider', data: { ...providerForm, member_group: memberGroup } })
      })
      if (!response.ok) throw new Error('Failed to add provider')
      const newProvider = await response.json()
      setProviders([...providers, newProvider])
      resetProviderForm()
    } catch (err) {
      console.error('Error adding provider:', err)
      setError('Failed to add provider')
    }
  }

  const handleUpdateProvider = async (id: string) => {
    if (!providerForm.name?.trim()) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_provider', data: { id, ...providerForm } })
      })
      if (!response.ok) throw new Error('Failed to update provider')
      const updated = await response.json()
      setProviders(providers.map(p => p.id === id ? updated : p))
      resetProviderForm()
    } catch (err) {
      console.error('Error updating provider:', err)
      setError('Failed to update provider')
    }
  }

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_provider', data: { id } })
      })
      if (!response.ok) throw new Error('Failed to delete provider')
      setProviders(providers.filter(p => p.id !== id))
    } catch (err) {
      console.error('Error deleting provider:', err)
      setError('Failed to delete provider')
    }
  }

  const handleAddProfile = async () => {
    if (!profileForm.family_member_name?.trim()) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_health_profile', data: { ...profileForm, member_group: memberGroup } })
      })
      if (!response.ok) throw new Error('Failed to add health profile')
      const newProfile = await response.json()
      setHealthProfiles([...healthProfiles, newProfile])
      resetProfileForm()
    } catch (err) {
      console.error('Error adding profile:', err)
      setError('Failed to add health profile')
    }
  }

  const handleUpdateProfile = async (id: string) => {
    if (!profileForm.family_member_name?.trim()) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_health_profile', data: { id, ...profileForm } })
      })
      if (!response.ok) throw new Error('Failed to update health profile')
      const updated = await response.json()
      setHealthProfiles(healthProfiles.map(p => p.id === id ? updated : p))
      resetProfileForm()
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update health profile')
    }
  }

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this health profile?')) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_health_profile', data: { id } })
      })
      if (!response.ok) throw new Error('Failed to delete health profile')
      setHealthProfiles(healthProfiles.filter(p => p.id !== id))
    } catch (err) {
      console.error('Error deleting profile:', err)
      setError('Failed to delete health profile')
    }
  }

  const startEditProvider = (provider: HealthProvider) => {
    setEditingProvider(provider.id)
    setProviderForm(provider)
    setShowAddProvider(true)
  }

  const startEditProfile = (profile: HealthProfile) => {
    setEditingProfile(profile.id)
    setProfileForm(profile)
    setShowAddProfile(true)
  }

  const resetProviderForm = () => {
    setProviderForm({ name: '', specialty: '', practice_name: '', phone: '', address: '', notes: '' })
    setShowAddProvider(false)
    setEditingProvider(null)
  }

  const resetProfileForm = () => {
    setProfileForm({
      family_member_name: '', primary_doctor: '', primary_doctor_phone: '',
      pharmacy_name: '', pharmacy_phone: '', blood_type: '', allergies: '',
      chronic_conditions: '', emergency_contact: '', emergency_phone: '', notes: ''
    })
    setShowAddProfile(false)
    setEditingProfile(null)
  }

  const handleUpdatePlan = async (updates: Partial<InsurancePlan>) => {
    if (!insurancePlan) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_insurance_plan', data: { id: insurancePlan.id, ...updates } })
      })
      if (!response.ok) throw new Error('Failed to update insurance plan')
      const updated = await response.json()
      setInsurancePlan(updated)
      setEditingPlan(false)
    } catch (err) {
      console.error('Error updating plan:', err)
      setError('Failed to update insurance plan')
    }
  }

  // ============================================================================
  // PHASE 2: APPOINTMENT HANDLERS
  // ============================================================================

  const handleAddAppointment = async () => {
    if (!appointmentForm.family_member_name?.trim() || !appointmentForm.appointment_date) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_appointment',
          data: { ...appointmentForm, member_group: memberGroup }
        })
      })
      if (!response.ok) throw new Error('Failed to add appointment')
      const newAppt = await response.json()
      setAppointments([newAppt, ...appointments])
      resetAppointmentForm()
    } catch (err) {
      console.error('Error adding appointment:', err)
      setError('Failed to add appointment')
    }
  }

  const handleUpdateAppointment = async (id: string) => {
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_appointment',
          data: { id, ...appointmentForm }
        })
      })
      if (!response.ok) throw new Error('Failed to update appointment')
      const updated = await response.json()
      setAppointments(appointments.map(a => a.id === id ? updated : a))
      resetAppointmentForm()
    } catch (err) {
      console.error('Error updating appointment:', err)
      setError('Failed to update appointment')
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_appointment', data: { id } })
      })
      if (!response.ok) throw new Error('Failed to delete appointment')
      setAppointments(appointments.filter(a => a.id !== id))
    } catch (err) {
      console.error('Error deleting appointment:', err)
      setError('Failed to delete appointment')
    }
  }

  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_appointment',
          data: { id, status: newStatus }
        })
      })
      if (!response.ok) throw new Error('Failed to update status')
      const updated = await response.json()
      setAppointments(appointments.map(a => a.id === id ? updated : a))
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update appointment status')
    }
  }

  const startEditAppointment = (appt: Appointment) => {
    setEditingAppointment(appt.id)
    setAppointmentForm({
      ...appt,
      appointment_date: appt.appointment_date ? new Date(appt.appointment_date).toISOString().slice(0, 16) : ''
    })
    setShowAddAppointment(true)
  }

  const resetAppointmentForm = () => {
    setAppointmentForm({
      family_member_name: '', provider_name: '', appointment_type: 'checkup',
      appointment_date: '', location: '', reason: '', status: 'scheduled',
      notes: '', copay_amount: '', referral_needed: false, referral_status: ''
    })
    setShowAddAppointment(false)
    setEditingAppointment(null)
  }

  // ============================================================================
  // PHASE 2: MEDICATION HANDLERS
  // ============================================================================

  const handleAddMedication = async () => {
    if (!medicationForm.family_member_name?.trim() || !medicationForm.medication_name?.trim()) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_medication',
          data: { ...medicationForm, member_group: memberGroup }
        })
      })
      if (!response.ok) throw new Error('Failed to add medication')
      const newMed = await response.json()
      setMedications([newMed, ...medications])
      resetMedicationForm()
    } catch (err) {
      console.error('Error adding medication:', err)
      setError('Failed to add medication')
    }
  }

  const handleUpdateMedication = async (id: string) => {
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_medication',
          data: { id, ...medicationForm }
        })
      })
      if (!response.ok) throw new Error('Failed to update medication')
      const updated = await response.json()
      setMedications(medications.map(m => m.id === id ? updated : m))
      resetMedicationForm()
    } catch (err) {
      console.error('Error updating medication:', err)
      setError('Failed to update medication')
    }
  }

  const handleDeleteMedication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medication?')) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_medication', data: { id } })
      })
      if (!response.ok) throw new Error('Failed to delete medication')
      setMedications(medications.filter(m => m.id !== id))
    } catch (err) {
      console.error('Error deleting medication:', err)
      setError('Failed to delete medication')
    }
  }

  const handleToggleMedicationActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_medication_active',
          data: { id, is_active: !currentActive }
        })
      })
      if (!response.ok) throw new Error('Failed to update medication')
      const updated = await response.json()
      setMedications(medications.map(m => m.id === id ? updated : m))
    } catch (err) {
      console.error('Error toggling medication:', err)
      setError('Failed to update medication status')
    }
  }

  const startEditMedication = (med: Medication) => {
    setEditingMedication(med.id)
    setMedicationForm({
      ...med,
      start_date: med.start_date ? med.start_date.split('T')[0] : '',
      end_date: med.end_date ? med.end_date.split('T')[0] : '',
      refill_date: med.refill_date ? med.refill_date.split('T')[0] : ''
    })
    setShowAddMedication(true)
  }

  const resetMedicationForm = () => {
    setMedicationForm({
      family_member_name: '', medication_name: '', dosage: '', frequency: '',
      prescribing_doctor: '', pharmacy: '', start_date: '', end_date: '',
      refill_date: '', refills_remaining: undefined, purpose: '', side_effects: '',
      is_active: true, notes: ''
    })
    setShowAddMedication(false)
    setEditingMedication(null)
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    })
  }

  const isUpcoming = (dateStr: string) => {
    return new Date(dateStr) >= new Date()
  }

  const isPastDue = (dateStr: string) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  const getDaysUntil = (dateStr: string) => {
    if (!dateStr) return null
    const diff = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const filteredAppointments = appointments.filter(a => {
    if (appointmentFilter === 'upcoming') return isUpcoming(a.appointment_date) && a.status === 'scheduled'
    if (appointmentFilter === 'past') return !isUpcoming(a.appointment_date) || a.status !== 'scheduled'
    return true
  })

  const filteredMedications = medications.filter(m => {
    if (medFilter === 'active') return m.is_active
    return true
  })

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

      {/* Sub-Navigation */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'insurance', label: 'Insurance & Benefits', icon: Shield },
          { id: 'appointments', label: 'Appointments', icon: Calendar },
          { id: 'medications', label: 'Medications', icon: Pill },
          { id: 'notes', label: 'Visit Notes & AI', icon: FileText, disabled: true }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveSection(tab.id)}
            disabled={tab.disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition ${
              activeSection === tab.id
                ? `bg-${themeColor}-500 text-white`
                : `bg-gray-200 text-gray-700 ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
            {tab.disabled && <span className="text-xs bg-gray-400 px-2 py-1 rounded ml-1">Phase 3</span>}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* INSURANCE & BENEFITS SECTION (Phase 1 - unchanged) */}
      {/* ================================================================== */}
      {activeSection === 'insurance' && (
        <div className="space-y-6">
          {/* Insurance Plan Card */}
          {insurancePlan && (
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    memberGroup === 'parents' ? 'bg-blue-100' : 'bg-teal-100'
                  }`}>
                    <Building2 className={`w-6 h-6 ${
                      memberGroup === 'parents' ? 'text-blue-600' : 'text-teal-600'
                    }`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{insurancePlan.plan_name}</h2>
                    <p className="text-sm text-gray-600 capitalize">{insurancePlan.plan_type}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingPlan(!editingPlan)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                    editingPlan
                      ? `bg-${themeColor}-100 text-${themeColor}-700`
                      : `bg-gray-100 text-gray-700 hover:bg-gray-200`
                  }`}
                >
                  <Edit2 className="w-4 h-4" />
                  {editingPlan ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {editingPlan ? (
                <InsurancePlanEditForm
                  plan={insurancePlan}
                  onSave={handleUpdatePlan}
                  onCancel={() => setEditingPlan(false)}
                  themeColor={themeColor}
                />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insurancePlan.subscriber_name && (
                      <div>
                        <p className="text-sm text-gray-600">Subscriber</p>
                        <p className="font-semibold text-gray-900">{insurancePlan.subscriber_name}</p>
                      </div>
                    )}
                    {insurancePlan.member_id && (
                      <div>
                        <p className="text-sm text-gray-600">Member ID</p>
                        <p className="font-semibold text-gray-900">{insurancePlan.member_id}</p>
                      </div>
                    )}
                    {insurancePlan.group_number && (
                      <div>
                        <p className="text-sm text-gray-600">Group Number</p>
                        <p className="font-semibold text-gray-900">{insurancePlan.group_number}</p>
                      </div>
                    )}
                    {insurancePlan.network_type && (
                      <div>
                        <p className="text-sm text-gray-600">Network Type</p>
                        <p className="font-semibold text-gray-900">{insurancePlan.network_type}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Copays & Coverage
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {insurancePlan.copay_primary && (
                        <div className="bg-white p-3 rounded border">
                          <p className="text-xs text-gray-600">Primary Care</p>
                          <p className="font-bold text-gray-900">{insurancePlan.copay_primary}</p>
                        </div>
                      )}
                      {insurancePlan.copay_specialist && (
                        <div className="bg-white p-3 rounded border">
                          <p className="text-xs text-gray-600">Specialist</p>
                          <p className="font-bold text-gray-900">{insurancePlan.copay_specialist}</p>
                        </div>
                      )}
                      {insurancePlan.copay_urgent_care && (
                        <div className="bg-white p-3 rounded border">
                          <p className="text-xs text-gray-600">Urgent Care</p>
                          <p className="font-bold text-gray-900">{insurancePlan.copay_urgent_care}</p>
                        </div>
                      )}
                      {insurancePlan.copay_er && (
                        <div className="bg-white p-3 rounded border">
                          <p className="text-xs text-gray-600">ER Visit</p>
                          <p className="font-bold text-gray-900">{insurancePlan.copay_er}</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {insurancePlan.deductible && (
                        <div className="bg-white p-3 rounded border">
                          <p className="text-xs text-gray-600">Deductible</p>
                          <p className="font-bold text-gray-900">{insurancePlan.deductible}</p>
                        </div>
                      )}
                      {insurancePlan.out_of_pocket_max && (
                        <div className="bg-white p-3 rounded border">
                          <p className="text-xs text-gray-600">Out of Pocket Max</p>
                          <p className="font-bold text-gray-900">{insurancePlan.out_of_pocket_max}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    {insurancePlan.plan_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <a href={`tel:${insurancePlan.plan_phone}`} className="text-blue-600 hover:underline">
                          {insurancePlan.plan_phone}
                        </a>
                      </div>
                    )}
                    {insurancePlan.plan_website && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <a href={insurancePlan.plan_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {insurancePlan.plan_website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Benefit Rules */}
          {benefitRules.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Benefit Rules & Restrictions
              </h3>
              <div className="space-y-3">
                {benefitRules.map(rule => (
                  <div key={rule.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[rule.rule_category]}`}>
                        {rule.rule_category.replace('_', ' ').toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{rule.rule_title}</h4>
                        <p className="text-sm text-gray-700 mt-1">{rule.rule_description}</p>
                        {rule.applies_to && (
                          <p className="text-xs text-gray-600 mt-2">
                            <strong>Applies to:</strong> {rule.applies_to}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provider Directory */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                Provider Directory
              </h3>
              <button
                onClick={() => { resetProviderForm(); setShowAddProvider(!showAddProvider) }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                  showAddProvider
                    ? `bg-${themeColor}-100 text-${themeColor}-700`
                    : `bg-${themeColor}-500 text-white hover:bg-${themeColor}-600`
                }`}
              >
                <Plus className="w-4 h-4" />
                {showAddProvider ? 'Cancel' : 'Add Provider'}
              </button>
            </div>

            {showAddProvider && (
              <ProviderForm
                form={providerForm} setForm={setProviderForm}
                onSave={() => editingProvider ? handleUpdateProvider(editingProvider) : handleAddProvider()}
                onCancel={resetProviderForm} isEditing={!!editingProvider} themeColor={themeColor}
              />
            )}

            {providers.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">No providers added yet. Click &quot;Add Provider&quot; to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {providers.map(provider => (
                  <div key={provider.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                          {provider.specialty && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{provider.specialty}</span>
                          )}
                        </div>
                        {provider.practice_name && <p className="text-sm text-gray-700 mt-1">{provider.practice_name}</p>}
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                          {provider.phone && (
                            <a href={`tel:${provider.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                              <Phone className="w-4 h-4" /> {provider.phone}
                            </a>
                          )}
                          {provider.address && (
                            <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {provider.address}</div>
                          )}
                        </div>
                        {provider.notes && <p className="text-sm text-gray-600 mt-2 italic">{provider.notes}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEditProvider(provider)} className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteProvider(provider.id)} className="p-2 hover:bg-red-100 rounded-lg transition text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Health Profiles */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Health Profiles
              </h3>
              <button
                onClick={() => { resetProfileForm(); setShowAddProfile(!showAddProfile) }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                  showAddProfile
                    ? `bg-${themeColor}-100 text-${themeColor}-700`
                    : `bg-${themeColor}-500 text-white hover:bg-${themeColor}-600`
                }`}
              >
                <Plus className="w-4 h-4" />
                {showAddProfile ? 'Cancel' : 'Add Profile'}
              </button>
            </div>

            {showAddProfile && (
              <HealthProfileForm
                form={profileForm} setForm={setProfileForm}
                onSave={() => editingProfile ? handleUpdateProfile(editingProfile) : handleAddProfile()}
                onCancel={resetProfileForm} isEditing={!!editingProfile} themeColor={themeColor}
              />
            )}

            {healthProfiles.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">No health profiles added yet. Click &quot;Add Profile&quot; to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthProfiles.map(profile => (
                  <div key={profile.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-semibold text-gray-900 text-lg">{profile.family_member_name}</h4>
                      <div className="flex gap-1">
                        <button onClick={() => startEditProfile(profile)} className="p-1.5 hover:bg-blue-100 rounded transition text-blue-600" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteProfile(profile.id)} className="p-1.5 hover:bg-red-100 rounded transition text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {profile.blood_type && (
                        <div><p className="text-gray-600">Blood Type</p><p className="font-semibold text-gray-900">{profile.blood_type}</p></div>
                      )}
                      {profile.allergies && (
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <p className="text-red-900 font-semibold text-xs">ALLERGIES</p>
                          <p className="text-red-800">{profile.allergies}</p>
                        </div>
                      )}
                      {profile.chronic_conditions && (
                        <div><p className="text-gray-600">Chronic Conditions</p><p className="text-gray-900">{profile.chronic_conditions}</p></div>
                      )}
                      {profile.primary_doctor && (
                        <div>
                          <p className="text-gray-600">Primary Doctor</p>
                          <p className="text-gray-900">{profile.primary_doctor}</p>
                          {profile.primary_doctor_phone && (
                            <a href={`tel:${profile.primary_doctor_phone}`} className="text-blue-600 hover:underline">{profile.primary_doctor_phone}</a>
                          )}
                        </div>
                      )}
                      {profile.pharmacy_name && (
                        <div>
                          <p className="text-gray-600">Pharmacy</p>
                          <p className="text-gray-900">{profile.pharmacy_name}</p>
                          {profile.pharmacy_phone && (
                            <a href={`tel:${profile.pharmacy_phone}`} className="text-blue-600 hover:underline">{profile.pharmacy_phone}</a>
                          )}
                        </div>
                      )}
                      {profile.emergency_contact && (
                        <div className="border-t pt-2">
                          <p className="text-gray-600 font-semibold">Emergency Contact</p>
                          <p className="text-gray-900">{profile.emergency_contact}</p>
                          {profile.emergency_phone && (
                            <a href={`tel:${profile.emergency_phone}`} className="text-blue-600 hover:underline">{profile.emergency_phone}</a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* APPOINTMENTS SECTION (Phase 2 - NEW) */}
      {/* ================================================================== */}
      {activeSection === 'appointments' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-blue-600">
                {appointments.filter(a => a.status === 'scheduled' && isUpcoming(a.appointment_date)).length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Upcoming</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-green-600">
                {appointments.filter(a => a.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Completed</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-amber-600">
                {appointments.filter(a => a.referral_needed && a.status === 'scheduled').length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Need Referral</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-gray-600">
                {appointments.length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Total</p>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Appointments
              </h3>
              <button
                onClick={() => { resetAppointmentForm(); setShowAddAppointment(!showAddAppointment) }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                  showAddAppointment
                    ? `bg-${themeColor}-100 text-${themeColor}-700`
                    : `bg-${themeColor}-500 text-white hover:bg-${themeColor}-600`
                }`}
              >
                <Plus className="w-4 h-4" />
                {showAddAppointment ? 'Cancel' : 'New Appointment'}
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
              {(['upcoming', 'past', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setAppointmentFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    appointmentFilter === f
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'upcoming' ? 'Upcoming' : f === 'past' ? 'Past' : 'All'}
                </button>
              ))}
            </div>

            {/* Add/Edit Form */}
            {showAddAppointment && (
              <AppointmentForm
                form={appointmentForm}
                setForm={setAppointmentForm}
                onSave={() => editingAppointment ? handleUpdateAppointment(editingAppointment) : handleAddAppointment()}
                onCancel={resetAppointmentForm}
                isEditing={!!editingAppointment}
                themeColor={themeColor}
                familyMembers={familyMembers}
                providers={providers}
              />
            )}

            {/* Appointments List */}
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">
                  {appointmentFilter === 'upcoming'
                    ? 'No upcoming appointments. Click "New Appointment" to schedule one.'
                    : 'No appointments found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map(appt => {
                  const daysUntil = getDaysUntil(appt.appointment_date)
                  return (
                    <div key={appt.id} className={`border rounded-lg p-4 transition ${
                      appt.status === 'cancelled' ? 'opacity-60' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">{appt.family_member_name}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${appointmentTypeColors[appt.appointment_type]}`}>
                              {appointmentTypeLabels[appt.appointment_type]}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColors[appt.status]}`}>
                              {statusLabels[appt.status]}
                            </span>
                            {appt.referral_needed && (
                              <span className="text-xs px-2 py-1 rounded-full font-semibold bg-amber-100 text-amber-800">
                                Referral {appt.referral_status || 'Needed'}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{formatDateTime(appt.appointment_date)}</span>
                              {daysUntil !== null && appt.status === 'scheduled' && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  daysUntil <= 1 ? 'bg-red-100 text-red-700' :
                                  daysUntil <= 7 ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                </span>
                              )}
                            </div>
                            {appt.provider_name && (
                              <div className="flex items-center gap-2">
                                <Stethoscope className="w-4 h-4" />
                                <span>{appt.provider_name}</span>
                              </div>
                            )}
                            {appt.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{appt.location}</span>
                              </div>
                            )}
                            {appt.reason && <p className="text-gray-700 mt-1">{appt.reason}</p>}
                            {appt.copay_amount && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                <span>Copay: {appt.copay_amount}</span>
                              </div>
                            )}
                            {appt.notes && <p className="text-gray-500 italic mt-1">{appt.notes}</p>}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          {appt.status === 'scheduled' && (
                            <button
                              onClick={() => handleQuickStatusChange(appt.id, 'completed')}
                              className="p-2 hover:bg-green-100 rounded-lg transition text-green-600"
                              title="Mark Completed"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => startEditAppointment(appt)} className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteAppointment(appt.id)} className="p-2 hover:bg-red-100 rounded-lg transition text-red-600" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MEDICATIONS SECTION (Phase 2 - NEW) */}
      {/* ================================================================== */}
      {activeSection === 'medications' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-green-600">
                {medications.filter(m => m.is_active).length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Active Meds</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-amber-600">
                {medications.filter(m => m.is_active && m.refill_date && isPastDue(m.refill_date)).length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Refills Due</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-gray-400">
                {medications.filter(m => !m.is_active).length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Discontinued</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-gray-600">
                {medications.length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Total</p>
            </div>
          </div>

          {/* Refill Alerts */}
          {medications.filter(m => m.is_active && m.refill_date && isPastDue(m.refill_date)).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                Refills Past Due
              </h4>
              <div className="space-y-1">
                {medications.filter(m => m.is_active && m.refill_date && isPastDue(m.refill_date)).map(m => (
                  <p key={m.id} className="text-sm text-amber-800">
                    <strong>{m.medication_name}</strong> for {m.family_member_name} — refill was due {formatDate(m.refill_date!)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Medications List */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-purple-600" />
                Medications
              </h3>
              <button
                onClick={() => { resetMedicationForm(); setShowAddMedication(!showAddMedication) }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                  showAddMedication
                    ? `bg-${themeColor}-100 text-${themeColor}-700`
                    : `bg-${themeColor}-500 text-white hover:bg-${themeColor}-600`
                }`}
              >
                <Plus className="w-4 h-4" />
                {showAddMedication ? 'Cancel' : 'Add Medication'}
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
              {(['active', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setMedFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    medFilter === f
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'active' ? 'Active' : 'All'}
                </button>
              ))}
            </div>

            {/* Add/Edit Form */}
            {showAddMedication && (
              <MedicationForm
                form={medicationForm}
                setForm={setMedicationForm}
                onSave={() => editingMedication ? handleUpdateMedication(editingMedication) : handleAddMedication()}
                onCancel={resetMedicationForm}
                isEditing={!!editingMedication}
                themeColor={themeColor}
                familyMembers={familyMembers}
              />
            )}

            {/* Medications List */}
            {filteredMedications.length === 0 ? (
              <div className="text-center py-8">
                <Pill className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">
                  {medFilter === 'active'
                    ? 'No active medications. Click "Add Medication" to track one.'
                    : 'No medications found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMedications.map(med => {
                  const refillDays = med.refill_date ? getDaysUntil(med.refill_date) : null
                  return (
                    <div key={med.id} className={`border rounded-lg p-4 transition ${
                      !med.is_active ? 'opacity-60 bg-gray-50' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">{med.medication_name}</h4>
                            {med.dosage && <span className="text-sm text-gray-600">({med.dosage})</span>}
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              med.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {med.is_active ? 'Active' : 'Discontinued'}
                            </span>
                            {med.is_active && refillDays !== null && refillDays <= 7 && (
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                refillDays <= 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {refillDays <= 0 ? 'Refill Overdue' : `Refill in ${refillDays}d`}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mt-1">
                            For <strong>{med.family_member_name}</strong>
                          </p>

                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                            {med.frequency && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{med.frequency}</span>
                              </div>
                            )}
                            {med.prescribing_doctor && (
                              <div className="flex items-center gap-2">
                                <Stethoscope className="w-3.5 h-3.5" />
                                <span>{med.prescribing_doctor}</span>
                              </div>
                            )}
                            {med.pharmacy && (
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5" />
                                <span>{med.pharmacy}</span>
                              </div>
                            )}
                            {med.refill_date && (
                              <div className="flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Refill: {formatDate(med.refill_date)}</span>
                                {med.refills_remaining !== null && med.refills_remaining !== undefined && (
                                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                    {med.refills_remaining} left
                                  </span>
                                )}
                              </div>
                            )}
                            {med.purpose && (
                              <div className="flex items-center gap-2 md:col-span-2">
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>For: {med.purpose}</span>
                              </div>
                            )}
                          </div>

                          {med.side_effects && (
                            <p className="text-xs text-amber-700 mt-2 bg-amber-50 px-2 py-1 rounded">
                              Side effects: {med.side_effects}
                            </p>
                          )}
                          {med.notes && <p className="text-sm text-gray-500 italic mt-1">{med.notes}</p>}
                        </div>

                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleToggleMedicationActive(med.id, med.is_active)}
                            className={`p-2 rounded-lg transition ${
                              med.is_active ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-green-100 text-green-600'
                            }`}
                            title={med.is_active ? 'Mark Discontinued' : 'Mark Active'}
                          >
                            {med.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button onClick={() => startEditMedication(med)} className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteMedication(med.id)} className="p-2 hover:bg-red-100 rounded-lg transition text-red-600" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS: FORMS
// ============================================================================

// Provider Form (Phase 1)
interface ProviderFormProps {
  form: Partial<HealthProvider>
  setForm: (form: Partial<HealthProvider>) => void
  onSave: () => void
  onCancel: () => void
  isEditing: boolean
  themeColor: string
}

function ProviderForm({ form, setForm, onSave, onCancel, isEditing, themeColor }: ProviderFormProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
      <input type="text" placeholder="Provider Name *" value={form.name || ''}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="text" placeholder="Specialty (e.g., Primary Care, Rheumatology, Pediatrics)" value={form.specialty || ''}
        onChange={(e) => setForm({ ...form, specialty: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="text" placeholder="Practice Name" value={form.practice_name || ''}
        onChange={(e) => setForm({ ...form, practice_name: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="tel" placeholder="Phone" value={form.phone || ''}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="text" placeholder="Address" value={form.address || ''}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <textarea placeholder="Notes" value={form.notes || ''}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
      <div className="flex gap-2">
        <button onClick={onSave}
          className={`flex-1 bg-${themeColor}-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-${themeColor}-600 transition`}>
          {isEditing ? 'Update Provider' : 'Add Provider'}
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">
          Cancel
        </button>
      </div>
    </div>
  )
}

// Health Profile Form (Phase 1)
interface HealthProfileFormProps {
  form: Partial<HealthProfile>
  setForm: (form: Partial<HealthProfile>) => void
  onSave: () => void
  onCancel: () => void
  isEditing: boolean
  themeColor: string
}

function HealthProfileForm({ form, setForm, onSave, onCancel, isEditing, themeColor }: HealthProfileFormProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
      <input type="text" placeholder="Family Member Name *" value={form.family_member_name || ''}
        onChange={(e) => setForm({ ...form, family_member_name: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="text" placeholder="Blood Type" value={form.blood_type || ''}
        onChange={(e) => setForm({ ...form, blood_type: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <textarea placeholder="Allergies" value={form.allergies || ''}
        onChange={(e) => setForm({ ...form, allergies: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
      <textarea placeholder="Chronic Conditions" value={form.chronic_conditions || ''}
        onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
      <input type="text" placeholder="Primary Doctor" value={form.primary_doctor || ''}
        onChange={(e) => setForm({ ...form, primary_doctor: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="tel" placeholder="Primary Doctor Phone" value={form.primary_doctor_phone || ''}
        onChange={(e) => setForm({ ...form, primary_doctor_phone: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="text" placeholder="Pharmacy Name" value={form.pharmacy_name || ''}
        onChange={(e) => setForm({ ...form, pharmacy_name: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="tel" placeholder="Pharmacy Phone" value={form.pharmacy_phone || ''}
        onChange={(e) => setForm({ ...form, pharmacy_phone: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="text" placeholder="Emergency Contact Name" value={form.emergency_contact || ''}
        onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="tel" placeholder="Emergency Contact Phone" value={form.emergency_phone || ''}
        onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <textarea placeholder="Additional Notes" value={form.notes || ''}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
      <div className="flex gap-2">
        <button onClick={onSave}
          className={`flex-1 bg-${themeColor}-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-${themeColor}-600 transition`}>
          {isEditing ? 'Update Profile' : 'Add Profile'}
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">
          Cancel
        </button>
      </div>
    </div>
  )
}

// Insurance Plan Edit Form (Phase 1)
interface InsurancePlanEditFormProps {
  plan: InsurancePlan
  onSave: (updates: Partial<InsurancePlan>) => void
  onCancel: () => void
  themeColor: string
}

function InsurancePlanEditForm({ plan, onSave, onCancel, themeColor }: InsurancePlanEditFormProps) {
  const [updates, setUpdates] = useState<Partial<InsurancePlan>>({
    copay_primary: plan.copay_primary, copay_specialist: plan.copay_specialist,
    copay_urgent_care: plan.copay_urgent_care, copay_er: plan.copay_er,
    deductible: plan.deductible, out_of_pocket_max: plan.out_of_pocket_max, notes: plan.notes
  })

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input type="text" placeholder="Primary Care Copay" value={updates.copay_primary || ''}
          onChange={(e) => setUpdates({ ...updates, copay_primary: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="Specialist Copay" value={updates.copay_specialist || ''}
          onChange={(e) => setUpdates({ ...updates, copay_specialist: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="Urgent Care Copay" value={updates.copay_urgent_care || ''}
          onChange={(e) => setUpdates({ ...updates, copay_urgent_care: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="ER Copay" value={updates.copay_er || ''}
          onChange={(e) => setUpdates({ ...updates, copay_er: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="Deductible" value={updates.deductible || ''}
          onChange={(e) => setUpdates({ ...updates, deductible: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="Out of Pocket Max" value={updates.out_of_pocket_max || ''}
          onChange={(e) => setUpdates({ ...updates, out_of_pocket_max: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <textarea placeholder="Notes" value={updates.notes || ''}
        onChange={(e) => setUpdates({ ...updates, notes: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
      <div className="flex gap-2">
        <button onClick={() => onSave(updates)}
          className={`flex-1 bg-${themeColor}-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-${themeColor}-600 transition`}>
          Save Changes
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// PHASE 2 FORMS
// ============================================================================

// Appointment Form
interface AppointmentFormProps {
  form: Partial<Appointment>
  setForm: (form: Partial<Appointment>) => void
  onSave: () => void
  onCancel: () => void
  isEditing: boolean
  themeColor: string
  familyMembers: string[]
  providers: HealthProvider[]
}

function AppointmentForm({ form, setForm, onSave, onCancel, isEditing, themeColor, familyMembers, providers }: AppointmentFormProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Family Member */}
        {familyMembers.length > 0 ? (
          <select value={form.family_member_name || ''}
            onChange={(e) => setForm({ ...form, family_member_name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Select Family Member *</option>
            {familyMembers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input type="text" placeholder="Family Member Name *" value={form.family_member_name || ''}
            onChange={(e) => setForm({ ...form, family_member_name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        )}

        {/* Appointment Type */}
        <select value={form.appointment_type || 'checkup'}
          onChange={(e) => setForm({ ...form, appointment_type: e.target.value as Appointment['appointment_type'] })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {Object.entries(appointmentTypeLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {/* Date & Time */}
        <input type="datetime-local" value={form.appointment_date || ''}
          onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        {/* Provider */}
        {providers.length > 0 ? (
          <select value={form.provider_name || ''}
            onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Select Provider (optional)</option>
            {providers.map(p => <option key={p.id} value={p.name}>{p.name} {p.specialty ? `- ${p.specialty}` : ''}</option>)}
          </select>
        ) : (
          <input type="text" placeholder="Provider/Doctor Name" value={form.provider_name || ''}
            onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        )}
      </div>

      <input type="text" placeholder="Location / Address" value={form.location || ''}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      <input type="text" placeholder="Reason for Visit" value={form.reason || ''}
        onChange={(e) => setForm({ ...form, reason: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input type="text" placeholder="Copay Amount (e.g. $25)" value={form.copay_amount || ''}
          onChange={(e) => setForm({ ...form, copay_amount: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <select value={form.status || 'scheduled'}
          onChange={(e) => setForm({ ...form, status: e.target.value as Appointment['status'] })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>

        <div className="flex items-center gap-2 px-3">
          <input type="checkbox" id="referral-needed"
            checked={form.referral_needed || false}
            onChange={(e) => setForm({ ...form, referral_needed: e.target.checked })}
            className="rounded" />
          <label htmlFor="referral-needed" className="text-sm text-gray-700">Referral Needed</label>
        </div>
      </div>

      {form.referral_needed && (
        <input type="text" placeholder="Referral Status (e.g. Pending, Approved)" value={form.referral_status || ''}
          onChange={(e) => setForm({ ...form, referral_status: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      )}

      <textarea placeholder="Notes" value={form.notes || ''}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />

      <div className="flex gap-2">
        <button onClick={onSave}
          className={`flex-1 bg-${themeColor}-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-${themeColor}-600 transition`}>
          {isEditing ? 'Update Appointment' : 'Add Appointment'}
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">
          Cancel
        </button>
      </div>
    </div>
  )
}

// Medication Form
interface MedicationFormProps {
  form: Partial<Medication>
  setForm: (form: Partial<Medication>) => void
  onSave: () => void
  onCancel: () => void
  isEditing: boolean
  themeColor: string
  familyMembers: string[]
}

function MedicationForm({ form, setForm, onSave, onCancel, isEditing, themeColor, familyMembers }: MedicationFormProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Family Member */}
        {familyMembers.length > 0 ? (
          <select value={form.family_member_name || ''}
            onChange={(e) => setForm({ ...form, family_member_name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Select Family Member *</option>
            {familyMembers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input type="text" placeholder="Family Member Name *" value={form.family_member_name || ''}
            onChange={(e) => setForm({ ...form, family_member_name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        )}

        <input type="text" placeholder="Medication Name *" value={form.medication_name || ''}
          onChange={(e) => setForm({ ...form, medication_name: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <input type="text" placeholder="Dosage (e.g. 20mg, 500mg)" value={form.dosage || ''}
          onChange={(e) => setForm({ ...form, dosage: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <input type="text" placeholder="Frequency (e.g. Once daily, Twice daily)" value={form.frequency || ''}
          onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <input type="text" placeholder="Prescribing Doctor" value={form.prescribing_doctor || ''}
          onChange={(e) => setForm({ ...form, prescribing_doctor: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <input type="text" placeholder="Pharmacy" value={form.pharmacy || ''}
          onChange={(e) => setForm({ ...form, pharmacy: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <input type="text" placeholder="Purpose (e.g. Blood pressure, ADHD, Pain management)" value={form.purpose || ''}
        onChange={(e) => setForm({ ...form, purpose: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
          <input type="date" value={form.start_date || ''}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">End Date (if applicable)</label>
          <input type="date" value={form.end_date || ''}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Next Refill Date</label>
          <input type="date" value={form.refill_date || ''}
            onChange={(e) => setForm({ ...form, refill_date: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input type="number" placeholder="Refills Remaining" value={form.refills_remaining ?? ''}
          onChange={(e) => setForm({ ...form, refills_remaining: e.target.value ? parseInt(e.target.value) : undefined })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <input type="text" placeholder="Side Effects (if any)" value={form.side_effects || ''}
          onChange={(e) => setForm({ ...form, side_effects: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <textarea placeholder="Notes" value={form.notes || ''}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />

      <div className="flex gap-2">
        <button onClick={onSave}
          className={`flex-1 bg-${themeColor}-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-${themeColor}-600 transition`}>
          {isEditing ? 'Update Medication' : 'Add Medication'}
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">
          Cancel
        </button>
      </div>
    </div>
  )
}
