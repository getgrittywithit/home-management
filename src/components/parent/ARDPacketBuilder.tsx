'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Download, Save, Loader2, Plus, X, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Calendar, ClipboardList,
} from 'lucide-react'

type PacketPreview = {
  iep_goals: any[]
  attendance: { rate: number; present: number; absent: number; sick_days: number }
  academics: { elar_mastered: number; elar_total: number; math_mastered: number; math_total: number }
  behavioral: { avg_mood: string | null; break_count: number; behavior_events: any[] }
  health: { medications: any[] }
  accommodations: { active: any[] }
}

type SavedPacket = {
  id: string; kid_name: string; meeting_date: string | null
  meeting_type: string | null; status: string; created_at: string
  date_range_start: string; date_range_end: string
}

const KIDS_WITH_IEP = [
  { name: 'Amos', plan: 'IEP' },
  { name: 'Zoey', plan: '504' },
  { name: 'Kaylee', plan: 'IEP' },
  { name: 'Ellie', plan: '504' },
  { name: 'Wyatt', plan: 'IEP (speech)' },
  { name: 'Hannah', plan: '504 + speech IEP' },
]

const MEETING_TYPES = [
  { value: 'annual', label: 'Annual Review' },
  { value: 'review', label: 'Progress Review' },
  { value: 'amendment', label: 'Amendment' },
  { value: 'initial', label: 'Initial Evaluation' },
  { value: 'transition', label: 'Transition Meeting' },
]

function today() { return new Date().toLocaleDateString('en-CA') }
function threeMonthsAgo() { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toLocaleDateString('en-CA') }

export default function ARDPacketBuilder() {
  const [kidName, setKidName] = useState('amos')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingType, setMeetingType] = useState('annual')
  const [startDate, setStartDate] = useState(threeMonthsAgo())
  const [endDate, setEndDate] = useState(today())
  const [preview, setPreview] = useState<PacketPreview | null>(null)
  const [parentNotes, setParentNotes] = useState('')
  const [concerns, setConcerns] = useState<string[]>([])
  const [requestedChanges, setRequestedChanges] = useState<string[]>([])
  const [newConcern, setNewConcern] = useState('')
  const [newRequest, setNewRequest] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedPackets, setSavedPackets] = useState<SavedPacket[]>([])
  const [showPast, setShowPast] = useState(false)
  const [toast, setToast] = useState('')

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    fetch('/api/ard-packet?action=list_packets')
      .then(r => r.json())
      .then(d => setSavedPackets(d.packets || []))
      .catch(() => {})
  }, [])

  const loadPreview = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ard-packet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_packet', kid_name: kidName, date_range_start: startDate, date_range_end: endDate }),
      })
      const data = await res.json()
      setPreview(data.data || null)
    } catch { /* silent */ }
    setLoading(false)
  }

  const handleExportPDF = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ard-packet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export_pdf', kid_name: kidName, date_range_start: startDate, date_range_end: endDate,
          meeting_date: meetingDate || null, meeting_type: meetingType, parent_notes: parentNotes || null,
          concerns: concerns.length > 0 ? concerns : null, requested_changes: requestedChanges.length > 0 ? requestedChanges : null,
        }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { flash('PDF generation failed') }
    setGenerating(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/ard-packet', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_packet', kid_name: kidName, meeting_date: meetingDate || null, meeting_type: meetingType,
        date_range_start: startDate, date_range_end: endDate, packet_data: preview || {},
        parent_notes: parentNotes || null, concerns, requested_changes: requestedChanges,
      }),
    }).catch(() => {})
    flash('Draft saved')
    setSaving(false)
  }

  const addItem = (list: string[], setter: (v: string[]) => void, value: string, clear: () => void) => {
    if (value.trim()) { setter([...list, value.trim()]); clear() }
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-500" /> ARD/IEP Packet Builder
        </h2>
        <button onClick={() => setShowPast(!showPast)} className="text-xs text-gray-500 hover:text-gray-700">
          {showPast ? 'Hide' : 'Show'} Past Packets ({savedPackets.length})
        </button>
      </div>

      {showPast && savedPackets.length > 0 && (
        <div className="space-y-1.5">
          {savedPackets.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 bg-white border rounded-lg text-sm">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900">{cap(p.kid_name)}</span>
              <span className="text-gray-500">{p.meeting_type || 'Review'} · {p.date_range_start} – {p.date_range_end}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ml-auto ${p.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Student + Meeting */}
      <div className="bg-white rounded-lg border p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-700">Step 1: Student & Meeting</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Student</label>
            <select value={kidName} onChange={e => setKidName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              {KIDS_WITH_IEP.map(k => <option key={k.name} value={k.name.toLowerCase()}>{k.name} ({k.plan})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Meeting Type</label>
            <select value={meetingType} onChange={e => setMeetingType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Meeting Date</label>
            <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div />
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Report from</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Report to</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <button onClick={loadPreview} disabled={loading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Pull Data
        </button>
      </div>

      {/* Step 2: Data Preview */}
      {preview && (
        <div className="bg-white rounded-lg border p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Step 2: Data Found</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: 'IEP Goals', val: `${preview.iep_goals.length} goals`, ok: preview.iep_goals.length > 0 },
              { label: 'Attendance', val: `${preview.attendance.rate}% rate`, ok: true },
              { label: 'ELAR', val: `${preview.academics.elar_mastered}/${preview.academics.elar_total} mastered`, ok: preview.academics.elar_total > 0 },
              { label: 'Math', val: `${preview.academics.math_mastered}/${preview.academics.math_total} mastered`, ok: preview.academics.math_total > 0 },
              { label: 'Mood', val: preview.behavioral.avg_mood ? `Avg ${preview.behavioral.avg_mood}/5` : 'No data', ok: !!preview.behavioral.avg_mood },
              { label: 'Breaks', val: `${preview.behavioral.break_count} requests`, ok: true },
              { label: 'Medications', val: `${preview.health.medications.length} active`, ok: preview.health.medications.length > 0 },
              { label: 'Accommodations', val: `${preview.accommodations.active.length} active`, ok: preview.accommodations.active.length > 0 },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                {item.ok ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                <div>
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Parent Notes */}
      {preview && (
        <div className="bg-white rounded-lg border p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Step 3: Your Observations</h3>
          <textarea value={parentNotes} onChange={e => setParentNotes(e.target.value)} rows={4}
            placeholder="Add your observations, notes for the school team..."
            className="w-full px-3 py-2 border rounded-lg text-sm" />

          <div>
            <label className="text-xs font-semibold text-gray-600">Concerns</label>
            {concerns.map((c, i) => (
              <div key={i} className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-700 flex-1">• {c}</span>
                <button onClick={() => setConcerns(concerns.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input value={newConcern} onChange={e => setNewConcern(e.target.value)} placeholder="Add a concern"
                onKeyDown={e => e.key === 'Enter' && addItem(concerns, setConcerns, newConcern, () => setNewConcern(''))}
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm" />
              <button onClick={() => addItem(concerns, setConcerns, newConcern, () => setNewConcern(''))}
                className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Requested Changes</label>
            {requestedChanges.map((r, i) => (
              <div key={i} className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-700 flex-1">• {r}</span>
                <button onClick={() => setRequestedChanges(requestedChanges.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input value={newRequest} onChange={e => setNewRequest(e.target.value)} placeholder="Add a request"
                onKeyDown={e => e.key === 'Enter' && addItem(requestedChanges, setRequestedChanges, newRequest, () => setNewRequest(''))}
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm" />
              <button onClick={() => addItem(requestedChanges, setRequestedChanges, newRequest, () => setNewRequest(''))}
                className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
            </button>
            <button onClick={handleExportPDF} disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Generate & Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
