'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Shield, AlertTriangle, Calendar, Check, Plus, ChevronDown, ChevronUp,
  Trash2, Pencil, X, Copy, Mail, FileText, Clock, User, Phone,
  Upload, Download, Heart, History, ClipboardList, Users, CheckCircle,
  AlertCircle, Info, Search, Eye, EyeOff
} from 'lucide-react'
import SchoolContactCards from './SchoolContactCards'
import SchoolDocuments from './SchoolDocuments'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', zoey: 'Zoey', kaylee: 'Kaylee',
  ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah',
}
const KID_AGES: Record<string, number> = {
  amos: 17, zoey: 15, kaylee: 13, ellie: 12, wyatt: 10, hannah: 8,
}
const KID_AVATAR_COLORS: Record<string, string> = {
  amos: 'bg-blue-500', zoey: 'bg-purple-500', kaylee: 'bg-pink-500',
  ellie: 'bg-emerald-500', wyatt: 'bg-orange-500', hannah: 'bg-rose-500',
}
const KID_SCHOOL_TYPE: Record<string, string> = {
  amos: 'homeschool', zoey: 'public', kaylee: 'public',
  ellie: 'homeschool', wyatt: 'homeschool', hannah: 'homeschool',
}

const PLAN_TYPES = ['504', 'IEP', 'Speech', 'OT', 'BIP', 'RTI', 'Other']
const PLAN_COLORS: Record<string, string> = {
  '504': 'bg-purple-100 text-purple-700 border-purple-200',
  'IEP': 'bg-blue-100 text-blue-700 border-blue-200',
  'Speech': 'bg-teal-100 text-teal-700 border-teal-200',
  'OT': 'bg-green-100 text-green-700 border-green-200',
  'BIP': 'bg-amber-100 text-amber-700 border-amber-200',
  'RTI': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Other': 'bg-gray-100 text-gray-600 border-gray-200',
}
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  draft: 'bg-gray-100 text-gray-600',
}

const DIAGNOSIS_PILLS: Record<string, { label: string; color: string }> = {
  adhd: { label: 'ADHD', color: 'bg-blue-100 text-blue-700' },
  autism: { label: 'Autism', color: 'bg-purple-100 text-purple-700' },
  learning_delay: { label: 'Learning Delay', color: 'bg-amber-100 text-amber-700' },
  speech_delay: { label: 'Speech Delay', color: 'bg-teal-100 text-teal-700' },
  dyslexia: { label: 'Dyslexia', color: 'bg-orange-100 text-orange-700' },
  dyscalculia: { label: 'Dyscalculia', color: 'bg-orange-100 text-orange-700' },
  dysgraphia: { label: 'Dysgraphia', color: 'bg-orange-100 text-orange-700' },
  anxiety: { label: 'Anxiety', color: 'bg-rose-100 text-rose-700' },
  mental_health: { label: 'Mental Health', color: 'bg-violet-100 text-violet-700' },
  apd: { label: 'APD', color: 'bg-indigo-100 text-indigo-700' },
  color_vision: { label: 'Color Vision', color: 'bg-yellow-100 text-yellow-700' },
  vision: { label: 'Vision/Glasses', color: 'bg-sky-100 text-sky-700' },
  hearing: { label: 'Hearing', color: 'bg-slate-100 text-slate-700' },
  sensory: { label: 'Sensory Processing', color: 'bg-fuchsia-100 text-fuchsia-700' },
  speech_services: { label: 'Speech (current)', color: 'bg-teal-200 text-teal-800' },
  speech_history: { label: 'Speech (past)', color: 'bg-teal-50 text-teal-500' },
  ot_current: { label: 'OT (current)', color: 'bg-green-200 text-green-800' },
  ot_history: { label: 'OT (past)', color: 'bg-green-50 text-green-500' },
  epipen: { label: 'EpiPen Required', color: 'bg-red-200 text-red-800' },
  seizure: { label: 'Seizure History', color: 'bg-red-200 text-red-800' },
  dietary: { label: 'Dietary', color: 'bg-lime-100 text-lime-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-600' },
}

// Safe date parser — handles ISO timestamps from Postgres ("2026-03-06T06:00:00.000Z")
function safeDate(d: any, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return ''
  try {
    const str = typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)
    const [y, m, day] = str.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

const PROVIDER_TYPES: Record<string, string> = {
  speech_therapist: '🗣️',
  occupational_therapist: '🤲',
  psychologist: '🧠',
  psychiatrist: '💊',
  neurologist: '🔬',
  developmental_pediatrician: '👶',
  counselor: '💬',
  bcba: '📋',
  tutor: '📚',
  advocate: '⚖️',
  other: '👤',
}

const MEETING_TYPES = [
  { value: 'annual_review', label: 'Annual Review' },
  { value: 'initial', label: 'Initial' },
  { value: 'amendment', label: 'Amendment' },
  { value: 'parent_request', label: 'Parent Request' },
  { value: 'reevaluation', label: 'Re-evaluation' },
  { value: 'transition', label: 'Transition' },
  { value: 'manifestation', label: 'Manifestation Determination' },
]

const EMAIL_MODES = [
  { value: 'full', label: 'Full Email', desc: 'Complete health update with all details' },
  { value: 'health_only', label: 'Health Info Only', desc: 'Just diagnoses and accommodations' },
  { value: 'contact_verify', label: 'Contact Verification', desc: 'Verify school has current info' },
]

type DetailTab = 'plans' | 'providers' | 'documents' | 'health' | 'history'

// ─── Toast notification ───────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${colors[type]} text-white px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-slide-up`}>
      {type === 'success' && <CheckCircle className="w-4 h-4" />}
      {type === 'error' && <AlertCircle className="w-4 h-4" />}
      {type === 'info' && <Info className="w-4 h-4" />}
      {message}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SpecialEdTabProps {
  preSelectedKid?: string | null
  embedded?: boolean
}

export default function SpecialEdTab({ preSelectedKid, embedded }: SpecialEdTabProps = {}) {
  // Core state
  const [selectedKid, setSelectedKid] = useState<string | null>(preSelectedKid || null)
  const [detailTab, setDetailTab] = useState<DetailTab>('plans')
  const [loading, setLoading] = useState(true)

  // Data state
  const [allPlans, setAllPlans] = useState<Record<string, any[]>>({})
  const [allMeetings, setAllMeetings] = useState<Record<string, any[]>>({})
  const [kidPlans, setKidPlans] = useState<any[]>([])
  const [kidMeetings, setKidMeetings] = useState<any[]>([])
  const [kidContacts, setKidContacts] = useState<any[]>([])

  // UI state
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null)
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set())
  const [expandedAccom, setExpandedAccom] = useState<Set<number>>(new Set())
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [showLogMeeting, setShowLogMeeting] = useState(false)
  const [editingPlan, setEditingPlan] = useState<any | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showFormerProviders, setShowFormerProviders] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Forms
  const [planForm, setPlanForm] = useState({
    plan_type: '504', status: 'active', start_date: '', review_date: '',
    next_meeting_date: '', next_meeting_time: '', next_meeting_location: '',
    notes: '', accommodations: [] as { text: string }[], goals: [] as { subject: string; goal: string }[],
  })
  const [meetForm, setMeetForm] = useState({
    meeting_date: '', meeting_time: '', meeting_type: 'annual_review',
    location: '', attendees: '', outcome: '', notes: '',
  })
  const [newAccom, setNewAccom] = useState('')
  const [newGoalSubject, setNewGoalSubject] = useState('')
  const [newGoalText, setNewGoalText] = useState('')

  // Auto-select kid when embedded
  useEffect(() => {
    if (preSelectedKid && preSelectedKid !== selectedKid) {
      setSelectedKid(preSelectedKid)
    }
  }, [preSelectedKid])

  // Email modal state
  const [emailKids, setEmailKids] = useState<Set<string>>(new Set(['zoey', 'kaylee']))
  const [emailMode, setEmailMode] = useState('full')
  const [emailPreview, setEmailPreview] = useState('')
  const [emailGenerated, setEmailGenerated] = useState(false)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
  }, [])

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadAllKidsSummary = useCallback(async () => {
    setLoading(true)
    const plansByKid: Record<string, any[]> = {}
    const meetingsByKid: Record<string, any[]> = {}

    await Promise.all(
      ALL_KIDS.map(async (kid) => {
        try {
          const [planRes, meetRes] = await Promise.all([
            fetch(`/api/parent/teacher?action=get_special_ed_plans&kid=${kid}`).then(r => r.json()).catch(() => ({ plans: [] })),
            fetch(`/api/parent/teacher?action=get_special_ed_meetings&kid=${kid}`).then(r => r.json()).catch(() => ({ meetings: [] })),
          ])
          plansByKid[kid] = planRes.plans || []
          meetingsByKid[kid] = meetRes.meetings || []
        } catch {
          plansByKid[kid] = []
          meetingsByKid[kid] = []
        }
      })
    )

    setAllPlans(plansByKid)
    setAllMeetings(meetingsByKid)
    setLoading(false)
  }, [])

  const loadKidDetail = useCallback(async (kid: string) => {
    const [planRes, meetRes] = await Promise.all([
      fetch(`/api/parent/teacher?action=get_special_ed_plans&kid=${kid}`).then(r => r.json()).catch(() => ({ plans: [] })),
      fetch(`/api/parent/teacher?action=get_special_ed_meetings&kid=${kid}`).then(r => r.json()).catch(() => ({ meetings: [] })),
    ])
    setKidPlans(planRes.plans || [])
    setKidMeetings(meetRes.meetings || [])

    // Update all plans cache
    setAllPlans(prev => ({ ...prev, [kid]: planRes.plans || [] }))
    setAllMeetings(prev => ({ ...prev, [kid]: meetRes.meetings || [] }))
  }, [])

  useEffect(() => {
    loadAllKidsSummary()
  }, [loadAllKidsSummary])

  useEffect(() => {
    if (selectedKid) {
      loadKidDetail(selectedKid)
    }
  }, [selectedKid, loadKidDetail])

  // ─── Derived data ─────────────────────────────────────────────────────────

  const upcomingMeetings = ALL_KIDS.flatMap(kid =>
    (allPlans[kid] || [])
      .filter(p => p.next_meeting_date && new Date(p.next_meeting_date) >= new Date())
      .map(p => ({ kid, plan: p }))
  ).sort((a, b) => new Date(a.plan.next_meeting_date).getTime() - new Date(b.plan.next_meeting_date).getTime())

  const missingPlanKids = ALL_KIDS.filter(kid => {
    const plans = allPlans[kid] || []
    return plans.length === 0
  })

  const unconfirmedMeetings = upcomingMeetings.filter(m => !m.plan.meeting_confirmed)

  // ─── Actions ──────────────────────────────────────────────────────────────

  const confirmMeeting = async (planId: number) => {
    try {
      await fetch('/api/parent/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_meeting', plan_id: planId }),
      })
      showToast('Meeting confirmed')
      if (selectedKid) loadKidDetail(selectedKid)
      loadAllKidsSummary()
    } catch {
      showToast('Failed to confirm meeting', 'error')
    }
  }

  const addAccommodation = async (planId: number, currentAccom: any[]) => {
    if (!newAccom.trim()) return
    const accom = [...currentAccom, { text: newAccom.trim() }]
    try {
      await fetch('/api/parent/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_special_ed_plan', id: planId, accommodations: accom }),
      })
      setNewAccom('')
      showToast('Accommodation added')
      if (selectedKid) loadKidDetail(selectedKid)
    } catch {
      showToast('Failed to add accommodation', 'error')
    }
  }

  const removeAccommodation = async (planId: number, currentAccom: any[], index: number) => {
    const accom = [...currentAccom]
    accom.splice(index, 1)
    try {
      await fetch('/api/parent/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_special_ed_plan', id: planId, accommodations: accom }),
      })
      showToast('Accommodation removed')
      if (selectedKid) loadKidDetail(selectedKid)
    } catch {
      showToast('Failed to remove accommodation', 'error')
    }
  }

  const addGoal = async (planId: number, currentGoals: any[]) => {
    if (!newGoalSubject.trim() || !newGoalText.trim()) return
    const goals = [...currentGoals, { subject: newGoalSubject.trim(), goal: newGoalText.trim() }]
    try {
      await fetch('/api/parent/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_special_ed_plan', id: planId, goals }),
      })
      setNewGoalSubject('')
      setNewGoalText('')
      showToast('Goal added')
      if (selectedKid) loadKidDetail(selectedKid)
    } catch {
      showToast('Failed to add goal', 'error')
    }
  }

  const removeGoal = async (planId: number, currentGoals: any[], index: number) => {
    const goals = [...currentGoals]
    goals.splice(index, 1)
    try {
      await fetch('/api/parent/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_special_ed_plan', id: planId, goals }),
      })
      showToast('Goal removed')
      if (selectedKid) loadKidDetail(selectedKid)
    } catch {
      showToast('Failed to remove goal', 'error')
    }
  }

  const savePlan = async () => {
    if (!selectedKid) return
    try {
      if (editingPlan) {
        await fetch('/api/parent/teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_special_ed_plan',
            id: editingPlan.id,
            notes: planForm.notes,
            next_meeting_date: planForm.next_meeting_date || null,
            next_meeting_time: planForm.next_meeting_time || null,
            next_meeting_location: planForm.next_meeting_location || null,
            accommodations: planForm.accommodations,
            goals: planForm.goals,
          }),
        })
        showToast('Plan updated')
      } else {
        // Create a new plan via logging approach — use the existing API actions
        // The existing schema supports creating plans but no create action exists yet
        // We'll POST to update_special_ed_plan and also handle creation
        const res = await fetch('/api/parent/teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_special_ed_plan',
            kid: selectedKid,
            plan_type: planForm.plan_type,
            status: planForm.status,
            start_date: planForm.start_date || null,
            review_date: planForm.review_date || null,
            next_meeting_date: planForm.next_meeting_date || null,
            next_meeting_time: planForm.next_meeting_time || null,
            next_meeting_location: planForm.next_meeting_location || null,
            notes: planForm.notes || null,
            accommodations: planForm.accommodations,
            goals: planForm.goals,
          }),
        })
        // If the endpoint doesn't support create yet, handle gracefully
        const data = await res.json()
        if (data.error) {
          showToast('Plan creation not yet supported in API — coming soon', 'info')
        } else {
          showToast('Plan created')
        }
      }
      setShowAddPlan(false)
      setEditingPlan(null)
      resetPlanForm()
      loadKidDetail(selectedKid)
    } catch {
      showToast('Failed to save plan', 'error')
    }
  }

  const logMeeting = async () => {
    if (!selectedKid || !meetForm.meeting_date) return
    const primaryPlan = kidPlans[0]
    try {
      await fetch('/api/parent/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_special_ed_meeting',
          kid: selectedKid,
          plan_id: primaryPlan?.id || null,
          ...meetForm,
        }),
      })
      showToast('Meeting logged')
      setShowLogMeeting(false)
      resetMeetForm()
      loadKidDetail(selectedKid)
    } catch {
      showToast('Failed to log meeting', 'error')
    }
  }

  const addToCalendar = async (plan: any) => {
    if (!plan?.next_meeting_date || !selectedKid) return
    try {
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_event',
          event_data: {
            title: `${plan.plan_type} Meeting — ${KID_DISPLAY[selectedKid]}`,
            event_type: 'school',
            start_time: `${plan.next_meeting_date.split('T')[0]}T14:00:00`,
            end_time: `${plan.next_meeting_date.split('T')[0]}T15:00:00`,
            location: plan.next_meeting_location || '',
          },
        }),
      })
      showToast('Added to calendar')
    } catch {
      showToast('Failed to add to calendar', 'error')
    }
  }

  const resetPlanForm = () => {
    setPlanForm({
      plan_type: '504', status: 'active', start_date: '', review_date: '',
      next_meeting_date: '', next_meeting_time: '', next_meeting_location: '',
      notes: '', accommodations: [], goals: [],
    })
  }

  const resetMeetForm = () => {
    setMeetForm({
      meeting_date: '', meeting_time: '', meeting_type: 'annual_review',
      location: '', attendees: '', outcome: '', notes: '',
    })
  }

  const startEditPlan = (plan: any) => {
    setEditingPlan(plan)
    setPlanForm({
      plan_type: plan.plan_type,
      status: plan.status || 'active',
      start_date: plan.start_date || '',
      review_date: plan.review_date || '',
      next_meeting_date: plan.next_meeting_date ? plan.next_meeting_date.split('T')[0] : '',
      next_meeting_time: plan.next_meeting_time || '',
      next_meeting_location: plan.next_meeting_location || '',
      notes: plan.notes || '',
      accommodations: plan.accommodations || [],
      goals: plan.goals || [],
    })
    setShowAddPlan(true)
  }

  // ─── Email generator ──────────────────────────────────────────────────────

  const generateEmail = () => {
    const kids = Array.from(emailKids)
    if (kids.length === 0) {
      showToast('Select at least one child', 'info')
      return
    }

    let email = ''
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    if (emailMode === 'full') {
      email = `Date: ${today}\n\nDear School Team,\n\nI am writing to provide an updated health and educational summary for the following student(s):\n\n`
      kids.forEach(kid => {
        const plans = allPlans[kid] || []
        const activePlans = plans.filter(p => p.status === 'active')
        email += `--- ${KID_DISPLAY[kid]} Moses ---\n`
        email += `School Type: ${KID_SCHOOL_TYPE[kid] === 'public' ? 'Public School' : 'Homeschool'}\n`
        if (activePlans.length > 0) {
          email += `Active Plans: ${activePlans.map(p => p.plan_type).join(', ')}\n`
          activePlans.forEach(p => {
            if (p.accommodations?.length > 0) {
              email += `Accommodations (${p.plan_type}):\n`
              p.accommodations.forEach((a: any) => { email += `  - ${a.text}\n` })
            }
            if (p.goals?.length > 0) {
              email += `Goals (${p.plan_type}):\n`
              p.goals.forEach((g: any) => { email += `  - ${g.subject}: ${g.goal}\n` })
            }
          })
        } else {
          email += `Active Plans: None on file\n`
        }
        email += '\n'
      })
      email += `Please let me know if you need any additional information.\n\nSincerely,\nLola Moses\nParent`
    } else if (emailMode === 'health_only') {
      email = `Date: ${today}\n\nHealth Information Summary\n\n`
      kids.forEach(kid => {
        const plans = allPlans[kid] || []
        email += `--- ${KID_DISPLAY[kid]} Moses ---\n`
        const activePlans = plans.filter(p => p.status === 'active')
        activePlans.forEach(p => {
          if (p.accommodations?.length > 0) {
            email += `Accommodations (${p.plan_type}):\n`
            p.accommodations.forEach((a: any) => { email += `  - ${a.text}\n` })
          }
        })
        if (activePlans.length === 0) email += `No active plans on file\n`
        email += '\n'
      })
    } else if (emailMode === 'contact_verify') {
      email = `Date: ${today}\n\nDear School Team,\n\nI am writing to verify that you have current contact and plan information on file for:\n\n`
      kids.forEach(kid => {
        const plans = allPlans[kid] || []
        email += `- ${KID_DISPLAY[kid]} Moses`
        if (plans.length > 0) email += ` (${plans.filter(p => p.status === 'active').map(p => p.plan_type).join(', ')})`
        email += '\n'
      })
      email += `\nPlease confirm that all information is up to date. If anything needs updating, please let me know.\n\nThank you,\nLola Moses\nParent`
    }

    setEmailPreview(email)
    setEmailGenerated(true)
  }

  const copyEmail = () => {
    navigator.clipboard.writeText(emailPreview).then(() => {
      showToast('Copied to clipboard')
    }).catch(() => {
      showToast('Failed to copy', 'error')
    })
  }

  // ─── Kid diagnoses helper (extracts from plan notes as structured data) ───

  const getKidDiagnoses = (kid: string): string[] => {
    const plans = allPlans[kid] || []
    const diagnoses: string[] = []
    // Extract plan types as a proxy for diagnoses
    plans.forEach(p => {
      if (p.plan_type === '504') diagnoses.push('504')
      if (p.plan_type === 'IEP') diagnoses.push('IEP')
      if (p.plan_type === 'Speech') diagnoses.push('speech_services')
    })
    return Array.from(new Set(diagnoses))
  }

  const getKidPlanBadges = (kid: string): string[] => {
    return (allPlans[kid] || [])
      .filter(p => p.status === 'active')
      .map(p => p.plan_type)
  }

  const hasMissingData = (kid: string): boolean => {
    const plans = allPlans[kid] || []
    if (plans.length === 0) return false // no plan = not necessarily missing
    return plans.some(p =>
      p.status === 'active' && (
        !(p.accommodations?.length > 0) ||
        !(p.goals?.length > 0)
      )
    )
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ════════════════════ Summary Banner ════════════════════ */}
      {!embedded && (unconfirmedMeetings.length > 0 || upcomingMeetings.length > 0) && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-sm text-purple-900">Special Ed & 504 Summary</h3>

              {/* Unconfirmed meetings */}
              {unconfirmedMeetings.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">
                      {unconfirmedMeetings.length} unconfirmed meeting{unconfirmedMeetings.length > 1 ? 's' : ''}
                    </p>
                    {unconfirmedMeetings.map(m => (
                      <div key={m.plan.id} className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedKid(m.kid); setDetailTab('plans'); setExpandedPlan(m.plan.id) }}
                          className="text-xs text-amber-700 hover:text-amber-900 hover:underline text-left"
                        >
                          {KID_DISPLAY[m.kid]} — {m.plan.plan_type} on{' '}
                          {safeDate(m.plan.next_meeting_date, { month: 'short', day: 'numeric' })}
                          {m.plan.next_meeting_time && ` at ${m.plan.next_meeting_time}`}
                        </button>
                        <button
                          onClick={() => confirmMeeting(m.plan.id)}
                          className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700 flex items-center gap-0.5 shrink-0"
                        >
                          <Check className="w-2.5 h-2.5" /> Confirm
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming meetings */}
              {upcomingMeetings.length > 0 && unconfirmedMeetings.length === 0 && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <p className="text-sm text-purple-700">
                    Next meeting: {KID_DISPLAY[upcomingMeetings[0].kid]} — {upcomingMeetings[0].plan.plan_type} on{' '}
                    {safeDate(upcomingMeetings[0].plan.next_meeting_date, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ Actions Bar ════════════════════ */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-600" />
          Special Ed & 504 Plans
        </h2>
        <button
          onClick={() => { setShowEmailModal(true); setEmailGenerated(false) }}
          className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 flex items-center gap-1.5 font-medium"
        >
          <Mail className="w-3.5 h-3.5" />
          Generate Health Update Emails
        </button>
      </div>

      {/* ════════════════════ Kid Selector Cards ════════════════════ */}
      <div className={`grid grid-cols-3 sm:grid-cols-6 gap-2 ${embedded ? 'hidden' : ''}`}>
        {ALL_KIDS.map(kid => {
          const plans = getKidPlanBadges(kid)
          const hasWarning = hasMissingData(kid)
          const isSelected = selectedKid === kid

          return (
            <button
              key={kid}
              onClick={() => setSelectedKid(isSelected ? null : kid)}
              className={`relative p-3 rounded-lg border-2 text-center transition-all ${
                isSelected
                  ? 'border-purple-400 bg-purple-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-25'
              }`}
            >
              {/* Warning dot */}
              {hasWarning && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />
              )}

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center text-white text-xs font-bold ${KID_AVATAR_COLORS[kid]}`}>
                {KID_DISPLAY[kid][0]}
              </div>

              {/* Name */}
              <p className={`text-xs font-semibold ${isSelected ? 'text-purple-800' : 'text-gray-700'}`}>
                {KID_DISPLAY[kid]}
              </p>

              {/* School type */}
              <p className="text-[10px] text-gray-400 mt-0.5">
                {KID_SCHOOL_TYPE[kid] === 'public' ? 'Public' : 'Home'}
              </p>

              {/* Plan badges */}
              {plans.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-1.5">
                  {plans.map(plan => (
                    <span key={plan} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PLAN_COLORS[plan] || PLAN_COLORS.Other}`}>
                      {plan}
                    </span>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* ════════════════════ Detail Panel ════════════════════ */}
      {selectedKid && (
        <div className="border-2 border-purple-200 rounded-lg bg-white">
          {/* Detail header */}
          <div className="bg-purple-50 border-b border-purple-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${KID_AVATAR_COLORS[selectedKid]}`}>
                {KID_DISPLAY[selectedKid][0]}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{KID_DISPLAY[selectedKid]} Moses</h3>
                <p className="text-xs text-gray-500">
                  Age {KID_AGES[selectedKid]} · {KID_SCHOOL_TYPE[selectedKid] === 'public' ? 'Public School' : 'Homeschool'}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedKid(null)} className="p-1 hover:bg-purple-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="flex border-b overflow-x-auto">
            {([
              { id: 'plans' as DetailTab, label: 'Plans', icon: ClipboardList },
              { id: 'providers' as DetailTab, label: 'Providers', icon: Users },
              { id: 'documents' as DetailTab, label: 'Documents', icon: FileText },
              { id: 'health' as DetailTab, label: 'Health', icon: Heart },
              { id: 'history' as DetailTab, label: 'History', icon: History },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  detailTab === tab.id
                    ? 'border-purple-500 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {/* ──── Plans Tab ──── */}
            {detailTab === 'plans' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Education Plans</span>
                  <button
                    onClick={() => { resetPlanForm(); setEditingPlan(null); setShowAddPlan(true) }}
                    className="text-xs text-purple-600 flex items-center gap-1 hover:text-purple-800 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Plan
                  </button>
                </div>

                {/* Nudge banner if no plans */}
                {kidPlans.length === 0 && (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <ClipboardList className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No plans on file for {KID_DISPLAY[selectedKid]}</p>
                    <p className="text-xs text-gray-400 mt-1">Add an IEP, 504, or other plan to track accommodations and goals</p>
                  </div>
                )}

                {/* Plan cards */}
                {kidPlans.map(plan => {
                  const isExpanded = expandedPlan === plan.id
                  const showGoals = expandedGoals.has(plan.id)
                  const showAccommodations = expandedAccom.has(plan.id)
                  const accom = plan.accommodations || []
                  const goals = plan.goals || []

                  return (
                    <div key={plan.id} className={`border rounded-lg overflow-hidden ${
                      plan.status === 'active' ? 'border-green-200' : plan.status === 'expired' ? 'border-red-200' : 'border-amber-200'
                    }`}>
                      {/* Plan header */}
                      <div
                        className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${PLAN_COLORS[plan.plan_type] || PLAN_COLORS.Other}`}>
                            {plan.plan_type}
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[plan.status] || STATUS_COLORS.draft}`}>
                            {(plan.status || 'draft').charAt(0).toUpperCase() + (plan.status || 'draft').slice(1)}
                          </span>
                          {plan.review_date && (
                            <span className="text-xs text-gray-400">
                              Last review: {safeDate(plan.review_date)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); startEditPlan(plan) }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t px-3 pb-3 space-y-3">
                          {plan.notes && (
                            <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded p-2">{plan.notes}</p>
                          )}

                          {/* Upcoming meeting */}
                          {plan.next_meeting_date && new Date(plan.next_meeting_date) >= new Date() && (
                            <div className={`rounded-lg p-3 mt-3 ${plan.meeting_confirmed ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                              <div className="flex items-start gap-2">
                                {!plan.meeting_confirmed && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                                {plan.meeting_confirmed && <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    Upcoming Meeting —{' '}
                                    {safeDate(plan.next_meeting_date, { month: 'long', day: 'numeric', year: 'numeric' })}
                                    {plan.next_meeting_time && ` at ${plan.next_meeting_time}`}
                                  </p>
                                  {plan.next_meeting_location && (
                                    <p className="text-xs text-gray-600 mt-0.5">{plan.next_meeting_location}</p>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    {!plan.meeting_confirmed && (
                                      <button
                                        onClick={() => confirmMeeting(plan.id)}
                                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" /> Mark Confirmed
                                      </button>
                                    )}
                                    <button
                                      onClick={() => addToCalendar(plan)}
                                      className="text-xs bg-white border px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-1"
                                    >
                                      <Calendar className="w-3 h-3" /> Add to Calendar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Schedule Meeting — show when no upcoming meeting */}
                          {(!plan.next_meeting_date || new Date(plan.next_meeting_date) < new Date()) && (
                            <button
                              onClick={() => startEditPlan(plan)}
                              className="text-xs text-purple-600 border border-purple-200 px-3 py-1.5 rounded hover:bg-purple-50 flex items-center gap-1 mt-3"
                            >
                              <Calendar className="w-3 h-3" /> Schedule Next Meeting
                            </button>
                          )}

                          {/* Accommodations */}
                          <div className="mt-3">
                            <button
                              onClick={() => {
                                const next = new Set(expandedAccom)
                                showAccommodations ? next.delete(plan.id) : next.add(plan.id)
                                setExpandedAccom(next)
                              }}
                              className="flex items-center justify-between w-full text-left"
                            >
                              <span className="text-sm font-medium text-gray-700">
                                Accommodations <span className="text-gray-400 text-xs ml-1">({accom.length})</span>
                              </span>
                              {showAccommodations ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                            </button>
                            {showAccommodations && (
                              <div className="mt-2 space-y-1">
                                {accom.map((a: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-sm py-1 px-2 bg-gray-50 rounded">
                                    <span className="text-gray-700">{a.text}</span>
                                    <button onClick={() => removeAccommodation(plan.id, accom, i)} className="text-gray-300 hover:text-red-500 p-0.5">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {accom.length === 0 && (
                                  <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                                    No accommodations listed — add them to keep records complete
                                  </p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  <input
                                    type="text"
                                    value={newAccom}
                                    onChange={e => setNewAccom(e.target.value)}
                                    placeholder="Add accommodation..."
                                    className="flex-1 text-xs border rounded px-2 py-1.5"
                                    onKeyDown={e => e.key === 'Enter' && addAccommodation(plan.id, accom)}
                                  />
                                  <button
                                    onClick={() => addAccommodation(plan.id, accom)}
                                    className="text-xs text-purple-600 hover:text-purple-800 px-2"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Goals */}
                          <div>
                            <button
                              onClick={() => {
                                const next = new Set(expandedGoals)
                                showGoals ? next.delete(plan.id) : next.add(plan.id)
                                setExpandedGoals(next)
                              }}
                              className="flex items-center justify-between w-full text-left"
                            >
                              <span className="text-sm font-medium text-gray-700">
                                Goals <span className="text-gray-400 text-xs ml-1">({goals.length})</span>
                              </span>
                              {showGoals ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                            </button>
                            {showGoals && (
                              <div className="mt-2 space-y-1">
                                {goals.map((g: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 bg-gray-50 rounded">
                                    <div>
                                      <span className="font-medium text-gray-700">{g.subject}:</span>{' '}
                                      <span className="text-gray-600">{g.goal}</span>
                                    </div>
                                    <button onClick={() => removeGoal(plan.id, goals, i)} className="text-gray-300 hover:text-red-500 p-0.5 shrink-0">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {goals.length === 0 && (
                                  <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                                    No goals listed — add IEP/504 goals here
                                  </p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  <input
                                    type="text"
                                    value={newGoalSubject}
                                    onChange={e => setNewGoalSubject(e.target.value)}
                                    placeholder="Subject"
                                    className="w-24 text-xs border rounded px-2 py-1.5"
                                  />
                                  <input
                                    type="text"
                                    value={newGoalText}
                                    onChange={e => setNewGoalText(e.target.value)}
                                    placeholder="Goal description"
                                    className="flex-1 text-xs border rounded px-2 py-1.5"
                                    onKeyDown={e => e.key === 'Enter' && addGoal(plan.id, goals)}
                                  />
                                  <button
                                    onClick={() => addGoal(plan.id, goals)}
                                    className="text-xs text-purple-600 hover:text-purple-800 px-2"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Meeting history section */}
                <div className="border rounded-lg mt-4">
                  <div className="flex items-center justify-between p-3">
                    <span className="font-medium text-sm flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-gray-500" /> Meeting History
                    </span>
                    <button
                      onClick={() => { resetMeetForm(); setShowLogMeeting(true) }}
                      className="text-xs text-purple-600 flex items-center gap-1 hover:text-purple-800"
                    >
                      <Plus className="w-3.5 h-3.5" /> Log Meeting
                    </button>
                  </div>

                  {/* Log meeting form */}
                  {showLogMeeting && (
                    <div className="px-3 pb-3 bg-gray-50 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <input
                          type="date"
                          value={meetForm.meeting_date}
                          onChange={e => setMeetForm(p => ({ ...p, meeting_date: e.target.value }))}
                          className="text-xs border rounded px-2 py-1.5"
                        />
                        <input
                          type="text"
                          value={meetForm.meeting_time}
                          onChange={e => setMeetForm(p => ({ ...p, meeting_time: e.target.value }))}
                          placeholder="Time (e.g. 1:50 PM)"
                          className="text-xs border rounded px-2 py-1.5"
                        />
                      </div>
                      <select
                        value={meetForm.meeting_type}
                        onChange={e => setMeetForm(p => ({ ...p, meeting_type: e.target.value }))}
                        className="w-full text-xs border rounded px-2 py-1.5"
                      >
                        {MEETING_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={meetForm.location}
                        onChange={e => setMeetForm(p => ({ ...p, location: e.target.value }))}
                        placeholder="Location"
                        className="w-full text-xs border rounded px-2 py-1.5"
                      />
                      <input
                        type="text"
                        value={meetForm.attendees}
                        onChange={e => setMeetForm(p => ({ ...p, attendees: e.target.value }))}
                        placeholder="Attendees"
                        className="w-full text-xs border rounded px-2 py-1.5"
                      />
                      <input
                        type="text"
                        value={meetForm.outcome}
                        onChange={e => setMeetForm(p => ({ ...p, outcome: e.target.value }))}
                        placeholder="Outcome"
                        className="w-full text-xs border rounded px-2 py-1.5"
                      />
                      <textarea
                        value={meetForm.notes}
                        onChange={e => setMeetForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Notes"
                        rows={2}
                        className="w-full text-xs border rounded px-2 py-1.5 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={logMeeting} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700">
                          Save Meeting
                        </button>
                        <button onClick={() => setShowLogMeeting(false)} className="text-xs text-gray-500">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Meeting list */}
                  <div className="divide-y">
                    {kidMeetings.map(m => (
                      <div key={m.id} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {safeDate(m.meeting_date)}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">
                            {(m.meeting_type || '').replace(/_/g, ' ')}
                          </span>
                        </div>
                        {m.outcome && <p className="text-xs text-gray-600 mt-0.5">{m.outcome}</p>}
                        {m.notes && <p className="text-xs text-gray-400 mt-0.5">{m.notes}</p>}
                        {m.attendees && <p className="text-xs text-gray-400 mt-0.5">Attendees: {m.attendees}</p>}
                      </div>
                    ))}
                    {kidMeetings.length === 0 && (
                      <div className="p-3 text-xs text-gray-400 text-center">No meetings logged yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ──── Providers Tab ──── */}
            {detailTab === 'providers' && (
              <div className="space-y-3">
                <SchoolContactCards kid={selectedKid} />
              </div>
            )}

            {/* ──── Documents Tab ──── */}
            {detailTab === 'documents' && (
              <div className="space-y-3">
                <SchoolDocuments
                  kid={selectedKid}
                  filterTypes={['IEP', '504_Plan', 'ARD_Notes', 'Speech_Report', 'Progress_Report', 'Medical_Form', 'Other']}
                />
              </div>
            )}

            {/* ──── Health Tab ──── */}
            {detailTab === 'health' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Health & Conditions</span>
                </div>

                {/* Diagnosis pills from plan data */}
                {kidPlans.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Active Plan Diagnoses</p>
                    <div className="flex flex-wrap gap-1.5">
                      {kidPlans
                        .filter(p => p.status === 'active')
                        .map(p => (
                          <span key={p.id} className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_COLORS[p.plan_type] || PLAN_COLORS.Other}`}>
                            {p.plan_type}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Accommodations quick view */}
                {kidPlans.some(p => p.status === 'active' && p.accommodations?.length > 0) && (
                  <div className="border rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Current Accommodations</p>
                    {kidPlans
                      .filter(p => p.status === 'active' && p.accommodations?.length > 0)
                      .map(p => (
                        <div key={p.id} className="mb-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{p.plan_type}</p>
                          <ul className="space-y-0.5">
                            {p.accommodations.map((a: any, i: number) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                <span className="text-green-500 mt-0.5">&#8226;</span>
                                {a.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    }
                  </div>
                )}

                {/* Active diagnoses — auto-populated from kid profiles */}
                {(() => {
                  const KID_DIAGNOSES: Record<string, string[]> = {
                    amos: ['adhd', 'autism', 'dyslexia', 'dyscalculia', 'speech_delay', 'apd', 'hearing', 'color_vision'],
                    kaylee: ['learning_delay', 'speech_delay'],
                    wyatt: ['adhd', 'speech_services', 'color_vision'],
                    hannah: ['sensory', 'speech_services'],
                    ellie: [],
                    zoey: [],
                  }
                  const KID_MEDS: Record<string, string[]> = {
                    amos: ['Focalin AM (⏸️ paused)', 'Clonidine PM (⏸️ paused)'],
                    wyatt: ['Focalin AM (⏸️ paused)', 'Clonidine PM (⏸️ paused)'],
                  }
                  const KID_SENSORY: Record<string, string> = {
                    amos: 'APD, bilateral hearing loss (high-freq), color vision deficiency. Does NOT wear glasses.',
                    hannah: 'Auditory sensitivity to loud noises. Uses ear protectors.',
                    wyatt: 'Color vision deficiency (shifted hues).',
                  }
                  const diagnoses = KID_DIAGNOSES[selectedKid || ''] || []
                  const meds = KID_MEDS[selectedKid || ''] || []
                  const sensory = KID_SENSORY[selectedKid || ''] || ''
                  return (
                    <>
                      <div className="border rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">Diagnoses & Conditions</p>
                        {diagnoses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {diagnoses.map(d => {
                              const pill = DIAGNOSIS_PILLS[d]
                              return pill ? (
                                <span key={d} className={`text-xs font-medium px-2.5 py-1 rounded-full ${pill.color}`}>
                                  {pill.label}
                                </span>
                              ) : null
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No diagnoses on file</p>
                        )}
                      </div>
                      {meds.length > 0 && (
                        <div className="border rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-500 mb-1.5">Medications</p>
                          {meds.map((m, i) => (
                            <p key={i} className="text-xs text-gray-700">💊 {m}</p>
                          ))}
                        </div>
                      )}
                      {sensory && (
                        <div className="border rounded-lg p-3 bg-amber-50">
                          <p className="text-xs font-medium text-amber-700 mb-1">Sensory Profile</p>
                          <p className="text-xs text-amber-800">{sensory}</p>
                        </div>
                      )}
                    </>
                  )
                })()}

                {/* All diagnosis badges (click to see what's available) */}
                <div className="border rounded-lg p-3">
                  <button
                    onClick={() => setShowFormerProviders(!showFormerProviders)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <span className="text-xs font-medium text-gray-500">All Available Diagnosis Badges</span>
                    {showFormerProviders ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                  </button>
                  {showFormerProviders && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(DIAGNOSIS_PILLS).map(([key, val]) => {
                        const kidDiags = (() => {
                          const map: Record<string, string[]> = { amos: ['adhd','autism','dyslexia','dyscalculia','speech_delay','apd','hearing','color_vision'], kaylee: ['learning_delay','speech_delay'], wyatt: ['adhd','speech_services','color_vision'], hannah: ['sensory','speech_services'] }
                          return map[selectedKid || ''] || []
                        })()
                        const isActive = kidDiags.includes(key)
                        return (
                          <span key={key} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isActive ? val.color + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-100 text-gray-400'}`}>
                            {val.label}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ──── History Tab ──── */}
            {detailTab === 'history' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Education History</span>
                </div>

                {/* School enrollment timeline — per kid */}
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">School Enrollment</p>
                  <div className="relative pl-4 border-l-2 border-purple-200 space-y-3">
                    {(() => {
                      const ENROLLMENT: Record<string, { school: string; dates: string; current: boolean }[]> = {
                        amos: [
                          { school: 'Homeschool', dates: 'November 2025 — Present', current: true },
                          { school: 'Boerne ISD (Public School)', dates: 'Until November 2025', current: false },
                        ],
                        zoey: [
                          { school: 'Champion High School (Boerne ISD)', dates: '2024 — Present', current: true },
                        ],
                        kaylee: [
                          { school: 'Boerne Middle School North (BMSN)', dates: '2024 — Present', current: true },
                        ],
                        ellie: [
                          { school: 'Homeschool', dates: '2025 — Present', current: true },
                          { school: 'Herff Elementary (Boerne ISD)', dates: 'Until 2025', current: false },
                        ],
                        wyatt: [
                          { school: 'Homeschool', dates: '2025 — Present', current: true },
                          { school: 'Herff Elementary (Boerne ISD)', dates: 'Until 2025', current: false },
                        ],
                        hannah: [
                          { school: 'Homeschool', dates: '2025 — Present', current: true },
                        ],
                      }
                      return (ENROLLMENT[selectedKid || ''] || []).map((e, i) => (
                        <div key={i} className="relative">
                          <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ${e.current ? 'bg-purple-500' : 'bg-gray-300'}`} />
                          <div>
                            <p className={`text-sm font-medium ${e.current ? 'text-gray-800' : 'text-gray-500'}`}>
                              {e.school} {e.current && '— Current'}
                            </p>
                            <p className="text-xs text-gray-400">{e.dates}</p>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>

                {/* Meeting history timeline */}
                {kidMeetings.length > 0 && (
                  <div className="border rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Meeting Timeline</p>
                    <div className="relative pl-4 border-l-2 border-blue-200 space-y-3">
                      {kidMeetings.map(m => (
                        <div key={m.id} className="relative">
                          <div className="absolute -left-[21px] w-3 h-3 bg-blue-400 rounded-full border-2 border-white" />
                          <div>
                            <p className="text-sm font-medium text-gray-800 capitalize">
                              {(m.meeting_type || 'Meeting').replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {safeDate(m.meeting_date, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                            {m.outcome && <p className="text-xs text-gray-600 mt-0.5">{m.outcome}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transition planning for Amos */}
                {selectedKid === 'amos' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Transition Planning</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Amos is {KID_AGES['amos']} — transition planning should begin at age 16 for post-secondary goals.
                          This includes vocational assessments, independent living skills, and community participation goals.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Plan history */}
                {kidPlans.length > 0 && (
                  <div className="border rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Plan History</p>
                    <div className="space-y-2">
                      {kidPlans.map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${PLAN_COLORS[p.plan_type] || PLAN_COLORS.Other}`}>
                            {p.plan_type}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                            {p.status}
                          </span>
                          {p.start_date && (
                            <span className="text-xs text-gray-400">
                              from {safeDate(p.start_date, { month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          {p.created_at && !p.start_date && (
                            <span className="text-xs text-gray-400">
                              created {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════ Add/Edit Plan Modal ════════════════════ */}
      {showAddPlan && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => { setShowAddPlan(false); setEditingPlan(null) }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editingPlan ? 'Edit Plan' : 'Add Plan'}</h3>
              <button onClick={() => { setShowAddPlan(false); setEditingPlan(null) }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {!editingPlan && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Plan Type</label>
                    <select
                      value={planForm.plan_type}
                      onChange={e => setPlanForm(p => ({ ...p, plan_type: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {PLAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                    <select
                      value={planForm.status}
                      onChange={e => setPlanForm(p => ({ ...p, status: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="expired">Expired</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={planForm.start_date}
                        onChange={e => setPlanForm(p => ({ ...p, start_date: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Review Date</label>
                      <input
                        type="date"
                        value={planForm.review_date}
                        onChange={e => setPlanForm(p => ({ ...p, review_date: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Next Meeting Date</label>
                <input
                  type="date"
                  value={planForm.next_meeting_date}
                  onChange={e => setPlanForm(p => ({ ...p, next_meeting_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Meeting Time</label>
                  <input
                    type="text"
                    value={planForm.next_meeting_time}
                    onChange={e => setPlanForm(p => ({ ...p, next_meeting_time: e.target.value }))}
                    placeholder="e.g. 1:50 PM"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Location</label>
                  <input
                    type="text"
                    value={planForm.next_meeting_location}
                    onChange={e => setPlanForm(p => ({ ...p, next_meeting_location: e.target.value }))}
                    placeholder="Location"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                <textarea
                  value={planForm.notes}
                  onChange={e => setPlanForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Plan notes, context, key info..."
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={savePlan} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 font-medium">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
                <button onClick={() => { setShowAddPlan(false); setEditingPlan(null) }} className="text-gray-500 text-sm px-4 py-2">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ Email Generator Modal ════════════════════ */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                Generate Health Update Email
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Kid selection */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Select children to include:</p>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_KIDS.map(kid => {
                    const checked = emailKids.has(kid)
                    return (
                      <label
                        key={kid}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          checked ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(emailKids)
                            checked ? next.delete(kid) : next.add(kid)
                            setEmailKids(next)
                            setEmailGenerated(false)
                          }}
                          className="rounded text-purple-600"
                        />
                        <span className="text-xs font-medium">{KID_DISPLAY[kid]}</span>
                        {KID_SCHOOL_TYPE[kid] === 'public' && (
                          <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded">PS</span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Email mode */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Email type:</p>
                <div className="space-y-1.5">
                  {EMAIL_MODES.map(mode => (
                    <label
                      key={mode.value}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        emailMode === mode.value ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="emailMode"
                        checked={emailMode === mode.value}
                        onChange={() => { setEmailMode(mode.value); setEmailGenerated(false) }}
                        className="mt-0.5 text-purple-600"
                      />
                      <div>
                        <span className="text-xs font-medium">{mode.label}</span>
                        <p className="text-[10px] text-gray-400">{mode.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={generateEmail}
                className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 font-medium"
              >
                Generate Email
              </button>

              {/* Preview */}
              {emailGenerated && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">Preview:</p>
                  <textarea
                    value={emailPreview}
                    onChange={e => setEmailPreview(e.target.value)}
                    rows={12}
                    className="w-full border rounded-lg px-3 py-2 text-xs font-mono resize-none bg-gray-50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={copyEmail}
                      className="flex-1 bg-purple-100 text-purple-700 py-2 rounded-lg text-xs font-medium hover:bg-purple-200 flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={() => { showToast('Marked as sent', 'info'); setShowEmailModal(false) }}
                      className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg text-xs font-medium hover:bg-green-200 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark as Sent
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ Toast ════════════════════ */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
