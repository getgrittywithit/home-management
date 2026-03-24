'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Heart, Building2, Phone, MapPin, Globe, DollarSign, AlertCircle,
  Plus, X, Edit2, Trash2, User, Pill, Calendar, FileText, ChevronRight,
  CheckCircle, Clock, Stethoscope, Loader2, RefreshCw, AlertTriangle,
  ArrowRight, Eye, EyeOff, Upload, Sparkles, ClipboardList, ListChecks,
  CircleDot, ChevronDown, ChevronUp
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

const priorityColors: Record<string, string> = {
  'urgent': 'bg-red-100 text-red-800',
  'high': 'bg-orange-100 text-orange-800',
  'medium': 'bg-blue-100 text-blue-800',
  'low': 'bg-gray-100 text-gray-600'
}

const taskStatusColors: Record<string, string> = {
  'pending': 'bg-amber-100 text-amber-800',
  'in_progress': 'bg-blue-100 text-blue-800',
  'completed': 'bg-green-100 text-green-800',
  'cancelled': 'bg-gray-100 text-gray-500'
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

  // Phase 3 form states
  const [showAddVisitNote, setShowAddVisitNote] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [analyzingNotes, setAnalyzingNotes] = useState(false)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [taskFilter, setTaskFilter] = useState<'pending' | 'all'>('pending')

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

  const [visitNoteForm, setVisitNoteForm] = useState<{
    family_member_name: string; visit_date: string; provider_name: string; raw_notes: string
  }>({ family_member_name: '', visit_date: '', provider_name: '', raw_notes: '' })

  const [taskForm, setTaskForm] = useState<Partial<HealthTask>>({
    family_member_name: '', task: '', due_date: '', priority: 'medium', category: '', notes: ''
  })

  const [uploadFile, setUploadFile] = useState<File | null>(null)

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
          // Load dental and activity/mood overviews
          const [dentalRes, activityRes] = await Promise.all([
            fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_dental_overview' }) }),
            fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_activity_mood_overview' }) }),
          ])
          setDentalOverview(await dentalRes.json())
          setActivityMoodOverview(await activityRes.json())
        } catch { /* tables may not exist yet */ }
      }
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
  // PHASE 3: VISIT NOTES HANDLERS
  // ============================================================================

  const handleAddVisitNote = async (aiData?: { synopsis: string; diagnoses: string[]; tasks: string[]; prescriptions: string[]; followup: string }) => {
    if (!visitNoteForm.family_member_name?.trim() || !visitNoteForm.visit_date) return
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
      setVisitNotes([newNote, ...visitNotes])
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
        // Reload tasks
        loadData()
      }

      resetVisitNoteForm()
    } catch (err) {
      console.error('Error adding visit note:', err)
      setError('Failed to save visit note')
    }
  }

  const handleAnalyzeNotes = async () => {
    if (!visitNoteForm.raw_notes?.trim() && !uploadFile) {
      setError('Please enter or upload visit notes first')
      return
    }
    setAnalyzingNotes(true)
    setError(null)
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
        const errData = await response.json()
        throw new Error(errData.error || 'AI analysis failed')
      }
      const aiData = await response.json()
      // Save the note with AI results
      await handleAddVisitNote(aiData)
    } catch (err: any) {
      console.error('Error analyzing notes:', err)
      setError(err.message || 'Failed to analyze notes')
    } finally {
      setAnalyzingNotes(false)
    }
  }

  const handleSaveWithoutAI = async () => {
    await handleAddVisitNote()
  }

  const handleDeleteVisitNote = async (id: string) => {
    if (!confirm('Delete this visit note?')) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_visit_note', data: { id } })
      })
      if (!response.ok) throw new Error('Failed to delete')
      setVisitNotes(visitNotes.filter(n => n.id !== id))
    } catch (err) {
      console.error('Error deleting visit note:', err)
      setError('Failed to delete visit note')
    }
  }

  const resetVisitNoteForm = () => {
    setVisitNoteForm({ family_member_name: '', visit_date: '', provider_name: '', raw_notes: '' })
    setUploadFile(null)
    setShowAddVisitNote(false)
  }

  // ============================================================================
  // PHASE 3: HEALTH TASK HANDLERS
  // ============================================================================

  const handleAddTask = async () => {
    if (!taskForm.family_member_name?.trim() || !taskForm.task?.trim()) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_health_task',
          data: { ...taskForm, member_group: memberGroup }
        })
      })
      if (!response.ok) throw new Error('Failed to add task')
      const newTask = await response.json()
      setHealthTasks([newTask, ...healthTasks])
      resetTaskForm()
    } catch (err) {
      console.error('Error adding task:', err)
      setError('Failed to add task')
    }
  }

  const handleCompleteTask = async (id: string) => {
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_health_task', data: { id } })
      })
      if (!response.ok) throw new Error('Failed to complete task')
      const updated = await response.json()
      setHealthTasks(healthTasks.map(t => t.id === id ? updated : t))
    } catch (err) {
      console.error('Error completing task:', err)
      setError('Failed to complete task')
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_health_task', data: { id } })
      })
      if (!response.ok) throw new Error('Failed to delete task')
      setHealthTasks(healthTasks.filter(t => t.id !== id))
    } catch (err) {
      console.error('Error deleting task:', err)
      setError('Failed to delete task')
    }
  }

  const resetTaskForm = () => {
    setTaskForm({ family_member_name: '', task: '', due_date: '', priority: 'medium', category: '', notes: '' })
    setShowAddTask(false)
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

  const filteredTasks = healthTasks.filter(t => {
    if (taskFilter === 'pending') return t.status === 'pending' || t.status === 'in_progress'
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
          { id: 'notes', label: 'Visit Notes & AI', icon: FileText },
          ...(memberGroup === 'kids' ? [
            { id: 'daily_care', label: 'Daily Care', icon: ListChecks },
            { id: 'dental', label: 'Dental', icon: ClipboardList },
            { id: 'activity_mood', label: 'Activity & Mood', icon: Heart },
            { id: 'kid_requests', label: `Kid Requests${kidRequests.filter(r => r.status === 'pending').length > 0 ? ` (${kidRequests.filter(r => r.status === 'pending').length})` : ''}`, icon: AlertTriangle }
          ] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition ${
              activeSection === tab.id
                ? `bg-${themeColor}-500 text-white`
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
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

      {/* ================================================================== */}
      {/* VISIT NOTES & AI SECTION (Phase 3 - NEW) */}
      {/* ================================================================== */}
      {activeSection === 'notes' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-purple-600">{visitNotes.length}</p>
              <p className="text-xs text-gray-600 mt-1">Visit Notes</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-amber-600">
                {healthTasks.filter(t => t.status === 'pending').length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Pending Tasks</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-blue-600">
                {healthTasks.filter(t => t.status === 'in_progress').length}
              </p>
              <p className="text-xs text-gray-600 mt-1">In Progress</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-green-600">
                {healthTasks.filter(t => t.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Completed</p>
            </div>
          </div>

          {/* Add Visit Note */}
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
                        : `bg-purple-600 text-white hover:bg-purple-700`
                    }`}
                  >
                    {analyzingNotes ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Analyze with AI & Save</>
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
                {visitNotes.map(note => {
                  const isExpanded = expandedNote === note.id
                  const aiTasks = Array.isArray(note.ai_tasks) ? note.ai_tasks : (typeof note.ai_tasks === 'string' ? JSON.parse(note.ai_tasks || '[]') : [])
                  const aiPrescriptions = Array.isArray(note.ai_prescriptions) ? note.ai_prescriptions : (typeof note.ai_prescriptions === 'string' ? JSON.parse(note.ai_prescriptions || '[]') : [])
                  const aiDiagnoses = Array.isArray(note.ai_diagnoses) ? note.ai_diagnoses : (typeof note.ai_diagnoses === 'string' ? JSON.parse(note.ai_diagnoses || '[]') : [])

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

          {/* Health Tasks */}
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
                {filteredTasks.map(task => (
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
      )}

      {/* ================================================================== */}
      {/* DAILY CARE MANAGER (Parent portal — kids memberGroup only) */}
      {/* ================================================================== */}
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
      {activeSection === 'activity_mood' && memberGroup === 'kids' && activityMoodOverview && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Activity & Mood Overview</h3>

          {/* Mood trends */}
          <div className="bg-white rounded-lg p-5 shadow-sm border">
            <h4 className="font-semibold text-gray-900 mb-3">Mood Trends (Last 7 Days)</h4>
            {(() => {
              const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
              const moodEmoji: Record<string, string> = { great: '😊', good: '🙂', ok: '😐', rough: '😔', bad: '😢' }
              const byKid: Record<string, any[]> = {}
              activityMoodOverview.moods?.forEach((m: any) => {
                if (!byKid[m.child_name]) byKid[m.child_name] = []
                byKid[m.child_name].push(m)
              })
              return (
                <div className="space-y-2">
                  {KIDS.map(kid => {
                    const moods = byKid[kid] || []
                    return (
                      <div key={kid} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-16">{kid.charAt(0).toUpperCase() + kid.slice(1)}</span>
                        <div className="flex gap-1">
                          {moods.length > 0 ? moods.map((m: any, i: number) => {
                            const dayLabel = new Date(m.log_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
                            return (
                              <div key={i} className="text-center" title={`${dayLabel}: ${m.mood}`}>
                                <div className="text-sm">{moodEmoji[m.mood] || '❓'}</div>
                                <div className="text-[10px] text-gray-400">{dayLabel.slice(0, 2)}</div>
                              </div>
                            )
                          }) : <span className="text-xs text-gray-400">No mood data</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Today's activity */}
          <div className="bg-white rounded-lg p-5 shadow-sm border">
            <h4 className="font-semibold text-gray-900 mb-3">Today&apos;s Activity</h4>
            {(() => {
              const activities = activityMoodOverview.activities || []
              if (activities.length === 0) return <p className="text-sm text-gray-400">No activities logged today</p>
              return (
                <div className="space-y-2">
                  {activities.map((a: any) => (
                    <div key={a.child_name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900">{a.child_name.charAt(0).toUpperCase() + a.child_name.slice(1)}</span>
                      <div className="text-sm text-gray-600">
                        {a.count} {a.count === 1 ? 'activity' : 'activities'}
                        {a.total_minutes && ` · ${a.total_minutes} min`}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
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
    </div>
  )
}

// ============================================================================
// KID REQUEST ACTIONS (inline sub-component)
// ============================================================================

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
                  const endStr = item.end_date ? ` · Until ${new Date(item.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''
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
