'use client'

import { useState, useEffect } from 'react'

interface PetStatus {
  name: string
  emoji: string
  owner: string
  metric: string
  days: number | null
  status: string
}

export default function ParentPetOverview() {
  const [pets, setPets] = useState<PetStatus[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    fetch(`/api/kids/zone-tasks?action=get_pet_overview&date=${today}`)
      .then(r => r.json())
      .then(data => {
        setPets(data.pets || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded || pets.length === 0) return null

  const statusDot = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-400'
      case 'soon': return 'bg-amber-400'
      case 'due': return 'bg-orange-400'
      case 'overdue': return 'bg-red-400'
      default: return 'bg-gray-300'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'good': return 'Good'
      case 'soon': return 'Due soon'
      case 'due': return 'Due now'
      case 'overdue': return 'Overdue'
      default: return 'Unknown'
    }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        🐾 Pet Care Status
      </h2>
      <div className="space-y-2.5">
        {pets.map(pet => (
          <div key={pet.name} className="flex items-center gap-3">
            <span className="text-lg">{pet.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900">{pet.name}</span>
                <span className="text-xs text-gray-400">({pet.owner})</span>
              </div>
              <p className="text-xs text-gray-500">
                {pet.metric}: {pet.days !== null ? `${pet.days} day${pet.days !== 1 ? 's' : ''} ago` : 'No data'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${statusDot(pet.status)}`} />
              <span className={`text-xs font-medium ${
                pet.status === 'good' ? 'text-green-600' :
                pet.status === 'soon' ? 'text-amber-600' :
                pet.status === 'due' ? 'text-orange-600' :
                pet.status === 'overdue' ? 'text-red-600' :
                'text-gray-400'
              }`}>
                {statusLabel(pet.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
