'use client'

import { useState, useEffect } from 'react'
import { Wrench, Plus, Clock, ChevronDown, ChevronUp } from 'lucide-react'

const WORK_KIDS = ['amos', 'wyatt']

interface WorkLogCardProps {
  kidName: string
}

export default function WorkLogCard({ kidName }: WorkLogCardProps) {
  const kid = kidName.toLowerCase()
  const [logs, setLogs] = useState<any[]>([])
  const [weeklyHours, setWeeklyHours] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [hours, setHours] = useState('')
  const [jobName, setJobName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Only show for Amos and Wyatt
  if (!WORK_KIDS.includes(kid)) return null

  useEffect(() => {
    Promise.all([
      fetch(`/api/work-log?action=get_logs&kid_name=${kid}`).then(r => r.json()),
      fetch(`/api/work-log?action=get_weekly_summary&kid_name=${kid}`).then(r => r.json()),
    ]).then(([logData, summaryData]) => {
      setLogs(logData.logs || [])
      const summary = (summaryData.summary || []).find((s: any) => s.kid_name === kid)
      setWeeklyHours(Number(summary?.total_hours || 0))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [kid])

  const handleSubmit = async () => {
    if (!hours || Number(hours) <= 0) return
    setSubmitting(true)
    const res = await fetch('/api/work-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_work', kid_name: kid, hours: Number(hours), job_name: jobName.trim() || null, description: description.trim() || null }),
    }).then(r => r.json()).catch(() => null)
    if (res?.success && res.log) {
      setLogs(prev => [res.log, ...prev])
      setWeeklyHours(prev => prev + Number(hours))
    }
    setHours(''); setJobName(''); setDescription(''); setShowForm(false); setSubmitting(false)
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
            <Clock className="w-3.5 h-3.5" /> {weeklyHours}h this week
          </span>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-orange-50 rounded-lg p-3 mb-3 space-y-2">
          <div className="flex gap-2">
            <input type="number" step="0.5" min="0.5" value={hours} onChange={e => setHours(e.target.value)}
              placeholder="Hours" className="w-20 border rounded px-2 py-1.5 text-sm" />
            <input type="text" value={jobName} onChange={e => setJobName(e.target.value)}
              placeholder="Job/Client name" className="flex-1 border rounded px-2 py-1.5 text-sm" />
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What did you work on?" rows={2}
            className="w-full border rounded px-2 py-1.5 text-sm resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!hours || submitting}
              className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Log Work'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      {/* Recent logs */}
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400">No work logged yet. Tap + to start!</p>
      ) : (
        <div className="space-y-1.5">
          {displayLogs.map((log: any) => (
            <div key={log.id} className="flex items-center gap-2 text-sm py-1 border-b border-gray-100 last:border-0">
              <span className="text-gray-500 w-16 flex-shrink-0">
                {new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="font-medium text-orange-700">{log.hours}h</span>
              <span className="text-gray-700 flex-1 truncate">{log.job_name || 'General work'}</span>
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
