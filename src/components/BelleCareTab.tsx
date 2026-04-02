'use client'

import { useState, useEffect } from 'react'
import { Dog, CheckCircle2, AlertTriangle, Calendar, RefreshCw } from 'lucide-react'

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', kaylee: 'Kaylee'
}
const KID_COLORS: Record<string, string> = {
  amos: 'bg-blue-100 text-blue-700', ellie: 'bg-purple-100 text-purple-700',
  wyatt: 'bg-green-100 text-green-700', hannah: 'bg-pink-100 text-pink-700',
  kaylee: 'bg-teal-100 text-teal-700',
}
const BELLE_KIDS = ['all', 'amos', 'ellie', 'wyatt', 'hannah', 'kaylee']

export default function BelleCareTab() {
  const [todayData, setTodayData] = useState<any>(null)
  const [weekDays, setWeekDays] = useState<any[]>([])
  const [weekends, setWeekends] = useState<any[]>([])
  const [groomingSchedule, setGroomingSchedule] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [groomingLogs, setGroomingLogs] = useState<any[]>([])
  const [swaps, setSwaps] = useState<any[]>([])
  const [filterKid, setFilterKid] = useState('all')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/kids/belle?action=get_todays_assignee').then(r => r.json()),
      fetch('/api/kids/belle?action=get_weekly_overview').then(r => r.json()),
      fetch('/api/kids/belle?action=get_weekend_schedule').then(r => r.json()),
      fetch('/api/kids/belle?action=get_grooming_schedule').then(r => r.json()),
      fetch('/api/kids/belle?action=get_history').then(r => r.json()),
      fetch('/api/kids/belle?action=get_swap_log').then(r => r.json()),
    ]).then(([today, week, wknd, groom, hist, swapLog]) => {
      setTodayData(today)
      setWeekDays(week.days || [])
      setWeekends(wknd.weekends || [])
      setGroomingSchedule(groom.grooming || [])
      setLogs(hist.logs || [])
      setGroomingLogs(hist.groomingLogs || [])
      setSwaps(swapLog.swaps || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  if (!loaded) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>
  }

  const todayTasks = todayData?.tasks || []
  const todayGrooming = todayData?.grooming || []
  const todayDone = todayTasks.filter((t: any) => t.completed).length + todayGrooming.filter((t: any) => t.completed).length
  const todayTotal = todayTasks.length + todayGrooming.length
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const hr = now.getHours()
  const amLate = hr >= 10 && todayTasks.some((t: any) => t.key === 'am_feed_walk' && !t.completed)
  const pmLate = hr >= 19 && todayTasks.some((t: any) => (t.key === 'pm_feed' || t.key === 'pm_walk') && !t.completed)
  const missedGrooming = groomingSchedule.filter((g: any) => g.missed_flag)
  const activeSwaps = swaps.filter((s: any) => s.status === 'pending' || (s.status === 'accepted' && new Date(s.swap_date + 'T23:59:59') >= new Date()))
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  // History stats
  const filteredLogs = filterKid === 'all' ? logs : logs.filter((l: any) => l.kid_name === filterKid)
  const kidStats: Record<string, { done: number; total: number }> = {}
  filteredLogs.forEach((l: any) => {
    if (!kidStats[l.kid_name]) kidStats[l.kid_name] = { done: 0, total: 0 }
    kidStats[l.kid_name].total++
    if (l.completed) kidStats[l.kid_name].done++
  })
  const filteredGroom = filterKid === 'all' ? groomingLogs : groomingLogs.filter((l: any) => l.kid_name === filterKid)
  const groomStats: Record<string, { done: number; total: number }> = {}
  filteredGroom.forEach((l: any) => {
    if (!groomStats[l.kid_name]) groomStats[l.kid_name] = { done: 0, total: 0 }
    groomStats[l.kid_name].total++
    if (l.completed) groomStats[l.kid_name].done++
  })

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Dog className="w-8 h-8" />
          <div><h1 className="text-2xl font-bold">Belle Care</h1><p className="text-amber-100">Daily care, grooming, and rotation</p></div>
        </div>
      </div>

      {/* Active Swaps */}
      {activeSwaps.length > 0 && (
        <div className="space-y-2">
          {activeSwaps.map((s: any) => (
            <div key={s.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <div className="text-sm">
                <span className="font-medium text-blue-900">{KID_DISPLAY[s.requesting_kid]}</span> asked <span className="font-medium text-blue-900">{KID_DISPLAY[s.covering_kid]}</span> to cover {s.swap_type === 'weekend' ? 'weekend' : s.swap_date}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${s.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {s.status === 'accepted' ? 'Accepted ✅' : 'Pending'}
                </span>
                {s.reason && <span className="text-xs text-blue-600 ml-1">"{s.reason}"</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">🐾 Today</h2>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${KID_COLORS[todayData?.assignee] || 'bg-gray-100 text-gray-700'}`}>
            {KID_DISPLAY[todayData?.assignee] || todayData?.assignee} on duty
          </span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
            <div className="bg-amber-500 h-2.5 rounded-full transition-all" style={{ width: `${todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{todayDone}/{todayTotal}</span>
        </div>
        {amLate && <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700 mb-2"><AlertTriangle className="w-3.5 h-3.5" /> AM feed + walk incomplete past 10 AM</div>}
        {pmLate && <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700 mb-2"><AlertTriangle className="w-3.5 h-3.5" /> PM tasks incomplete past 7 PM</div>}
        <div className="divide-y mt-2">
          {todayTasks.map((t: any) => (
            <div key={t.key} className="flex items-center gap-2 py-2 text-sm">
              {t.completed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <span className="w-4 h-4 border-2 border-gray-300 rounded-full" />}
              <span>{t.emoji}</span>
              <span className={t.completed ? 'text-gray-400 line-through' : 'text-gray-800'}>{t.label}</span>
              {t.time && <span className="text-xs text-gray-400 ml-auto">{t.time}</span>}
            </div>
          ))}
          {todayGrooming.length > 0 && (
            <>
              <div className="py-1 text-xs font-medium text-purple-600">Weekend Grooming</div>
              {todayGrooming.map((t: any) => (
                <div key={t.key} className="flex items-center gap-2 py-2 text-sm">
                  {t.completed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <span className="w-4 h-4 border-2 border-gray-300 rounded-full" />}
                  <span>{t.emoji}</span>
                  <span className={t.completed ? 'text-gray-400 line-through' : 'text-gray-800'}>{t.label}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">This Week</h2>
        <div className="grid grid-cols-6 gap-2">
          {/* Weekdays Mon-Fri */}
          {weekDays.filter((d: any) => {
            const dow = new Date(d.date + 'T12:00:00').getDay()
            return dow >= 1 && dow <= 5
          }).map((d: any) => {
            const isToday = d.date === todayStr
            const isPast = d.date < todayStr
            const pct = d.totalTasks > 0 ? d.completedTasks / d.totalTasks : 0
            return (
              <div key={d.date} className={`text-center p-2 rounded-lg ${isToday ? 'ring-2 ring-amber-400 bg-amber-50' : 'bg-gray-50'}`}>
                <p className="text-xs font-medium text-gray-600">{d.dayName}</p>
                <p className={`text-xs ${KID_COLORS[d.assignee]?.split(' ')[1] || 'text-gray-500'}`}>{KID_DISPLAY[d.assignee] || '—'}</p>
                <div className="text-lg mt-1">
                  {!isPast && !isToday ? '⬜' : pct >= 1 ? '✅' : pct > 0 ? '⚠️' : isPast ? '❌' : '⬜'}
                </div>
                <p className="text-xs text-gray-400">{d.completedTasks}/{d.totalTasks}</p>
              </div>
            )
          })}
          {/* Merged weekend */}
          {(() => {
            const sat = weekDays.find((d: any) => new Date(d.date + 'T12:00:00').getDay() === 6)
            const sun = weekDays.find((d: any) => new Date(d.date + 'T12:00:00').getDay() === 0)
            if (!sat) return null
            const isWeekendToday = (sat.date === todayStr) || (sun?.date === todayStr)
            const isPast = sun ? sun.date < todayStr : sat.date < todayStr
            const totalTasks = (sat.totalTasks || 0) + (sun?.totalTasks || 0)
            const doneTasks = (sat.completedTasks || 0) + (sun?.completedTasks || 0)
            const pct = totalTasks > 0 ? doneTasks / totalTasks : 0
            return (
              <div className={`text-center p-2 rounded-lg ${isWeekendToday ? 'ring-2 ring-amber-400 bg-amber-50' : 'bg-gray-50'}`}>
                <p className="text-xs font-medium text-gray-600">Wknd</p>
                <p className={`text-xs ${KID_COLORS[sat.assignee]?.split(' ')[1] || 'text-gray-500'}`}>{KID_DISPLAY[sat.assignee] || '—'}</p>
                <div className="text-lg mt-1">
                  {!isPast && !isWeekendToday ? '⬜' : pct >= 1 ? '✅' : pct > 0 ? '⚠️' : isPast ? '❌' : '⬜'}
                </div>
                <p className="text-xs text-gray-400">{doneTasks}/{totalTasks}</p>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Weekend Schedule + Grooming */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-600" /> Upcoming Weekends</h2>
        <div className="space-y-3">
          {weekends.map((w: any, i: number) => (
            <div key={w.saturday} className={`p-3 rounded-lg ${i === 0 ? 'bg-amber-50 border border-amber-200' : 'border'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Sat-Sun {w.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KID_COLORS[w.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                  {KID_DISPLAY[w.kid_name]}
                </span>
              </div>
              {w.groomingTasks?.length > 0 && (
                <div className="flex gap-2 mt-1">
                  {w.groomingTasks.map((g: any) => (
                    <span key={g.key} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{g.emoji} {g.label}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Missed Grooming Alerts */}
      {missedGrooming.length > 0 && (
        <div className="space-y-2">
          {missedGrooming.map((g: any) => (
            <div key={g.id || g.task + g.due_date} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-800">
                Belle's {g.task.replace('_', ' ')} wasn't completed — {KID_DISPLAY[g.kid_name]}'s weekend {g.weekend_start}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">History — Last 60 Days</h2>
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {BELLE_KIDS.map(kid => (
            <button key={kid} onClick={() => setFilterKid(kid)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${filterKid === kid ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {kid === 'all' ? 'All Kids' : KID_DISPLAY[kid]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(kidStats).map(([kid, s]) => {
            const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
            const gs = groomStats[kid]
            const gpct = gs && gs.total > 0 ? Math.round((gs.done / gs.total) * 100) : null
            return (
              <div key={kid} className="p-3 border rounded-lg text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KID_COLORS[kid] || 'bg-gray-100 text-gray-700'}`}>{KID_DISPLAY[kid]}</span>
                <div className="text-xl font-bold text-amber-600 mt-2">{pct}%</div>
                <p className="text-xs text-gray-400">daily tasks</p>
                {gpct !== null && <p className="text-xs text-purple-500 mt-1">{gpct}% grooming</p>}
              </div>
            )
          })}
        </div>

        {/* Swap Log */}
        {swaps.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium text-gray-700 mb-2">Swap Log</h3>
            <div className="space-y-2">
              {swaps.slice(0, 10).map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded">
                  <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                  <span>{KID_DISPLAY[s.requesting_kid]} → {KID_DISPLAY[s.covering_kid]}</span>
                  <span className="text-xs text-gray-400">{s.swap_type} {s.swap_date}</span>
                  <span className={`text-xs ml-auto ${s.status === 'accepted' ? 'text-green-600' : s.status === 'declined' ? 'text-red-600' : 'text-yellow-600'}`}>{s.status}</span>
                  {s.reason && <span className="text-xs text-gray-400">"{s.reason}"</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(kidStats).length === 0 && <p className="text-center text-gray-400 py-4">No care logs yet</p>}
      </div>
    </div>
  )
}
