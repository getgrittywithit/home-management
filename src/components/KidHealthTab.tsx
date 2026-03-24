'use client'

import { useState, useEffect } from 'react'
import {
  Heart, Stethoscope, Building2, Calendar, Clock,
  ChevronRight, CheckCircle, AlertCircle, Loader2, Send
} from 'lucide-react'

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

interface KidHealthTabProps {
  childName: string
}

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

export default function KidHealthTab({ childName }: KidHealthTabProps) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [requests, setRequests] = useState<HealthRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [category, setCategory] = useState('')
  const [duration, setDuration] = useState('')
  const [severity, setSeverity] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const childKey = childName.toLowerCase()

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
    } catch (err) {
      console.error('Failed to load health data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/kids/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_health_request',
          child: childKey,
          category,
          duration,
          severity,
          notes: notes.trim() || null,
        }),
      })
      setSubmitted(true)
      setTimeout(() => {
        resetForm()
        loadData()
      }, 2500)
    } catch (err) {
      console.error('Failed to submit request:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setFormStep(1)
    setCategory('')
    setDuration('')
    setSeverity('')
    setNotes('')
    setSubmitted(false)
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
                        Next visit: {new Date(nextApt.appointment_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

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
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4].map(step => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    formStep === step ? 'bg-amber-500 text-white' :
                    formStep > step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {formStep > step ? '✓' : step}
                  </div>
                  {step < 4 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                </div>
              ))}
            </div>

            {/* Step 1: Category */}
            {formStep === 1 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">What&apos;s going on?</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategory(cat.id); setFormStep(2) }}
                      className={`p-3 rounded-lg border text-left text-sm font-medium transition ${
                        category === cat.id
                          ? 'border-amber-500 bg-amber-50 text-amber-800'
                          : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-gray-700'
                      }`}
                    >
                      <span className="mr-2">{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Duration */}
            {formStep === 2 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">How long has this been going on?</p>
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map(dur => (
                    <button
                      key={dur.id}
                      onClick={() => { setDuration(dur.id); setFormStep(3) }}
                      className={`p-3 rounded-lg border text-sm font-medium transition ${
                        duration === dur.id
                          ? 'border-amber-500 bg-amber-50 text-amber-800'
                          : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-gray-700'
                      }`}
                    >
                      <Clock className="w-4 h-4 inline mr-2" />
                      {dur.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setFormStep(1)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
              </div>
            )}

            {/* Step 3: Severity */}
            {formStep === 3 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">How bad is it?</p>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITIES.map(sev => (
                    <button
                      key={sev.id}
                      onClick={() => { setSeverity(sev.id); setFormStep(4) }}
                      className={`p-4 rounded-lg border text-center transition ${
                        severity === sev.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{sev.emoji}</div>
                      <div className="text-xs font-medium text-gray-700">{sev.label}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setFormStep(2)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
              </div>
            )}

            {/* Step 4: Notes + Submit */}
            {formStep === 4 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Want to tell me more? <span className="text-gray-400">(optional)</span></p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anything else you want Mom to know..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  rows={3}
                />

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-3 mt-3 text-sm">
                  <div className="font-medium text-gray-700 mb-1">Your request:</div>
                  <div className="text-gray-600">
                    {CATEGORIES.find(c => c.id === category)?.emoji} {CATEGORIES.find(c => c.id === category)?.label}
                    {' · '}
                    {DURATIONS.find(d => d.id === duration)?.label}
                    {' · '}
                    {SEVERITIES.find(s => s.id === severity)?.emoji} {SEVERITIES.find(s => s.id === severity)?.label}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-amber-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {submitting ? 'Sending...' : 'Send to Mom'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
                <button onClick={() => setFormStep(3)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
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
                      <div className="font-medium text-gray-900">
                        {catInfo?.emoji} {catInfo?.label || req.category}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {SEVERITIES.find(s => s.id === req.severity)?.emoji} {SEVERITIES.find(s => s.id === req.severity)?.label}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
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
