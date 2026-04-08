'use client'

import { useState, useEffect } from 'react'
import { Droplets, Plus, Minus } from 'lucide-react'

interface HydrationTrackerProps {
  kidName: string
}

export default function HydrationTracker({ kidName }: HydrationTrackerProps) {
  const [cups, setCups] = useState(0)
  const [goal, setGoal] = useState(8)
  const [loaded, setLoaded] = useState(false)

  const kid = kidName.toLowerCase()

  useEffect(() => {
    fetch(`/api/hydration?action=get_today&kid_name=${kid}`)
      .then(r => r.json())
      .then(data => {
        if (data.hydration) {
          setCups(data.hydration.cups_logged || 0)
          setGoal(data.hydration.goal_cups || 8)
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [kid])

  const addCup = async () => {
    setCups(c => c + 1)
    const res = await fetch('/api/hydration', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_cup', kid_name: kid }),
    }).then(r => r.json()).catch(() => null)
    if (res?.hydration) setCups(res.hydration.cups_logged)
  }

  const removeCup = async () => {
    if (cups <= 0) return
    setCups(c => Math.max(0, c - 1))
    const res = await fetch('/api/hydration', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_cup', kid_name: kid }),
    }).then(r => r.json()).catch(() => null)
    if (res?.hydration) setCups(res.hydration.cups_logged)
  }

  if (!loaded) return null

  const pct = goal > 0 ? Math.min(100, Math.round((cups / goal) * 100)) : 0
  const met = cups >= goal

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-1.5 text-sm">
          <Droplets className="w-4 h-4 text-blue-500" /> Water Today
        </h3>
        <span className={`text-sm font-bold ${met ? 'text-green-600' : 'text-blue-600'}`}>
          {cups}/{goal} cups
        </span>
      </div>

      {/* Cup icons */}
      <div className="flex items-center gap-1.5 mb-3">
        {Array.from({ length: goal }, (_, i) => (
          <div key={i} className={`w-7 h-8 rounded-b-lg border-2 transition-colors ${
            i < cups ? 'bg-blue-400 border-blue-500' : 'bg-gray-100 border-gray-200'
          }`} />
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div className={`h-full rounded-full transition-all ${met ? 'bg-green-500' : 'bg-blue-400'}`}
          style={{ width: `${pct}%` }} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button onClick={removeCup} disabled={cups <= 0}
          className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
          <Minus className="w-4 h-4 text-gray-600" />
        </button>
        <button onClick={addCup}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600">
          <Plus className="w-4 h-4" /> Log a Cup
        </button>
      </div>

      {met && (
        <p className="text-xs text-green-600 font-medium mt-2 text-center">Goal met! Great hydration!</p>
      )}
    </div>
  )
}
