'use client'

import { useState, useEffect } from 'react'
import { Heart, Target, Zap, RefreshCw } from 'lucide-react'

const KIDS = ['Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah']

const postAction = async (action: string, body: any = {}) => {
  const res = await fetch('/api/family-huddle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) })
  return res.json()
}

interface HuddleBonusRoundProps {
  huddleId: number
  bonusType: string
  onCreateTodo?: (kidName: string, title: string) => void
}

export default function HuddleBonusRound({ huddleId, bonusType, onCreateTodo }: HuddleBonusRoundProps) {
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [challenge, setChallenge] = useState<any>(null)
  const [previousGoals, setPreviousGoals] = useState<any[]>([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBonus()
  }, [])

  const loadBonus = async () => {
    setLoading(true)
    const res = await postAction('get_bonus_round', { huddle_id: huddleId })
    if (res.bonus) {
      if (res.bonus.challenge) setChallenge(res.bonus.challenge)
      if (res.bonus.previous_goals) setPreviousGoals(res.bonus.previous_goals)
    }
    setLoading(false)
  }

  const swapChallenge = async () => {
    if (!challenge) return
    const res = await postAction('swap_challenge', { exclude_id: challenge.id })
    if (res.challenge) setChallenge(res.challenge)
  }

  const handleSave = async () => {
    const payload: any[] = []
    if (bonusType === 'family_challenge' && challenge) {
      payload.push({ kid_name: null, content: challenge.challenge_text })
    }
    for (const [kid, content] of Object.entries(responses)) {
      if (content.trim()) payload.push({ kid_name: kid.toLowerCase(), content })
    }
    await postAction('save_bonus_round', { huddle_id: huddleId, bonus_type: bonusType, responses: payload })
    setSaved(true)
  }

  if (loading) return <div className="bg-white rounded-lg border shadow-sm p-5 text-center text-gray-400">Loading bonus round...</div>

  const HEADERS: Record<string, { icon: any; title: string; subtitle: string; color: string }> = {
    gratitude: { icon: Heart, title: 'Gratitude Round', subtitle: 'Each person names one thing they\'re grateful for this week.', color: 'text-rose-500' },
    goal_checkin: { icon: Target, title: 'Goal Check-In', subtitle: 'Share one thing you want to work on next week.', color: 'text-blue-500' },
    family_challenge: { icon: Zap, title: 'Family Challenge of the Week', subtitle: 'One fun challenge the whole family tries this week!', color: 'text-amber-500' },
  }

  const header = HEADERS[bonusType] || HEADERS.gratitude
  const Icon = header.icon

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${header.color}`} /> {header.title}
      </h3>
      <p className="text-xs text-gray-500 mb-4">{header.subtitle}</p>

      {bonusType === 'family_challenge' && challenge && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
            <p className="text-lg font-bold text-gray-900">{'\u26A1'} {challenge.challenge_text}</p>
            <p className="text-xs text-gray-400 mt-1 capitalize">{challenge.category}</p>
          </div>
          <button onClick={swapChallenge}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto">
            <RefreshCw className="w-3.5 h-3.5" /> Try a different challenge
          </button>
        </div>
      )}

      {(bonusType === 'gratitude' || bonusType === 'goal_checkin') && (
        <div className="space-y-2">
          {KIDS.map(kid => {
            const prevGoal = bonusType === 'goal_checkin'
              ? previousGoals.find(g => g.kid_name?.toLowerCase() === kid.toLowerCase())
              : null
            return (
              <div key={kid} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                <span className="font-medium text-gray-900 w-16 pt-1">{kid}</span>
                <div className="flex-1">
                  <input type="text" value={responses[kid] || ''}
                    onChange={e => setResponses(prev => ({ ...prev, [kid]: e.target.value }))}
                    placeholder={bonusType === 'gratitude' ? 'I\'m grateful for...' : 'Next week I want to...'}
                    className="w-full border rounded px-3 py-1.5 text-sm" />
                  {prevGoal && (
                    <button
                      onClick={() => setResponses(prev => ({ ...prev, [kid]: prevGoal.content }))}
                      className="text-xs text-blue-500 hover:text-blue-700 mt-1">
                      Carry over: &quot;{prevGoal.content}&quot;
                    </button>
                  )}
                </div>
                {bonusType === 'goal_checkin' && responses[kid]?.trim() && onCreateTodo && (
                  <button
                    onClick={() => onCreateTodo(kid, responses[kid])}
                    className="text-xs text-indigo-500 hover:text-indigo-700 whitespace-nowrap pt-2">
                    {'\u2192'} To-Do
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button onClick={handleSave} disabled={saved}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${saved ? 'bg-green-100 text-green-700' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}>
          {saved ? '\u2705 Saved!' : 'Save Bonus Round'}
        </button>
      </div>
    </div>
  )
}
