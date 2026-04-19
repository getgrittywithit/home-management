'use client'

import { useState, useEffect } from 'react'
import { X, Trophy } from 'lucide-react'

interface NewAchievement {
  key: string
  title: string
  description: string
  emoji: string
}

export default function AchievementPopup({ kidName }: { kidName: string }) {
  const [achievements, setAchievements] = useState<NewAchievement[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [visible, setVisible] = useState(false)

  const kid = kidName.toLowerCase()

  useEffect(() => {
    fetch(`/api/kids/achievements?action=get_achievements&kid=${kid}`)
      .then(r => r.json())
      .then(data => {
        const newUnlocks = data.newUnlocks || []
        if (newUnlocks.length > 0) {
          setAchievements(newUnlocks)
          setVisible(true)
        }
      })
      .catch(() => {})
  }, [kid])

  const dismiss = async () => {
    const current = achievements[currentIdx]
    if (current) {
      await fetch('/api/kids/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_seen', kid_name: kid, keys: [current.key] }),
      }).catch(() => {})
    }

    if (currentIdx + 1 < achievements.length) {
      setCurrentIdx(prev => prev + 1)
    } else {
      setVisible(false)
    }
  }

  if (!visible || achievements.length === 0 || currentIdx >= achievements.length) return null

  const achievement = achievements[currentIdx]

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 shadow-2xl text-center max-w-xs w-full relative">
        <button onClick={dismiss} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>

        <div className="mb-3">
          <span className="text-5xl block mb-2">{achievement.emoji}</span>
          <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
            <Trophy className="w-3 h-3" /> Achievement Unlocked!
          </div>
        </div>

        <p className="text-lg font-bold text-gray-900 mt-2">{achievement.title}</p>
        <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>

        {achievements.length > 1 && (
          <p className="text-xs text-gray-400 mt-2">{currentIdx + 1} of {achievements.length}</p>
        )}

        <button
          onClick={dismiss}
          className="mt-4 bg-amber-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors w-full"
        >
          {currentIdx + 1 < achievements.length ? 'Next' : 'Awesome!'}
        </button>
      </div>
    </div>
  )
}
