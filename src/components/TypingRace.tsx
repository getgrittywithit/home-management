'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Keyboard, Trophy, Zap, Eye, BarChart2, Users } from 'lucide-react'

interface TypingPassage {
  id: string
  grade_band: string
  text: string
  word_count: number
  dyslexia_version: string | null
  dyslexia_word_count: number | null
}

interface LeaderboardEntry {
  kid_name: string
  best_wpm: number
  best_accuracy: number
  total_sessions: number
}

interface TypingSession {
  wpm: number
  accuracy_pct: number
  session_date: string
  personal_best: boolean
}

interface TypingRaceProps {
  kidName: string
  onStarEarned?: (amount: number, source: string) => void
}

const KID_GRADE_BANDS: Record<string, string> = {
  amos: 'upper',
  ellie: 'middle',
  wyatt: 'middle',
  hannah: 'lower',
  kaylee: 'middle',
  zoey: 'upper',
}

const DYSLEXIA_KIDS = ['amos']

export default function TypingRace({ kidName, onStarEarned }: TypingRaceProps) {
  const [view, setView] = useState<'home' | 'race' | 'results'>('home')
  const [passage, setPassage] = useState<TypingPassage | null>(null)
  const [passages, setPassages] = useState<TypingPassage[]>([])
  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [dyslexiaMode, setDyslexiaMode] = useState(DYSLEXIA_KIDS.includes(kidName.toLowerCase()))
  const [personalBest, setPersonalBest] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [history, setHistory] = useState<TypingSession[]>([])
  const [result, setResult] = useState<{ wpm: number; accuracy: number; stars: number; isPB: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const kid = kidName.toLowerCase()
  const gradeBand = KID_GRADE_BANDS[kid] || 'middle'

  // Load initial data
  useEffect(() => {
    const load = async () => {
      try {
        const [pbRes, lbRes, histRes, passRes] = await Promise.all([
          fetch(`/api/homeschool?action=get_typing_personal_best&kid_name=${kid}`),
          fetch('/api/homeschool?action=get_typing_leaderboard'),
          fetch(`/api/homeschool?action=get_typing_history&kid_name=${kid}&limit=5`),
          fetch(`/api/homeschool?action=get_typing_passages&grade_band=${gradeBand}`),
        ])
        const [pbJson, lbJson, histJson, passJson] = await Promise.all([
          pbRes.json(), lbRes.json(), histRes.json(), passRes.json(),
        ])
        setPersonalBest(pbJson.stats?.best_wpm || 0)
        setLeaderboard(lbJson.leaderboard || [])
        setHistory(histJson.sessions || [])
        setPassages(passJson.passages || [])
      } catch (err) {
        console.error('Failed to load typing data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [kid, gradeBand])

  const startRace = useCallback(() => {
    if (passages.length === 0) return
    const p = passages[Math.floor(Math.random() * passages.length)]
    setPassage(p)
    setTyped('')
    setStartTime(null)
    setEndTime(null)
    setResult(null)
    setView('race')
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [passages])

  const getTargetText = useCallback(() => {
    if (!passage) return ''
    if (dyslexiaMode && passage.dyslexia_version) return passage.dyslexia_version
    return passage.text
  }, [passage, dyslexiaMode])

  const handleTyping = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (!startTime && value.length > 0) {
      setStartTime(Date.now())
    }
    setTyped(value)

    const target = getTargetText()
    // Check if complete
    if (value.length >= target.length) {
      const end = Date.now()
      setEndTime(end)
      finishRace(value, end)
    }
  }, [startTime, getTargetText])

  const finishRace = async (finalTyped: string, end: number) => {
    if (!startTime || !passage) return
    const target = getTargetText()
    const timeSec = (end - startTime) / 1000
    const wordCount = target.split(/\s+/).length
    const wpm = Math.round((wordCount / timeSec) * 60)

    // Calculate accuracy
    let correct = 0
    for (let i = 0; i < Math.min(finalTyped.length, target.length); i++) {
      if (finalTyped[i] === target[i]) correct++
    }
    const accuracy = Math.round((correct / target.length) * 100)

    // Save session
    try {
      const res = await fetch('/api/homeschool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_typing_session',
          kid_name: kid,
          wpm,
          accuracy_pct: accuracy,
          passage_id: passage.id,
          dyslexia_mode: dyslexiaMode,
          race_mode: false,
        }),
      })
      const json = await res.json()
      const isPB = json.is_personal_best || false
      const starsEarned = json.stars_earned || 2

      setResult({ wpm, accuracy, stars: starsEarned, isPB })
      setView('results')

      // Award stars through digi-pet system
      const starTypes: { type: string; ref: string }[] = [
        { type: 'typing_session', ref: `typing-session-${kid}-${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })}` },
      ]
      if (isPB) {
        starTypes.push({ type: 'typing_pb', ref: `typing-pb-${kid}-${Date.now()}` })
      }
      if (accuracy >= 95) {
        starTypes.push({ type: 'typing_accuracy', ref: `typing-acc-${kid}-${Date.now()}` })
      }

      for (const st of starTypes) {
        await fetch('/api/digi-pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'award_task_stars',
            kid_name: kid,
            task_type: st.type,
            source_ref: st.ref,
          }),
        })
      }

      if (isPB) setPersonalBest(wpm)
      onStarEarned?.(starsEarned, 'typing')
    } catch (err) {
      console.error('Failed to save typing session:', err)
      setResult({ wpm, accuracy, stars: 0, isPB: false })
      setView('results')
    }
  }

  // Character-by-character coloring
  const renderPassageWithHighlight = () => {
    const target = getTargetText()
    return target.split('').map((char, i) => {
      let className = 'text-gray-400'
      if (i < typed.length) {
        if (typed[i] === char) {
          className = 'text-green-600'
        } else {
          className = dyslexiaMode ? 'text-orange-500 underline' : 'text-red-500 underline'
        }
      } else if (i === typed.length) {
        className = 'text-gray-900 bg-blue-100'
      }
      return (
        <span key={i} className={className}>
          {char}
        </span>
      )
    })
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
        Loading Typing Race...
      </div>
    )
  }

  // ---- HOME VIEW ----
  if (view === 'home') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600" />
            Typing Race
          </h3>
          {personalBest > 0 && (
            <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> Your Best: {personalBest} WPM
            </span>
          )}
        </div>

        {/* Dyslexia mode toggle */}
        {DYSLEXIA_KIDS.includes(kid) && (
          <label className="flex items-center gap-2 mb-4 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={dyslexiaMode}
              onChange={(e) => setDyslexiaMode(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Eye className="w-4 h-4" />
            Dyslexia-friendly mode (larger text, shorter passage)
          </label>
        )}

        {/* Family Challenge Board */}
        {leaderboard.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Users className="w-4 h-4" /> Family Challenge Board
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.kid_name}
                  className={`rounded-lg p-2 text-center text-sm border ${
                    entry.kid_name === kid
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="font-medium capitalize">
                    {i === 0 && '🏆 '}{entry.kid_name}
                  </div>
                  <div className="text-lg font-bold text-gray-900">{entry.best_wpm}</div>
                  <div className="text-xs text-gray-500">WPM</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent history */}
        {history.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <BarChart2 className="w-4 h-4" /> Recent Sessions
            </h4>
            <div className="flex gap-2 overflow-x-auto">
              {history.map((s, i) => (
                <div key={i} className="shrink-0 rounded-lg border border-gray-100 bg-gray-50 p-2 text-center text-xs min-w-[60px]">
                  <div className="font-bold text-gray-900">{s.wpm}</div>
                  <div className="text-gray-500">{s.accuracy_pct}%</div>
                  {s.personal_best && <div className="text-yellow-600 mt-0.5">PB!</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stars info */}
        <div className="text-xs text-gray-500 mb-4 space-y-0.5">
          <div>+2 stars for completing a session</div>
          <div>+5 stars for beating your personal best</div>
          <div>+3 stars for 95%+ accuracy</div>
        </div>

        <button
          onClick={startRace}
          disabled={passages.length === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {passages.length === 0 ? 'No passages available' : 'Start Typing!'}
        </button>
      </div>
    )
  }

  // ---- RACE VIEW ----
  if (view === 'race' && passage) {
    const target = getTargetText()
    const progress = Math.round((typed.length / target.length) * 100)

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600" />
            Type the passage below!
          </h3>
          <button
            onClick={() => setView('home')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full mb-4">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Passage display */}
        <div
          className={`rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4 leading-relaxed ${
            dyslexiaMode ? 'text-lg' : 'text-base'
          }`}
          style={dyslexiaMode ? {
            fontFamily: 'OpenDyslexic, Comic Sans MS, sans-serif',
            fontSize: '18px',
            lineHeight: '1.8',
          } : { fontFamily: 'monospace' }}
        >
          {renderPassageWithHighlight()}
        </div>

        {/* Typing input */}
        <textarea
          ref={inputRef}
          value={typed}
          onChange={handleTyping}
          placeholder="Start typing here..."
          className={`w-full rounded-lg border-2 border-blue-300 p-4 focus:border-blue-500 focus:outline-none resize-none ${
            dyslexiaMode ? 'text-lg' : 'text-base'
          }`}
          style={dyslexiaMode ? {
            fontFamily: 'OpenDyslexic, Comic Sans MS, sans-serif',
            fontSize: '18px',
            lineHeight: '1.8',
          } : { fontFamily: 'monospace' }}
          rows={4}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />

        {startTime && !endTime && (
          <div className="mt-2 text-sm text-gray-500 text-center">
            Keep going! {Math.round(progress)}% done
          </div>
        )}
      </div>
    )
  }

  // ---- RESULTS VIEW ----
  if (view === 'results' && result) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <div className="mb-4">
          {result.isPB ? (
            <>
              <div className="text-4xl mb-2">🏆</div>
              <h3 className="text-xl font-bold text-yellow-700">New Personal Best!</h3>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">⌨️</div>
              <h3 className="text-xl font-bold text-gray-800">Race Complete!</h3>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="text-3xl font-bold text-blue-700">{result.wpm}</div>
            <div className="text-sm text-blue-600">Words Per Minute</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <div className="text-3xl font-bold text-green-700">{result.accuracy}%</div>
            <div className="text-sm text-green-600">Accuracy</div>
          </div>
        </div>

        {result.stars > 0 && (
          <div className="mb-4 bg-yellow-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-yellow-800">
              +{result.stars} Stars Earned!
            </div>
            <div className="text-xs text-yellow-600 mt-1 space-y-0.5">
              <div>+2 session complete</div>
              {result.isPB && <div>+5 personal best!</div>}
              {result.accuracy >= 95 && <div>+3 accuracy bonus (95%+)</div>}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={startRace}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Race Again
          </button>
          <button
            onClick={() => setView('home')}
            className="px-4 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return null
}
