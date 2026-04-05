'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface HealthCycleTrackerProps {
  overview: any
  onRefresh: () => void
  onError: (msg: string) => void
}

export default function HealthCycleTracker({ overview, onRefresh, onError }: HealthCycleTrackerProps) {
  const [addingKid, setAddingKid] = useState(false)
  const [selectedKid, setSelectedKid] = useState('')
  const [reportKid, setReportKid] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const ALL_KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']

  const settings = overview?.settings || []
  const irrCounts = overview?.irregularityCounts || {}
  const toDateStr = (d: any): string => {
    if (!d) return ''
    if (typeof d === 'string') return d.slice(0, 10)
    try { return new Date(d).toISOString().slice(0, 10) } catch { return '' }
  }
  const recentLogs = (overview?.recentLogs || []).map((l: any) => ({ ...l, event_date: toDateStr(l.event_date) }))
  const trackedKids = settings.map((s: any) => s.kid_name)
  const availableKids = ALL_KIDS.filter(k => !trackedKids.includes(k))

  const logsByKid: Record<string, any[]> = {}
  recentLogs.forEach((l: any) => {
    if (!logsByKid[l.kid_name]) logsByKid[l.kid_name] = []
    logsByKid[l.kid_name].push(l)
  })

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_cycle_entry', entryId }) })
      onRefresh()
    } catch { onError('Failed to delete entry') }
  }

  const handleToggleMode = async (kid: string, currentMode: string) => {
    const newMode = currentMode === 'full' ? 'learning' : 'full'
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_cycle_mode', child: kid, mode: newMode }) })
      onRefresh()
    } catch { onError('Failed to update mode') }
  }

  const handleAddKid = async () => {
    if (!selectedKid) return
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_kid_to_cycle_tracker', child: selectedKid }) })
      setAddingKid(false); setSelectedKid(''); onRefresh()
    } catch { onError('Failed to add kid') }
  }

  const handleGenerateReport = async (kid: string) => {
    setReportKid(kid); setReportLoading(true); setReportData(null)
    try {
      const res = await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_cycle_report', child: kid }) })
      setReportData(await res.json())
    } catch { onError('Failed to generate report') }
    setReportLoading(false)
  }

  const buildReportText = (kid: string, data: any) => {
    const s = data.settings
    const logs = (data.logs || []).map((l: any) => ({ ...l, event_date: toDateStr(l.event_date) }))
    const symptoms = (data.symptoms || []).map((sym: any) => ({ ...sym, log_date: toDateStr(sym.log_date) }))
    const capName = kid.charAt(0).toUpperCase() + kid.slice(1)
    const starts = logs.filter((l: any) => l.event_type === 'start').map((l: any) => l.event_date).sort()
    const ends = logs.filter((l: any) => l.event_type === 'end').map((l: any) => l.event_date).sort()

    if (starts.length < 2) return `${capName} — Cycle Summary\n\nNot enough data yet — keep tracking and this report will fill in over time.`

    let totalGap = 0
    for (let i = 1; i < starts.length; i++) { totalGap += (new Date(starts[i] + 'T12:00:00').getTime() - new Date(starts[i-1] + 'T12:00:00').getTime()) / 86400000 }
    const avgCycle = Math.round(totalGap / (starts.length - 1))

    let totalDur = 0, durCount = 0
    starts.forEach((st: string) => {
      const end = ends.find((e: string) => e >= st)
      if (end) { totalDur += (new Date(end + 'T12:00:00').getTime() - new Date(st + 'T12:00:00').getTime()) / 86400000 + 1; durCount++ }
    })
    const avgDur = durCount > 0 ? Math.round(totalDur / durCount) : (s?.avg_period_duration || 5)
    const regLabel = s?.cycle_regularity === 'regular' ? 'Regular' : s?.cycle_regularity === 'varies' ? 'Varies' : 'Unknown'

    const allIrr: Record<string, number> = {}
    symptoms.forEach((sym: any) => { (sym.irregularities || []).forEach((ir: string) => { allIrr[ir] = (allIrr[ir] || 0) + 1 }) })
    const irrLines = Object.entries(allIrr).map(([k, v]) => `  - ${k} (${v}x)`).join('\n')
    const commonSym = (s?.common_symptoms || []).join(', ')
    const noteLines = symptoms.filter((sym: any) => sym.notes).map((sym: any) => `  ${sym.log_date}: ${sym.notes}`).join('\n')

    let report = `${capName} — Cycle Summary\nDate range: last 6 months\n\n`
    report += `Average cycle length: ${avgCycle} days\nAverage period duration: ${avgDur} days\nCycle regularity: ${regLabel}\n\n`
    report += `Periods logged: ${starts.length}\n`
    if (irrLines) { report += `\nIrregularities reported:\n${irrLines}\n` }
    if (commonSym) { report += `\nMost common symptoms: ${commonSym}\n` }
    if (noteLines) { report += `\nCheck-in notes:\n${noteLines}\n` }
    return report
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">🌸 Cycle Tracker</h3>
        {availableKids.length > 0 && (
          <button onClick={() => setAddingKid(!addingKid)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 transition">
            <Plus className="w-4 h-4" />Add to Tracker
          </button>
        )}
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800">
        Cycle data is private to each child&apos;s profile and is not visible to other kids.
      </div>

      {addingKid && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <select value={selectedKid} onChange={e => setSelectedKid(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
            <option value="">Select child...</option>
            {availableKids.map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
          </select>
          <p className="text-xs text-gray-500">Will start in Learning Mode — informational only, no tracking.</p>
          <div className="flex gap-2">
            <button onClick={handleAddKid} disabled={!selectedKid}
              className="flex-1 bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600 transition disabled:opacity-50">Add</button>
            <button onClick={() => setAddingKid(false)}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">Cancel</button>
          </div>
        </div>
      )}

      {settings.length === 0 ? (
        <div className="bg-white rounded-lg p-8 shadow-sm border text-center text-gray-400">No kids added to cycle tracker yet.</div>
      ) : (
        settings.map((s: any) => {
          const capName = s.kid_name.charAt(0).toUpperCase() + s.kid_name.slice(1)
          const kidLogs = (logsByKid[s.kid_name] || []).slice(0, 6)
          const hasIrregularities = (irrCounts[s.kid_name] || 0) >= 2

          return (
            <div key={s.kid_name} className="bg-white rounded-lg p-5 shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{capName}</h4>
                  {hasIrregularities && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⚠ patterns to review</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.mode === 'full' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.mode === 'full' ? 'Full Tracking' : 'Learning Mode'}
                  </span>
                  <button onClick={() => handleToggleMode(s.kid_name, s.mode)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                    Switch to {s.mode === 'full' ? 'Learning' : 'Full'}
                  </button>
                </div>
              </div>

              {s.mode === 'full' && s.onboarded && (
                <div className="flex gap-3 text-xs text-gray-500 mb-2">
                  {s.cycle_regularity && s.cycle_regularity !== 'unknown' && <span>Regularity: {s.cycle_regularity}</span>}
                  {s.avg_period_duration && <span>Avg duration: ~{s.avg_period_duration}d</span>}
                  {s.common_symptoms?.length > 0 && <span>Symptoms: {s.common_symptoms.join(', ')}</span>}
                </div>
              )}

              {kidLogs.length > 0 ? (
                <div className="space-y-1 mb-3">
                  {kidLogs.map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between text-sm text-gray-600 group">
                      <span>
                        {entry.event_type === 'start' ? '🔴 Started' : '⚪ Ended'}{' '}
                        {new Date(entry.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button onClick={() => handleDeleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition" title="Delete this entry">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-3">No cycles logged yet</p>
              )}

              {s.mode === 'full' && (
                <button onClick={() => handleGenerateReport(s.kid_name)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                  Generate Report
                </button>
              )}

              {reportKid === s.kid_name && (reportLoading ? (
                <div className="mt-3 text-sm text-gray-400">Generating report...</div>
              ) : reportData ? (
                <div className="mt-3 bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{buildReportText(s.kid_name, reportData)}</pre>
                  <button onClick={() => { navigator.clipboard.writeText(buildReportText(s.kid_name, reportData)) }}
                    className="mt-2 text-xs text-rose-600 hover:text-rose-700 font-medium">Copy to clipboard</button>
                </div>
              ) : null)}
            </div>
          )
        })
      )}
    </div>
  )
}
