'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Loader2, FileDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

interface KidProgressDashboardProps {
  kidName: string
}

export default function KidProgressDashboard({ kidName }: KidProgressDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<any>(null)
  const [goals, setGoals] = useState<any[]>([])
  const [moods, setMoods] = useState<any>(null)
  const [taskTrend, setTaskTrend] = useState<any>(null)
  const [reportCards, setReportCards] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => { loadAll() }, [kidName])

  const loadAll = async () => {
    setLoading(true)
    const kid = kidName.toLowerCase()

    // IEP goals
    const goalsRes = await fetch(`/api/iep-goals?kid_name=${kid}`).then(r => r.json()).catch(() => ({}))
    setGoals(goalsRes.goals || [])

    // Attendance (last 90 days)
    const attendRes = await fetch(`/api/parent/teacher?action=get_attendance_summary&kid=${kid}`).then(r => r.json()).catch(() => ({}))
    setAttendance(attendRes)

    // Mood trends (last 30 days)
    const moodRes = await fetch(`/api/kids/mood?action=get_mood_history&kid=${kid}&days=30`).then(r => r.json()).catch(() => ({}))
    const history = moodRes.history || []
    const validMoods = history.filter((m: any) => typeof m.mood === 'number' && !isNaN(m.mood) && m.mood > 0)
    if (validMoods.length > 0) {
      const avg = validMoods.reduce((s: number, m: any) => s + m.mood, 0) / validMoods.length
      const avgStr = isNaN(avg) ? null : avg.toFixed(1)
      if (avgStr) {
        const half = Math.floor(validMoods.length / 2)
        const firstHalf = validMoods.slice(half)
        const secondHalf = validMoods.slice(0, half)
        const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s: number, m: any) => s + m.mood, 0) / firstHalf.length : 0
        const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s: number, m: any) => s + m.mood, 0) / secondHalf.length : 0
        setMoods({ avg: avgStr, trend: secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'stable', entries: validMoods.length })
      }
    }

    // Task completion trend
    const taskRes = await fetch(`/api/kids/checklist?action=get_all_completion`).then(r => r.json()).catch(() => ({}))
    const kidTask = (taskRes.kids || []).find((k: any) => k.name === kid)
    if (kidTask) {
      setTaskTrend({ done: kidTask.required?.done || 0, total: kidTask.required?.total || 0 })
    }

    // Report cards
    const rcRes = await fetch(`/api/parent/teacher?action=get_report_cards&kid=${kid}`).then(r => r.json()).catch(() => ({}))
    setReportCards(rcRes.cards || [])

    setLoading(false)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/health/export-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_ard_packet', kid_name: kidName.toLowerCase(), meeting_type: 'Progress Report' }),
      })
      if (res.ok) {
        const blob = await res.blob()
        window.open(URL.createObjectURL(blob), '_blank')
      }
    } catch {}
    setExporting(false)
  }

  const officialGoals = goals.filter((g: any) => (g.goal_type || 'official') === 'official')
  const supplementalGoals = goals.filter((g: any) => g.goal_type === 'supplemental')

  if (loading) return <div className="p-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>

  const TrendIcon = ({ dir }: { dir: string }) =>
    dir === 'up' ? <TrendingUp className="w-4 h-4 text-green-500" /> :
    dir === 'down' ? <TrendingDown className="w-4 h-4 text-red-500" /> :
    <Minus className="w-4 h-4 text-gray-400" />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> Progress Report: {cap(kidName)}
        </h3>
        <button onClick={handleExport} disabled={exporting}
          className="text-xs flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50">
          <FileDown className="w-3.5 h-3.5" /> {exporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      {/* Top stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Attendance */}
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Attendance</p>
          {attendance?.summary ? (
            <>
              <p className="text-2xl font-bold text-gray-900">{attendance.summary.rate || '--'}%</p>
              <p className="text-xs text-gray-500">{attendance.summary.present || 0}/{attendance.summary.total || 0} days</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No data</p>
          )}
        </div>

        {/* IEP Goals */}
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">IEP Goals</p>
          <p className="text-2xl font-bold text-gray-900">{officialGoals.length}</p>
          <p className="text-xs text-gray-500">{officialGoals.filter((g: any) => g.status === 'in_progress').length} in progress</p>
        </div>

        {/* Mood */}
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Mood (30d)</p>
          {moods && moods.avg ? (
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900">{moods.avg}/5</p>
              <TrendIcon dir={moods.trend} />
            </div>
          ) : (
            <p className="text-sm text-gray-400">&mdash;/5 <span className="text-xs">No mood data yet</span></p>
          )}
        </div>

        {/* Task Completion */}
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Tasks</p>
          {taskTrend ? (
            <>
              <p className="text-2xl font-bold text-gray-900">{taskTrend.total > 0 ? Math.round((taskTrend.done / taskTrend.total) * 100) : 0}%</p>
              <p className="text-xs text-gray-500">{taskTrend.done}/{taskTrend.total} this week</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No data</p>
          )}
        </div>
      </div>

      {/* IEP Goals Detail */}
      {officialGoals.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-900 mb-3">IEP / 504 Goals</h4>
          <div className="space-y-3">
            {officialGoals.map((g: any) => {
              const target = g.target_value || 0
              const current = parseFloat(g.current_value) || 0
              const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0
              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">{g.goal_text?.split(':')[0] || 'Goal'}</span>
                    <span className="text-xs text-gray-500">{current || '?'}% / {target}% target</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Report Card Grades */}
      {reportCards.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-900 mb-3">Report Card</h4>
          <div className="grid grid-cols-3 gap-2">
            {reportCards.map((rc: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">{rc.subject}</p>
                <p className="text-lg font-bold text-gray-900">{rc.grade || '--'}</p>
                <p className="text-[10px] text-gray-400">{rc.grading_period}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supplemental Home Focus Goals */}
      {supplementalGoals.length > 0 && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
          <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-1">
            {'\uD83C\uDFE0'} Home Focus Goals
            <span className="text-xs font-normal text-amber-600">(parent-identified)</span>
          </h4>
          <div className="space-y-2">
            {supplementalGoals.map((g: any) => (
              <div key={g.id} className="text-sm text-amber-900">
                <span className="font-medium">{g.goal_text?.split(':')[0] || 'Goal'}:</span>{' '}
                <span className="text-amber-700">{g.goal_text?.split(':').slice(1).join(':').trim().slice(0, 120) || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
