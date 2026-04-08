'use client'

import { useState, useEffect } from 'react'
import { Star, Target, Users, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'

interface PointsBalance {
  current_points: number
  total_earned_all_time: number
  last_payout_date: string | null
}

interface PointsSettings {
  mode: 'points' | 'dollars'
  conversion_rate: number
}

interface Goal {
  id: number
  goal_name: string
  target_points: number
  current_points: number
  completed?: boolean
}

interface LogEntry {
  id: number
  transaction_type: 'earned' | 'deducted' | 'payout'
  points: number
  reason: string
  logged_date: string
}

export default function KidPointsCard({ childName }: { childName: string }) {
  const [balance, setBalance] = useState<PointsBalance>({ current_points: 0, total_earned_all_time: 0, last_payout_date: null })
  const [settings, setSettings] = useState<PointsSettings>({ mode: 'points', conversion_rate: 0.10 })
  const [kidGoals, setKidGoals] = useState<Goal[]>([])
  const [familyGoals, setFamilyGoals] = useState<Goal[]>([])
  const [history, setHistory] = useState<LogEntry[]>([])
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [weekEarned, setWeekEarned] = useState(0)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    Promise.all([
      fetch(`/api/stars?action=get_balance&kid_name=${childKey}`).then(r => r.json()),
      fetch(`/api/stars?action=get_savings_goals&kid_name=${childKey}`).then(r => r.json()),
      fetch(`/api/stars?action=get_kid_history&kid_name=${childKey}&limit=20`).then(r => r.json()),
    ]).then(([balData, goalData, histData]) => {
      setBalance({
        current_points: balData.balance ?? 0,
        total_earned_all_time: balData.lifetime_earned ?? 0,
        last_payout_date: null,
      })
      const goals = (goalData.goals || []).map((g: any) => ({
        id: g.id,
        goal_name: g.goal_name,
        target_points: g.target_stars,
        current_points: g.current_balance ?? 0,
      }))
      setKidGoals(goals)
      setFamilyGoals([])
      const hist = (histData.history || []).map((h: any) => ({
        id: h.id,
        transaction_type: h.amount >= 0 ? 'earned' as const : 'deducted' as const,
        points: Math.abs(h.amount),
        reason: h.note || h.source || '',
        logged_date: h.created_at,
      }))
      setHistory(hist)
      // Calculate this week's earnings
      const now = new Date()
      const dayOfWeek = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
      monday.setHours(0, 0, 0, 0)
      const earned = hist
        .filter((e: LogEntry) => e.transaction_type === 'earned' && new Date(e.logged_date) >= monday)
        .reduce((sum: number, e: LogEntry) => sum + e.points, 0)
      setWeekEarned(earned)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [childKey])

  const fmt = (pts: number) => {
    if (settings.mode === 'dollars') return `$${(pts * settings.conversion_rate).toFixed(2)}`
    return `${pts} stars`
  }

  const fmtLarge = (pts: number) => {
    if (settings.mode === 'dollars') return `$${(pts * settings.conversion_rate).toFixed(2)}`
    return `${pts}`
  }

  const addGoal = async () => {
    if (!goalName.trim() || !goalTarget) return
    await fetch('/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_savings_goal', kid_name: childKey, goal_name: goalName.trim(), target_stars: parseInt(goalTarget) })
    })
    setKidGoals(prev => [...prev, { id: Date.now(), goal_name: goalName.trim(), target_points: parseInt(goalTarget), current_points: 0 }])
    setGoalName('')
    setGoalTarget('')
    setShowAddGoal(false)
  }

  if (!loaded) return null

  const displayHistory = showAllHistory ? history : history.slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Card 1: My Balance */}
      <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white p-5 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-6 h-6" />
              <span className="text-3xl font-bold">{fmtLarge(balance.current_points)}</span>
              {settings.mode === 'points' && <span className="text-amber-100 text-sm">stars</span>}
            </div>
            <p className="text-amber-100 text-xs">This week: +{fmt(weekEarned)}</p>
            <p className="text-amber-100 text-xs">Total earned all time: {fmt(balance.total_earned_all_time)}</p>
            {balance.last_payout_date && (
              <p className="text-amber-100 text-xs">Last payout: {new Date(balance.last_payout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            )}
          </div>
          <Star className="w-12 h-12 text-amber-200/50" />
        </div>
      </div>

      {/* Card 2: My Goals */}
      {(kidGoals.length > 0 || showAddGoal) && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              My Goals
            </h3>
            {!showAddGoal && (
              <button onClick={() => setShowAddGoal(true)} className="text-purple-600 hover:text-purple-800">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          {kidGoals.map(goal => {
            const pct = goal.target_points > 0 ? Math.min(100, Math.round((goal.current_points / goal.target_points) * 100)) : 0
            return (
              <div key={goal.id} className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{goal.goal_name}</span>
                  <span className="text-gray-500">{fmt(goal.current_points)} / {fmt(goal.target_points)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
          {showAddGoal && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex gap-2 mb-2">
                <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)}
                  placeholder="Goal name" className="flex-1 border rounded px-2 py-1 text-sm" />
                <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)}
                  placeholder="Stars" className="w-20 border rounded px-2 py-1 text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={addGoal} className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600">Save</button>
                <button onClick={() => setShowAddGoal(false)} className="text-gray-500 text-sm">Cancel</button>
              </div>
            </div>
          )}
          {kidGoals.length === 0 && !showAddGoal && (
            <p className="text-sm text-gray-400">Set a goal to save toward something!</p>
          )}
        </div>
      )}

      {kidGoals.length === 0 && !showAddGoal && (
        <button onClick={() => setShowAddGoal(true)}
          className="w-full bg-white rounded-lg border shadow-sm p-4 text-left hover:bg-gray-50">
          <div className="flex items-center gap-2 text-purple-600">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Set a savings goal</span>
            <Plus className="w-3 h-3 ml-auto" />
          </div>
        </button>
      )}

      {/* Card 3: Family Goal */}
      {familyGoals.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-blue-600" />
            Family Goal
          </h3>
          {familyGoals.filter(g => !g.completed).slice(0, 1).map(goal => {
            const pct = goal.target_points > 0 ? Math.min(100, Math.round((goal.current_points / goal.target_points) * 100)) : 0
            return (
              <div key={goal.id}>
                <p className="text-sm text-gray-600 mb-2">Everyone's working toward: <span className="font-medium text-gray-900">{goal.goal_name}</span></p>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">{fmt(goal.current_points)} / {fmt(goal.target_points)}</span>
                  <span className="text-blue-600 font-medium">{pct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Card 4: Recent Activity */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {displayHistory.map(entry => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700 truncate block">{entry.reason}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(entry.logged_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span className={`font-semibold ml-2 flex-shrink-0 ${
                  entry.transaction_type === 'earned' ? 'text-green-600' :
                  entry.transaction_type === 'deducted' ? 'text-rose-600' :
                  'text-gray-500'
                }`}>
                  {entry.transaction_type === 'earned' ? '+' : '-'}{fmt(entry.points)}
                </span>
              </div>
            ))}
          </div>
          {history.length > 5 && (
            <button
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="mt-3 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {showAllHistory ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> View all</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
