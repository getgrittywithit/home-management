'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface JourneyMapProps {
  kidName: string
  subject: 'elar' | 'math'
  onSelectSkill?: (skillId: string) => void
}

const MILESTONES = [
  { name: 'Pathfinder', min: 0, badge: '🗺️' },
  { name: 'Discoverer', min: 16, badge: '🔍' },
  { name: 'Practitioner', min: 36, badge: '📚' },
  { name: 'Proficient', min: 56, badge: '⭐' },
  { name: 'Expert', min: 76, badge: '🏆' },
  { name: 'Scholar', min: 86, badge: '👑' },
  { name: 'Maestro', min: 96, badge: '🎯' },
]

function getMilestoneIndex(mastery: number): number {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (mastery >= MILESTONES[i].min) return i
  }
  return 0
}

function MasteryBar({ mastery }: { mastery: number }) {
  const idx = getMilestoneIndex(mastery)
  const color = mastery >= 76 ? 'bg-green-500' : mastery >= 36 ? 'bg-blue-500' : mastery > 0 ? 'bg-amber-500' : 'bg-gray-200'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className={`${color} rounded-full h-2.5 transition-all`} style={{ width: `${mastery}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-10 text-right">{mastery}%</span>
      <span className="text-sm">{MILESTONES[idx].badge}</span>
    </div>
  )
}

export default function JourneyMap({ kidName, subject, onSelectSkill }: JourneyMapProps) {
  const [skills, setSkills] = useState<any[]>([])
  const [skillNames, setSkillNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const action = subject === 'elar' ? 'elar_journey_map' : 'math_journey_map'
    fetch(`/api/learning-engine?action=${action}&kid_name=${kidName.toLowerCase()}`)
      .then(r => r.json())
      .then(data => {
        setSkills(data.skills || [])
        setSkillNames(data.skill_names || {})
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [kidName, subject])

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  }

  if (skills.length === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
        <p className="text-2xl mb-2">{subject === 'elar' ? '\uD83D\uDCD6' : '\uD83D\uDD22'}</p>
        <p className="text-gray-600 font-medium mb-1">No progress yet!</p>
        <p className="text-sm text-gray-400 mb-4">Start practicing to build your {subject === 'elar' ? 'reading' : 'math'} skills.</p>
        <button onClick={() => onSelectSkill?.('start')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">
          Start Practicing
        </button>
      </div>
    )
  }

  const avgMastery = Math.round(skills.reduce((sum, s) => sum + (s.current_mastery || 0), 0) / skills.length)
  const masteredCount = skills.filter(s => s.current_mastery >= 80).length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-900">{subject === 'elar' ? '📖 ELAR' : '🔢 Math'} Journey Map</h3>
          <span className="text-sm text-gray-500">{masteredCount}/{skills.length} mastered (80%+)</span>
        </div>
        <MasteryBar mastery={avgMastery} />
      </div>

      {/* Skills Grid */}
      <div className="grid gap-2">
        {skills.map((s: any) => {
          const idx = getMilestoneIndex(s.current_mastery || 0)
          const milestone = MILESTONES[idx]
          const displayName = s.skill_name || skillNames[s.skill_id] || s.skill_id
          return (
            <button key={s.skill_id} onClick={() => onSelectSkill?.(s.skill_id)}
              className="bg-white rounded-lg border shadow-sm p-3 text-left hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">{milestone.badge}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 text-sm truncate">{s.skill_id}: {displayName}</span>
                    <span className="text-xs text-gray-500 ml-2">{milestone.name}</span>
                  </div>
                  <MasteryBar mastery={s.current_mastery || 0} />
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{s.questions_attempted || 0} attempted</span>
                    <span>{s.questions_correct || 0} correct</span>
                    {s.streak > 0 && <span className="text-amber-500">🔥 {s.streak} streak</span>}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
