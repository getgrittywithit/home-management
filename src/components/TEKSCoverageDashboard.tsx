'use client'

import { useState, useEffect } from 'react'
import { BarChart2, ChevronRight, AlertTriangle, Download, RefreshCw, Loader2 } from 'lucide-react'
import { HOMESCHOOL_KIDS, KID_DISPLAY, KID_GRADES } from '@/lib/constants'

const SUBJECT_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  ELAR: { bg: 'bg-purple-50', bar: 'bg-purple-500', text: 'text-purple-700' },
  Math: { bg: 'bg-teal-50', bar: 'bg-teal-500', text: 'text-teal-700' },
  Science: { bg: 'bg-blue-50', bar: 'bg-blue-500', text: 'text-blue-700' },
  'Social Studies': { bg: 'bg-orange-50', bar: 'bg-orange-500', text: 'text-orange-700' },
}

export default function TEKSCoverageDashboard() {
  const [kid, setKid] = useState('ellie')
  const [data, setData] = useState<any>(null)
  const [gaps, setGaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [drillSubject, setDrillSubject] = useState<string | null>(null)

  const fetchData = async (k: string) => {
    setLoading(true)
    const [coverageRes, gapsRes] = await Promise.all([
      fetch(`/api/teks?action=coverage&kid_name=${k}&school_year=2025-2026`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/teks?action=gaps&kid_name=${k}`).then(r => r.json()).catch(() => ({ gaps: [] })),
    ])
    setData(coverageRes)
    setGaps(gapsRes.gaps || [])
    setLoading(false)
  }

  useEffect(() => { fetchData(kid) }, [kid])

  const refresh = async () => {
    setRefreshing(true)
    await fetch('/api/teks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh_coverage', kid_name: kid }),
    }).catch(() => {})
    await fetchData(kid)
    setRefreshing(false)
  }

  const subjects = data?.subjects || {}

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-5 rounded-xl">
        <h2 className="text-xl font-bold flex items-center gap-2"><BarChart2 className="w-6 h-6" /> TEKS Coverage</h2>
        <p className="text-emerald-100 text-sm mt-1">Texas Essential Knowledge & Skills tracking</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {[...HOMESCHOOL_KIDS].map(k => (
            <button key={k} onClick={() => setKid(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${kid === k ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {KID_DISPLAY[k]} <span className="text-[9px] opacity-60">Gr.{KID_GRADES[k]}</span>
            </button>
          ))}
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="text-xs text-emerald-600 flex items-center gap-1 hover:text-emerald-700 disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
      ) : drillSubject ? (
        <div className="bg-white rounded-xl border p-4">
          <button onClick={() => setDrillSubject(null)} className="text-xs text-blue-600 mb-3">← Back to overview</button>
          <h3 className="font-semibold text-sm text-gray-900 mb-3">{drillSubject} — {KID_DISPLAY[kid]}</h3>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {(data?.coverage || []).filter((c: any) => c.subject === drillSubject).map((c: any) => (
              <div key={c.teks_code} className="flex items-center justify-between p-2 rounded border border-gray-100 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-gray-500">{c.teks_code}</span>
                  <p className="text-gray-700 truncate">{c.student_expectation}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  c.status === 'mastered' ? 'bg-green-100 text-green-700' :
                  c.status === 'practiced' ? 'bg-blue-100 text-blue-700' :
                  c.status === 'introduced' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(subjects).map(([subject, stats]: [string, any]) => {
              const colors = SUBJECT_COLORS[subject] || { bg: 'bg-gray-50', bar: 'bg-gray-500', text: 'text-gray-700' }
              const pct = stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0
              return (
                <button key={subject} onClick={() => setDrillSubject(subject)}
                  className={`${colors.bg} rounded-xl p-4 text-left border hover:shadow-sm`}>
                  <p className={`text-sm font-semibold ${colors.text}`}>{subject}</p>
                  <div className="w-full bg-white/50 rounded-full h-2 mt-2">
                    <div className={`${colors.bar} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-gray-500">{stats.covered}/{stats.total} standards</span>
                    <span className={`text-xs font-bold ${colors.text}`}>{pct}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{stats.mastered} mastered</p>
                </button>
              )
            })}
          </div>

          {gaps.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> {gaps.length} Uncovered Standards
              </h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {gaps.slice(0, 10).map((g: any) => (
                  <p key={g.teks_code} className="text-[10px] text-amber-700">
                    <span className="font-mono">{g.teks_code}</span> — {g.student_expectation?.substring(0, 80)}...
                  </p>
                ))}
              </div>
            </div>
          )}

          {Object.keys(subjects).length === 0 && (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-500">No coverage data yet. Click Refresh to compute coverage from activities.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
