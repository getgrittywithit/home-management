'use client'

import { useState, useEffect } from 'react'
import { Trophy, Flame, Users, Award } from 'lucide-react'
import { KID_DISPLAY } from '@/lib/constants'

interface Challenge {
  id: string
  title: string
  description: string | null
  category: string | null
  started_by: string
  participants: string[]
  tracking_metric: string
  start_date: string
  end_date: string
  star_prize: number
  status: string
  winner: string | null
}

interface Progress {
  kid_name: string
  progress_count: number
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const CATEGORY_EMOJI: Record<string, string> = {
  reading: '📚', math: '🔢', chores: '🧹', exercise: '💪', kindness: '💛', custom: '🎯'
}

export default function ParentChallengeOverview() {
  const [active, setActive] = useState<Challenge[]>([])
  const [completed, setCompleted] = useState<Challenge[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, Progress[]>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/social?action=get_challenges&status=active').then(r => r.json()),
      fetch('/api/social?action=get_challenges&status=completed').then(r => r.json()),
    ]).then(async ([activeData, completedData]) => {
      const activeChallenges = activeData.challenges || []
      const completedChallenges = completedData.challenges || []
      setActive(activeChallenges)
      setCompleted(completedChallenges)

      // Fetch progress for all active challenges
      const pMap: Record<string, Progress[]> = {}
      for (const c of activeChallenges) {
        try {
          const pRes = await fetch(`/api/social?action=get_challenge_progress&challenge_id=${c.id}`)
          const pData = await pRes.json()
          pMap[c.id] = pData.progress || []
        } catch { /* ignore */ }
      }
      setProgressMap(pMap)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>

  const daysLeft = (endDate: string) => {
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
    return diff > 0 ? `${diff}d left` : 'Ended'
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6" /> Challenges Overview</h1>
        <p className="text-amber-100 mt-1">{active.length} active · {completed.length} completed</p>
      </div>

      {/* Active Challenges */}
      {active.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Active Challenges</h2>
          {active.map(c => {
            const progress = progressMap[c.id] || []
            const sorted = [...progress].sort((a, b) => b.progress_count - a.progress_count)
            return (
              <div key={c.id} className="bg-white rounded-lg border shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_EMOJI[c.category || 'custom'] || '🎯'}</span>
                      <h3 className="font-bold text-gray-900">{c.title}</h3>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{daysLeft(c.end_date)}</span>
                    </div>
                    {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-amber-600 font-bold">⭐ {c.star_prize}</span>
                    <p className="text-xs text-gray-400">prize</p>
                  </div>
                </div>

                {/* Participants + Progress */}
                <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  {c.participants.map(p => KID_DISPLAY[p] || cap(p)).join(', ')}
                  <span className="ml-1">· Tracking: {c.tracking_metric}</span>
                </div>

                {sorted.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {sorted.map((p, i) => {
                      const maxProgress = sorted[0]?.progress_count || 1
                      const pct = Math.min(100, Math.round((p.progress_count / maxProgress) * 100))
                      return (
                        <div key={p.kid_name} className="flex items-center gap-2">
                          <span className="text-sm w-20 text-gray-700">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '} {KID_DISPLAY[p.kid_name] || cap(p.kid_name)}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-3">
                            <div className={`${i === 0 ? 'bg-amber-400' : 'bg-gray-300'} h-3 rounded-full transition-all`} style={{ width: `${Math.max(pct, 5)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-12 text-right">{p.progress_count} {c.tracking_metric}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Completed Challenges */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Award className="w-5 h-5 text-green-500" /> Completed</h2>
          {completed.map(c => (
            <div key={c.id} className="bg-gray-50 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_EMOJI[c.category || 'custom'] || '🎯'}</span>
                  <span className="font-medium text-gray-700">{c.title}</span>
                </div>
                {c.winner && (
                  <span className="text-sm text-green-700 font-medium">🏆 {KID_DISPLAY[c.winner] || cap(c.winner)}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{c.participants.map(p => KID_DISPLAY[p] || cap(p)).join(', ')} · ⭐ {c.star_prize}</p>
            </div>
          ))}
        </div>
      )}

      {active.length === 0 && completed.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No challenges yet. Kids can create challenges from their portal!</p>
        </div>
      )}
    </div>
  )
}
