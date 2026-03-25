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
const ALL_KIDS = ['all', 'amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']

interface ScheduleEntry { kid_name: string; week_start: string }
interface LogEntry { kid_name: string; care_date: string; task: string; completed: boolean }

export default function BelleCareTab() {
  const [assignee, setAssignee] = useState<string | null>(null)
  const [todayTasks, setTodayTasks] = useState<any[]>([])
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [totalTasks, setTotalTasks] = useState(6)
  const [filterKid, setFilterKid] = useState('all')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = () => {
    Promise.all([
      fetch('/api/kids/belle?action=get_current_assignee').then(r => r.json()),
      fetch('/api/kids/belle?action=get_schedule').then(r => r.json()),
      fetch('/api/kids/belle?action=get_history').then(r => r.json()),
    ]).then(([assignData, schedData, histData]) => {
      setAssignee(assignData.assignee || null)
      setSchedule(schedData.schedule || [])
      setLogs(histData.logs || [])
      setTotalTasks(histData.totalTasks || 6)
      setLoaded(true)

      // Also fetch today's tasks for the assignee
      if (assignData.assignee) {
        fetch(`/api/kids/belle?action=get_todays_tasks&kid=${assignData.assignee}`)
          .then(r => r.json())
          .then(data => setTodayTasks(data.tasks || []))
      }
    }).catch(() => setLoaded(true))
  }

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
  const morningIncomplete = currentHour >= 10 && todayTasks.filter((t: any) => t.time === 'Morning' && !t.completed).length > 0
  const eveningIncomplete = currentHour >= 19 && todayTasks.filter((t: any) => t.time === 'Evening' && !t.completed).length > 0

  // Build weekly grid from logs
  const getWeekDays = (): string[] => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((day + 6) % 7))
    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      const dd = new Date(monday)
      dd.setDate(monday.getDate() + i)
      days.push(dd.toLocaleDateString('en-CA'))
    }
    return days
  }
  const weekDays = getWeekDays()
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Count completed per day for this week's assignee
  const weekGrid = weekDays.map(d => {
    const dayLogs = logs.filter(l => l.care_date === d && l.kid_name === assignee)
    const completed = dayLogs.filter(l => l.completed).length
    return { date: d, completed, total: totalTasks }
  })

  // History: completion rate per kid
  const filteredLogs = filterKid === 'all' ? logs : logs.filter(l => l.kid_name === filterKid)
  const kidStats: Record<string, { done: number; total: number }> = {}
  filteredLogs.forEach(l => {
    if (!kidStats[l.kid_name]) kidStats[l.kid_name] = { done: 0, total: 0 }
    kidStats[l.kid_name].total++
    if (l.completed) kidStats[l.kid_name].done++
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Dog className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Belle Care</h1>
            <p className="text-amber-100">Daily care tracking and rotation schedule</p>
          </div>
        </div>
      </div>

      {/* Today's Status */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="text-lg">🐾</span> Today
          </h2>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${KID_COLORS[assignee || ''] || 'bg-gray-100 text-gray-700'}`}>
            {KID_DISPLAY[assignee || ''] || assignee} on duty
          </span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
            <div className="bg-amber-500 h-2.5 rounded-full transition-all" style={{ width: `${todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{todayDone}/{todayTotal}</span>
        </div>

        {/* Flags */}
        {morningIncomplete && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Morning tasks incomplete past 10 AM
          </div>
        )}
        {eveningIncomplete && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" /> Evening tasks incomplete past 7 PM
          </div>
        )}

        {/* Task list */}
        <div className="mt-3 divide-y">
          {todayTasks.map((t: any) => (
            <div key={t.task} className="flex items-center gap-2 py-2 text-sm">
              {t.completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <span className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0" />
              )}
              <span className="text-xs text-gray-400 w-16">{t.time}</span>
              <span className={t.completed ? 'text-gray-400 line-through' : 'text-gray-800'}>{t.task}</span>
            </div>
          ))}
        </div>
      </div>

      {/* This Week Grid */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">This Week — {KID_DISPLAY[assignee || ''] || assignee}</h2>
        <div className="grid grid-cols-7 gap-2">
          {weekGrid.map((d, i) => {
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
            const isToday = d.date === today
            const isPast = d.date < today
            const pct = d.total > 0 ? d.completed / d.total : 0
            return (
              <div key={d.date} className={`text-center p-2 rounded-lg ${isToday ? 'ring-2 ring-amber-400 bg-amber-50' : 'bg-gray-50'}`}>
                <p className="text-xs font-medium text-gray-600">{dayNames[i]}</p>
                <div className="text-lg mt-1">
                  {!isPast && !isToday ? '⬜' : pct >= 1 ? '✅' : pct > 0 ? '⚠️' : isPast ? '❌' : '⬜'}
                </div>
                <p className="text-xs text-gray-400">{d.completed}/{d.total}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-600" /> Rotation Schedule
        </h2>
        <p className="text-xs text-gray-400 mb-3">6-week cycle following zone rotation</p>
        <div className="space-y-2">
          {schedule.slice(0, 12).map((s, i) => {
            const weekDate = new Date(s.week_start + 'T12:00:00')
            const label = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
            const isCurrent = s.week_start <= today && new Date(new Date(s.week_start + 'T12:00:00').getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA') > today
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isCurrent ? 'bg-amber-50 border border-amber-200' : ''}`}>
                <span className="text-sm text-gray-500 w-24">Week of {label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KID_COLORS[s.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                  {KID_DISPLAY[s.kid_name] || s.kid_name}
                </span>
                {isCurrent && <span className="text-xs text-amber-600 font-medium ml-auto">This week</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">History — Last 30 Days</h2>
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {ALL_KIDS.map(kid => (
            <button key={kid} onClick={() => setFilterKid(kid)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                filterKid === kid ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {kid === 'all' ? 'All Kids' : KID_DISPLAY[kid]}
            </button>
          ))}
        </div>

        {/* Completion rates */}
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
