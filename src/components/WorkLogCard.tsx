'use client'

import { useState, useEffect, useMemo } from 'react'
import { Wrench, Plus, Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

const WORK_KIDS = ['amos', 'wyatt']

const LUNCH_DURATIONS = [0, 15, 20, 30, 45, 60]
const TIME_DEDUCTIONS = [0, 15, 30, 45, 60, 75, 90]

const LUNCH_TYPES = [
  { value: 'packed', label: 'Packed', icon: '🏠' },
  { value: 'fast_food', label: 'Fast Food', icon: '🍔' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'skipped', label: 'Skipped', icon: '⏭️' },
]

// Generate time options in 15-min increments from 5:00 AM to 10:00 PM
function timeOptions(): string[] {
  const opts: string[] = []
  for (let h = 5; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return opts
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function minsToDisplay(mins: number): string {
  if (mins <= 0) return '0h 0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

export default function WorkLogCard({ kidName }: { kidName: string }) {
  const kid = kidName.toLowerCase()
  const [logs, setLogs] = useState<any[]>([])
  const [weeklyHours, setWeeklyHours] = useState(0)
  const [, setWeeklyBillable] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Form state
  const [logDate, setLogDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
  const [jobName, setJobName] = useState('')
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('16:30')
  const [lunchMin, setLunchMin] = useState(30)
  const [lunchDesc, setLunchDesc] = useState('')
  const [lunchType, setLunchType] = useState('packed')
  const [travelMin, setTravelMin] = useState(0)
  const [materialMin, setMaterialMin] = useState(0)
  const [otherMin, setOtherMin] = useState(0)
  const [description, setDescription] = useState('')

  const times = useMemo(() => timeOptions(), [])

  if (!WORK_KIDS.includes(kid)) return null

  useEffect(() => {
    Promise.all([
      fetch(`/api/work-log?action=get_logs&kid_name=${kid}`).then(r => r.json()),
      fetch(`/api/work-log?action=get_weekly_summary&kid_name=${kid}`).then(r => r.json()),
    ]).then(([logData, summaryData]) => {
      setLogs(logData.logs || [])
      const summary = (summaryData.summary || []).find((s: any) => s.kid_name === kid)
      setWeeklyHours(Number(summary?.total_hours || 0))
      setWeeklyBillable(Number(summary?.total_billable_min || 0))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [kid])

  // Calculated values
  const grossMin = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    let diff = (eh * 60 + em) - (sh * 60 + sm)
    if (diff < 0) diff += 24 * 60
    return diff
  }, [startTime, endTime])

  const billableMin = Math.max(0, grossMin - lunchMin - travelMin - materialMin - otherMin)

  const handleSubmit = async () => {
    if (!startTime || !endTime) return
    setSubmitting(true)
    const res = await fetch('/api/work-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log_work', kid_name: kid, date: logDate,
        start_time: startTime, end_time: endTime, job_name: jobName.trim() || null,
        description: description.trim() || null,
        lunch_minutes: lunchMin, travel_minutes: travelMin,
        material_run_minutes: materialMin, other_deduction_minutes: otherMin,
        lunch_description: lunchDesc.trim() || null, lunch_type: lunchType,
      }),
    }).then(r => r.json()).catch(() => null)
    if (res?.success && res.log) {
      setLogs(prev => [res.log, ...prev])
      setWeeklyHours(prev => prev + grossMin / 60)
      setWeeklyBillable(prev => prev + billableMin)
    }
    resetForm()
    setSubmitting(false)
  }

  const resetForm = () => {
    setShowForm(false); setJobName(''); setDescription('')
    setStartTime('07:00'); setEndTime('16:30'); setLunchMin(30)
    setLunchDesc(''); setLunchType('packed'); setTravelMin(0)
    setMaterialMin(0); setOtherMin(0)
    setLogDate(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
  }

  const handleDelete = async (id: number) => {
    setLogs(prev => prev.filter(l => l.id !== id))
    await fetch('/api/work-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_log', id }),
    }).catch(() => {})
  }

  if (!loaded) return null
  const displayLogs = showAll ? logs : logs.slice(0, 3)

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-1.5 text-sm">
          <Wrench className="w-4 h-4 text-orange-600" /> Work Log
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-orange-600 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {weeklyHours.toFixed(1)}h this week
          </span>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Full Work Log Form */}
      {showForm && (
        <div className="bg-orange-50 rounded-lg p-3 mb-3 space-y-3 border border-orange-200">
          {/* Date + Job */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 font-medium">Date</label>
              <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Job/Client</label>
              <input type="text" value={jobName} onChange={e => setJobName(e.target.value)}
                placeholder="Client name" className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
          </div>

          {/* Time section */}
          <div className="bg-white rounded-lg p-2.5 border border-orange-100">
            <p className="text-xs font-semibold text-gray-600 mb-2">Time</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Start</label>
                <select value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  {times.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">End</label>
                <select value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  {times.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Total: {minsToDisplay(grossMin)}</p>
          </div>

          {/* Lunch section */}
          <div className="bg-white rounded-lg p-2.5 border border-orange-100">
            <p className="text-xs font-semibold text-gray-600 mb-2">Lunch Break</p>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {LUNCH_DURATIONS.map(d => (
                <button key={d} onClick={() => setLunchMin(d)}
                  className={`px-2 py-1 rounded text-xs font-medium ${lunchMin === d ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {d === 0 ? 'None' : `${d}m`}
                </button>
              ))}
            </div>
            {lunchMin > 0 && (
              <>
                <input type="text" value={lunchDesc} onChange={e => setLunchDesc(e.target.value)}
                  placeholder="What'd you eat?" className="w-full border rounded px-2 py-1.5 text-sm mb-2" />
                <div className="flex gap-1.5 flex-wrap">
                  {LUNCH_TYPES.map(lt => (
                    <button key={lt.value} onClick={() => setLunchType(lt.value)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        lunchType === lt.value ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-gray-50 text-gray-500 border border-gray-200'
                      }`}>
                      {lt.icon} {lt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Time breakdown */}
          <div className="bg-white rounded-lg p-2.5 border border-orange-100">
            <p className="text-xs font-semibold text-gray-600 mb-2">Time Breakdown</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">Travel</label>
                <select value={travelMin} onChange={e => setTravelMin(Number(e.target.value))}
                  className="w-full border rounded px-2 py-1 text-sm">
                  {TIME_DEDUCTIONS.map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Material runs</label>
                <select value={materialMin} onChange={e => setMaterialMin(Number(e.target.value))}
                  className="w-full border rounded px-2 py-1 text-sm">
                  {TIME_DEDUCTIONS.map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Other</label>
                <select value={otherMin} onChange={e => setOtherMin(Number(e.target.value))}
                  className="w-full border rounded px-2 py-1 text-sm">
                  {TIME_DEDUCTIONS.map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What did you work on?" rows={2}
            className="w-full border rounded px-2 py-1.5 text-sm resize-none" />

          {/* Calculated summary */}
          <div className="bg-orange-100 rounded-lg p-2.5 text-xs space-y-0.5">
            <div className="flex justify-between"><span className="text-gray-600">Gross time:</span><span>{minsToDisplay(grossMin)}</span></div>
            {lunchMin > 0 && <div className="flex justify-between"><span className="text-gray-500">– Lunch:</span><span>{minsToDisplay(lunchMin)}</span></div>}
            {travelMin > 0 && <div className="flex justify-between"><span className="text-gray-500">– Travel:</span><span>{minsToDisplay(travelMin)}</span></div>}
            {materialMin > 0 && <div className="flex justify-between"><span className="text-gray-500">– Mat. runs:</span><span>{minsToDisplay(materialMin)}</span></div>}
            {otherMin > 0 && <div className="flex justify-between"><span className="text-gray-500">– Other:</span><span>{minsToDisplay(otherMin)}</span></div>}
            <div className="border-t border-orange-200 pt-1 flex justify-between font-bold text-orange-800">
              <span>= BILLABLE:</span><span>{minsToDisplay(billableMin)}</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={submitting || grossMin <= 0}
              className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Log'}
            </button>
            <button onClick={resetForm} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {/* Recent logs */}
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400">No work logged yet. Tap + to start!</p>
      ) : (
        <div className="space-y-1.5">
          {displayLogs.map((log: any) => (
            <div key={log.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-gray-100 last:border-0 group">
              <span className="text-gray-500 w-16 flex-shrink-0">
                {new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="font-medium text-orange-700 w-10">{log.billable_minutes ? minsToDisplay(log.billable_minutes) : `${log.hours}h`}</span>
              <span className="text-gray-700 flex-1 truncate">{log.job_name || 'General work'}</span>
              {log.lunch_type && (
                <span className="text-xs text-gray-400">
                  {LUNCH_TYPES.find(l => l.value === log.lunch_type)?.icon || ''}
                </span>
              )}
              <button onClick={() => handleDelete(log.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {logs.length > 3 && (
            <button onClick={() => setShowAll(!showAll)}
              className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-0.5 mt-1">
              {showAll ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> View all ({logs.length})</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
