'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Send, SkipForward, Loader2, Star, Trophy, Lightbulb } from 'lucide-react'

interface BookBuddyProps {
  kidName: string
  onStarsEarned?: (count: number) => void
}

export default function BookBuddy({ kidName, onStarsEarned }: BookBuddyProps) {
  const [skill, setSkill] = useState<any>(null)
  const [passage, setPassage] = useState<any>(null)
  const [response, setResponse] = useState('')
  const [feedback, setFeedback] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [questionsInSession, setQuestionsInSession] = useState(0)
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set())
  const [showHint, setShowHint] = useState(false)

  const loadNextSkill = async () => {
    setLoading(true)
    setFeedback(null)
    setResponse('')
    setShowHint(false)
    try {
      const res = await fetch(`/api/learning-engine?action=next_elar_skill&kid_name=${kidName.toLowerCase()}`)
      const data = await res.json()
      setSkill(data)
      setSessionId(data.session_id || `elar-${Date.now()}`)

      // Load a passage for this skill, avoiding already-seen passages
      const pRes = await fetch(`/api/learning-engine?action=elar_placement_passages&skill_id=${data.skill_id}&level=2nd-3rd`)
      const pData = await pRes.json()
      if (pData.passages?.length > 0) {
        const available = pData.passages.filter((p: any) => !answeredIds.has(p.id))
        const pool = available.length > 0 ? available : pData.passages
        const randomIdx = Math.floor(Math.random() * pool.length)
        setPassage(pool[randomIdx])
      } else {
        setPassage(null)
      }
    } catch (e) {
      console.error('Failed to load skill:', e)
    }
    setLoading(false)
  }

  useEffect(() => { loadNextSkill() }, [kidName])

  const handleSubmit = async () => {
    if (!response.trim() || !skill) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/learning-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book_buddy_score',
          kid_name: kidName, skill_id: skill.skill_id,
          passage_id: passage?.id, kid_response: response,
          passage_text: passage?.passage_text, question: passage?.question,
          session_id: sessionId,
        }),
      })
      const data = await res.json()
      setFeedback(data)
      setQuestionsInSession(prev => prev + 1)
      if (passage?.id) setAnsweredIds(prev => new Set(prev).add(passage.id))
      if (data.stars_earned && onStarsEarned) onStarsEarned(data.stars_earned)
      // Auto-advance: 3s for good answers, 6s for weak (kids need time to read feedback)
      const delay = (data.score === 'detailed' || data.score === 'adequate') ? 3000 : 6000
      setTimeout(() => handleNext(), delay)
    } catch (e) {
      console.error('Scoring error:', e)
    }
    setSubmitting(false)
  }

  const handleNext = () => {
    setFeedback(null)
    setResponse('')
    loadNextSkill()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
        <p className="text-gray-500">Loading your next reading challenge...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-5 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-6 h-6" />
          <h2 className="text-xl font-bold">Book Buddy</h2>
        </div>
        {skill && (
          <div className="mt-2">
            <p className="text-blue-100 text-sm">Current Focus: {skill.skill_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-blue-400/30 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${skill.current_mastery || 0}%` }} />
              </div>
              <span className="text-sm font-medium">{skill.current_mastery || 0}%</span>
            </div>
            <p className="text-blue-200 text-xs mt-1">{skill.reason}</p>
          </div>
        )}
      </div>

      {/* Passage + Question */}
      {passage ? (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="prose prose-sm max-w-none mb-4">
            <p className="text-gray-800 leading-relaxed text-base">{passage.passage_text}</p>
          </div>
          <div className="border-t pt-4">
            <p className="font-medium text-gray-900 mb-3">{passage.question}</p>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              disabled={!!feedback}
              className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none disabled:bg-gray-50"
            />
            {!feedback && (
              <div className="space-y-2 mt-3">
                {passage?.hint_text && !showHint && (
                  <button
                    onClick={() => setShowHint(true)}
                    className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    <Lightbulb className="w-4 h-4" /> Need a hint?
                  </button>
                )}
                {showHint && passage?.hint_text && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{passage.hint_text}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleSubmit} disabled={submitting || !response.trim()}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {submitting ? 'Checking...' : 'Submit'}
                  </button>
                  <button onClick={handleNext} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 rounded-lg border">
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center text-gray-400">
          <p>No passages available yet for this skill. Seed data needed.</p>
          <button onClick={loadNextSkill} className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium">Try Another Skill</button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (() => {
        const isGood = feedback.score === 'detailed' || feedback.score === 'adequate'
        const encourageText = isGood
          ? (passage?.encouragement_correct || null)
          : (passage?.encouragement_wrong || null)
        return (
        <div className={`rounded-lg border shadow-sm p-5 ${
          feedback.score === 'detailed' ? 'bg-green-50 border-green-200' :
          feedback.score === 'adequate' ? 'bg-blue-50 border-blue-200' :
          'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="text-2xl">{feedback.score === 'detailed' ? '🌟' : feedback.score === 'adequate' ? '👍' : '💪'}</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {feedback.score === 'detailed' ? 'Excellent!' : feedback.score === 'adequate' ? 'Good work!' : 'Keep going!'}
                <span className="text-sm font-normal text-gray-500 ml-2">+{feedback.points} points</span>
              </p>
              {encourageText && (
                <p className="text-sm text-gray-800 mt-1 font-medium">{encourageText}</p>
              )}
              <p className="text-sm text-gray-700 mt-1">{feedback.feedback}</p>
              {feedback.mastery_delta > 0 && (
                <p className="text-sm text-green-600 mt-2 font-medium">Mastery: {feedback.mastery_before}% → {feedback.mastery_after}%</p>
              )}
              {feedback.milestone_reached && (
                <div className="mt-2 flex items-center gap-2 text-sm font-bold text-purple-700">
                  <Trophy className="w-4 h-4" /> Milestone reached: {feedback.milestone_reached}!
                </div>
              )}
              <div className="flex items-center gap-1 mt-2 text-amber-600 text-sm font-medium">
                <Star className="w-4 h-4" /> +{feedback.stars_earned} stars earned
              </div>
            </div>
          </div>
          <button onClick={handleNext}
            className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700">
            Next Passage
          </button>
        </div>
        )
      })()}
    </div>
  )
}
