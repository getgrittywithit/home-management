'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, Pause, RotateCcw } from 'lucide-react'

interface FocusTimerProps {
  studentName: string
  studentId: string
  subjectName: string
  subjectId: string
  subjectEmoji: string
  plannedMins: number
  mascot: string
  mascotName: string
  colorTheme: string
  onComplete: (result: { mood: string; elapsed: number; coins: number }) => void
}

type TimerPhase = 'focus' | 'break' | 'done'

const BREAK_MINS = 5
const COINS_PER_SESSION = 3

const THEME_COLORS: Record<string, { ring: string; bg: string; text: string; btn: string; btnHover: string; light: string }> = {
  blue:   { ring: 'stroke-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   btn: 'bg-blue-500',   btnHover: 'hover:bg-blue-600',   light: 'bg-blue-100' },
  purple: { ring: 'stroke-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', btn: 'bg-purple-500', btnHover: 'hover:bg-purple-600', light: 'bg-purple-100' },
  orange: { ring: 'stroke-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', btn: 'bg-orange-500', btnHover: 'hover:bg-orange-600', light: 'bg-orange-100' },
  green:  { ring: 'stroke-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  btn: 'bg-green-500',  btnHover: 'hover:bg-green-600',  light: 'bg-green-100' },
}

const MASCOT_STATES: Record<string, { focus: string; break: string; done: string }> = {
  '🦉': { focus: '🦉', break: '🧘', done: '🎉' },
  '🐱': { focus: '🐱', break: '😺', done: '🎊' },
  '🐕': { focus: '🐕', break: '🐾', done: '🏆' },
  '🐰': { focus: '🐰', break: '🌸', done: '⭐' },
}

export default function FocusTimer({
  studentName, studentId, subjectName, subjectId, subjectEmoji,
  plannedMins, mascot, mascotName, colorTheme, onComplete
}: FocusTimerProps) {
  const [phase, setPhase] = useState<TimerPhase>('focus')
  const [secondsLeft, setSecondsLeft] = useState(plannedMins * 60)
  const [totalFocusSecs, setTotalFocusSecs] = useState(plannedMins * 60)
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(BREAK_MINS * 60)
  const [paused, setPaused] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [elapsedFocus, setElapsedFocus] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const colors = THEME_COLORS[colorTheme] || THEME_COLORS.blue
  const mascotStates = MASCOT_STATES[mascot] || MASCOT_STATES['🦉']

  // Start session on mount
  useEffect(() => {
    fetch('/api/homeschool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start_focus_session',
        data: { student_id: studentId, subject_id: subjectId, planned_mins: plannedMins }
      })
    })
      .then(r => r.json())
      .then(data => { if (data.session_id) setSessionId(data.session_id) })
      .catch(() => {})

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer tick
  useEffect(() => {
    if (paused || phase === 'done') {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }

    intervalRef.current = setInterval(() => {
      if (phase === 'focus') {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            // Time's up -- auto finish
            handleFinish()
            return 0
          }
          return prev - 1
        })
        setElapsedFocus(prev => prev + 1)
      } else if (phase === 'break') {
        setBreakSecondsLeft(prev => {
          if (prev <= 1) {
            // Break over, resume focus
            resumeFromBreak()
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [phase, paused]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBreak = useCallback(() => {
    setPhase('break')
    setBreakSecondsLeft(BREAK_MINS * 60)
    if (sessionId) {
      fetch('/api/homeschool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause_focus_session', data: { session_id: sessionId } })
      }).catch(() => {})
    }
  }, [sessionId])

  const resumeFromBreak = useCallback(() => {
    setPhase('focus')
  }, [])

  const handleFinish = useCallback(() => {
    setPhase('done')
    if (sessionId) {
      fetch('/api/homeschool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end_focus_session',
          data: { session_id: sessionId, elapsed_secs: elapsedFocus }
        })
      }).catch(() => {})
    }
  }, [sessionId, elapsedFocus])

  const handleMoodSelect = (mood: string) => {
    onComplete({ mood, elapsed: elapsedFocus, coins: COINS_PER_SESSION })
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Progress ring calculations
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const progressFraction = phase === 'focus'
    ? secondsLeft / totalFocusSecs
    : breakSecondsLeft / (BREAK_MINS * 60)
  const dashOffset = circumference * progressFraction

  // ---------- DONE SCREEN ----------
  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className={`${colors.bg} rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl`}>
          <div className="text-6xl mb-4">{mascotStates.done}</div>
          <h2 className={`text-2xl font-bold ${colors.text} mb-1`}>Great work, {studentName}!</h2>
          <p className="text-gray-600 mb-6">You focused for {Math.round(elapsedFocus / 60)} minutes on {subjectName}</p>

          <div className={`${colors.light} rounded-xl p-4 mb-6`}>
            <p className="text-lg font-bold">⭐ {COINS_PER_SESSION} coins earned!</p>
          </div>

          <p className="text-sm text-gray-500 mb-3">How did it go?</p>
          <div className="flex justify-center gap-4">
            {[
              { emoji: '😊', label: 'Great', value: 'great' },
              { emoji: '😐', label: 'Okay', value: 'okay' },
              { emoji: '😟', label: 'Rough', value: 'rough' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => handleMoodSelect(opt.value)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/80 transition-colors"
              >
                <span className="text-3xl">{opt.emoji}</span>
                <span className="text-xs text-gray-600">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---------- BREAK SCREEN ----------
  if (phase === 'break') {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">{mascotStates.break}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Break Time!</h2>
          <p className="text-gray-500 mb-2">{mascotName} says: stretch, breathe, move around</p>

          <div className="text-5xl font-mono font-bold text-gray-700 my-6">
            {formatTimer(breakSecondsLeft)}
          </div>

          <button
            onClick={resumeFromBreak}
            className={`${colors.btn} ${colors.btnHover} text-white px-8 py-3 rounded-xl font-semibold text-lg transition-colors flex items-center gap-2 mx-auto`}
          >
            <Play className="w-5 h-5" /> Resume
          </button>
        </div>
      </div>
    )
  }

  // ---------- FOCUS SCREEN ----------
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={() => handleFinish()}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mascot */}
        <div className="text-5xl mb-2">{mascotStates.focus}</div>

        {/* Subject */}
        <p className={`text-lg font-semibold ${colors.text} mb-1`}>
          {subjectEmoji} {subjectName}
        </p>
        <p className="text-sm text-gray-400 mb-6">{studentName}'s focus session</p>

        {/* Progress ring */}
        <div className="relative w-52 h-52 mx-auto mb-6">
          <svg className="w-52 h-52 -rotate-90" viewBox="0 0 200 200">
            {/* Background ring */}
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
            {/* Progress ring */}
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              className={colors.ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          {/* Timer text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-bold text-gray-800">
              {formatTimer(secondsLeft)}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              {paused ? 'PAUSED' : 'remaining'}
            </span>
          </div>
        </div>

        {/* Coins preview */}
        <div className={`${colors.light} rounded-lg px-4 py-2 mb-6 inline-block`}>
          <span className="text-sm font-medium">⭐ {COINS_PER_SESSION} coins when done</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleBreak}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
          >
            <Pause className="w-4 h-4" /> Take a Break
          </button>
          <button
            onClick={() => handleFinish()}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl ${colors.btn} ${colors.btnHover} text-white font-medium transition-colors`}
          >
            I'm Done
          </button>
        </div>
      </div>
    </div>
  )
}
