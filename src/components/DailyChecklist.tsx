'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2, Circle, Lock, DollarSign, Sparkles,
  Dog, Utensils, Home, Trash2, Trophy
} from 'lucide-react'

interface ChecklistItem {
  id: string
  title: string
  description?: string
  category: string
  time?: string
  points?: number
  completed: boolean
}

interface DailyChecklistProps {
  childName: string
}

const CATEGORY_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  zone: { icon: <Home className="w-4 h-4" />, color: 'text-amber-600' },
  dishes: { icon: <Utensils className="w-4 h-4" />, color: 'text-blue-600' },
  belle: { icon: <Dog className="w-4 h-4" />, color: 'text-purple-600' },
  tidy: { icon: <Sparkles className="w-4 h-4" />, color: 'text-green-600' },
  school_clean: { icon: <Trash2 className="w-4 h-4" />, color: 'text-teal-600' },
  parent_task: { icon: <Sparkles className="w-4 h-4" />, color: 'text-rose-600' },
  hygiene: { icon: <Sparkles className="w-4 h-4" />, color: 'text-sky-600' },
  earn_money: { icon: <DollarSign className="w-4 h-4" />, color: 'text-emerald-600' },
}

export default function DailyChecklist({ childName }: DailyChecklistProps) {
  const [required, setRequired] = useState<ChecklistItem[]>([])
  const [dailyCare, setDailyCare] = useState<ChecklistItem[]>([])
  const [earnMoney, setEarnMoney] = useState<ChecklistItem[]>([])
  const [allRequiredDone, setAllRequiredDone] = useState(false)
  const [zone, setZone] = useState<string | null>(null)
  const [stats, setStats] = useState({ requiredTotal: 0, requiredDone: 0, dailyCareTotal: 0, dailyCareDone: 0, earnMoneyTotal: 0, earnMoneyDone: 0 })
  const [loaded, setLoaded] = useState(false)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    fetch(`/api/kids/checklist?child=${childKey}`)
      .then(r => r.json())
      .then(data => {
        setRequired(data.required || [])
        setDailyCare(data.dailyCare || [])
        setEarnMoney(data.earnMoney || [])
        setAllRequiredDone(data.allRequiredDone || false)
        setZone(data.zone || null)
        setStats(data.stats || stats)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [childKey])

  const toggle = async (item: ChecklistItem, tier: 'required' | 'dailyCare' | 'earnMoney') => {
    // Optimistic update
    const update = (items: ChecklistItem[]) => items.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i)
    if (tier === 'required') {
      const updated = update(required)
      setRequired(updated)
      setAllRequiredDone(updated.every(t => t.completed))
      setStats(s => ({ ...s, requiredDone: updated.filter(t => t.completed).length }))
    } else if (tier === 'dailyCare') {
      const updated = update(dailyCare)
      setDailyCare(updated)
      setStats(s => ({ ...s, dailyCareDone: updated.filter(t => t.completed).length }))
    } else {
      const updated = update(earnMoney)
      setEarnMoney(updated)
      setStats(s => ({ ...s, earnMoneyDone: updated.filter(t => t.completed).length }))
    }

    try {
      await fetch('/api/kids/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', child: childKey, eventId: item.id, eventSummary: item.title })
      })
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  const totalDone = stats.requiredDone + stats.dailyCareDone + stats.earnMoneyDone
  const totalAll = stats.requiredTotal + stats.dailyCareTotal + stats.earnMoneyTotal
  const earnedPoints = earnMoney.filter(c => c.completed).reduce((sum, c) => sum + (c.points || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Daily Checklist</h1>
            <p className="text-green-100">{childName}'s tasks for today</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{totalDone}/{totalAll}</div>
            <div className="text-xs text-green-100">Tasks done</div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-xl font-bold text-amber-600">{stats.requiredDone}/{stats.requiredTotal}</div>
          <div className="text-xs text-gray-500">Required</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-xl font-bold text-sky-600">{stats.dailyCareDone}/{stats.dailyCareTotal}</div>
          <div className="text-xs text-gray-500">Daily Care</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-xl font-bold text-emerald-600">{earnedPoints} pts</div>
          <div className="text-xs text-gray-500">Earned</div>
        </div>
      </div>

      {/* Tier 1: Required */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b bg-amber-50 rounded-t-lg">
          <h2 className="font-bold text-amber-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Required — Because You Live Here
          </h2>
          <p className="text-xs text-amber-700 mt-1">No pay — these come first</p>
        </div>
        <div className="divide-y">
          {required.map(item => (
            <ChecklistRow key={item.id} item={item} onToggle={() => toggle(item, 'required')} />
          ))}
          {required.length === 0 && (
            <div className="p-6 text-center text-gray-400">No required tasks today</div>
          )}
          {required.some(item => item.category === 'dishes') && (
            <div className="px-4 py-2 bg-blue-50 border-t text-xs text-blue-700 italic">
              🍴 Wash your 5 handwash items at your meal time — not later.
            </div>
          )}
        </div>
      </div>

      {/* Tier 2: Daily Care */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b bg-sky-50 rounded-t-lg">
          <h2 className="font-bold text-sky-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Daily Care — Take Care of You
          </h2>
        </div>
        <div className="divide-y">
          {dailyCare.map(item => (
            <ChecklistRow key={item.id} item={item} onToggle={() => toggle(item, 'dailyCare')} />
          ))}
        </div>
      </div>

      {/* Tier 3: Earn Money */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className={`p-4 border-b rounded-t-lg ${allRequiredDone ? 'bg-emerald-50' : 'bg-gray-100'}`}>
          <h2 className={`font-bold flex items-center gap-2 ${allRequiredDone ? 'text-emerald-900' : 'text-gray-500'}`}>
            {allRequiredDone ? <Trophy className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            Earn Money Chores
          </h2>
          <p className={`text-xs mt-1 ${allRequiredDone ? 'text-emerald-700' : 'text-gray-400'}`}>
            {allRequiredDone
              ? `${earnMoney.length} chores available — earn points for each!`
              : 'Complete all required tasks first to unlock'}
          </p>
        </div>
        {allRequiredDone ? (
          <div className="divide-y">
            {earnMoney.map(item => (
              <ChecklistRow key={item.id} item={item} onToggle={() => toggle(item, 'earnMoney')} showPoints />
            ))}
            {earnMoney.length === 0 && (
              <div className="p-6 text-center text-gray-400">No earn-money chores set up yet. Ask a parent to add some!</div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">Finish your required tasks to unlock earn-money chores</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ChecklistRow({ item, onToggle, showPoints }: { item: ChecklistItem; onToggle: () => void; showPoints?: boolean }) {
  const cat = CATEGORY_ICONS[item.category] || { icon: <Circle className="w-4 h-4" />, color: 'text-gray-500' }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${item.completed ? 'bg-gray-50/50' : ''}`}>
      <button onClick={onToggle} className="flex-shrink-0">
        {item.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300" />
        )}
      </button>
      <div className={`flex-shrink-0 ${cat.color}`}>{cat.icon}</div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {item.title}
        </span>
        {item.description && (
          <p className={`text-xs ${item.completed ? 'text-gray-300' : 'text-gray-500'}`}>{item.description}</p>
        )}
      </div>
      {item.time && <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>}
      {showPoints && item.points && (
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
          +{item.points} pts
        </span>
      )}
    </div>
  )
}
