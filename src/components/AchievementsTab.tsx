'use client'

import { useState, useEffect } from 'react'
import { Trophy, Flame, Lock, X } from 'lucide-react'

interface Achievement {
  key: string; title: string; description: string; emoji: string; category: string
  trigger_type: string; trigger_value: number | null; trigger_metric: string | null
  unlocked: boolean; unlocked_at: string | null; seen_by_kid: boolean
}

interface YearReview {
  year: number; booksRead: number; longestReadingStreak: number; longestDentalStreak: number
  totalPoints: number; achievementsUnlocked: number; goalsCompleted: number
}

const CATEGORY_ORDER = ['reading', 'health', 'chores', 'goals', 'special']
const CATEGORY_LABELS: Record<string, string> = { reading: 'Reading', health: 'Health', chores: 'Chores', goals: 'Goals', special: 'Special' }

export default function AchievementsTab({ childName }: { childName: string }) {
  const [all, setAll] = useState<Achievement[]>([])
  const [newUnlocks, setNewUnlocks] = useState<Achievement[]>([])
  const [streaks, setStreaks] = useState({ reading: 0, dental: 0, chore: 0, activity: 0 })
  const [yearReview, setYearReview] = useState<YearReview | null>(null)
  const [celebratingIdx, setCelebratingIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    Promise.all([
      fetch(`/api/kids/achievements?action=get_achievements&kid=${childKey}`).then(r => r.json()),
      fetch(`/api/kids/achievements?action=get_year_review&kid=${childKey}`).then(r => r.json()),
    ]).then(([achData, yrData]) => {
      setAll(achData.all || [])
      setNewUnlocks(achData.newUnlocks || [])
      setStreaks(achData.streaks || streaks)
      setYearReview(yrData || null)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [childKey])

  const dismissCelebration = async () => {
    const current = newUnlocks[celebratingIdx]
    if (current) {
      await fetch('/api/kids/achievements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_seen', kid_name: childKey, keys: [current.key] })
      }).catch(() => {})
    }
    if (celebratingIdx + 1 < newUnlocks.length) {
      setCelebratingIdx(prev => prev + 1)
    } else {
      setNewUnlocks([])
    }
  }

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" /></div>

  const unlocked = all.filter(a => a.unlocked)
  const grouped: Record<string, Achievement[]> = {}
  all.forEach(a => { if (!grouped[a.category]) grouped[a.category] = []; grouped[a.category].push(a) })

  return (
    <div className="space-y-6">
      {/* Celebration Modal */}
      {newUnlocks.length > 0 && celebratingIdx < newUnlocks.length && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-xs">
            <p className="text-4xl mb-3">{newUnlocks[celebratingIdx].emoji}</p>
            <p className="text-lg font-bold text-gray-900">New Achievement!</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{newUnlocks[celebratingIdx].title}</p>
            <p className="text-sm text-gray-600 mt-2">{newUnlocks[celebratingIdx].description}</p>
            <button onClick={dismissCelebration}
              className="mt-4 bg-amber-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-600">
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Achievements</h1>
            <p className="text-amber-200">{unlocked.length} earned · {all.length - unlocked.length} to unlock</p>
          </div>
          <Trophy className="w-10 h-10 text-amber-200/60" />
        </div>
      </div>

      {/* Recently Unlocked */}
      {unlocked.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3">Recently Unlocked</h2>
          <div className="space-y-2">
            {unlocked.slice(0, 5).map(a => (
              <div key={a.key} className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                <span className="text-2xl">{a.emoji}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Badges by Category */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-4">All Badges</h2>
        {CATEGORY_ORDER.filter(c => grouped[c]?.length).map(cat => (
          <div key={cat} className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{CATEGORY_LABELS[cat] || cat}</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {(grouped[cat] || []).map(a => (
                <div key={a.key} className={`p-3 rounded-lg text-center border ${a.unlocked ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                  <span className="text-2xl">{a.unlocked ? a.emoji : '🔒'}</span>
                  <p className={`text-xs mt-1 font-medium ${a.unlocked ? 'text-gray-900' : 'text-gray-400'}`}>{a.title}</p>
                  {!a.unlocked && a.trigger_value && (
                    <p className="text-[10px] text-gray-400">{a.trigger_value} {a.trigger_metric?.replace('_', ' ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Streaks */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">Current Streaks</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Reading', icon: '📚', value: streaks.reading },
            { label: 'Dental', icon: '🦷', value: streaks.dental },
            { label: 'Chores', icon: '⭐', value: streaks.chore },
            { label: 'Activity', icon: '🏃', value: streaks.activity },
          ].map(s => (
            <div key={s.label} className="text-center p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">{s.icon}</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{s.value}</div>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Year in Review */}
      {yearReview && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3">{childName}'s {yearReview.year} So Far</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>📚 Books read: <span className="font-bold">{yearReview.booksRead}</span></div>
            <div>🔥 Longest reading streak: <span className="font-bold">{yearReview.longestReadingStreak} days</span></div>
            <div>🦷 Longest dental streak: <span className="font-bold">{yearReview.longestDentalStreak} days</span></div>
            <div>💰 Points earned: <span className="font-bold">{yearReview.totalPoints.toLocaleString()}</span></div>
            <div>🏆 Achievements: <span className="font-bold">{yearReview.achievementsUnlocked}</span></div>
            <div>🎯 Goals completed: <span className="font-bold">{yearReview.goalsCompleted}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
