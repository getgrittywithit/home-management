'use client'

import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'

interface PetStatus {
  pet: {
    pet_name: string
    pet_type: string
    happiness: number
    health: number
  } | null
  pet_emoji: string
  state_name: string
}

function moodMessage(happiness: number): { text: string; emoji: string; bar: string } {
  if (happiness >= 80) return { text: "I'm so happy! You're amazing!", emoji: '🥰', bar: 'from-green-400 to-emerald-500' }
  if (happiness >= 50) return { text: 'Complete tasks to keep me happy!', emoji: '😊', bar: 'from-green-400 to-amber-400' }
  if (happiness >= 20) return { text: 'I\u2019m getting hungry… do some tasks!', emoji: '😟', bar: 'from-amber-400 to-orange-500' }
  return { text: 'Help! I need you!', emoji: '😢', bar: 'from-orange-500 to-red-500' }
}

export default function DigiPetMiniWidget({
  kidName,
  onOpen,
}: {
  kidName: string
  onOpen?: () => void
}) {
  const [data, setData] = useState<PetStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!kidName) return
    fetch(`/api/digi-pet?action=get_pet&kid_name=${kidName.toLowerCase()}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.pet || j.error) {
          setHidden(true)
        } else {
          setData(j)
        }
      })
      .catch(() => setHidden(true))
      .finally(() => setLoading(false))
  }, [kidName])

  if (hidden || loading) return null
  if (!data?.pet) return null

  const happiness = Math.max(0, Math.min(100, data.pet.happiness || 0))
  const mood = moodMessage(happiness)
  const emoji = data.pet_emoji || '🐾'
  const petName = data.pet.pet_name || 'My Pet'

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-3 hover:shadow-sm transition-all active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl flex-shrink-0">{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-xs font-bold text-purple-900 truncate">
              🐾 Your Digi-Pet: {petName}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 flex-shrink-0">
              <span>❤️</span>
              <span>{happiness}/100</span>
            </div>
          </div>
          <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden border border-purple-100">
            <div
              className={`h-full bg-gradient-to-r ${mood.bar} transition-all`}
              style={{ width: `${happiness}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-gray-600 italic">
              {mood.emoji} "{mood.text}"
            </span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-purple-700">
              Visit {petName} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
