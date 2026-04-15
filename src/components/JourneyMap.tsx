'use client'

import { useState, useEffect } from 'react'
import { Star, Trophy, BookOpen, Calculator } from 'lucide-react'

interface Skill {
  skill_id: string
  skill_name: string
  mastery_score: number
  current_level: string
  attempts: number
}

interface JourneyMapProps {
  kidName: string
  subject: 'elar' | 'math'
}

const ELAR_ICONS: Record<string, string> = {
  R1: '📖', R2: '💡', R3: '👤', R4: '🏔️', R5: '🔮', R6: '⚡',
  R7: '⚖️', R8: '🎯', R9: '📝', R10: '🎨', R11: '💎', R12: '📋',
  W1: '✏️', W2: '📐', W3: '💬',
}

const MATH_ICONS: Record<string, string> = {
  M1: '🔢', M2: '➕', M3: '✖️', M4: '🥧', M5: '🔄', M6: '📊',
  M7: '📏', M8: '💰', M9: '📐', M10: '📈', M11: '🎲', M12: '🧩',
}

const MILESTONES = {
  elar: [
    { count: 4, title: 'Explorer', icon: '🗺️' },
    { count: 8, title: 'Scholar', icon: '🎓' },
    { count: 12, title: 'Literary Legend', icon: '👑' },
    { count: 15, title: 'ELAR Champion', icon: '🏆' },
  ],
  math: [
    { count: 3, title: 'Number Cruncher', icon: '💪' },
    { count: 6, title: 'Problem Solver', icon: '🧩' },
    { count: 9, title: 'Math Whiz', icon: '🌟' },
    { count: 12, title: 'Math Champion', icon: '🏆' },
  ],
}

export default function JourneyMap({ kidName, subject }: JourneyMapProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [mastered, setMastered] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/academic-progress?action=get_${subject}_progress&kid_name=${kidName.toLowerCase()}`)
      .then(r => r.json())
      .then(data => {
        setSkills(data.skills || [])
        setMastered(data.mastered || 0)
        setTotal(data.total || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [kidName, subject])

  if (loading) {
    return <div className="py-8 text-center text-gray-400 animate-pulse">Loading journey...</div>
  }

  const icons = subject === 'elar' ? ELAR_ICONS : MATH_ICONS
  const milestones = MILESTONES[subject]
  const currentMilestone = milestones.filter(m => mastered >= m.count).pop()
  const nextMilestone = milestones.find(m => mastered < m.count)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-2xl p-5 text-white ${subject === 'elar' ? 'bg-gradient-to-r from-purple-500 to-indigo-600' : 'bg-gradient-to-r from-blue-500 to-cyan-600'}`}>
        <h2 className="text-xl font-bold flex items-center gap-2">
          {subject === 'elar' ? <BookOpen className="w-5 h-5" /> : <Calculator className="w-5 h-5" />}
          My {subject === 'elar' ? 'Reading' : 'Math'} Journey
        </h2>
        <div className="flex items-center gap-4 mt-3">
          {currentMilestone && (
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5">
              <span className="text-lg">{currentMilestone.icon}</span>
              <span className="font-medium text-sm">{currentMilestone.title}</span>
            </div>
          )}
          <div className="text-sm opacity-80">
            {mastered}/{total} skills mastered
          </div>
          {nextMilestone && (
            <div className="text-xs opacity-70 ml-auto">
              Next: {nextMilestone.title} ({nextMilestone.count - mastered} more)
            </div>
          )}
        </div>
      </div>

      {/* Empty-state banner — D72 EMPTY-4 */}
      {skills.length > 0 && skills.every((s) => (Number(s.mastery_score) || 0) === 0) && (
        <div className={`rounded-2xl border-2 border-dashed p-5 text-center ${
          subject === 'elar' ? 'border-purple-200 bg-purple-50/40' : 'border-blue-200 bg-blue-50/40'
        }`}>
          <div className="text-3xl mb-2">🌟</div>
          <h3 className={`font-bold text-base mb-1 ${subject === 'elar' ? 'text-purple-900' : 'text-blue-900'}`}>
            Your {subject === 'elar' ? 'reading' : 'math'} adventure starts here!
          </h3>
          <p className="text-xs text-gray-600 max-w-sm mx-auto mb-3">
            Complete {subject === 'elar' ? 'Book Buddy' : 'Math Buddy'} sessions to level up your skills.
            Each skill goes from 0 → 100.
          </p>
          <div className={`inline-flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-lg text-white ${
            subject === 'elar' ? 'bg-purple-600' : 'bg-blue-600'
          }`}>
            {subject === 'elar' ? <BookOpen className="w-3.5 h-3.5" /> : <Calculator className="w-3.5 h-3.5" />}
            Open {subject === 'elar' ? 'Book Buddy' : 'Math Buddy'}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 italic">
            Switch to the {subject === 'elar' ? 'Book Buddy' : 'Math Buddy'} tab to begin
          </p>
        </div>
      )}

      {/* Skills */}
      <div className="space-y-2">
        {skills.map(skill => {
          const score = Number(skill.mastery_score) || 0
          const isMastered = score >= 95
          const icon = icons[skill.skill_id] || '📝'

          return (
            <div key={skill.skill_id} className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {skill.skill_name}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0 ml-2">
                      {Math.round(score)}/100
                      {isMastered && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 inline ml-1" />}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isMastered ? 'bg-yellow-400' :
                        score >= 80 ? 'bg-green-500' :
                        score >= 50 ? 'bg-blue-500' :
                        score > 0 ? 'bg-amber-400' : 'bg-gray-200'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Milestones */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {milestones.map(m => {
          const achieved = mastered >= m.count
          return (
            <div key={m.count} className={`shrink-0 rounded-xl border p-3 text-center min-w-[90px] ${
              achieved ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50 opacity-50'
            }`}>
              <div className="text-2xl mb-1">{m.icon}</div>
              <div className="text-xs font-medium text-gray-700">{m.title}</div>
              <div className="text-[10px] text-gray-500">{m.count} skills</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
