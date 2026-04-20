'use client'

import { useState, useEffect } from 'react'
import { MODE_EFFECTS } from '@/lib/dayModeTypes'

const MODE_COLORS: Record<string, string> = {
  fun_friday: 'from-yellow-400 to-amber-400',
  off_day: 'from-green-400 to-emerald-400',
  vacation: 'from-cyan-400 to-blue-400',
  sick_day: 'from-amber-300 to-yellow-300',
  field_trip: 'from-purple-400 to-indigo-400',
  work_day: 'from-orange-400 to-red-400',
  half_day: 'from-blue-400 to-indigo-400',
  catch_up: 'from-indigo-400 to-purple-400',
}

const MODE_EMOJI: Record<string, string> = {
  fun_friday: '🌟', off_day: '🌿', vacation: '🏖', sick_day: '💛',
  field_trip: '🚐', work_day: '🔨', half_day: '⏰', catch_up: '📚',
}

export default function ModeBanner({ kidName }: { kidName: string }) {
  const [mode, setMode] = useState<any>(null)

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    fetch(`/api/day-mode?action=get_range&start=${today}&end=${today}&kid_name=${kidName.toLowerCase()}`)
      .then(r => r.json())
      .then(d => {
        const m = (d.modes || []).find((m: any) => m.status === 'active' && m.mode_type !== 'normal')
        setMode(m || null)
      })
      .catch(() => {})
  }, [kidName])

  if (!mode) return null

  const effect = MODE_EFFECTS[mode.mode_type]
  const colors = MODE_COLORS[mode.mode_type] || 'from-gray-400 to-gray-500'
  const emoji = MODE_EMOJI[mode.mode_type] || '📋'
  const banner = effect?.banner

  if (!banner) return null

  return (
    <div className={`bg-gradient-to-r ${colors} text-white p-4 rounded-xl`}>
      <p className="text-sm font-medium flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        {banner}
      </p>
      {effect?.streak === 'pause' && (
        <p className="text-xs mt-1 opacity-80">🔥 Streak paused — it won&apos;t break today.</p>
      )}
    </div>
  )
}
