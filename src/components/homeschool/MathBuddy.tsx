'use client'

import { useState, useEffect } from 'react'
import { Calculator, Send, SkipForward, Loader2, Star, Trophy, CheckCircle2, XCircle } from 'lucide-react'
import SpeakerButton from '../SpeakerButton'

interface MathBuddyProps {
  kidName: string
  onStarsEarned?: (count: number) => void
}

export default function MathBuddy({ kidName, onStarsEarned }: MathBuddyProps) {
  const [skill, setSkill] = useState<any>(null)
  const [problem, setProblem] = useState<any>(null)
  const [answer, setAnswer] = useState('')
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set())

  const loadNextSkill = async () => {
    setLoading(true)
    setFeedback(null)
    setAnswer('')
    setSelectedChoice(null)
    try {
      const res = await fetch(`/api/learning-engine?action=next_math_skill&kid_name=${kidName.toLowerCase()}`)
      const data = await res.json()
      setSkill(data)
      setSessionId(data.session_id || `math-${Date.now()}`)

      const pRes = await fetch(`/api/learning-engine?action=math_placement_problems&skill_id=${data.skill_id}&level=2nd-3rd`)
      const pData = await pRes.json()
      if (pData.problems?.length > 0) {
        // Exclude already-answered problems
        const available = pData.problems.filter((p: any) => !answeredIds.has(p.id))
        const pool = available.length > 0 ? available : pData.problems // fallback if all answered
        const randomIdx = Math.floor(Math.random() * pool.length)
        setProblem(pool[randomIdx])
      } else {
        setProblem(null)
      }
    } catch (e) {
      console.error('Failed to load skill:', e)
    }
    setLoading(false)
  }

  useEffect(() => { loadNextSkill() }, [kidName])

  const handleSubmit = async () => {
    const kidAnswer = problem?.answer_type === 'multiple_choice' ? selectedChoice : answer
    if (!kidAnswer?.trim() || !skill) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/learning-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'math_buddy_score',
          kid_name: kidName, skill_id: skill.skill_id,
          problem_id: problem?.id, kid_answer: kidAnswer,
          correct_answer: problem?.answer || '', problem_text: problem?.problem_text,
          session_id: sessionId,
        }),
      })
      const data = await res.json()
      setFeedback(data)
      if (problem?.id) setAnsweredIds(prev => new Set(prev).add(problem.id))
      // Update progress bar from scoring response
      if (data.mastery_after !== undefined && skill) {
        setSkill((prev: any) => prev ? { ...prev, current_mastery: data.mastery_after } : prev)
      }
      if (data.stars_earned && onStarsEarned) onStarsEarned(data.stars_earned)
    } catch (e) {
      console.error('Scoring error:', e)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-3" />
        <p className="text-gray-500">Loading your next math challenge...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white p-5 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-6 h-6" />
          <h2 className="text-xl font-bold">Math Buddy</h2>
        </div>
        {skill && (
          <div className="mt-2">
            <p className="text-teal-100 text-sm">Current Focus: {skill.skill_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-teal-400/30 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${skill.current_mastery || 0}%` }} />
              </div>
              <span className="text-sm font-medium">{skill.current_mastery || 0}%</span>
            </div>
            <p className="text-teal-200 text-xs mt-1">
              {(skill.current_mastery || 0) > 0
                ? `${skill.current_mastery}% mastery — Working on ${skill.skill_name}`
                : skill.reason}
            </p>
          </div>
        )}
      </div>

      {/* Problem */}
      {problem ? (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-start gap-2 mb-4">
            <p className="text-lg font-medium text-gray-900 flex-1">{problem.problem_text}</p>
            <SpeakerButton text={problem.problem_text} size="md" />
          </div>

          {problem.answer_type === 'multiple_choice' && problem.choices ? (
            <div className="space-y-2 mb-4">
              {Object.entries(problem.choices as Record<string, string>).map(([key, val]) => (
                <button key={key} onClick={() => !feedback && setSelectedChoice(key)}
                  disabled={!!feedback}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                    selectedChoice === key
                      ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                      : 'border-gray-200 hover:bg-gray-50'
                  } ${feedback ? 'cursor-default' : 'cursor-pointer'}`}>
                  <span className="font-medium text-gray-500 mr-2">{key.toUpperCase()}.</span>
                  {val}
                </button>
              ))}
            </div>
          ) : (
            <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              disabled={!!feedback}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full border rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:bg-gray-50 mb-4" />
          )}

          {!feedback && (
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={submitting || (!answer.trim() && !selectedChoice)}
                className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Checking...' : 'Submit'}
              </button>
              <button onClick={loadNextSkill} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 rounded-lg border">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center text-gray-400">
          <p>No problems available yet for this skill. Seed data needed.</p>
          <button onClick={loadNextSkill} className="mt-3 text-teal-600 hover:text-teal-800 text-sm font-medium">Try Another Skill</button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-lg border shadow-sm p-5 ${
          feedback.is_correct ? 'bg-green-50 border-green-200' :
          feedback.is_partial ? 'bg-amber-50 border-amber-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="text-2xl">
              {feedback.is_correct ? <CheckCircle2 className="w-7 h-7 text-green-600" /> :
               feedback.is_partial ? '🤏' :
               <XCircle className="w-7 h-7 text-red-400" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {feedback.is_correct ? 'Correct!' : feedback.is_partial ? 'Almost!' : 'Not quite.'}
                <span className="text-sm font-normal text-gray-500 ml-2">+{feedback.points} points</span>
              </p>
              <p className="text-sm text-gray-700 mt-1">{feedback.feedback}</p>
              {feedback.mastery_delta > 0 && (
                <p className="text-sm text-green-600 mt-2 font-medium">Mastery: {feedback.mastery_before}% → {feedback.mastery_after}%</p>
              )}
              {feedback.milestone_reached && (
                <div className="mt-2 flex items-center gap-2 text-sm font-bold text-purple-700">
                  <Trophy className="w-4 h-4" /> Milestone: {feedback.milestone_reached}!
                </div>
              )}
              <div className="flex items-center gap-1 mt-2 text-amber-600 text-sm font-medium">
                <Star className="w-4 h-4" /> +{feedback.stars_earned} stars
              </div>
            </div>
          </div>
          <button onClick={loadNextSkill}
            className="w-full mt-4 bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700">
            Next Problem
          </button>
        </div>
      )}
    </div>
  )
}
