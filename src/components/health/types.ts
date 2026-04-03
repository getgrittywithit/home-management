export interface InsurancePlan {
  id: string; plan_name: string; plan_type: 'private' | 'medicaid'; member_group: 'parents' | 'kids'
  subscriber_name?: string; member_id?: string; group_number?: string; plan_phone?: string; plan_website?: string
  copay_primary?: string; copay_specialist?: string; copay_urgent_care?: string; copay_er?: string
  deductible?: string; out_of_pocket_max?: string; pharmacy_coverage?: string; dental_coverage?: string
  vision_coverage?: string; network_type?: string; coverage_start_date?: string; coverage_end_date?: string; notes?: string
}

export interface HealthProfile {
  id: string; family_member_name: string; member_group: 'parents' | 'kids'
  primary_doctor?: string; primary_doctor_phone?: string; pharmacy_name?: string; pharmacy_phone?: string
  blood_type?: string; allergies?: string; chronic_conditions?: string
  emergency_contact?: string; emergency_phone?: string; notes?: string
}

export interface HealthProvider {
  id: string; name: string; specialty?: string; practice_name?: string; phone?: string; fax?: string
  address?: string; accepts_insurance?: string; portal_url?: string; notes?: string; member_group?: string
}

export interface BenefitRule {
  id: string; rule_category: 'referral' | 'prior_auth' | 'coverage' | 'formulary' | 'network'
  rule_title: string; rule_description: string; applies_to?: string
}

export interface Appointment {
  id: string; family_member_name: string; member_group: 'parents' | 'kids'
  provider_id?: string; provider_name?: string
  appointment_type: 'checkup' | 'specialist' | 'dental' | 'vision' | 'urgent' | 'followup' | 'lab' | 'imaging'
  appointment_date: string; location?: string; reason?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes?: string; copay_amount?: string; referral_needed: boolean; referral_status?: string
}

export interface Medication {
  id: string; family_member_name: string; member_group: 'parents' | 'kids'
  medication_name: string; dosage?: string; frequency?: string; prescribing_doctor?: string; pharmacy?: string
  start_date?: string; end_date?: string; refill_date?: string; refills_remaining?: number
  purpose?: string; side_effects?: string; is_active: boolean; notes?: string
}

export interface VisitNote {
  id: string; appointment_id?: string; family_member_name: string; member_group: 'parents' | 'kids'
  visit_date: string; provider_name?: string; raw_notes?: string
  ai_synopsis?: string; ai_tasks?: string[]; ai_prescriptions?: string[]; ai_diagnoses?: string[]; ai_followup?: string
}

export interface HealthTask {
  id: string; family_member_name: string; member_group: 'parents' | 'kids'
  visit_note_id?: string; task: string; due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'; status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  category?: string; notes?: string; completed_at?: string
}

export interface HealthData {
  insurancePlan: InsurancePlan | null
  providers: HealthProvider[]
  healthProfiles: HealthProfile[]
  benefitRules: BenefitRule[]
  appointments: Appointment[]
  medications: Medication[]
  visitNotes: VisitNote[]
  healthTasks: HealthTask[]
  kidRequests: any[]
  kidCareItems: any[]
  dentalOverview: any
  activityMoodOverview: any
  cycleOverview: any
  memberGroup: 'parents' | 'kids'
  onReload: () => void
}

export const categoryColors: Record<string, string> = {
  referral: 'bg-blue-100 text-blue-800', prior_auth: 'bg-orange-100 text-orange-800',
  coverage: 'bg-green-100 text-green-800', formulary: 'bg-purple-100 text-purple-800', network: 'bg-pink-100 text-pink-800',
}

export const appointmentTypeLabels: Record<string, string> = {
  checkup: 'Check-up', specialist: 'Specialist', dental: 'Dental', vision: 'Vision',
  urgent: 'Urgent Care', followup: 'Follow-up', lab: 'Lab Work', imaging: 'Imaging',
}

export const appointmentTypeColors: Record<string, string> = {
  checkup: 'bg-green-100 text-green-800', specialist: 'bg-blue-100 text-blue-800',
  dental: 'bg-cyan-100 text-cyan-800', vision: 'bg-indigo-100 text-indigo-800',
  urgent: 'bg-red-100 text-red-800', followup: 'bg-amber-100 text-amber-800',
  lab: 'bg-purple-100 text-purple-800', imaging: 'bg-pink-100 text-pink-800',
}

export const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600', no_show: 'bg-red-100 text-red-800',
}

export const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
  medium: 'bg-blue-100 text-blue-800', low: 'bg-gray-100 text-gray-600',
}
