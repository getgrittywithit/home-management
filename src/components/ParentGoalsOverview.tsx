'use client'

import { useState, useEffect } from 'react'
import { Target, Users, Plus } from 'lucide-react'
import { ALL_KIDS, KID_DISPLAY } from '@/lib/constants'

interface Goal {
  id: number
  goal_name: string
  target_stars: number
  current_balance: number
}

interface KidGoalData {
  name: string
  display: string
  balance: number
  goals: Goal[]
}

export default function ParentGoalsOverview() {
  const [kidData, setKidData] = useState<KidGoalData[]>([])
  const [familyGoals, setFamilyGoals] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showAddFamily, setShowAddFamily] = useState(false)
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      const results: KidGoalData[] = []
      for (const kid of ALL_KIDS) {
        try {
          const [goalRes, balRes] = await Promise.all([
            fetch(`/api/stars?action=get_savings_goals&kid_name=${kid}`).then(r => r.json()),
            fetch(`/api/stars?action=get_balance&kid_name=${kid}`).then(r => r.json()),
          ])
          results.push({
            name: kid,
            display: KID_DISPLAY[kid] || kid,
            balance: balRes.balance ?? 0,
            goals: goalRes.goals || [],
          })
        } catch {
          results.push({ name: kid, display: KID_DISPLAY[kid] || kid, balance: 0, goals: [] })
        }
      }
      setKidData(results)

      // Fetch family goals
      try {
        const res = await fetch('/api/stars?action=get_family_goals')
        const data = await res.json()
        setFamilyGoals(data.goals || [])
      } catch {
        setFamilyGoals([])
      }

      setLoaded(true)
    }
    fetchAll()
  }, [])

  if (!loaded) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
    </div>
  )

  const addFamilyGoal = async () => {
    if (!newGoalName.trim() || !newGoalTarget) return
    const res = await fetch('/api/stars', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_family_goal', goal_name: newGoalName.trim(), target_points: parseInt(newGoalTarget), created_by: 'parent' }),
    }).then(r => r.json()).catch(() => null)
    if (res?.goal) {
      setFamilyGoals(prev => [res.goal, ...prev])
    }
    setNewGoalName(''); setNewGoalTarget(''); setShowAddFamily(false)
  }

  const kidsWithGoals = kidData.filter(k => k.goals.length > 0)
  const kidsWithoutGoals = kidData.filter(k => k.goals.length === 0)

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-6 h-6" /> Goals Overview
        </h1>
        <p className="text-pink-200 mt-1">All kids&apos; savings goals and family goals</p>
      </div>

      {/* Family Goals */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> Family Goals
          </h2>
          <button onClick={() => setShowAddFamily(true)} className="text-blue-600 hover:text-blue-800">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {showAddFamily && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border space-y-2">
            <input type="text" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} placeholder="Family goal name" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="number" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} placeholder="Target points" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={addFamilyGoal} disabled={!newGoalName.trim() || !newGoalTarget} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">Create Goal</button>
              <button onClick={() => setShowAddFamily(false)} className="text-gray-500 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {familyGoals.length === 0 && !showAddFamily && (
          <p className="text-gray-400 text-sm text-center py-4">No family goals yet. Create one to get started!</p>
        )}

        {familyGoals.map((goal: any) => {
          const pct = goal.target_points > 0 ? Math.min(100, Math.round(((goal.current_points || 0) / goal.target_points) * 100)) : 0
          const isComplete = goal.completed
          return (
            <div key={goal.id} className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className={`font-medium ${isComplete ? 'text-green-700' : 'text-gray-900'}`}>
                  {isComplete ? '✅ ' : ''}{goal.goal_name}
                </span>
                <span className="text-gray-500">{goal.current_points || 0} / {goal.target_points} pts ({pct}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${isComplete ? 'bg-green-500' : 'bg-blue-500'} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Per-Kid Goals */}
      {kidsWithGoals.map(kid => (
        <div key={kid.name} className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">{kid.display}</h2>
            <span className="text-sm text-gray-500">{kid.balance} pts available</span>
          </div>
          {kid.goals.map((goal: any) => {
            const current = goal.current_balance ?? 0
            const target = goal.target_stars ?? goal.target_points ?? 0
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
            const isComplete = current >= target
            return (
              <div key={goal.id} className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className={`font-medium ${isComplete ? 'text-green-700' : 'text-gray-800'}`}>
                    {isComplete ? '✅ ' : ''}{goal.goal_name}
                  </span>
                  <span className="text-gray-500">{current} / {target} pts ({pct}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${isComplete ? 'bg-green-500' : 'bg-pink-500'} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {/* Kids with no goals */}
      {kidsWithoutGoals.length > 0 && (
        <div className="bg-gray-50 rounded-lg border p-4">
          <p className="text-sm text-gray-500">
            No goals set yet: {kidsWithoutGoals.map(k => k.display).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
