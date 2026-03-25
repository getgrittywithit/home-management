'use client'

import { useState, useEffect } from 'react'
import { Dog, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react'

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee'
}
const KID_COLORS: Record<string, string> = {
  amos: 'bg-blue-100 text-blue-700',
  ellie: 'bg-purple-100 text-purple-700',
  wyatt: 'bg-green-100 text-green-700',
  hannah: 'bg-pink-100 text-pink-700',
  zoey: 'bg-amber-100 text-amber-700',
  kaylee: 'bg-teal-100 text-teal-700',
}
const BELLE_KIDS = ['all', 'amos', 'ellie', 'wyatt', 'hannah', 'kaylee']

interface DayOverview {
  date: string
  dayName: string
  assignee: string | null
  totalTasks: number
  completedTasks: number
}

interface Weekend {
  saturday: string
  kid_name: string
  label: string
}

interface LogEntry {
  kid_name: string
  care_date: string
  task: string
  completed: boolean
}

export default function BelleCareTab() {
  const [todayAssignee, setTodayAssignee] = useState<string | null>(null)
  const [todayTasks, setTodayTasks] = useState<any[]>([])
  const [weekDays, setWeekDays] = useState<DayOverview[]>([])
  const [weekends, setWeekends] = useState<Weekend[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filterKid, setFilterKid] = useState('all')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/kids/belle?action=get_todays_assignee').then(r => r.json()),
      fetch('/api/kids/belle?action=get_weekly_overview').then(r => r.json()),
      fetch('/api/kids/belle?action=get_weekend_schedule').then(r => r.json()),
      fetch('/api/kids/belle?action=get_history').then(r => r.json()),
    ]).then(([todayData, weekData, wkndData, histData]) => {
      setTodayAssignee(todayData.assignee || null)
      setTodayTasks(todayData.tasks || [])
      setWeekDays(weekData.days || [])
      setWeekends(wkndData.weekends || [])
      setLogs(histData.logs || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    )
  }

  const todayDone = todayTasks.filter((t: any) => t.completed).length
  const todayTotal = todayTasks.length
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const currentHour = now.getHours()
  const amIncomplete = currentHour >= 10 && todayTasks.some((t: any) => t.key === 'am_feed_walk' && !t.completed)
  const pmIncomplete = currentHour >= 19 && todayTasks.some((t: any) => (t.key === 'pm_feed' || t.key === 'pm_walk') && !t.completed)

  // History stats
  const filteredLogs = filterKid === 'all' ? logs : logs.filter(l => l.kid_name === filterKid)
  const kidStats: Record<string, { done: number; total: number }> = {}
  filteredLogs.forEach(l => {
    if (!kidStats[l.kid_name]) kidStats[l.kid_name] = { done: 0, total: 0 }
    kidStats[l.kid_name].total++
    if (l.completed) kidStats[l.kid_name].done++
  })

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Dog className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Belle Care</h1>
            <p className="text-amber-100">Daily care tracking and rotation</p>
          </div>
        </div>
      </div>

      {/* Today */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            🐾 Today
          </h2>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${KID_COLORS[todayAssignee || ''] || 'bg-gray-100 text-gray-700'}`}>
            {KID_DISPLAY[todayAssignee || ''] || todayAssignee} on duty
          </span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
            <div className="bg-amber-500 h-2.5 rounded-full transition-all" style={{ width: `${todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{todayDone}/{todayTotal}</span>
        </div>

        {amIncomplete && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> AM feed + walk incomplete past 10 AM
          </div>
        )}
        {pmIncomplete && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> PM tasks incomplete past 7 PM
          </div>
        )}

        <div className="divide-y mt-2">
          {todayTasks.map((t: any) => (
            <div key={t.key} className="flex items-center gap-2 py-2 text-sm">
              {t.completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <span className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0" />
              )}
              <span>{t.emoji}</span>
              <span className={t.completed ? 'text-gray-400 line-through' : 'text-gray-800'}>{t.label}</span>
              {t.time && <span className="text-xs text-gray-400 ml-auto">{t.time}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* This Week Grid */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">This Week</h2>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(d => {
            const isToday = d.date === todayStr
            const isPast = d.date < todayStr
            const pct = d.totalTasks > 0 ? d.completedTasks / d.totalTasks : 0
            return (
              <div key={d.date} className={`text-center p-2 rounded-lg ${isToday ? 'ring-2 ring-amber-400 bg-amber-50' : 'bg-gray-50'}`}>
                <p className="text-xs font-medium text-gray-600">{d.dayName}</p>
                <p className={`text-xs mt-0.5 ${KID_COLORS[d.assignee || '']?.split(' ')[1] || 'text-gray-500'}`}>
                  {KID_DISPLAY[d.assignee || ''] || '—'}
                </p>
                <div className="text-lg mt-1">
                  {!isPast && !isToday ? '⬜' : pct >= 1 ? '✅' : pct > 0 ? '⚠️' : isPast ? '❌' : '⬜'}
                </div>
                <p className="text-xs text-gray-400">{d.completedTasks}/{d.totalTasks}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Weekdays: fixed assignments · Weekends: 5-week rotation
        </div>
      </div>

      {/* Weekend Schedule */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-600" /> Weekend Schedule
        </h2>
        <div className="space-y-2">
          {weekends.map((w, i) => (
            <div key={w.saturday} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${i === 0 ? 'bg-amber-50 border border-amber-200' : ''}`}>
              <span className="text-sm text-gray-500 w-28">Sat-Sun {w.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KID_COLORS[w.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                {KID_DISPLAY[w.kid_name] || w.kid_name}
              </span>
              {i === 0 && <span className="text-xs text-amber-600 font-medium ml-auto">Next up</span>}
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">History — Last 30 Days</h2>
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {BELLE_KIDS.map(kid => (
            <button key={kid} onClick={() => setFilterKid(kid)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                filterKid === kid ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {kid === 'all' ? 'All Kids' : KID_DISPLAY[kid]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(kidStats).map(([kid, stat]) => {
            const pct = stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0
            return (
              <div key={kid} className="p-3 border rounded-lg text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KID_COLORS[kid] || 'bg-gray-100 text-gray-700'}`}>
                  {KID_DISPLAY[kid] || kid}
                </span>
                <div className="text-xl font-bold text-amber-600 mt-2">{pct}%</div>
                <p className="text-xs text-gray-400">{stat.done}/{stat.total} tasks</p>
              </div>
            )
          })}
        </div>
        {Object.keys(kidStats).length === 0 && (
          <p className="text-center text-gray-400 py-4">No care logs yet</p>
        )}
      </div>
    </div>
  )
}
