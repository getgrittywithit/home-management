'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, AlertTriangle, ShoppingCart } from 'lucide-react'
import SpeakerButton from './SpeakerButton'
import {
  PET_DISPLAY, PET_EMOJI, PET_TYPE, PET_PRIMARY, PET_HELPERS,
  PET_DAILY_TASKS, PET_WEEKLY_TASKS, PET_MONTHLY_TASKS,
  HADES_FEEDING_INTERVAL_DAYS,
} from '@/lib/constants'

interface PetCareCardProps {
  kidName: string
}

interface CareLog {
  task_type: string
  completed_at: string
}

interface FeedingInfo {
  days_since_fed: number | null
  needs_mice: boolean
  urgency: string
  message: string
}

export default function PetCareCard({ kidName }: PetCareCardProps) {
  const kid = kidName.toLowerCase()
  const [completedTasks, setCompletedTasks] = useState<Record<string, Set<string>>>({})
  const [hadesInfo, setHadesInfo] = useState<FeedingInfo | null>(null)
  const [spikeInfo, setSpikeInfo] = useState<{ days_since_fed: number | null; message: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Determine which pets this kid cares for
  const myPets: string[] = []
  for (const pet of ['spike', 'hades', 'midnight'] as const) {
    if (PET_PRIMARY[pet] === kid || (PET_HELPERS[pet] || []).includes(kid)) {
      myPets.push(pet)
    }
  }

  const fetchStatus = useCallback(async () => {
    const completed: Record<string, Set<string>> = {}
    for (const pet of myPets) {
      try {
        const res = await fetch('/api/kids/zone-tasks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_pet_care_today', pet_key: pet }),
        })
        const data = await res.json()
        const tasks = new Set<string>()
        for (const log of (data.care_logs || []) as CareLog[]) {
          tasks.add(log.task_type)
        }
        // Also mark feeding as done if fed today
        for (const f of (data.feedings || [])) {
          tasks.add('feed')
        }
        completed[pet] = tasks
      } catch {
        completed[pet] = new Set()
      }
    }
    setCompletedTasks(completed)

    // Check Hades feeding cycle if Zoey
    if (kid === 'zoey') {
      try {
        const res = await fetch('/api/kids/zone-tasks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_hades_feeding' }),
        })
        setHadesInfo(await res.json())
      } catch {}
    }

    // Check Spike live feeding if Amos (primary) or any Spike caretaker
    if (myPets.includes('spike')) {
      try {
        const res = await fetch('/api/kids/zone-tasks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_spike_feeding' }),
        })
        setSpikeInfo(await res.json())
      } catch {}
    }
    setLoading(false)
  }, [kid])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleComplete = async (pet: string, taskKey: string) => {
    try {
      await fetch('/api/kids/zone-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_pet_care', pet_key: pet, task_key: taskKey, completed_by: kid }),
      })
      setCompletedTasks(prev => {
        const updated = { ...prev }
        const tasks = new Set(updated[pet] || [])
        tasks.add(taskKey)
        updated[pet] = tasks
        return updated
      })
    } catch {}
  }

  const handleLogFeeding = async () => {
    try {
      await fetch('/api/kids/zone-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_feeding', pet_key: 'hades', fed_by: 'zoey', quantity: 2 }),
      })
      setToast('Feeding logged!')
      setTimeout(() => setToast(''), 2500)
      fetchStatus()
    } catch {}
  }

  const handleLogSpikeFeed = async (feedType: string) => {
    try {
      await fetch('/api/kids/zone-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_feeding', pet_key: 'spike', fed_by: kid, quantity: 1, notes: feedType }),
      })
      setToast(`${feedType} feeding logged!`)
      setTimeout(() => setToast(''), 2500)
      fetchStatus()
    } catch {}
  }

  const handleRequestMice = async () => {
    try {
      await fetch('/api/kids/zone-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_hades_mice' }),
      })
      setToast('Mice request sent to Mom!')
      setTimeout(() => setToast(''), 3000)
    } catch {}
  }

  if (myPets.length === 0) return null
  if (loading) return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="animate-pulse h-4 bg-gray-200 rounded w-32 mb-3" />
      <div className="animate-pulse h-3 bg-gray-100 rounded w-48" />
    </div>
  )

  return (
    <div className="space-y-4">
      {myPets.map(pet => {
        const dailyTasks = PET_DAILY_TASKS[pet] || []
        const done = completedTasks[pet] || new Set()
        const isPrimary = PET_PRIMARY[pet] === kid
        const allDone = dailyTasks.length > 0 && dailyTasks.every(t => done.has(t.key))

        return (
          <div key={pet} className={`rounded-2xl border ${allDone ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'} p-5 space-y-3`}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="text-xl">{PET_EMOJI[pet]}</span>
                {PET_DISPLAY[pet]} Care
                {isPrimary && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Primary</span>}
                {!isPrimary && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Helper</span>}
              </h2>
              {allDone && <span className="text-green-600 text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" /> All done!</span>}
            </div>

            <p className="text-xs text-gray-400">{PET_TYPE[pet]}</p>

            {/* Daily Tasks */}
            <div className="space-y-1.5">
              {dailyTasks.map(task => {
                const isDone = done.has(task.key)
                return (
                  <div key={task.key} className={`flex items-center gap-3 py-2 px-3 rounded-lg ${isDone ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <button onClick={() => !isDone && handleComplete(pet, task.key)} disabled={isDone}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}>
                      {isDone && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {task.emoji} {task.label}
                      </span>
                      {task.time && <span className="text-xs text-gray-400 ml-2">{task.time}</span>}
                    </div>
                    {!isDone && (
                      <SpeakerButton text={task.label} size="sm" rate={0.9} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Spike-specific: live feeding tracker (crickets/roaches) */}
            {pet === 'spike' && spikeInfo && (
              <div className="rounded-lg p-3 bg-gray-50 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">
                    🦗 Live Feed: {spikeInfo.message}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleLogSpikeFeed('Crickets')}
                    className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-medium">
                    <Check className="w-3 h-3" /> Log Crickets
                  </button>
                  <button onClick={() => handleLogSpikeFeed('Roaches')}
                    className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-medium">
                    <Check className="w-3 h-3" /> Log Roaches
                  </button>
                </div>
              </div>
            )}

            {/* Hades-specific: feeding cycle + request mice */}
            {pet === 'hades' && kid === 'zoey' && hadesInfo && (
              <div className={`rounded-lg p-3 space-y-2 ${
                hadesInfo.urgency === 'overdue' ? 'bg-red-50 border border-red-200'
                : hadesInfo.urgency === 'due_soon' || hadesInfo.urgency === 'due' ? 'bg-amber-50 border border-amber-200'
                : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  {(hadesInfo.urgency === 'overdue' || hadesInfo.urgency === 'due_soon') && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium text-gray-800">{hadesInfo.message}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleLogFeeding}
                    className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-medium">
                    <Check className="w-3 h-3" /> Log Feeding
                  </button>
                  {hadesInfo.needs_mice && (
                    <button onClick={handleRequestMice}
                      className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 font-medium">
                      <ShoppingCart className="w-3 h-3" /> Need Mice — Tell Mom
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Weekly/Monthly reminders */}
            {(PET_WEEKLY_TASKS[pet] || []).length > 0 && (
              <div className="border-t pt-2 mt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Weekly</p>
                {(PET_WEEKLY_TASKS[pet] || []).map(t => (
                  <p key={t.key} className="text-xs text-gray-500">{t.emoji} {t.label} — {t.frequency}</p>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {toast && (
        <div className="text-center text-sm text-emerald-600 font-medium bg-emerald-50 rounded-lg py-2">{toast}</div>
      )}
    </div>
  )
}
