'use client'

import { useState, useEffect } from 'react'
import { Activity, Check } from 'lucide-react'

const SUGGESTIONS = ['Bike ride', 'Trampoline time', 'Walk to the park', 'Backyard games', 'Dance break', 'Yoga stretches']

interface Props { kidName: string }

export default function FridayMoveCard({ kidName }: Props) {
  const [move, setMove] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const isFriday = new Date().getDay() === 5

  useEffect(() => {
    if (!isFriday) return
    fetch(`/api/fun-friday?action=get_friday_move&friday_date=${today}`)
      .then(r => r.json()).then(d => { setMove(d.move); setLoaded(true) }).catch(() => setLoaded(true))
  }, [isFriday, today])

  if (!isFriday || !loaded) return null

  if (move) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> Friday Move: {move.activity}
        </p>
      </div>
    )
  }

  const suggestion = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]
  const isWyatt = kidName.toLowerCase() === 'wyatt'

  return (
    <div className={`rounded-xl p-3 border ${isWyatt ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
      <p className={`text-xs font-semibold ${isWyatt ? 'text-orange-800' : 'text-blue-800'} flex items-center gap-1.5`}>
        <Activity className="w-3.5 h-3.5" /> Friday Move (45 min)
      </p>
      <p className="text-[11px] text-gray-600 mt-1">Suggestion: {suggestion}</p>
      {isWyatt && <p className="text-[10px] text-orange-600 mt-0.5 font-medium">Movement is extra important today!</p>}
    </div>
  )
}
