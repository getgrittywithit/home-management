'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Printer, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react'

const MOOD_EMOJIS: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '😊', 5: '😄' }
const FLAG_LABELS: Record<string, string> = {
  mood_low: 'mood low this week', break_flag: 'asked for a break',
  chores_low: 'chores below 50%', sick: 'sick day this week',
  health_request: 'open health request', cycle_irregular: 'cycle irregularity flagged',
  dental_broken: 'dental streak broken',
}

interface KidData {
  name: string; displayName: string; flags: string[]
  chores: { requiredDone: number; requiredTotal: number; pct: number; missedDays: number }
  mood: { avg: number | null; trend: string; scores: (number | null)[]; breakFlagThisWeek: boolean }
  points: { earnedThisWeek: number; deductedThisWeek: number; currentBalance: number }
  dental: { streak: number; completedThisWeek: number; totalThisWeek: number }
  health: { openRequests: number; sickDaysThisWeek: number }
  cycle: { note: string | null } | null
}

interface FamilyGoal { title: string; current: number; target: number; pct: number }

export default function WeeklySummaryTab() {
  const [weekOf, setWeekOf] = useState('')
  const [kids, setKids] = useState<KidData[]>([])
  const [flaggedKids, setFlaggedKids] = useState<string[]>([])
  const [familyGoals, setFamilyGoals] = useState<FamilyGoal[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/parent/weekly-summary')
      .then(r => r.json())
      .then(data => {
        setWeekOf(data.weekOf || '')
        setKids(data.kids || [])
        setFlaggedKids(data.flaggedKids || [])
        setFamilyGoals(data.familyGoalProgress || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" /></div>

  const weekEnd = weekOf ? new Date(new Date(weekOf + 'T12:00:00').getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const weekStart = weekOf ? new Date(weekOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

  // Sort: flagged kids first
  const sorted = [...kids].sort((a, b) => {
    const aF = a.flags.length > 0 ? 0 : 1
    const bF = b.flags.length > 0 ? 0 : 1
    return aF - bF
  })

  const chorePctColor = (pct: number) => pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  const chorePctText = (pct: number) => pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-500 text-white p-6 rounded-lg print:bg-white print:text-black print:p-2 print:border-b-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold print:text-lg">Weekly Summary</h1>
          <p className="text-violet-200 print:text-gray-600">{weekStart} – {weekEnd}</p>
        </div>
        <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg print:hidden">
          <Printer className="w-5 h-5" />
        </button>
      </div>

      {/* Needs Attention */}
      {flaggedKids.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 print:p-2">
          <h2 className="font-bold text-red-900 flex items-center gap-2 mb-2 print:text-sm">
            <AlertTriangle className="w-5 h-5 print:w-4 print:h-4" /> Needs Attention
          </h2>
          <div className="space-y-1">
            {sorted.filter(k => k.flags.length > 0).map(k => (
              <p key={k.name} className="text-sm text-red-800 print:text-xs">
                <span className="font-medium">{k.displayName}</span> — {k.flags.map(f => FLAG_LABELS[f] || f).join(', ')}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Kid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
        {sorted.map(kid => (
          <div key={kid.name} className={`bg-white rounded-lg border shadow-sm p-4 print:p-2 print:text-xs ${kid.flags.length > 0 ? 'border-l-4 border-l-amber-500' : ''}`}>
            {/* Kid header */}
            <div className="flex items-center justify-between mb-3 print:mb-1">
              <h3 className="font-bold text-gray-900">{kid.displayName}</h3>
              {kid.flags.length === 0 ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded print:text-[10px]">No flags</span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded print:text-[10px]">{kid.flags.length} flag{kid.flags.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Chores */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm print:text-xs">
                <span className="text-gray-600">Chores</span>
                <span className={`font-medium ${chorePctText(kid.chores.pct)}`}>{kid.chores.pct}% ({kid.chores.requiredDone}/{kid.chores.requiredTotal})</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div className={`${chorePctColor(kid.chores.pct)} h-1.5 rounded-full`} style={{ width: `${Math.min(kid.chores.pct, 100)}%` }} />
              </div>
            </div>

            {/* Mood */}
            <div className="mb-2 flex items-center justify-between text-sm print:text-xs">
              <span className="text-gray-600">Mood</span>
              <div className="flex items-center gap-2">
                {kid.mood.avg !== null ? (
                  <>
                    <span>{MOOD_EMOJIS[Math.round(kid.mood.avg)] || '😐'} {kid.mood.avg}</span>
                    {kid.mood.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                    {kid.mood.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                    {kid.mood.trend === 'stable' && <Minus className="w-3.5 h-3.5 text-gray-400" />}
                  </>
                ) : <span className="text-gray-400">—</span>}
              </div>
            </div>
            {/* Mood dots */}
            <div className="flex gap-1 mb-2">
              {kid.mood.scores.map((s, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${s !== null ? 'bg-violet-400' : 'bg-gray-200'}`} title={['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]} />
              ))}
            </div>

            {/* Points */}
            <div className="mb-2 flex items-center justify-between text-sm print:text-xs">
              <span className="text-gray-600">Points</span>
              <span>
                <span className="text-green-600">+{kid.points.earnedThisWeek}</span>
                {kid.points.deductedThisWeek > 0 && <span className="text-red-500 ml-1">−{kid.points.deductedThisWeek}</span>}
                <span className="text-gray-500 ml-2">{kid.points.currentBalance} bal</span>
              </span>
            </div>

            {/* Health */}
            <div className="text-sm text-gray-500 print:text-xs">
              {kid.health.sickDaysThisWeek > 0 && <span className="text-amber-600 mr-2">{kid.health.sickDaysThisWeek} sick day{kid.health.sickDaysThisWeek > 1 ? 's' : ''}</span>}
              {kid.health.openRequests > 0 && <span className="text-red-500">{kid.health.openRequests} open request</span>}
              {kid.health.sickDaysThisWeek === 0 && kid.health.openRequests === 0 && 'No health flags'}
            </div>

            {/* Cycle (girls only) */}
            {kid.cycle && (
              <div className="text-xs text-gray-400 mt-1">{kid.cycle.note || 'No cycle notes'}</div>
            )}
          </div>
        ))}
      </div>

      {/* Family Goals */}
      {familyGoals.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5 print:p-2">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3 print:text-sm print:mb-1">
            <Target className="w-5 h-5 text-violet-500 print:w-4 print:h-4" /> Family Goals
          </h2>
          {familyGoals.map((g, i) => (
            <div key={i} className="mb-2">
              <div className="flex items-center justify-between text-sm print:text-xs">
                <span className="text-gray-700">{g.title}</span>
                <span className="text-gray-500">{g.pct}% ({g.current}/{g.target})</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${Math.min(g.pct, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
