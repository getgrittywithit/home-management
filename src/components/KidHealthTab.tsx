'use client'

import { useState, useEffect } from 'react'
import {
  Heart, Stethoscope, Building2, Calendar, Clock,
  ChevronRight, CheckCircle, AlertCircle, Loader2, Send,
  CheckCircle2, Circle, Pill, Sun, Moon, Flame, Dumbbell,
  Plus, Trash2
} from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

// ============================================================================
// TYPES
// ============================================================================

interface Provider {
  id: string
  name: string
  specialty: string
  practice_name: string
  phone?: string
  address?: string
}

interface Appointment {
  id: string
  provider_name: string
  appointment_type: string
  appointment_date: string
  location?: string
  reason?: string
  status: string
}

interface HealthRequest {
  id: number
  category: string
  duration: string
  severity: string
  notes?: string
  status: string
  parent_response?: string
  created_at: string
  resolved_at?: string
}

interface CareItem {
  id: number
  item_name: string
  instructions: string
  time_of_day: 'morning' | 'evening' | 'both'
  category: string
  end_date?: string
  morning_done: boolean | null
  evening_done: boolean | null
}

interface DentalItem {
  id: number
  item_name: string
  time_of_day: 'morning' | 'evening'
  completed: boolean
}

interface DentalData {
  items: DentalItem[]
  streak: { current_streak: number; longest_streak: number; last_completed_date: string | null }
  notes: { id: number; note: string; created_at: string }[]
  dentist: Provider | null
  nextDentalVisit: Appointment | null
}

interface FitnessData {
  todayActivities: { id: number; activity_type: string; duration_minutes: number | null; notes: string | null; created_at: string }[]
  moodHistory: { mood: string; log_date: string; notes: string | null }[]
  todayMood: { mood: string; log_date: string; notes: string | null } | null
  activityStreak: number
  wellness: any
}

interface KidHealthTabProps {
  childName: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES = [
  { id: 'head', label: 'Head / Headache', emoji: '🤕' },
  { id: 'stomach', label: 'Stomach', emoji: '🤢' },
  { id: 'skin', label: 'Skin / Rash', emoji: '🩹' },
  { id: 'eyes', label: 'Eyes / Vision', emoji: '👁️' },
  { id: 'teeth', label: 'Teeth / Mouth', emoji: '🦷' },
  { id: 'ears', label: 'Ears', emoji: '👂' },
  { id: 'sick', label: 'Feeling Sick', emoji: '🤒' },
  { id: 'injury', label: 'Hurt / Injury', emoji: '🩼' },
  { id: 'checkup', label: 'Just Need a Checkup', emoji: '✅' },
  { id: 'other', label: 'Something Else', emoji: '❓' },
]

const DURATIONS = [
  { id: 'today', label: 'Today' },
  { id: 'few_days', label: 'A few days' },
  { id: 'week', label: 'About a week' },
  { id: 'awhile', label: 'A while now' },
]

const SEVERITIES = [
  { id: 'mild', label: 'Not bad', emoji: '😊' },
  { id: 'medium', label: 'Medium', emoji: '😐' },
  { id: 'severe', label: 'Really bothering me', emoji: '😟' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  scheduled: { label: 'Appointment Scheduled', color: 'bg-blue-100 text-blue-800' },
  handled: { label: 'Handled at Home', color: 'bg-green-100 text-green-800' },
  dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-600' },
}

const ACTIVITY_TYPES = [
  { id: 'walking', label: 'Walking', emoji: '🚶' },
  { id: 'running', label: 'Running', emoji: '🏃' },
  { id: 'outdoor_play', label: 'Outdoor Play', emoji: '🌳' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'workout', label: 'Workout', emoji: '🏋️' },
  { id: 'stretching', label: 'Stretching', emoji: '🧘' },
  { id: 'dance', label: 'Dance', emoji: '💃' },
  { id: 'bike', label: 'Bike Ride', emoji: '🚲' },
  { id: 'swimming', label: 'Swimming', emoji: '🏊' },
  { id: 'other', label: 'Other', emoji: '🎯' },
]

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hr' },
  { value: 90, label: '1.5 hr' },
  { value: 120, label: '2+ hr' },
]

const MOODS = [
  { id: 'great', label: 'Great', emoji: '😊' },
  { id: 'good', label: 'Good', emoji: '🙂' },
  { id: 'ok', label: 'OK', emoji: '😐' },
  { id: 'rough', label: 'Rough', emoji: '😔' },
  { id: 'bad', label: 'Bad', emoji: '😢' },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function KidHealthTab({ childName }: KidHealthTabProps) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [requests, setRequests] = useState<HealthRequest[]>([])
  const [dailyCare, setDailyCare] = useState<CareItem[]>([])
  const [dental, setDental] = useState<DentalData | null>(null)
  const [fitness, setFitness] = useState<FitnessData | null>(null)
  const [cycle, setCycle] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Health request form state
  const [showForm, setShowForm] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [category, setCategory] = useState('')
  const [duration, setDuration] = useState('')
  const [severity, setSeverity] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Activity form state
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityType, setActivityType] = useState('')
  const [activityDuration, setActivityDuration] = useState<number | null>(null)
  const [activityNotes, setActivityNotes] = useState('')

  // Wellness form state (Zoey)
  const [wellnessForm, setWellnessForm] = useState({ steps: '', waterCups: '', fastingStart: '', fastingEnd: '', weight: '' })

  const childKey = childName.toLowerCase()
  const isZoey = childKey === 'zoey'

  useEffect(() => {
    loadData()
  }, [childKey])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/kids/health?child=${childKey}`)
      const data = await res.json()
      setProviders(data.providers || [])
      setAppointments(data.appointments || [])
      setRequests(data.requests || [])
      setDailyCare(data.dailyCare || [])
      setDental(data.dental || null)
      setFitness(data.fitness || null)
      setCycle(data.cycle || null)
      // Pre-fill wellness form for Zoey
      if (data.fitness?.wellness && childKey === 'zoey') {
        const w = data.fitness.wellness
        setWellnessForm({
          steps: w.steps?.toString() || '',
          waterCups: w.water_cups?.toString() || '',
          fastingStart: w.fasting_start || '',
          fastingEnd: w.fasting_end || '',
          weight: w.weight?.toString() || '',
        })
      }
    } catch (err) {
      console.error('Failed to load health data:', err)
    } finally {
      setLoading(false)
    }
  }

  const postAction = async (body: any) => {
    await fetch('/api/kids/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  // ── Health request handlers ──
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await postAction({ action: 'submit_health_request', child: childKey, category, duration, severity, notes: notes.trim() || null })
      setSubmitted(true)
      setTimeout(() => { resetForm(); loadData() }, 2500)
    } catch (err) {
      console.error('Failed to submit request:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setShowForm(false); setFormStep(1); setCategory(''); setDuration(''); setSeverity(''); setNotes(''); setSubmitted(false)
  }

  // ── Daily care handlers ──
  const toggleCareItem = async (careItemId: number, timeOfDay: 'morning' | 'evening') => {
    setDailyCare(prev => prev.map(item => {
      if (item.id !== careItemId) return item
      return timeOfDay === 'morning' ? { ...item, morning_done: !item.morning_done } : { ...item, evening_done: !item.evening_done }
    }))
    try {
      await postAction({ action: 'toggle_care_item', child: childKey, careItemId, timeOfDay })
    } catch { loadData() }
  }

  // ── Dental handlers ──
  const toggleDentalItem = async (dentalItemId: number) => {
    if (!dental) return
    setDental(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === dentalItemId ? { ...i, completed: !i.completed } : i)
    } : prev)
    try {
      await postAction({ action: 'toggle_dental_item', child: childKey, dentalItemId })
      // Reload to get updated streak
      setTimeout(loadData, 500)
    } catch { loadData() }
  }

  // ── Activity handlers ──
  const logActivity = async () => {
    if (!activityType) return
    try {
      await postAction({ action: 'log_activity', child: childKey, activityType, durationMinutes: activityDuration, notes: activityNotes.trim() || null })
      setShowActivityForm(false); setActivityType(''); setActivityDuration(null); setActivityNotes('')
      loadData()
    } catch (err) { console.error('Failed to log activity:', err) }
  }

  const deleteActivity = async (id: number) => {
    try {
      await postAction({ action: 'delete_activity', activityId: id })
      loadData()
    } catch (err) { console.error('Failed to delete activity:', err) }
  }

  // ── Mood handler ──
  const logMood = async (mood: string) => {
    try {
      await postAction({ action: 'log_mood', child: childKey, mood })
      loadData()
    } catch (err) { console.error('Failed to log mood:', err) }
  }

  // ── Wellness handler (Zoey) ──
  const saveWellness = async () => {
    try {
      await postAction({
        action: 'log_wellness', child: childKey,
        steps: wellnessForm.steps ? parseInt(wellnessForm.steps) : null,
        waterCups: wellnessForm.waterCups ? parseInt(wellnessForm.waterCups) : null,
        fastingStart: wellnessForm.fastingStart || null,
        fastingEnd: wellnessForm.fastingEnd || null,
        weight: wellnessForm.weight ? parseFloat(wellnessForm.weight) : null,
      })
      loadData()
    } catch (err) { console.error('Failed to save wellness:', err) }
  }

  // Build a map of provider → next appointment
  const nextAppointmentByProvider: Record<string, Appointment> = {}
  appointments.forEach(apt => {
    const key = apt.provider_name.toLowerCase()
    if (!nextAppointmentByProvider[key] || apt.appointment_date < nextAppointmentByProvider[key].appointment_date) {
      nextAppointmentByProvider[key] = apt
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  // Streak milestone helper
  const streakLabel = (count: number) => {
    if (count >= 100) return '💯 LEGEND'
    if (count >= 30) return '1 month! 💪'
    if (count >= 7) return '1 week! 🎉'
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Heart className="w-7 h-7" />
          <div>
            <h1 className="text-2xl font-bold">Health</h1>
            <p className="text-teal-100">{childName}&apos;s doctors & health info</p>
          </div>
        </div>
      </div>

      {/* My Doctors */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Stethoscope className="w-5 h-5 text-teal-600" />
          My Doctors
        </h2>
        {providers.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No doctors on file yet. Mom can add them from the parent Health tab.</p>
        ) : (
          <div className="space-y-3">
            {providers.map(provider => {
              const nextApt = nextAppointmentByProvider[provider.name.toLowerCase()]
              return (
                <div key={provider.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{provider.name}</div>
                    <div className="text-sm text-gray-600">
                      {provider.practice_name}
                      {provider.specialty && ` (${provider.specialty})`}
                    </div>
                    {nextApt && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-teal-700 bg-teal-50 rounded px-2 py-0.5 w-fit">
                        <Calendar className="w-3 h-3" />
                        Next visit: {parseDateLocal(nextApt.appointment_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* My Daily Care */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Pill className="w-5 h-5 text-purple-600" />
          My Daily Care
        </h2>
        {dailyCare.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No daily care routines set up. Looking good! 🎉</p>
        ) : (
          <div className="space-y-5">
            {(() => {
              const morningItems = dailyCare.filter(i => i.time_of_day === 'morning' || i.time_of_day === 'both')
              if (morningItems.length === 0) return null
              const allDone = morningItems.every(i => i.morning_done)
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">☀️ Morning Routine</span>
                    {allDone && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium ml-auto">Morning done ✅</span>}
                  </div>
                  <div className="space-y-1">
                    {morningItems.map(item => (
                      <CareCheckRow key={`${item.id}-morning`} item={item} checked={!!item.morning_done} onToggle={() => toggleCareItem(item.id, 'morning')} />
                    ))}
                  </div>
                </div>
              )
            })()}
            {(() => {
              const eveningItems = dailyCare.filter(i => i.time_of_day === 'evening' || i.time_of_day === 'both')
              if (eveningItems.length === 0) return null
              const allDone = eveningItems.every(i => i.evening_done)
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-700">🌙 Evening Routine</span>
                    {allDone && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium ml-auto">Evening done ✅</span>}
                  </div>
                  <div className="space-y-1">
                    {eveningItems.map(item => (
                      <CareCheckRow key={`${item.id}-evening`} item={item} checked={!!item.evening_done} onToggle={() => toggleCareItem(item.id, 'evening')} />
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* DENTAL HEALTH */}
      {/* ================================================================== */}
      {dental && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            🦷 Dental Health
          </h2>

          {/* Dentist info */}
          {dental.dentist ? (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{dental.dentist.name}</div>
                <div className="text-sm text-gray-600">{dental.dentist.practice_name}</div>
                {dental.nextDentalVisit && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-cyan-700 bg-cyan-50 rounded px-2 py-0.5 w-fit">
                    <Calendar className="w-3 h-3" />
                    Next visit: {parseDateLocal(dental.nextDentalVisit.appointment_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm mb-4">No dentist on file. Mom can add one from the parent Health tab.</p>
          )}

          {/* Dental notes */}
          {dental.notes.length > 0 && (
            <div className="mb-4 space-y-1">
              {dental.notes.map(n => (
                <div key={n.id} className="text-sm text-gray-600 bg-cyan-50 rounded px-3 py-2">
                  📝 {n.note}
                </div>
              ))}
            </div>
          )}

          {/* Streak */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 rounded-lg">
            <Flame className="w-5 h-5 text-orange-500" />
            {dental.streak.current_streak > 0 ? (
              <div>
                <span className="font-bold text-orange-700">🔥 {dental.streak.current_streak}-day streak!</span>
                {streakLabel(dental.streak.current_streak) && (
                  <span className="ml-2 text-sm text-orange-600">{streakLabel(dental.streak.current_streak)}</span>
                )}
                {dental.streak.longest_streak > dental.streak.current_streak && (
                  <span className="text-xs text-gray-500 ml-2">Best: {dental.streak.longest_streak} days</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-orange-700">Start your streak — check off today&apos;s dental care!</span>
            )}
          </div>

          {/* Dental checklist */}
          {dental.items.length > 0 && (
            <div className="space-y-4">
              {/* Morning dental */}
              {(() => {
                const morning = dental.items.filter(i => i.time_of_day === 'morning')
                if (morning.length === 0) return null
                return (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">☀️ Morning</div>
                    <div className="space-y-1">
                      {morning.map(item => (
                        <DentalCheckRow key={item.id} item={item} onToggle={() => toggleDentalItem(item.id)} />
                      ))}
                    </div>
                  </div>
                )
              })()}
              {/* Evening dental */}
              {(() => {
                const evening = dental.items.filter(i => i.time_of_day === 'evening')
                if (evening.length === 0) return null
                return (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">🌙 Evening</div>
                    <div className="space-y-1">
                      {evening.map(item => (
                        <DentalCheckRow key={item.id} item={item} onToggle={() => toggleDentalItem(item.id)} />
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* FITNESS & ACTIVITY */}
      {/* ================================================================== */}
      {fitness && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-blue-600" />
            Fitness & Activity 💪
          </h2>

          {/* Mood check-in */}
          <div className="mb-5">
            <div className="text-sm font-semibold text-gray-700 mb-2">How do you feel today?</div>
            <div className="flex gap-2">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => logMood(m.id)}
                  className={`flex-1 p-2 rounded-lg border text-center transition ${
                    fitness.todayMood?.mood === m.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-xl">{m.emoji}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{m.label}</div>
                </button>
              ))}
            </div>
            {/* 7-day mood history */}
            {fitness.moodHistory.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-gray-400 mr-1">This week:</span>
                {fitness.moodHistory.map((m, i) => {
                  const moodInfo = MOODS.find(x => x.id === m.mood)
                  const dayLabel = parseDateLocal(m.log_date).toLocaleDateString('en-US', { weekday: 'short' })
                  return (
                    <div key={i} className="text-center" title={`${dayLabel}: ${moodInfo?.label}`}>
                      <div className="text-sm">{moodInfo?.emoji}</div>
                      <div className="text-[10px] text-gray-400">{dayLabel.slice(0, 2)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Activity streak */}
          {fitness.activityStreak > 0 && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 rounded-lg">
              <Flame className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-blue-700">🔥 {fitness.activityStreak}-day active streak!</span>
            </div>
          )}

          {/* Log activity button / form */}
          {!showActivityForm ? (
            <button
              onClick={() => setShowActivityForm(true)}
              className="w-full py-3 bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg text-blue-700 font-medium transition flex items-center justify-center gap-2 mb-4"
            >
              <Plus className="w-4 h-4" />
              Log Activity
            </button>
          ) : (
            <div className="bg-blue-50 rounded-lg p-4 mb-4 space-y-3">
              <div className="text-sm font-medium text-gray-700">What did you do?</div>
              <div className="grid grid-cols-3 gap-1.5">
                {ACTIVITY_TYPES.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setActivityType(a.id)}
                    className={`p-2 rounded-lg border text-xs font-medium transition ${
                      activityType === a.id ? 'border-blue-500 bg-blue-100 text-blue-800' : 'border-gray-200 bg-white hover:border-blue-300 text-gray-700'
                    }`}
                  >
                    {a.emoji} {a.label}
                  </button>
                ))}
              </div>
              <div className="text-sm font-medium text-gray-700">How long?</div>
              <div className="flex gap-1.5 flex-wrap">
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setActivityDuration(d.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      activityDuration === d.value ? 'border-blue-500 bg-blue-100 text-blue-800' : 'border-gray-200 bg-white hover:border-blue-300 text-gray-700'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Notes (optional)"
                value={activityNotes}
                onChange={e => setActivityNotes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button onClick={logActivity} disabled={!activityType}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50">
                  Log It
                </button>
                <button onClick={() => { setShowActivityForm(false); setActivityType(''); setActivityDuration(null); setActivityNotes('') }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Today's activities */}
          {fitness.todayActivities.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">Today&apos;s Activities</div>
              <div className="space-y-1.5">
                {fitness.todayActivities.map(a => {
                  const typeInfo = ACTIVITY_TYPES.find(t => t.id === a.activity_type)
                  return (
                    <div key={a.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                      <span className="text-sm">{typeInfo?.emoji || '🎯'}</span>
                      <span className="text-sm font-medium text-gray-900">{typeInfo?.label || a.activity_type}</span>
                      {a.duration_minutes && <span className="text-xs text-gray-500">{a.duration_minutes} min</span>}
                      {a.notes && <span className="text-xs text-gray-400 truncate">{a.notes}</span>}
                      <button onClick={() => deleteActivity(a.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Zoey's extended wellness */}
          {isZoey && (
            <div className="border-t pt-4 mt-4">
              <div className="text-sm font-semibold text-gray-700 mb-3">✨ Wellness Journal</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Steps</label>
                  <input type="number" placeholder="0" value={wellnessForm.steps}
                    onChange={e => setWellnessForm(f => ({ ...f, steps: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Water (cups)</label>
                  <input type="number" placeholder="0" value={wellnessForm.waterCups}
                    onChange={e => setWellnessForm(f => ({ ...f, waterCups: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Fasting start</label>
                  <input type="time" value={wellnessForm.fastingStart}
                    onChange={e => setWellnessForm(f => ({ ...f, fastingStart: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Fasting end</label>
                  <input type="time" value={wellnessForm.fastingEnd}
                    onChange={e => setWellnessForm(f => ({ ...f, fastingEnd: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Weight (lbs, optional — private)</label>
                  <input type="number" step="0.1" placeholder="Optional" value={wellnessForm.weight}
                    onChange={e => setWellnessForm(f => ({ ...f, weight: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button onClick={saveWellness}
                className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition text-sm">
                Save Wellness Log
              </button>

              {/* Weekly activity summary */}
              {fitness.wellness?.weeklyActivities?.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-500 mb-2">This Week&apos;s Activity</div>
                  <div className="flex gap-1">
                    {fitness.wellness.weeklyActivities.map((day: any, i: number) => {
                      const dayLabel = parseDateLocal(day.log_date).toLocaleDateString('en-US', { weekday: 'short' })
                      const height = Math.min(100, Math.max(20, (day.total_minutes || 0) / 120 * 100))
                      return (
                        <div key={i} className="flex-1 text-center">
                          <div className="h-16 flex items-end justify-center">
                            <div className="w-full bg-blue-400 rounded-t" style={{ height: `${height}%` }}
                              title={`${day.total_minutes || 0} min`} />
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">{dayLabel.slice(0, 2)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* CYCLE TRACKER — only renders if kid has cycle_settings row */}
      {/* ================================================================== */}
      {cycle && (
        <CycleSection cycle={cycle} childKey={childKey} onRefresh={loadData} postAction={postAction} />
      )}

      {/* Something's Bothering Me */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Something&apos;s Bothering Me
        </h2>

        {!showForm && !submitted ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 bg-amber-50 hover:bg-amber-100 border-2 border-dashed border-amber-300 rounded-lg text-amber-700 font-medium transition flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Tell Mom something&apos;s bothering me
          </button>
        ) : submitted ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900">Got it!</p>
            <p className="text-gray-500">Mom will see this soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4].map(step => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    formStep === step ? 'bg-amber-500 text-white' : formStep > step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>{formStep > step ? '✓' : step}</div>
                  {step < 4 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                </div>
              ))}
            </div>

            {formStep === 1 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">What&apos;s going on?</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => { setCategory(cat.id); setFormStep(2) }}
                      className={`p-3 rounded-lg border text-left text-sm font-medium transition ${category === cat.id ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-gray-700'}`}>
                      <span className="mr-2">{cat.emoji}</span>{cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">How long has this been going on?</p>
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map(dur => (
                    <button key={dur.id} onClick={() => { setDuration(dur.id); setFormStep(3) }}
                      className={`p-3 rounded-lg border text-sm font-medium transition ${duration === dur.id ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-gray-700'}`}>
                      <Clock className="w-4 h-4 inline mr-2" />{dur.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setFormStep(1)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">← Back</button>
              </div>
            )}

            {formStep === 3 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">How bad is it?</p>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITIES.map(sev => (
                    <button key={sev.id} onClick={() => { setSeverity(sev.id); setFormStep(4) }}
                      className={`p-4 rounded-lg border text-center transition ${severity === sev.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'}`}>
                      <div className="text-2xl mb-1">{sev.emoji}</div>
                      <div className="text-xs font-medium text-gray-700">{sev.label}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setFormStep(2)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">← Back</button>
              </div>
            )}

            {formStep === 4 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Want to tell me more? <span className="text-gray-400">(optional)</span></p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Anything else you want Mom to know..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" rows={3} />
                <div className="bg-gray-50 rounded-lg p-3 mt-3 text-sm">
                  <div className="font-medium text-gray-700 mb-1">Your request:</div>
                  <div className="text-gray-600">
                    {CATEGORIES.find(c => c.id === category)?.emoji} {CATEGORIES.find(c => c.id === category)?.label}
                    {' · '}{DURATIONS.find(d => d.id === duration)?.label}
                    {' · '}{SEVERITIES.find(s => s.id === severity)?.emoji} {SEVERITIES.find(s => s.id === severity)?.label}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 bg-amber-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {submitting ? 'Sending...' : 'Send to Mom'}
                  </button>
                  <button onClick={resetForm} className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition">Cancel</button>
                </div>
                <button onClick={() => setFormStep(3)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">← Back</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Past Requests */}
      {requests.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-500" />
            My Requests
          </h2>
          <div className="space-y-3">
            {requests.map(req => {
              const catInfo = CATEGORIES.find(c => c.id === req.category)
              const statusInfo = STATUS_LABELS[req.status] || STATUS_LABELS.pending
              return (
                <div key={req.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{catInfo?.emoji} {catInfo?.label || req.category}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}{SEVERITIES.find(s => s.id === req.severity)?.emoji} {SEVERITIES.find(s => s.id === req.severity)?.label}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>
                  {req.parent_response && (
                    <div className="mt-2 text-sm text-teal-700 bg-teal-50 rounded p-2">
                      <span className="font-medium">Mom says:</span> {req.parent_response}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CareCheckRow({ item, checked, onToggle }: { item: CareItem; checked: boolean; onToggle: () => void }) {
  const parsedEnd = item.end_date ? parseDateLocal(item.end_date) : null
  const endDateLabel = parsedEnd && !isNaN(parsedEnd.getTime())
    ? `Until ${parsedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : (item.end_date ? 'Ongoing' : null)
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${checked ? 'bg-gray-50/50' : 'bg-purple-50/40'}`}>
      <button onClick={onToggle} className="flex-shrink-0">
        {checked ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-gray-300" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.item_name}</div>
        <div className={`text-xs ${checked ? 'text-gray-300' : 'text-gray-500'}`}>{item.instructions}</div>
      </div>
      {endDateLabel && (
        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">{endDateLabel}</span>
      )}
    </div>
  )
}

function CycleSection({ cycle, childKey, onRefresh, postAction }: {
  cycle: any; childKey: string; onRefresh: () => void; postAction: (body: any) => Promise<void>
}) {
  const [symptomForm, setSymptomForm] = useState({ flow: '', cramps: -1, mood: '', notes: '', irregularities: [] as string[] })
  const [editingSymptoms, setEditingSymptoms] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showIrregularModal, setShowIrregularModal] = useState(false)
  const [irregForm, setIrregForm] = useState({ irregularities: [] as string[], notes: '', date: '' })

  // Onboarding state
  const [onboardStep, setOnboardStep] = useState(1)
  const [obRegularity, setObRegularity] = useState('')
  const [obLastStart, setObLastStart] = useState('')
  const [obDuration, setObDuration] = useState(0)
  const [obSymptoms, setObSymptoms] = useState<string[]>([])
  const [obComplete, setObComplete] = useState(false)

  const toDateStr = (d: any): string => {
    if (!d) return ''
    if (typeof d === 'string') return d.slice(0, 10)
    try { return new Date(d).toISOString().slice(0, 10) } catch { return '' }
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  // Pre-fill symptom form
  useEffect(() => {
    const ts = (cycle.symptoms || []).find((s: any) => toDateStr(s.log_date) === today)
    if (ts) {
      setSymptomForm({ flow: ts.flow || '', cramps: ts.cramps ?? -1, mood: ts.mood || '', notes: ts.notes || '', irregularities: ts.irregularities || [] })
    }
    // Default irregular form date
    setIrregForm(f => ({ ...f, date: today }))
  }, [cycle.symptoms, today])

  const FLOW_OPTIONS = [{ id: 'none', label: 'None' }, { id: 'light', label: 'Light' }, { id: 'medium', label: 'Medium' }, { id: 'heavy', label: 'Heavy' }]
  const CRAMP_OPTIONS = [{ value: 0, label: 'None', icon: '😌' }, { value: 1, label: 'Mild', icon: '😐' }, { value: 2, label: 'Moderate', icon: '😣' }, { value: 3, label: 'Bad day', icon: '😩' }]
  const CYCLE_MOODS = [{ id: 'great', emoji: '😊' }, { id: 'good', emoji: '🙂' }, { id: 'ok', emoji: '😐' }, { id: 'rough', emoji: '😔' }, { id: 'bad', emoji: '😢' }]
  const IRREGULARITY_OPTIONS = ['Spotting between periods', 'Heavier than usual', 'Lighter than usual', 'Longer than expected', 'Came early', 'Came late', 'Skipped a month', 'Severe cramps', 'Clotting']
  const COMMON_SYMPTOM_OPTIONS = ['Cramps', 'Mood changes', 'Fatigue', 'Headaches', 'Bloating', 'Nothing much', 'Not sure yet']
  const FAQ = [
    { q: 'What is a period?', a: 'A period is when your body sheds the lining of your uterus each month. It usually means some bleeding for a few days. It\'s a normal part of growing up.' },
    { q: 'How often does it happen?', a: 'Most people get their period every 28 to 35 days, but it can be different for everyone. It often takes a while for your cycle to become regular.' },
    { q: 'What\'s normal to feel?', a: 'Cramps, mood changes, feeling tired, and bloating are all very common. Everyone experiences it a little differently, and that\'s totally normal.' },
  ]

  // ── Onboarding Flow ──
  if (cycle.mode === 'full' && !cycle.onboarded) {
    const handleSkip = async () => {
      try { await postAction({ action: 'skip_cycle_onboarding', child: childKey }); onRefresh() } catch {}
    }
    const handleComplete = async () => {
      try {
        await postAction({
          action: 'complete_cycle_onboarding', child: childKey,
          regularity: obRegularity || 'unknown',
          lastPeriodStart: obLastStart || null,
          periodDuration: obDuration || 5,
          commonSymptoms: obSymptoms,
        })
        setObComplete(true)
      } catch {}
    }
    const handleGoToCycle = () => { onRefresh() }

    if (obComplete) {
      return (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-rose-100 text-center">
          <div className="text-3xl mb-3">🌸</div>
          <p className="font-semibold text-gray-900 mb-2">You&apos;re all set.</p>
          <p className="text-sm text-gray-600 mb-4">Your cycle info is private to you. Mom can see patterns to help you stay healthy, but your personal notes are yours.</p>
          <button onClick={handleGoToCycle} className="px-6 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition">Go to My Cycle</button>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-rose-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">🌸 My Cycle</h2>
        <div className="text-xs text-gray-400 mb-4">Step {onboardStep} of 5</div>
        <div className="flex gap-1 mb-4">{[1,2,3,4,5].map(s => <div key={s} className={`h-1 flex-1 rounded ${s <= onboardStep ? 'bg-rose-400' : 'bg-gray-200'}`} />)}</div>

        {onboardStep === 1 && (
          <div>
            <p className="text-sm text-gray-700 mb-4">Have you started your period yet?</p>
            <div className="flex gap-3">
              <button onClick={() => setOnboardStep(2)} className="flex-1 py-3 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition">Yes, I have</button>
              <button onClick={handleSkip} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition">Not yet</button>
            </div>
          </div>
        )}

        {onboardStep === 2 && (
          <div>
            <p className="text-sm text-gray-700 mb-4">About how often does your period come?</p>
            <div className="space-y-2">
              {[{ v: 'regular', l: 'Every 3\u20134 weeks' }, { v: 'varies', l: 'It varies a lot' }, { v: 'unknown', l: 'I\'m not sure yet' }].map(o => (
                <button key={o.v} onClick={() => { setObRegularity(o.v); setOnboardStep(3) }}
                  className={`w-full py-3 rounded-lg border text-sm font-medium transition ${obRegularity === o.v ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 hover:border-rose-300 text-gray-700'}`}>{o.l}</button>
              ))}
            </div>
          </div>
        )}

        {onboardStep === 3 && (
          <div>
            <p className="text-sm text-gray-700 mb-2">When did your last period start?</p>
            <p className="text-xs text-gray-400 mb-3">Approximate is fine — just your best guess</p>
            <input type="date" value={obLastStart} max={today}
              onChange={e => setObLastStart(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setOnboardStep(4)} className="flex-1 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition text-sm">Next</button>
              <button onClick={() => { setObLastStart(''); setOnboardStep(4) }} className="px-4 py-2 text-gray-500 text-sm">Skip</button>
            </div>
            <button onClick={() => setOnboardStep(2)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">&larr; Back</button>
          </div>
        )}

        {onboardStep === 4 && (
          <div>
            <p className="text-sm text-gray-700 mb-4">How long does it usually last?</p>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: 3, l: '3\u20134 days' }, { v: 5, l: '5\u20136 days' }, { v: 7, l: '7+ days' }, { v: 0, l: 'Not sure' }].map(o => (
                <button key={o.v} onClick={() => { setObDuration(o.v); setOnboardStep(5) }}
                  className={`py-3 rounded-lg border text-sm font-medium transition ${obDuration === o.v ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 hover:border-rose-300 text-gray-700'}`}>{o.l}</button>
              ))}
            </div>
            <button onClick={() => setOnboardStep(3)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">&larr; Back</button>
          </div>
        )}

        {onboardStep === 5 && (
          <div>
            <p className="text-sm text-gray-700 mb-3">What usually bothers you most? (pick all that apply)</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {COMMON_SYMPTOM_OPTIONS.map(s => (
                <button key={s} onClick={() => setObSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition ${obSymptoms.includes(s) ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 hover:border-rose-300 text-gray-600'}`}>{s}</button>
              ))}
            </div>
            <button onClick={handleComplete} className="w-full py-3 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition">Done</button>
            <button onClick={() => setOnboardStep(4)} className="mt-2 text-xs text-gray-400 hover:text-gray-600 block">&larr; Back</button>
          </div>
        )}
      </div>
    )
  }

  // ── Learning Mode ──
  if (cycle.mode === 'learning') {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-rose-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3">🌸 My Cycle</h2>
        <p className="text-sm text-gray-600 mb-4">Your body goes through a monthly cycle. As you get older, this section will help you track and understand it.</p>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="border border-rose-100 rounded-lg">
              <button onClick={() => setExpanded(expanded === `faq-${i}` ? null : `faq-${i}`)}
                className="w-full flex items-center justify-between p-3 text-left text-sm font-medium text-gray-700 hover:bg-rose-50 rounded-lg transition">
                {item.q}
                <ChevronRight className={`w-4 h-4 text-gray-400 transition ${expanded === `faq-${i}` ? 'rotate-90' : ''}`} />
              </button>
              {expanded === `faq-${i}` && <p className="px-3 pb-3 text-sm text-gray-600">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Full Mode ──
  const log = (cycle.log || []).map((e: any) => ({ ...e, event_date: toDateStr(e.event_date) })).filter((e: any) => e.event_date)

  const lastStart = log.find((e: any) => e.event_type === 'start')
  const lastEnd = log.find((e: any) => e.event_type === 'end')
  const periodActive = !!(lastStart && (!lastEnd || lastStart.event_date > lastEnd.event_date))
  const periodStartDate = periodActive && lastStart ? parseDateLocal(lastStart.event_date) : null
  const dayOfPeriod = periodStartDate ? Math.floor((parseDateLocal(today).getTime() - periodStartDate.getTime()) / 86400000) + 1 : 0

  const startDatesSorted = log.filter((e: any) => e.event_type === 'start').map((e: any) => e.event_date).sort()
  const uniqueStartDates = Array.from(new Set(startDatesSorted)) as string[]
  const lastStartDate = uniqueStartDates.length > 0 ? uniqueStartDates[uniqueStartDates.length - 1] : null
  let estimatedNext: string | null = null
  let avgCycleLength: number | null = null

  if (uniqueStartDates.length >= 2) {
    let totalDays = 0
    for (let i = 1; i < uniqueStartDates.length; i++) {
      totalDays += (parseDateLocal(uniqueStartDates[i]).getTime() - parseDateLocal(uniqueStartDates[i - 1]).getTime()) / 86400000
    }
    avgCycleLength = Math.round(totalDays / (uniqueStartDates.length - 1))
    if (lastStartDate && avgCycleLength > 0) {
      const next = parseDateLocal(lastStartDate); next.setDate(next.getDate() + avgCycleLength); estimatedNext = next.toISOString().slice(0, 10)
    } else if (lastStartDate) {
      const next = parseDateLocal(lastStartDate); next.setDate(next.getDate() + 28); estimatedNext = next.toISOString().slice(0, 10)
    }
  } else if (lastStartDate) {
    const next = parseDateLocal(lastStartDate); next.setDate(next.getDate() + 28); estimatedNext = next.toISOString().slice(0, 10)
  }

  const nearEstimated = estimatedNext && !periodActive ? Math.abs((parseDateLocal(estimatedNext).getTime() - parseDateLocal(today).getTime()) / 86400000) <= 2 : false
  const showCheckin = periodActive || nearEstimated
  const todaySymptom = (cycle.symptoms || []).find((s: any) => toDateStr(s.log_date) === today)
  const startEntries = log.filter((e: any) => e.event_type === 'start').slice(0, 6)
  const endEntries = log.filter((e: any) => e.event_type === 'end')

  const handleLogEvent = async (eventType: string) => {
    try { await postAction({ action: 'log_cycle_event', child: childKey, eventType }); onRefresh() } catch (err) { console.error('Failed to log cycle event:', err) }
  }
  const handleSaveSymptoms = async () => {
    try {
      await postAction({
        action: 'log_cycle_symptoms', child: childKey,
        mood: symptomForm.mood || null, cramps: symptomForm.cramps >= 0 ? symptomForm.cramps : null,
        flow: symptomForm.flow || null, notes: symptomForm.notes.trim() || null,
        irregularities: symptomForm.irregularities.length > 0 ? symptomForm.irregularities : [],
      })
      setEditingSymptoms(false); onRefresh()
    } catch (err) { console.error('Failed to save symptoms:', err) }
  }
  const handleSaveIrregular = async () => {
    try {
      await postAction({
        action: 'log_cycle_symptoms', child: childKey,
        irregularities: irregForm.irregularities, notes: irregForm.notes.trim() || null,
        logDate: irregForm.date || today,
      })
      setShowIrregularModal(false); setIrregForm({ irregularities: [], notes: '', date: today }); onRefresh()
    } catch (err) { console.error('Failed to log irregular:', err) }
  }

  const toggleIrreg = (item: string, arr: string[], setArr: (v: string[]) => void) => {
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  return (
    <div className="space-y-4">
      {/* Card 1: Cycle Status */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-rose-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">🌸 My Cycle</h2>
        {periodActive && lastStart ? (
          <div>
            <div className="text-sm text-gray-700 mb-3">
              <span className="font-semibold text-rose-600">Day {dayOfPeriod}</span> of your current period
              <span className="text-xs text-gray-500 ml-2">(started {parseDateLocal(lastStart.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
            </div>
            <button onClick={() => handleLogEvent('end')} className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-200 transition">End Period</button>
          </div>
        ) : (
          <div>
            {lastStartDate && <div className="text-sm text-gray-600 mb-1">Last period: {parseDateLocal(lastStartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>}
            {estimatedNext && uniqueStartDates.length >= 2 ? (
              <div className="text-sm text-gray-600 mb-3">Estimated next: <span className="font-medium text-rose-600">{parseDateLocal(estimatedNext).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span></div>
            ) : uniqueStartDates.length < 2 ? <div className="text-xs text-gray-400 mb-3">Keep tracking to see your pattern</div> : null}
            <button onClick={() => handleLogEvent('start')} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition">Start Period</button>
          </div>
        )}
        {/* Log something irregular button — always visible */}
        <button onClick={() => setShowIrregularModal(true)}
          className="mt-3 text-xs text-rose-500 hover:text-rose-600 font-medium block">Log something irregular</button>
      </div>

      {/* Irregular logging modal */}
      {showIrregularModal && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-rose-200">
          <h3 className="font-bold text-gray-900 mb-3">Log Something Irregular</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {IRREGULARITY_OPTIONS.map(item => (
              <button key={item} onClick={() => toggleIrreg(item, irregForm.irregularities, v => setIrregForm(f => ({ ...f, irregularities: v })))}
                className={`px-2.5 py-1 rounded-full border text-xs font-medium transition ${irregForm.irregularities.includes(item) ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 hover:border-rose-300 text-gray-600'}`}>{item}</button>
            ))}
          </div>
          <input type="date" value={irregForm.date} onChange={e => setIrregForm(f => ({ ...f, date: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 mb-2" />
          <textarea value={irregForm.notes} onChange={e => setIrregForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes (optional)" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none mb-3" />
          <div className="flex gap-2">
            <button onClick={handleSaveIrregular} disabled={irregForm.irregularities.length === 0}
              className="flex-1 bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600 transition disabled:opacity-50 text-sm">Save</button>
            <button onClick={() => setShowIrregularModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Card 2: Today's Check-in */}
      {showCheckin && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-rose-100">
          <h3 className="font-bold text-gray-900 mb-3">Today&apos;s Check-in</h3>
          {todaySymptom && !editingSymptoms ? (
            <div>
              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                {todaySymptom.flow && <div className="bg-rose-50 rounded p-2 text-center"><div className="text-xs text-gray-500">Flow</div><div className="capitalize font-medium">{todaySymptom.flow}</div></div>}
                {todaySymptom.cramps !== null && todaySymptom.cramps !== undefined && <div className="bg-rose-50 rounded p-2 text-center"><div className="text-xs text-gray-500">Cramps</div><div>{CRAMP_OPTIONS[todaySymptom.cramps]?.icon} {CRAMP_OPTIONS[todaySymptom.cramps]?.label}</div></div>}
                {todaySymptom.mood && <div className="bg-rose-50 rounded p-2 text-center"><div className="text-xs text-gray-500">Mood</div><div>{CYCLE_MOODS.find(m => m.id === todaySymptom.mood)?.emoji}</div></div>}
              </div>
              {todaySymptom.notes && <p className="text-sm text-gray-500 mb-2">{todaySymptom.notes}</p>}
              {todaySymptom.irregularities?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{todaySymptom.irregularities.map((ir: string) => <span key={ir} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{ir}</span>)}</div>}
              <button onClick={() => setEditingSymptoms(true)} className="text-xs text-rose-600 hover:text-rose-700 font-medium">Edit</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div><div className="text-xs font-medium text-gray-600 mb-1">Flow</div><div className="flex gap-1.5">{FLOW_OPTIONS.map(f => <button key={f.id} onClick={() => setSymptomForm(s => ({ ...s, flow: f.id }))} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${symptomForm.flow === f.id ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 hover:border-rose-300 text-gray-600'}`}>{f.label}</button>)}</div></div>
              <div><div className="text-xs font-medium text-gray-600 mb-1">Cramps</div><div className="flex gap-1.5">{CRAMP_OPTIONS.map(c => <button key={c.value} onClick={() => setSymptomForm(s => ({ ...s, cramps: c.value }))} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${symptomForm.cramps === c.value ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 hover:border-rose-300 text-gray-600'}`}>{c.icon} {c.label}</button>)}</div></div>
              <div><div className="text-xs font-medium text-gray-600 mb-1">Mood</div><div className="flex gap-1.5">{CYCLE_MOODS.map(m => <button key={m.id} onClick={() => setSymptomForm(s => ({ ...s, mood: m.id }))} className={`flex-1 py-2 rounded-lg border text-center transition ${symptomForm.mood === m.id ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-rose-300'}`}>{m.emoji}</button>)}</div></div>
              <textarea value={symptomForm.notes} onChange={e => setSymptomForm(s => ({ ...s, notes: e.target.value }))} placeholder="Notes (optional)" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none" />
              {/* Irregularities in check-in */}
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">Anything unusual?</div>
                <div className="flex flex-wrap gap-1.5">
                  {IRREGULARITY_OPTIONS.map(item => (
                    <button key={item} onClick={() => toggleIrreg(item, symptomForm.irregularities, v => setSymptomForm(s => ({ ...s, irregularities: v })))}
                      className={`px-2.5 py-1 rounded-full border text-xs font-medium transition ${symptomForm.irregularities.includes(item) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-amber-300 text-gray-600'}`}>{item}</button>
                  ))}
                </div>
              </div>
              <button onClick={handleSaveSymptoms} className="w-full bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600 transition text-sm">Save Check-in</button>
            </div>
          )}
        </div>
      )}

      {/* Card 3: History */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-rose-100">
        <h3 className="font-bold text-gray-900 mb-3">My History</h3>
        {(() => {
          const periodDays = new Set<string>()
          const starts = log.filter((e: any) => e.event_type === 'start').sort((a: any, b: any) => a.event_date.localeCompare(b.event_date))
          const ends = log.filter((e: any) => e.event_type === 'end').sort((a: any, b: any) => a.event_date.localeCompare(b.event_date))
          starts.forEach((s: any) => {
            const matchingEnd = ends.find((e: any) => e.event_date >= s.event_date)
            const endDate = matchingEnd ? matchingEnd.event_date : (periodActive && lastStart && s.event_date === lastStart.event_date ? today : s.event_date)
            const start = parseDateLocal(s.event_date); const end = parseDateLocal(endDate)
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { periodDays.add(d.toISOString().slice(0, 10)) }
          })
          const months: { label: string; days: string[] }[] = []
          const now = parseDateLocal(today)
          for (let m = 5; m >= 0; m--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1)
            const label = monthDate.toLocaleDateString('en-US', { month: 'short' })
            const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
            const days: string[] = []; for (let d = 1; d <= daysInMonth; d++) { days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d).toISOString().slice(0, 10)) }
            months.push({ label, days })
          }
          return (<div className="mb-4 overflow-x-auto"><div className="flex gap-3 min-w-0">{months.map((month, i) => (<div key={i} className="flex-shrink-0"><div className="text-[10px] text-gray-400 mb-1 text-center">{month.label}</div><div className="flex flex-wrap gap-0.5" style={{ width: '60px' }}>{month.days.map(day => (<div key={day} className={`w-1.5 h-1.5 rounded-full ${periodDays.has(day) ? 'bg-rose-400' : 'bg-gray-100'}`} title={day} />))}</div></div>))}</div></div>)
        })()}
        {startEntries.length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {startEntries.slice(0, 3).map((s: any, i: number) => {
              const matchEnd = endEntries.find((e: any) => e.event_date >= s.event_date && e.event_date <= new Date(parseDateLocal(s.event_date).getTime() + 15 * 86400000).toISOString().slice(0, 10))
              const duration = matchEnd ? Math.floor((parseDateLocal(matchEnd.event_date).getTime() - parseDateLocal(s.event_date).getTime()) / 86400000) + 1 : null
              return (<div key={i} className="text-sm text-gray-600">Started {parseDateLocal(s.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{duration && <span className="text-gray-400">, lasted {duration} days</span>}</div>)
            })}
          </div>
        ) : <p className="text-sm text-gray-400 mb-3">No cycles logged yet.</p>}
        {avgCycleLength ? <div className="text-sm font-medium text-rose-600">Your average cycle: {avgCycleLength} days</div>
          : startEntries.length < 2 ? <div className="text-xs text-gray-400">Keep tracking — your history will build here over time</div> : null}
      </div>
    </div>
  )
}

function DentalCheckRow({ item, onToggle }: { item: DentalItem; onToggle: () => void }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${item.completed ? 'bg-gray-50/50' : 'bg-cyan-50/40'}`}>
      <button onClick={onToggle} className="flex-shrink-0">
        {item.completed ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-gray-300" />}
      </button>
      <span className={`text-sm font-medium ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
        {item.item_name}
      </span>
    </div>
  )
}
