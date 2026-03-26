'use client'

import { useState, useEffect } from 'react'
import { Target, Plus, X } from 'lucide-react'

interface Goal { id: number; goal_name: string; target_points: number; current_points: number; completed?: boolean }
interface FamilyGoal { id: number; goal_name: string; target_points: number; current_points: number; completed?: boolean }

export default function GoalsTab({ childName }: { childName: string }) {
  const [kidGoals, setKidGoals] = useState<Goal[]>([])
  const [familyGoals, setFamilyGoals] = useState<FamilyGoal[]>([])
  const [balance, setBalance] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [addingPts, setAddingPts] = useState<number | null>(null)
  const [ptsAmount, setPtsAmount] = useState('')

  const childKey = childName.toLowerCase()

  useEffect(() => {
    Promise.all([
      fetch(`/api/kids/points?action=get_goals&child=${childKey}`).then(r => r.json()),
      fetch(`/api/kids/points?action=get_balance&child=${childKey}`).then(r => r.json()),
    ]).then(([goalData, balData]) => {
      setKidGoals(goalData.kidGoals || [])
      setFamilyGoals(goalData.familyGoals || [])
      setBalance(balData.balance?.current_points || 0)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [childKey])

  const addGoal = async () => {
    if (!goalName.trim() || !goalTarget) return
    await fetch('/api/kids/points', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_goal', child: childKey, goal_name: goalName.trim(), target_points: parseInt(goalTarget) })
    })
    setKidGoals(prev => [...prev, { id: Date.now(), goal_name: goalName.trim(), target_points: parseInt(goalTarget), current_points: 0 }])
    setGoalName(''); setGoalTarget(''); setShowAdd(false)
  }

  const addPoints = async (goalId: number) => {
    const pts = parseInt(ptsAmount)
    if (!pts || pts <= 0 || pts > balance) return
    await fetch('/api/kids/points', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_goal_progress', goalId, current_points: (kidGoals.find(g => g.id === goalId)?.current_points || 0) + pts })
    })
    setKidGoals(prev => prev.map(g => g.id === goalId ? { ...g, current_points: g.current_points + pts } : g))
    setBalance(prev => prev - pts)
    setAddingPts(null); setPtsAmount('')
  }

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" /></div>

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">My Goals</h1>
        <p className="text-pink-200">Available balance: {balance} pts</p>
      </div>

      {/* Savings Goals */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Target className="w-5 h-5 text-pink-500" /> Savings Goals</h2>
          <button onClick={() => setShowAdd(true)} className="text-pink-600 hover:text-pink-800"><Plus className="w-5 h-5" /></button>
        </div>

        {showAdd && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border space-y-2">
            <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Goal name" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Target points" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={addGoal} disabled={!goalName.trim() || !goalTarget} className="bg-pink-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-pink-600 disabled:opacity-50">Create Goal</button>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {kidGoals.length === 0 && !showAdd && <p className="text-gray-400 text-sm text-center py-4">Set your first goal!</p>}

        {kidGoals.map(goal => {
          const pct = goal.target_points > 0 ? Math.min(100, Math.round((goal.current_points / goal.target_points) * 100)) : 0
          const isComplete = goal.current_points >= goal.target_points
          return (
            <div key={goal.id} className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className={`font-medium ${isComplete ? 'text-green-700' : 'text-gray-900'}`}>{isComplete ? '✅ ' : ''}{goal.goal_name}</span>
                <span className="text-gray-500">{goal.current_points} / {goal.target_points} pts ({pct}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div className={`${isComplete ? 'bg-green-500' : 'bg-pink-500'} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
              {!isComplete && (
                addingPts === goal.id ? (
                  <div className="flex gap-2 items-center">
                    <input type="number" value={ptsAmount} onChange={e => setPtsAmount(e.target.value)} placeholder="Pts" className="w-20 border rounded px-2 py-1 text-sm" autoFocus />
                    <button onClick={() => addPoints(goal.id)} className="bg-pink-500 text-white px-2 py-1 rounded text-xs">Add</button>
                    <button onClick={() => setAddingPts(null)} className="text-gray-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <button onClick={() => { setAddingPts(goal.id); setPtsAmount('') }} className="text-xs text-pink-600 hover:text-pink-800">+ Add Points</button>
                )
              )}
            </div>
          )
        })}
      </div>

      {/* Family Goals */}
      {familyGoals.filter(g => !g.completed).length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Family Goals</h2>
          {familyGoals.filter(g => !g.completed).map(goal => {
            const pct = goal.target_points > 0 ? Math.min(100, Math.round((goal.current_points / goal.target_points) * 100)) : 0
            return (
              <div key={goal.id} className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{goal.goal_name}</span>
                  <span className="text-gray-500">{goal.current_points} / {goal.target_points} pts</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Everyone's contributing through completed chores</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
