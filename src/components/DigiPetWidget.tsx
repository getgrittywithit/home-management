'use client'

import { useState, useEffect } from 'react'

interface DigiPetWidgetProps {
  childName: string
  onNavigate?: () => void
}

export default function DigiPetWidget({ childName, onNavigate }: DigiPetWidgetProps) {
  const kidKey = childName.toLowerCase()
  const [pet, setPet] = useState<any>(null)
  const [stateName, setStateName] = useState('')
  const [stateEmoji, setStateEmoji] = useState('')
  const [petEmoji, setPetEmoji] = useState('🐶')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!kidKey) return
    fetch(`/api/digi-pet?action=get_pet&kid_name=${kidKey}`)
      .then(r => r.json())
      .then(data => {
        if (data.pet?.enabled === false) {
          setPet(null)
        } else {
          setPet(data.pet)
          setStateName(data.state_name)
          setStateEmoji(data.state_emoji)
          setPetEmoji(data.pet_emoji || '🐶')
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [kidKey])

  if (!loaded || !pet || !pet.enabled) return null

  // Don't show widget if pet hasn't been set up
  if (pet.pet_type === 'dog' && pet.pet_name === 'My Pet') {
    return (
      <div
        onClick={onNavigate}
        className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-purple-200 p-4 cursor-pointer hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌟</span>
          <div>
            <div className="font-bold text-purple-700">Create Your Digi-Pet!</div>
            <div className="text-xs text-purple-500">Tap to choose a pet companion</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onNavigate}
      className="bg-white rounded-lg border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Pet Emoji + State */}
        <div className="text-center">
          <div className="text-4xl">{petEmoji}</div>
          <div className="text-xs mt-0.5">{stateEmoji}</div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-800 truncate">{pet.pet_name}</div>
          <div className="text-xs text-gray-500 capitalize">{stateName}</div>

          {/* Mini Bars */}
          <div className="mt-1.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-4">&#x1F497;</span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-400 to-red-400"
                  style={{ width: `${pet.happiness}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-4">&#x1F49A;</span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
                  style={{ width: `${pet.health}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stars */}
        <div className="text-right">
          <div className="text-sm font-bold text-yellow-600">&#11088; {pet.stars_balance}</div>
          {pet.streak_days > 0 && (
            <div className="text-xs text-orange-500 font-medium">&#128293; {pet.streak_days}d</div>
          )}
        </div>
      </div>
    </div>
  )
}
