'use client'

import { useState, useEffect } from 'react'
import { Sun, ChevronDown, Plane, Users, Star, Calendar, AlertTriangle, Check, X, Loader2 } from 'lucide-react'
import { ALL_KIDS, KID_DISPLAY, KID_SCHOOL_TYPE } from '@/lib/constants'
import PlanTheWeekView from './PlanTheWeekView'
import ExcuseEmailDraft from './ExcuseEmailDraft'

const MODE_OPTIONS = [
  { value: 'normal', label: 'Normal', emoji: '📋', color: 'bg-gray-100 text-gray-700' },
  { value: 'fun_friday', label: 'Fun Friday', emoji: '🌟', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'off_day', label: 'Off Day', emoji: '🌿', color: 'bg-green-100 text-green-800' },
  { value: 'sick_day', label: 'Sick Day', emoji: '💛', color: 'bg-amber-100 text-amber-800' },
  { value: 'half_day', label: 'Half Day', emoji: '⏰', color: 'bg-blue-100 text-blue-800' },
]
const MORE_MODES = [
  { value: 'vacation', label: 'Vacation', emoji: '🏖', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'field_trip', label: 'Field Trip', emoji: '🚐', color: 'bg-purple-100 text-purple-800' },
  { value: 'work_day', label: 'Work Day', emoji: '🔨', color: 'bg-orange-100 text-orange-800' },
  { value: 'catch_up', label: 'Catch-Up', emoji: '📚', color: 'bg-indigo-100 text-indigo-800' },
]

const BISD_MODES = [
  { value: 'normal', label: 'At School', emoji: '🏫' },
  { value: 'off_day', label: 'BISD Off', emoji: '🌿' },
  { value: 'vacation', label: 'Vacation', emoji: '🏖' },
  { value: 'sick_day', label: 'Sick Day', emoji: '💛' },
  { value: 'field_trip', label: 'Appointment', emoji: '📋' },
]

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export default function ParentDayModeWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [showVacation, setShowVacation] = useState(false)
  const [vacKids, setVacKids] = useState<string[]>([])
  const [vacStart, setVacStart] = useState('')
  const [vacEnd, setVacEnd] = useState('')
  const [vacReason, setVacReason] = useState('')
  const [vacMode, setVacMode] = useState('vacation')
  const [showPlanWeek, setShowPlanWeek] = useState(false)
  const [bisdSuggestion, setBisdSuggestion] = useState<any>(null)
  const [excuseEmail, setExcuseEmail] = useState<{ kid: string; mode: string; date: string; reason?: string } | null>(null)

  const fetchData = () => {
    fetch('/api/day-mode?action=get_today').then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
    const end = new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-CA')
    fetch(`/api/day-mode?action=suggest_from_bisd&end=${end}`).then(r => r.json())
      .then(d => { if (d.suggestions?.length > 0) setBisdSuggestion(d.suggestions[0]) })
      .catch(() => {})
  }
  useEffect(() => { fetchData() }, [])

  const setMode = async (kidName: string, modeType: string) => {
    setUpdating(kidName)
    const isBisd = ['zoey', 'kaylee'].includes(kidName.toLowerCase())
    const notifySchool = isBisd && ['sick_day', 'off_day', 'vacation', 'field_trip'].includes(modeType)
    const res = await fetch('/api/day-mode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_mode', kid_name: kidName, date: data?.date, mode_type: modeType, set_by: 'parent', notify_school: notifySchool }),
    }).then(r => r.json()).catch(() => ({}))
    if (res.email_drafted) {
      setExcuseEmail({ kid: kidName, mode: modeType, date: data?.date })
    }
    await fetchData()
    setUpdating(null)
  }

  const confirmPending = async (modeId: number) => {
    await fetch('/api/day-mode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm_pending', mode_id: modeId }),
    }).catch(() => {})
    fetchData()
  }

  const overridePending = async (modeId: number, newMode: string) => {
    await fetch('/api/day-mode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'override_pending', mode_id: modeId, new_mode_type: newMode }),
    }).catch(() => {})
    fetchData()
  }

  const bulkSetAll = async (modeType: string) => {
    const today = data?.date
    for (const kid of [...ALL_KIDS]) { await setMode(kid, modeType) }
  }

  const submitVacation = async () => {
    if (!vacKids.length || !vacStart || !vacEnd) return
    setUpdating('vacation')
    await fetch('/api/day-mode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_bulk', kid_names: vacKids, start: vacStart, end: vacEnd, mode_type: vacMode, reason: vacReason }),
    }).catch(() => {})
    setShowVacation(false)
    setVacKids([]); setVacStart(''); setVacEnd(''); setVacReason('')
    await fetchData()
    setUpdating(null)
  }

  if (loading) return <div className="bg-white rounded-xl border shadow-sm p-5"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>
  if (!data) return null

  const pending = (data.kids || []).filter((k: any) => k.pending)
  const homeschool = (data.kids || []).filter((k: any) => k.school_type === 'homeschool')
  const publicSchool = (data.kids || []).filter((k: any) => k.school_type === 'public')
  const allModes = [...MODE_OPTIONS, ...(showMore ? MORE_MODES : [])]

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
          <Sun className="w-4 h-4 text-amber-500" /> Today&apos;s Day Mode
        </h3>
        <span className="text-xs text-gray-400">{new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
      </div>

      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-900 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Needs your attention</p>
          {pending.map((k: any) => (
            <div key={k.kid_name} className="flex items-center justify-between">
              <span className="text-sm text-amber-800">{k.display_name}: {k.mode?.mode_type?.replace(/_/g, ' ')}</span>
              <div className="flex gap-1">
                <button onClick={() => confirmPending(k.mode.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Confirm</button>
                <button onClick={() => overridePending(k.mode.id, 'normal')} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Restore</button>
                <button onClick={() => overridePending(k.mode.id, 'half_day')} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Half Day</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {homeschool.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Homeschool</p>
          <div className="space-y-1.5">
            {homeschool.map((k: any) => {
              const current = k.mode?.mode_type || 'normal'
              const opt = [...MODE_OPTIONS, ...MORE_MODES].find(o => o.value === current) || MODE_OPTIONS[0]
              return (
                <div key={k.kid_name} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 w-16">{k.display_name}</span>
                  <select value={current} onChange={e => setMode(k.kid_name, e.target.value)}
                    disabled={updating === k.kid_name}
                    className={`flex-1 text-xs rounded-lg px-2 py-1.5 border ${opt.color} font-medium`}>
                    {MODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                    <option disabled>───</option>
                    {MORE_MODES.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                  </select>
                  {updating === k.kid_name && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {publicSchool.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">BISD</p>
          <div className="space-y-1.5">
            {publicSchool.map((k: any) => {
              const current = k.mode?.mode_type || 'normal'
              return (
                <div key={k.kid_name} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 w-16">{k.display_name}</span>
                  <select value={current} onChange={e => setMode(k.kid_name, e.target.value)}
                    disabled={updating === k.kid_name}
                    className="flex-1 text-xs rounded-lg px-2 py-1.5 border bg-gray-50 font-medium">
                    {BISD_MODES.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {bisdSuggestion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-xs text-blue-800">🏫 {bisdSuggestion.title} ({new Date(bisdSuggestion.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}) — apply to homeschoolers too?</span>
          <div className="flex gap-1.5">
            <button onClick={async () => {
              for (const kid of [...ALL_KIDS]) await setMode(kid, 'off_day')
              setBisdSuggestion(null)
            }} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Apply</button>
            <button onClick={() => setBisdSuggestion(null)} className="text-xs text-gray-400">Dismiss</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t">
        <button onClick={() => bulkSetAll('off_day')} className="text-xs bg-green-50 text-green-700 py-2 rounded-lg hover:bg-green-100">🌿 Everyone off</button>
        <button onClick={() => { setMode('zoey', 'off_day'); setMode('kaylee', 'off_day') }} className="text-xs bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100">🎒 BISD off</button>
        <button onClick={() => setShowVacation(!showVacation)} className="text-xs bg-cyan-50 text-cyan-700 py-2 rounded-lg hover:bg-cyan-100">🏖 Vacation range</button>
        <button onClick={() => setShowPlanWeek(true)} className="text-xs bg-indigo-50 text-indigo-700 py-2 rounded-lg hover:bg-indigo-100">📅 Plan the week</button>
      </div>

      {showVacation && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 space-y-2">
          <div className="flex flex-wrap gap-1">
            {[...ALL_KIDS].map(kid => (
              <button key={kid} onClick={() => setVacKids(p => p.includes(kid) ? p.filter(k => k !== kid) : [...p, kid])}
                className={`px-2 py-1 rounded-full text-xs font-medium ${vacKids.includes(kid) ? 'bg-cyan-500 text-white' : 'bg-white text-gray-600'}`}>
                {KID_DISPLAY[kid]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={vacStart} onChange={e => setVacStart(e.target.value)} className="border rounded px-2 py-1 text-xs" />
            <input type="date" value={vacEnd} onChange={e => setVacEnd(e.target.value)} className="border rounded px-2 py-1 text-xs" />
          </div>
          <input value={vacReason} onChange={e => setVacReason(e.target.value)} placeholder="Reason..." className="w-full border rounded px-2 py-1 text-xs" />
          <button onClick={submitVacation} disabled={!vacKids.length || !vacStart || !vacEnd}
            className="w-full bg-cyan-500 text-white py-1.5 rounded text-xs font-medium hover:bg-cyan-600 disabled:opacity-50">
            {updating === 'vacation' ? 'Setting...' : 'Apply Vacation'}
          </button>
        </div>
      )}

      {showPlanWeek && <PlanTheWeekView onClose={() => { setShowPlanWeek(false); fetchData() }} />}
      {excuseEmail && (
        <ExcuseEmailDraft
          kidName={excuseEmail.kid}
          modeType={excuseEmail.mode}
          date={excuseEmail.date}
          reason={excuseEmail.reason}
          onClose={() => setExcuseEmail(null)}
        />
      )}
    </div>
  )
}
