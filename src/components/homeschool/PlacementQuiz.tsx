'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, Loader2, CheckCircle, Sparkles } from 'lucide-react'

interface SkillSummary {
  skill_id: string
  skill_name: string
  current_mastery: number
}

interface ElarPassage {
  id: string
  skill_id: string
  reading_level: string
  passage_text: string
  question: string
  age_appropriate_context?: string
}

interface MathProblem {
  id: string
  skill_id: string
  math_level: string
  problem_text: string
  answer: string
  answer_type: string
  choices?: string[]
  age_appropriate_context?: string
}

type Subject = 'elar' | 'math'

const LEVELS = ['2nd-3rd', '4th-5th', '6th-7th', '8th-9th', '10th-12th']

export default function PlacementQuiz({
  kidName, subject, onClose, onComplete,
}: {
  kidName: string
  subject: Subject
  onClose: () => void
  onComplete?: (result: { skill_id: string; starting_mastery: number }) => void
}) {
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [skillNames, setSkillNames] = useState<Record<string, string>>({})
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [level, setLevel] = useState<string>('2nd-3rd')
  const [passages, setPassages] = useState<ElarPassage[]>([])
  const [problems, setProblems] = useState<MathProblem[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [responses, setResponses] = useState<any[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [phase, setPhase] = useState<'loading' | 'pick_skill' | 'quiz' | 'empty' | 'done'>('loading')
  const [resultMastery, setResultMastery] = useState<number | null>(null)

  const kidKey = kidName.toLowerCase()

  // Step 1: fetch journey map to get skill list
  useEffect(() => {
    setPhase('loading')
    fetch(`/api/learning-engine?action=${subject}_journey_map&kid_name=${kidKey}`)
      .then((r) => r.json())
      .then((json) => {
        setSkills(json.skills || [])
        setSkillNames(json.skill_names || {})
        if ((json.skills || []).length > 0) {
          setSelectedSkill(json.skills[0].skill_id)
          setPhase('pick_skill')
        } else if (json.skill_names && Object.keys(json.skill_names).length > 0) {
          // Kid has no progress yet — use the skill_names dict
          const first = Object.keys(json.skill_names)[0]
          setSelectedSkill(first)
          setSkills(Object.entries(json.skill_names).map(([id, name]) => ({
            skill_id: id,
            skill_name: String(name),
            current_mastery: 0,
          })))
          setPhase('pick_skill')
        } else {
          setPhase('empty')
        }
      })
      .catch(() => setPhase('empty'))
  }, [kidKey, subject])

  // Step 2: once skill is picked, fetch passages/problems
  const startQuiz = useCallback(async () => {
    if (!selectedSkill) return
    setPhase('loading')
    try {
      if (subject === 'elar') {
        const res = await fetch(
          `/api/learning-engine?action=elar_placement_passages&skill_id=${selectedSkill}&level=${level}`
        )
        const json = await res.json()
        const list: ElarPassage[] = json.passages || []
        if (list.length === 0) {
          setPhase('empty')
          return
        }
        setPassages(list)
      } else {
        const res = await fetch(
          `/api/learning-engine?action=math_placement_problems&skill_id=${selectedSkill}&level=${level}`
        )
        const json = await res.json()
        const list: MathProblem[] = json.problems || []
        if (list.length === 0) {
          setPhase('empty')
          return
        }
        setProblems(list)
      }
      setCurrentIdx(0)
      setResponses([])
      setTotalPoints(0)
      setPhase('quiz')
    } catch {
      setPhase('empty')
    }
  }, [selectedSkill, level, subject])

  const items = subject === 'elar' ? passages : problems
  const total = items.length
  const current = items[currentIdx]

  const submitResponse = async (isCorrect: boolean, answer: string) => {
    const points = isCorrect ? (subject === 'elar' ? 15 : 15) : 0
    const nextResponses = [...responses, {
      item_id: current?.id,
      answer,
      correct: isCorrect,
      points,
    }]
    const nextPoints = totalPoints + points
    setResponses(nextResponses)
    setTotalPoints(nextPoints)

    if (currentIdx + 1 < total) {
      setCurrentIdx(currentIdx + 1)
      return
    }

    // Done — submit to API
    try {
      const res = await fetch('/api/learning-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: `${subject}_placement_complete`,
          kid_name: kidKey,
          skill_id: selectedSkill,
          placed_at_level: level,
          total_points: nextPoints,
          [subject === 'elar' ? 'passages_attempted' : 'problems_attempted']: items.map((i) => i.id),
          raw_responses: nextResponses,
        }),
      })
      const json = await res.json()
      setResultMastery(json.starting_mastery || 0)
      setPhase('done')
      if (selectedSkill) onComplete?.({ skill_id: selectedSkill, starting_mastery: json.starting_mastery || 0 })
    } catch {
      setPhase('empty')
    }
  }

  const progress = total > 0 ? Math.round(((currentIdx + (phase === 'done' ? 1 : 0)) / total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900">
              Placement Quiz — {kidName} ({subject.toUpperCase()})
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {phase === 'loading' && (
            <div className="text-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading…</p>
            </div>
          )}

          {phase === 'empty' && (
            <div className="text-center py-10 space-y-3">
              <div className="text-5xl">🌱</div>
              <h4 className="font-bold text-gray-900">Seed data needed</h4>
              <p className="text-sm text-gray-600 max-w-sm mx-auto">
                The placement quiz is ready, but no {subject.toUpperCase()} passages have been added yet.
                Once content is seeded, this quiz will activate automatically — no UI changes needed.
              </p>
              <p className="text-xs text-gray-400">
                Expected content: ~180 ELAR passages + ~192 Math problems across 27 skills
              </p>
              <button
                onClick={onClose}
                className="mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          )}

          {phase === 'pick_skill' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Pick a skill and starting level. The quiz will pull {subject === 'elar' ? '3 passages' : '4 problems'} from the API.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-700">Skill</label>
                <select
                  value={selectedSkill || ''}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {skills.map((s) => (
                    <option key={s.skill_id} value={s.skill_id}>
                      {s.skill_name || skillNames[s.skill_id] || s.skill_id}
                      {s.current_mastery > 0 ? ` (current: ${s.current_mastery}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Starting level</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLevel(lvl)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                        level === lvl ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={startQuiz}
                disabled={!selectedSkill}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                Start Quiz <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {phase === 'quiz' && current && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                  <span>Question {currentIdx + 1} of {total}</span>
                  <span>{level}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
                  />
                </div>
              </div>

              {subject === 'elar' && 'passage_text' in current && (
                <ElarPassageView
                  passage={current as ElarPassage}
                  onAnswer={(correct, answer) => submitResponse(correct, answer)}
                />
              )}
              {subject === 'math' && 'problem_text' in current && (
                <MathProblemView
                  problem={current as MathProblem}
                  onAnswer={(correct, answer) => submitResponse(correct, answer)}
                />
              )}
            </div>
          )}

          {phase === 'done' && resultMastery != null && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h4 className="font-bold text-gray-900 text-lg">Placement complete!</h4>
              <p className="text-sm text-gray-600">
                {kidName} placed at <span className="font-bold">{resultMastery}%</span> mastery on{' '}
                <span className="font-semibold">{selectedSkill && (skillNames[selectedSkill] || selectedSkill)}</span>.
              </p>
              <div className="h-2 w-48 mx-auto bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500" style={{ width: `${resultMastery}%` }} />
              </div>
              <p className="text-xs text-gray-500">
                This feeds into the JourneyMap as the starting position for {subject === 'elar' ? 'BookBuddy' : 'MathBuddy'}.
              </p>
              <button
                onClick={onClose}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ELAR passage view — free-text answer, scored simply (right/wrong placeholder)
// ============================================================================
function ElarPassageView({
  passage, onAnswer,
}: {
  passage: ElarPassage
  onAnswer: (correct: boolean, answer: string) => void
}) {
  const [answer, setAnswer] = useState('')
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-sm text-gray-800 whitespace-pre-wrap">
        {passage.passage_text}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-2">{passage.question}</p>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          placeholder="Type your answer…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onAnswer(false, '')}
          className="px-4 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100"
        >
          Skip
        </button>
        <button
          onClick={() => onAnswer(answer.trim().length > 5, answer)}
          disabled={answer.trim().length < 2}
          className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          Submit answer
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Math problem view — supports multiple choice + numeric
// ============================================================================
function MathProblemView({
  problem, onAnswer,
}: {
  problem: MathProblem
  onAnswer: (correct: boolean, answer: string) => void
}) {
  const [answer, setAnswer] = useState('')
  const hasChoices = problem.choices && problem.choices.length > 0

  const check = (val: string) => {
    const normalized = val.trim().toLowerCase()
    return normalized === String(problem.answer || '').trim().toLowerCase()
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-sm text-gray-900 whitespace-pre-wrap">
        {problem.problem_text}
      </div>

      {hasChoices ? (
        <div className="space-y-1.5">
          {problem.choices!.map((c) => (
            <button
              key={c}
              onClick={() => onAnswer(check(c), c)}
              className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-indigo-50 hover:border-indigo-300"
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => onAnswer(false, '')}
            className="w-full text-center text-xs text-gray-500 hover:bg-gray-100 py-1.5 rounded"
          >
            Skip
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onAnswer(false, '')}
              className="px-4 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100"
            >
              Skip
            </button>
            <button
              onClick={() => onAnswer(check(answer), answer)}
              disabled={!answer.trim()}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              Submit answer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
