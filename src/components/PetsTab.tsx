'use client'

import { useState, useEffect } from 'react'
import { Dog, AlertTriangle, Clock } from 'lucide-react'
import BelleCareTab from './BelleCareTab'

interface PetStatus {
  name: string
  emoji: string
  owners: string
  stat_label: string
  stat_value: string | null
  status: 'good' | 'warning' | 'none'
}

export default function PetsTab() {
  const [pets, setPets] = useState<PetStatus[]>([])
  const [loaded, setLoaded] = useState(false)
  const [feedingHistory, setFeedingHistory] = useState<any[]>([])
  const [spikeFeedingHistory, setSpikeFeedingHistory] = useState<any[]>([])
  const [hadesUrgency, setHadesUrgency] = useState('')

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    Promise.all([
      // Hades — days since last feeding
      fetch(`/api/kids/zone-tasks?action=check_feeding_reminder&pet=hades&date=${today}`)
        .then(r => r.json()).catch(() => ({ days_since_fed: null, reminder_level: 'none' })),
      // Spike — days since last bath
      fetch(`/api/kids/zone-tasks?action=get_pet_overview&date=${today}`)
        .then(r => r.json()).catch(() => ({ pets: [] })),
      // Belle — today's completion
      fetch('/api/kids/belle?action=get_todays_assignee')
        .then(r => r.json()).catch(() => ({ tasks: [], assignee: '' })),
    ]).then(([hadesData, overviewData, belleData]) => {
      const overviewPets = overviewData.pets || []
      const spike = overviewPets.find((p: any) => p.name === 'Spike')
      const midnight = overviewPets.find((p: any) => p.name === 'Midnight')

      const belleTasks = belleData.tasks || []
      const belleGrooming = belleData.grooming || []
      const belleDone = belleTasks.filter((t: any) => t.completed).length + belleGrooming.filter((t: any) => t.completed).length
      const belleTotal = belleTasks.length + belleGrooming.length

      setPets([
        {
          name: 'Hades',
          emoji: '🐍',
          owners: 'Zoey',
          stat_label: 'Last fed',
          stat_value: hadesData.days_since_fed !== null ? `${hadesData.days_since_fed}d ago` : 'No data',
          status: hadesData.reminder_level === 'overdue' || hadesData.reminder_level === 'due' ? 'warning'
            : hadesData.reminder_level === 'soon' ? 'warning'
            : hadesData.days_since_fed !== null ? 'good' : 'none',
        },
        {
          name: 'Spike',
          emoji: '🦎',
          owners: 'Amos',
          stat_label: 'Last bath',
          stat_value: spike?.days !== null && spike?.days !== undefined ? `${spike.days}d ago` : 'No data',
          status: spike?.status === 'due' ? 'warning' : spike?.status === 'good' ? 'good' : 'none',
        },
        {
          name: 'Midnight',
          emoji: '🐰',
          owners: 'Ellie + Hannah',
          stat_label: 'Last clean',
          stat_value: midnight?.days !== null && midnight?.days !== undefined ? `${midnight.days}d ago` : 'No data',
          status: midnight?.status === 'due' ? 'warning' : midnight?.status === 'good' ? 'good' : 'none',
        },
        {
          name: 'Belle',
          emoji: '🐕',
          owners: belleData.assignee ? belleData.assignee.charAt(0).toUpperCase() + belleData.assignee.slice(1) : 'TBD',
          stat_label: 'Today',
          stat_value: `${belleDone}/${belleTotal}`,
          status: belleTotal > 0 && belleDone === belleTotal ? 'good' : belleDone > 0 ? 'warning' : 'none',
        },
      ])
      setLoaded(true)
    })

    // Fetch feeding histories
    fetch('/api/kids/zone-tasks?action=get_feeding_history&pet=hades&limit=5')
      .then(r => r.json())
      .then(data => setFeedingHistory(data.feedings || []))
      .catch(() => {})

    fetch('/api/kids/zone-tasks?action=get_feeding_history&pet=spike&limit=5')
      .then(r => r.json())
      .then(data => setSpikeFeedingHistory(data.feedings || []))
      .catch(() => {})

    // Check Hades urgency
    fetch('/api/kids/zone-tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_hades_feeding' }),
    }).then(r => r.json())
      .then(data => setHadesUrgency(data.urgency || ''))
      .catch(() => {})
  }, [])

  const statusDot = (s: string) => {
    if (s === 'good') return 'bg-green-400'
    if (s === 'warning') return 'bg-amber-400'
    return 'bg-gray-300'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Dog className="w-6 h-6" /> Pets
        </h1>
        <p className="text-amber-100 mt-1">Daily status for all household animals</p>
      </div>

      {/* Daily Pet Check */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b bg-amber-50 rounded-t-lg">
          <h2 className="font-bold text-amber-900 text-sm">Daily Pet Check</h2>
        </div>
        {!loaded ? (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500" />
          </div>
        ) : (
          <div className="divide-y">
            {pets.map(pet => (
              <div key={pet.name} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{pet.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{pet.name}</span>
                    <span className="text-xs text-gray-400">({pet.owners})</span>
                  </div>
                  <p className="text-xs text-gray-500">{pet.stat_label}: {pet.stat_value}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${statusDot(pet.status)}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hades Feeding Cycle */}
      {(hadesUrgency === 'overdue' || hadesUrgency === 'due_soon' || hadesUrgency === 'due') && (
        <div className={`rounded-lg border p-4 ${hadesUrgency === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${hadesUrgency === 'overdue' ? 'text-red-500' : 'text-amber-500'}`} />
            <span className="font-semibold text-sm text-gray-900">
              {hadesUrgency === 'overdue' ? '🐍 Hades — OVERDUE for feeding!' : '🐍 Hades — Feeding due soon'}
            </span>
          </div>
          <p className="text-xs text-gray-600">Zoey should be flagging mice needed. Check grocery requests for live mice.</p>
        </div>
      )}

      {/* Feeding History */}
      {feedingHistory.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> 🐍 Hades — Feeding History
            </h2>
          </div>
          <div className="divide-y">
            {feedingHistory.map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-gray-800 font-medium">{new Date(f.fed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span className="text-gray-500">Fed by {f.fed_by}</span>
                <span className="text-gray-400">({f.quantity} mice)</span>
                {f.notes && <span className="text-xs text-gray-400 italic">{f.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spike Feeding History */}
      {spikeFeedingHistory.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> 🦎 Spike — Live Feed History (Crickets / Roaches)
            </h2>
          </div>
          <div className="divide-y">
            {spikeFeedingHistory.map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-gray-800 font-medium">{new Date(f.fed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span className="text-gray-500">Fed by {f.fed_by}</span>
                {f.notes && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{f.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Belle Care content */}
      <BelleCareTab />
    </div>
  )
}
