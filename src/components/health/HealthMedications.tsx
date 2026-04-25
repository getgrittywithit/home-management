'use client'

import { useState } from 'react'
import {
  Building2, Plus, Edit2, Trash2, Pill, Clock,
  Stethoscope, RefreshCw, AlertTriangle, ArrowRight, Eye, EyeOff
} from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Medication {
  id: string
  family_member_name: string
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

interface HealthMedicationsProps {
  memberGroup: 'parents' | 'kids'
  medications: Medication[]
  familyMembers: string[]
  onReload: () => void
  onError: (msg: string) => void
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HealthMedications({
  memberGroup, medications, familyMembers,
  onReload, onError,
}: HealthMedicationsProps) {
  const themeColor = memberGroup === 'parents' ? 'blue' : 'teal'

  const [showAddMedication, setShowAddMedication] = useState(false)
  const [editingMedication, setEditingMedication] = useState<string | null>(null)
  const [medFilter, setMedFilter] = useState<'active' | 'all'>('active')
  const [medicationForm, setMedicationForm] = useState<Partial<Medication>>({
    family_member_name: '', medication_name: '', dosage: '', frequency: '',
    prescribing_doctor: '', pharmacy: '', start_date: '', end_date: '',
    refill_date: '', refills_remaining: undefined, purpose: '', side_effects: '',
    is_active: true, notes: ''
  })

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isPastDue = (dateStr: string) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  const getDaysUntil = (dateStr: string) => {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  }

  const filteredMedications = medications.filter(m => medFilter === 'active' ? m.is_active : true)

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
    setMedicationForm({
      family_member_name: '', medication_name: '', dosage: '', frequency: '',
      prescribing_doctor: '', pharmacy: '', start_date: '', end_date: '',
      refill_date: '', refills_remaining: undefined, purpose: '', side_effects: '',
      is_active: true, notes: ''
    })
    setShowAddMedication(false)
    setEditingMedication(null)
  }

  const startEdit = (med: Medication) => {
    setEditingMedication(med.id)
    setMedicationForm({
      ...med,
      start_date: med.start_date ? med.start_date.split('T')[0] : '',
      end_date: med.end_date ? med.end_date.split('T')[0] : '',
      refill_date: med.refill_date ? med.refill_date.split('T')[0] : ''
    })
    setShowAddMedication(true)
  }

  const handleSave = async () => {
    if (!medicationForm.family_member_name?.trim() || !medicationForm.medication_name?.trim()) return
    if (editingMedication) {
      await apiCall('update_medication', { id: editingMedication, ...medicationForm })
    } else {
      await apiCall('add_medication', medicationForm)
    }
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medication?')) return
    await apiCall('delete_medication', { id })
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await apiCall('toggle_medication_active', { id, is_active: !currentActive })
  }

  return (
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
            onClick={() => { resetForm(); setShowAddMedication(!showAddMedication) }}
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
            onSave={handleSave}
            onCancel={resetForm}
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
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-3.5 h-3.5" />
                          {med.prescribing_doctor ? (
                            <span>{med.prescribing_doctor}</span>
                          ) : (
                            // P1-C: actively prompt Lola to fill in real prescriber
                            // when the field is null (after the Sarah Chen scrub)
                            <button
                              type="button"
                              onClick={() => startEdit(med)}
                              className="text-xs text-gray-400 hover:text-gray-600 underline decoration-dotted"
                            >
                              + Add prescriber
                            </button>
                          )}
                        </div>
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
                        onClick={() => handleToggleActive(med.id, med.is_active)}
                        className={`p-2 rounded-lg transition ${
                          med.is_active ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-green-100 text-green-600'
                        }`}
                        title={med.is_active ? 'Mark Discontinued' : 'Mark Active'}
                      >
                        {med.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => startEdit(med)} className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(med.id)} className="p-2 hover:bg-red-100 rounded-lg transition text-red-600" title="Delete">
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
// MEDICATION FORM
// ============================================================================

function MedicationForm({ form, setForm, onSave, onCancel, isEditing, themeColor, familyMembers }: {
  form: Partial<Medication>; setForm: (f: Partial<Medication>) => void
  onSave: () => void; onCancel: () => void; isEditing: boolean; themeColor: string; familyMembers: string[]
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
