'use client'

import { useState } from 'react'
import {
  Calendar, Plus, Edit2, Trash2, Clock, Stethoscope,
  MapPin, DollarSign, CheckCircle
} from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Appointment {
  id: string
  family_member_name: string
  provider_name?: string
  appointment_type: string
  appointment_date: string
  location?: string
  reason?: string
  status: string
  notes?: string
  copay_amount?: string
  referral_needed?: boolean
  referral_status?: string
  member_group?: string
}

interface HealthAppointmentsProps {
  memberGroup: 'parents' | 'kids'
  appointments: Appointment[]
  familyMembers: string[]
  providers: Array<{ id: string; name: string; specialty?: string }>
  onReload: () => void
  onError: (msg: string) => void
}

// ============================================================================
// LABEL & COLOR MAPS
// ============================================================================

const appointmentTypeLabels: Record<string, string> = {
  checkup: 'Checkup', specialist: 'Specialist', dental: 'Dental',
  vision: 'Vision', therapy: 'Therapy', lab_work: 'Lab Work',
  vaccination: 'Vaccination', other: 'Other'
}

const appointmentTypeColors: Record<string, string> = {
  checkup: 'bg-blue-100 text-blue-800', specialist: 'bg-purple-100 text-purple-800',
  dental: 'bg-cyan-100 text-cyan-800', vision: 'bg-indigo-100 text-indigo-800',
  therapy: 'bg-pink-100 text-pink-800', lab_work: 'bg-amber-100 text-amber-800',
  vaccination: 'bg-green-100 text-green-800', other: 'bg-gray-100 text-gray-800'
}

const statusLabels: Record<string, string> = {
  scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show'
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500', no_show: 'bg-red-100 text-red-800'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })
}

const isUpcoming = (dateStr: string) => {
  if (!dateStr) return false
  return new Date(dateStr) >= new Date()
}

const getDaysUntil = (dateStr: string) => {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HealthAppointments({
  memberGroup, appointments, familyMembers, providers,
  onReload, onError,
}: HealthAppointmentsProps) {
  const themeColor = memberGroup === 'parents' ? 'blue' : 'teal'

  const [showAddAppointment, setShowAddAppointment] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null)
  const [apptFilter, setApptFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [appointmentForm, setAppointmentForm] = useState<Partial<Appointment>>({
    family_member_name: '', provider_name: '', appointment_type: 'checkup',
    appointment_date: '', location: '', reason: '', status: 'scheduled',
    notes: '', copay_amount: '', referral_needed: false, referral_status: ''
  })

  const filteredAppointments = appointments.filter(a => {
    if (apptFilter === 'upcoming') return a.status === 'scheduled' && isUpcoming(a.appointment_date)
    if (apptFilter === 'past') return !isUpcoming(a.appointment_date) || a.status !== 'scheduled'
    return true
  })

  const apiCall = async (action: string, data: any) => {
    try {
      const res = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data: { ...data, member_group: memberGroup } }),
      })
      if (!res.ok) throw new Error('Failed')
      onReload()
      return true
    } catch {
      onError(`Failed to ${action.replace(/_/g, ' ')}`)
      return false
    }
  }

  const resetForm = () => {
    setAppointmentForm({
      family_member_name: '', provider_name: '', appointment_type: 'checkup',
      appointment_date: '', location: '', reason: '', status: 'scheduled',
      notes: '', copay_amount: '', referral_needed: false, referral_status: ''
    })
    setShowAddAppointment(false)
    setEditingAppointment(null)
  }

  const startEdit = (appt: Appointment) => {
    setEditingAppointment(appt.id)
    setAppointmentForm({
      ...appt,
      appointment_date: appt.appointment_date ? appt.appointment_date.slice(0, 16) : ''
    })
    setShowAddAppointment(true)
  }

  const handleSave = async () => {
    if (!appointmentForm.family_member_name?.trim() || !appointmentForm.appointment_date?.trim()) return
    if (editingAppointment) {
      await apiCall('update_appointment', { id: editingAppointment, ...appointmentForm })
    } else {
      await apiCall('add_appointment', appointmentForm)
    }
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return
    await apiCall('delete_appointment', { id })
  }

  const handleMarkCompleted = async (id: string) => {
    await apiCall('update_appointment', { id, status: 'completed' })
  }

  // Stats
  const upcomingCount = appointments.filter(a => a.status === 'scheduled' && isUpcoming(a.appointment_date)).length
  const completedCount = appointments.filter(a => a.status === 'completed').length
  const needReferralCount = appointments.filter(a => a.referral_needed && a.referral_status !== 'approved').length

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-blue-600">{upcomingCount}</p>
          <p className="text-xs text-gray-600 mt-1">Upcoming</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          <p className="text-xs text-gray-600 mt-1">Completed</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-amber-600">{needReferralCount}</p>
          <p className="text-xs text-gray-600 mt-1">Need Referral</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-gray-600">{appointments.length}</p>
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
            onClick={() => { resetForm(); setShowAddAppointment(!showAddAppointment) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              showAddAppointment
                ? `bg-${themeColor}-100 text-${themeColor}-700`
                : `bg-${themeColor}-500 text-white hover:bg-${themeColor}-600`
            }`}
          >
            <Plus className="w-4 h-4" />
            {showAddAppointment ? 'Cancel' : 'Add Appointment'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(['upcoming', 'past', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setApptFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                apptFilter === f
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
            onSave={handleSave}
            onCancel={resetForm}
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
              {apptFilter === 'upcoming'
                ? 'No upcoming appointments. Click "Add Appointment" to schedule one.'
                : apptFilter === 'past'
                ? 'No past appointments found.'
                : 'No appointments found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map(appt => {
              const daysUntil = getDaysUntil(appt.appointment_date)
              return (
                <div key={appt.id} className={`border rounded-lg p-4 transition ${
                  appt.status === 'cancelled' ? 'opacity-60 bg-gray-50' : 'hover:bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{appt.family_member_name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          appointmentTypeColors[appt.appointment_type] || appointmentTypeColors.other
                        }`}>
                          {appointmentTypeLabels[appt.appointment_type] || appt.appointment_type}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          statusColors[appt.status] || statusColors.scheduled
                        }`}>
                          {statusLabels[appt.status] || appt.status}
                        </span>
                        {appt.referral_needed && (
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            appt.referral_status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : appt.referral_status === 'denied'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            Referral: {appt.referral_status || 'Pending'}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDateTime(appt.appointment_date)}</span>
                          {daysUntil !== null && isUpcoming(appt.appointment_date) && appt.status === 'scheduled' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                              daysUntil <= 1 ? 'bg-red-100 text-red-800'
                              : daysUntil <= 7 ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                            }`}>
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil}d`}
                            </span>
                          )}
                        </div>
                        {appt.provider_name && (
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>{appt.provider_name}</span>
                          </div>
                        )}
                        {appt.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{appt.location}</span>
                          </div>
                        )}
                        {appt.copay_amount && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Copay: ${appt.copay_amount}</span>
                          </div>
                        )}
                        {appt.reason && (
                          <div className="flex items-center gap-2 md:col-span-2">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Reason: {appt.reason}</span>
                          </div>
                        )}
                      </div>

                      {appt.notes && <p className="text-sm text-gray-500 italic mt-2">{appt.notes}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                      {appt.status === 'scheduled' && (
                        <button
                          onClick={() => handleMarkCompleted(appt.id)}
                          className="p-2 hover:bg-green-100 rounded-lg transition text-green-600"
                          title="Mark Completed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => startEdit(appt)} className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(appt.id)} className="p-2 hover:bg-red-100 rounded-lg transition text-red-600" title="Delete">
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
  )
}

// ============================================================================
// APPOINTMENT FORM
// ============================================================================

function AppointmentForm({ form, setForm, onSave, onCancel, isEditing, themeColor, familyMembers, providers }: {
  form: Partial<Appointment>; setForm: (f: Partial<Appointment>) => void
  onSave: () => void; onCancel: () => void; isEditing: boolean; themeColor: string
  familyMembers: string[]; providers: Array<{ id: string; name: string; specialty?: string }>
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        <select value={form.appointment_type || 'checkup'}
          onChange={(e) => setForm({ ...form, appointment_type: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="checkup">Checkup</option>
          <option value="specialist">Specialist</option>
          <option value="dental">Dental</option>
          <option value="vision">Vision</option>
          <option value="therapy">Therapy</option>
          <option value="lab_work">Lab Work</option>
          <option value="vaccination">Vaccination</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Date & Time *</label>
          <input type="datetime-local" value={form.appointment_date || ''}
            onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {providers.length > 0 ? (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Provider</label>
            <select value={form.provider_name || ''}
              onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Select Provider</option>
              {providers.map(p => (
                <option key={p.id} value={p.name}>
                  {p.name}{p.specialty ? ` (${p.specialty})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Provider</label>
            <input type="text" placeholder="Provider Name" value={form.provider_name || ''}
              onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input type="text" placeholder="Location" value={form.location || ''}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="Reason for Visit" value={form.reason || ''}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input type="text" placeholder="Copay Amount" value={form.copay_amount || ''}
          onChange={(e) => setForm({ ...form, copay_amount: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={form.status || 'scheduled'}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.referral_needed || false}
              onChange={(e) => setForm({ ...form, referral_needed: e.target.checked, referral_status: e.target.checked ? (form.referral_status || 'pending') : '' })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Referral Needed
          </label>
        </div>
      </div>
      {form.referral_needed && (
        <select value={form.referral_status || 'pending'}
          onChange={(e) => setForm({ ...form, referral_status: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="pending">Referral Pending</option>
          <option value="submitted">Referral Submitted</option>
          <option value="approved">Referral Approved</option>
          <option value="denied">Referral Denied</option>
        </select>
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
