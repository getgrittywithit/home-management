'use client'

import { useState, useEffect } from 'react'
import {
  Star, DollarSign, AlertTriangle, Trophy, Target, Users,
  Plus, Minus, Settings, Save, Heart, ChevronDown, ChevronUp, X
} from 'lucide-react'

interface Balance {
  kid_name: string
  current_points: number
  total_earned_all_time: number
  last_payout_date: string | null
}

interface PointsSettings {
  mode: 'points' | 'dollars'
  conversion_rate: number
}

interface FamilyGoal {
  id: number
  goal_name: string
  target_points: number
  current_points: number
  completed: boolean
}

interface SickDay {
  id: number
  kid_name: string
  sick_date: string
  reason: string
  severity: string
  notes: string | null
  saw_doctor: boolean
}

const KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee'
}
const SICK_REASONS = ['Headache', 'Stomach', 'Nausea', 'Fatigue', 'Fever', 'Anxiety', 'Not feeling well', 'Other']
const SEVERITY_LEVELS = ['Mild', 'Moderate', "Couldn't get out of bed"]

export default function PointsEarningTab() {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'family-goals' | 'sick-days' | 'settings'>('overview')
  const [balances, setBalances] = useState<Balance[]>([])
  const [settings, setSettings] = useState<PointsSettings>({ mode: 'points', conversion_rate: 0.10 })
  const [sickDayCounts, setSickDayCounts] = useState<Record<string, number>>({})
  const [familyGoals, setFamilyGoals] = useState<FamilyGoal[]>([])
  const [sickDays, setSickDays] = useState<SickDay[]>([])
  const [loaded, setLoaded] = useState(false)

  // Modal states
  const [payoutKid, setPayoutKid] = useState<string | null>(null)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutNote, setPayoutNote] = useState('')
  const [deductKid, setDeductKid] = useState<string | null>(null)
  const [deductAmount, setDeductAmount] = useState('')
  const [deductReason, setDeductReason] = useState('')
  const [showAddFamilyGoal, setShowAddFamilyGoal] = useState(false)
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('')
  const [showAddSickDay, setShowAddSickDay] = useState(false)
  const [sickKid, setSickKid] = useState('amos')
  const [sickDate, setSickDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
  const [sickReason, setSickReason] = useState('Not feeling well')
  const [sickSeverity, setSickSeverity] = useState('Mild')
  const [sickNotes, setSickNotes] = useState('')
  const [sickDoctor, setSickDoctor] = useState(false)
  const [selectedSickKid, setSelectedSickKid] = useState('amos')

  // Settings draft
  const [draftMode, setDraftMode] = useState<'points' | 'dollars'>('points')
  const [draftRate, setDraftRate] = useState('0.10')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    Promise.all([
      fetch('/api/kids/points?action=get_all_balances').then(r => r.json()),
      fetch('/api/kids/points?action=get_family_goals').then(r => r.json()),
    ]).then(([balData, goalData]) => {
      setBalances(balData.balances || [])
      setSettings(balData.settings || settings)
      setSickDayCounts(balData.sickDayCounts || {})
      setDraftMode(balData.settings?.mode || 'points')
      setDraftRate(String(balData.settings?.conversion_rate || 0.10))
      setFamilyGoals(goalData.familyGoals || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }

  const loadSickDays = (kid: string) => {
    setSelectedSickKid(kid)
    fetch(`/api/kids/points?action=get_sick_days&child=${kid}`)
      .then(r => r.json())
      .then(data => setSickDays(data.sickDays || []))
  }

  useEffect(() => {
    if (activeSubTab === 'sick-days') loadSickDays(selectedSickKid)
  }, [activeSubTab])

  const fmt = (pts: number) => {
    if (settings.mode === 'dollars') return `$${(pts * settings.conversion_rate).toFixed(2)}`
    return `${pts} pts`
  }

  const handlePayout = async () => {
    if (!payoutKid || !payoutAmount) return
    await fetch('/api/kids/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_payout', child: payoutKid, points: parseInt(payoutAmount), note: payoutNote || 'Payout' })
    })
    setPayoutKid(null)
    setPayoutAmount('')
    setPayoutNote('')
    loadData()
  }

  const handleDeduction = async () => {
    if (!deductKid || !deductAmount || !deductReason.trim()) return
    await fetch('/api/kids/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_deduction', child: deductKid, points: parseInt(deductAmount), reason: deductReason.trim() })
    })
    setDeductKid(null)
    setDeductAmount('')
    setDeductReason('')
    loadData()
  }

  const handleAddFamilyGoal = async () => {
    if (!newGoalName.trim() || !newGoalTarget) return
    await fetch('/api/kids/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_family_goal', goal_name: newGoalName.trim(), target_points: parseInt(newGoalTarget) })
    })
    setShowAddFamilyGoal(false)
    setNewGoalName('')
    setNewGoalTarget('')
    loadData()
  }

  const handleCompleteFamilyGoal = async (goalId: number) => {
    await fetch('/api/kids/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_family_goal', goalId })
    })
    loadData()
  }

  const handleLogSickDay = async () => {
    await fetch('/api/kids/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log_sick_day',
        child: sickKid, sick_date: sickDate, reason: sickReason,
        severity: sickSeverity, notes: sickNotes || null, saw_doctor: sickDoctor
      })
    })
    setShowAddSickDay(false)
    setSickNotes('')
    setSickDoctor(false)
    loadSickDays(selectedSickKid)
    loadData()
  }

  const handleSaveSettings = async () => {
    await fetch('/api/kids/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_settings', mode: draftMode, conversion_rate: parseFloat(draftRate) })
    })
    loadData()
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Points & Earning</h1>
        <p className="text-amber-100">Manage kids' points, goals, payouts, and sick days</p>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white border rounded-lg">
        <div className="flex border-b overflow-x-auto">
          {([
            { id: 'overview', label: 'All Kids', icon: Star },
            { id: 'family-goals', label: 'Family Goals', icon: Trophy },
            { id: 'sick-days', label: 'Sick Day Log', icon: Heart },
            { id: 'settings', label: 'Settings', icon: Settings },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 font-medium whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'border-b-2 border-amber-500 text-amber-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ─── Overview ─── */}
          {activeSubTab === 'overview' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-3 font-medium">Kid</th>
                      <th className="pb-3 font-medium text-right">Balance</th>
                      <th className="pb-3 font-medium text-right">Total Earned</th>
                      <th className="pb-3 font-medium text-right">Last Payout</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {balances.map(kid => (
                      <tr key={kid.kid_name} className="text-sm">
                        <td className="py-3 font-medium text-gray-900">
                          {KID_DISPLAY[kid.kid_name] || kid.kid_name}
                          {(sickDayCounts[kid.kid_name] || 0) >= 2 && (
                            <span className="ml-2 text-amber-500" title="2+ sick days in last 30 days">
                              <AlertTriangle className="w-4 h-4 inline" />
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right font-semibold text-amber-600">{fmt(kid.current_points)}</td>
                        <td className="py-3 text-right text-gray-600">{fmt(kid.total_earned_all_time)}</td>
                        <td className="py-3 text-right text-gray-500">
                          {kid.last_payout_date
                            ? new Date(kid.last_payout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => { setPayoutKid(kid.kid_name); setPayoutAmount(''); setPayoutNote('') }}
                              className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200"
                            >
                              Payout
                            </button>
                            <button
                              onClick={() => { setDeductKid(kid.kid_name); setDeductAmount(''); setDeductReason('') }}
                              className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs hover:bg-rose-200"
                            >
                              Deduct
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payout Modal */}
              {payoutKid && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setPayoutKid(null)}>
                  <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">Log Payout — {KID_DISPLAY[payoutKid]}</h3>
                      <button onClick={() => setPayoutKid(null)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Points to redeem</label>
                        <input type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2" placeholder="50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                        <input type="text" value={payoutNote} onChange={e => setPayoutNote(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2" placeholder="Weekly payout" />
                      </div>
                      <button onClick={handlePayout} disabled={!payoutAmount}
                        className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:opacity-50">
                        Confirm Payout
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Deduction Modal */}
              {deductKid && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDeductKid(null)}>
                  <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">Log Deduction — {KID_DISPLAY[deductKid]}</h3>
                      <button onClick={() => setDeductKid(null)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Points to deduct</label>
                        <input type="number" value={deductAmount} onChange={e => setDeductAmount(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2" placeholder="10" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
                        <input type="text" value={deductReason} onChange={e => setDeductReason(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2" placeholder="Reason for deduction" />
                      </div>
                      <button onClick={handleDeduction} disabled={!deductAmount || !deductReason.trim()}
                        className="w-full bg-rose-500 text-white py-2 rounded-lg hover:bg-rose-600 disabled:opacity-50">
                        Confirm Deduction
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Family Goals ─── */}
          {activeSubTab === 'family-goals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Active Family Goals</h3>
                <button onClick={() => setShowAddFamilyGoal(true)}
                  className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Goal
                </button>
              </div>

              {showAddFamilyGoal && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex gap-3 mb-3">
                    <input type="text" value={newGoalName} onChange={e => setNewGoalName(e.target.value)}
                      placeholder="Goal name (e.g., Family Movie Night)" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                    <input type="number" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)}
                      placeholder="Target pts" className="w-28 border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddFamilyGoal} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600">Save</button>
                    <button onClick={() => setShowAddFamilyGoal(false)} className="text-gray-500 text-sm px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              )}

              {familyGoals.filter(g => !g.completed).map(goal => {
                const pct = goal.target_points > 0 ? Math.min(100, Math.round((goal.current_points / goal.target_points) * 100)) : 0
                return (
                  <div key={goal.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{goal.goal_name}</h4>
                      {goal.current_points >= goal.target_points && (
                        <button onClick={() => handleCompleteFamilyGoal(goal.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600">
                          Mark Redeemed
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">{fmt(goal.current_points)} / {fmt(goal.target_points)}</span>
                      <span className="text-amber-600 font-medium">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-amber-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}

              {familyGoals.filter(g => !g.completed).length === 0 && !showAddFamilyGoal && (
                <p className="text-center text-gray-400 py-8">No active family goals. Add one above!</p>
              )}

              {/* Completed goals */}
              {familyGoals.filter(g => g.completed).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 mt-6">Completed Goals</h4>
                  {familyGoals.filter(g => g.completed).map(goal => (
                    <div key={goal.id} className="p-3 border rounded-lg bg-gray-50 mb-2 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600 line-through">{goal.goal_name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{fmt(goal.target_points)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Sick Days ─── */}
          {activeSubTab === 'sick-days' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {KIDS.map(kid => (
                    <button key={kid} onClick={() => loadSickDays(kid)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        selectedSickKid === kid ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {KID_DISPLAY[kid]}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowAddSickDay(true)}
                  className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-rose-600 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Log Sick Day
                </button>
              </div>

              {showAddSickDay && (
                <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                  <h4 className="font-medium">Log Sick Day</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kid</label>
                      <select value={sickKid} onChange={e => setSickKid(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                        {KIDS.map(k => <option key={k} value={k}>{KID_DISPLAY[k]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                      <input type="date" value={sickDate} onChange={e => setSickDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                      <select value={sickReason} onChange={e => setSickReason(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                        {SICK_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
                      <select value={sickSeverity} onChange={e => setSickSeverity(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                        {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                    <input type="text" value={sickNotes} onChange={e => setSickNotes(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Any additional notes" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={sickDoctor} onChange={e => setSickDoctor(e.target.checked)} className="rounded" />
                    Saw a doctor
                  </label>
                  <div className="flex gap-2">
                    <button onClick={handleLogSickDay} className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-rose-600">Save</button>
                    <button onClick={() => setShowAddSickDay(false)} className="text-gray-500 text-sm px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              )}

              {/* Sick day list */}
              {sickDays.length > 0 ? (
                <div className="divide-y border rounded-lg">
                  {sickDays.map(day => (
                    <div key={day.id} className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Heart className="w-5 h-5 text-rose-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(day.sick_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            day.severity === 'Mild' ? 'bg-yellow-100 text-yellow-700' :
                            day.severity === 'Moderate' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {day.severity}
                          </span>
                          {day.saw_doctor && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Doctor visit</span>}
                        </div>
                        <p className="text-sm text-gray-600">{day.reason}</p>
                        {day.notes && <p className="text-xs text-gray-400 mt-0.5">{day.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">No sick days logged for {KID_DISPLAY[selectedSickKid]} in the last 90 days</p>
              )}
            </div>
          )}

          {/* ─── Settings ─── */}
          {activeSubTab === 'settings' && (
            <div className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Mode</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDraftMode('points')}
                    className={`flex-1 p-3 rounded-lg border-2 text-center ${
                      draftMode === 'points' ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                    }`}
                  >
                    <Star className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                    <div className="text-sm font-medium">Points</div>
                  </button>
                  <button
                    onClick={() => setDraftMode('dollars')}
                    className={`flex-1 p-3 rounded-lg border-2 text-center ${
                      draftMode === 'dollars' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <DollarSign className="w-6 h-6 mx-auto mb-1 text-green-500" />
                    <div className="text-sm font-medium">Dollars</div>
                  </button>
                </div>
              </div>

              {draftMode === 'dollars' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conversion Rate</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">10 points =</span>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">$</span>
                      <input type="number" step="0.01" value={draftRate}
                        onChange={e => setDraftRate(e.target.value)}
                        className="w-20 border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Example: 100 points = ${(100 * parseFloat(draftRate || '0')).toFixed(2)}
                  </p>
                </div>
              )}

              <button onClick={handleSaveSettings}
                className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
