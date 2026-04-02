'use client'

import { useState, useEffect } from 'react'

const MOODS = [
  { score: 1, emoji: '😔' },
  { score: 2, emoji: '😕' },
  { score: 3, emoji: '😐' },
  { score: 4, emoji: '🙂' },
  { score: 5, emoji: '😄' },
]

const MOOD_COLORS: Record<number, string> = {
  1: 'ring-red-300 bg-red-50',
  2: 'ring-orange-300 bg-orange-50',
  3: 'ring-yellow-300 bg-yellow-50',
  4: 'ring-teal-300 bg-teal-50',
  5: 'ring-green-300 bg-green-50',
}

const ENERGY_OPTIONS = [
  { score: 1, label: 'Exhausted', emoji: '😴' },
  { score: 2, label: 'Tired', emoji: '🥱' },
  { score: 3, label: 'Okay', emoji: '😐' },
  { score: 4, label: 'Energized', emoji: '⚡' },
]
const WORRY_OPTIONS = [
  { score: 1, label: 'Calm', emoji: '😌' },
  { score: 2, label: 'A little', emoji: '😐' },
  { score: 3, label: 'A lot', emoji: '😟' },
  { score: 4, label: "Can't stop", emoji: '😰' },
]
const GRUMPY_OPTIONS = [
  { score: 1, label: 'Not at all', emoji: '😊' },
  { score: 2, label: 'A little', emoji: '😐' },
  { score: 3, label: 'Yeah', emoji: '😤' },
  { score: 4, label: 'Very', emoji: '🤬' },
]
const FOCUS_OPTIONS = [
  { score: 1, label: 'Locked in', emoji: '🎯' },
  { score: 2, label: 'Okay', emoji: '😐' },
  { score: 3, label: 'Scattered', emoji: '😵' },
  { score: 4, label: "Can't focus", emoji: '💨' },
]

export default function DailyCheckInCard({ childName }: { childName: string }) {
  const [moodScore, setMoodScore] = useState<number | null>(null)
  const [oneWin, setOneWin] = useState('')
  const [oneHard, setOneHard] = useState('')
  const [whatHelped, setWhatHelped] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [existingMood, setExistingMood] = useState<number | null>(null)
  const [isAfternoon, setIsAfternoon] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showExpanded, setShowExpanded] = useState(false)
  const [energy, setEnergy] = useState<number | null>(null)
  const [anxiety, setAnxiety] = useState<number | null>(null)
  const [irritability, setIrritability] = useState<number | null>(null)
  const [focus, setFocus] = useState<number | null>(null)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    setIsAfternoon(now.getHours() >= 15)

    fetch(`/api/kids/mood?action=get_today_mood&kid=${childKey}`)
      .then(r => r.json())
      .then(data => {
        if (data.mood) setExistingMood(data.mood.mood_score)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [childKey])

  if (!loaded || !isAfternoon) return null

  const submit = async () => {
    if (!moodScore) return
    await fetch('/api/kids/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log_mood',
        kid_name: childKey,
        mood_score: moodScore,
        one_win: oneWin.trim() || null,
        one_hard_thing: oneHard.trim() || null,
        what_helped: whatHelped.trim() || null,
        ...(energy !== null ? { energy } : {}),
        ...(anxiety !== null ? { anxiety } : {}),
        ...(irritability !== null ? { irritability } : {}),
        ...(focus !== null ? { focus } : {}),
      })
    })
    setExistingMood(moodScore)
    setSubmitted(true)
  }

  // Already checked in
  if (existingMood && !submitted) {
    const moodEmoji = MOODS.find(m => m.score === existingMood)?.emoji || '😐'
    return (
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <div className="text-center">
          <span className="text-4xl">{moodEmoji}</span>
          <p className="text-sm text-gray-500 mt-2">You checked in today</p>
        </div>
      </div>
    )
  }

  // Just submitted
  if (submitted) {
    const moodEmoji = MOODS.find(m => m.score === moodScore)?.emoji || '😐'
    return (
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <div className="text-center">
          <span className="text-4xl">{moodEmoji}</span>
          <p className="text-sm text-gray-600 mt-2 font-medium">Thanks for sharing!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 mb-4">How was your day?</h3>

      {/* Mood picker */}
      <div className="flex justify-center gap-3 mb-4">
        {MOODS.map(m => (
          <button
            key={m.score}
            onClick={() => setMoodScore(m.score)}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
              moodScore === m.score
                ? `ring-4 ${MOOD_COLORS[m.score]} scale-110`
                : 'hover:bg-gray-100'
            }`}
          >
            {m.emoji}
          </button>
        ))}
      </div>

      {/* Prompts — show after mood picked */}
      {moodScore && (
        <div className="space-y-3 mt-4">
          <div>
            <label className="text-xs font-medium text-gray-500">One good thing today:</label>
            <input type="text" value={oneWin} onChange={e => setOneWin(e.target.value.substring(0, 150))}
              placeholder="Something that made you smile..."
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">One hard thing:</label>
            <input type="text" value={oneHard} onChange={e => setOneHard(e.target.value.substring(0, 150))}
              placeholder="Something that was tricky or frustrating..."
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">What helped you today?</label>
            <input type="text" value={whatHelped} onChange={e => setWhatHelped(e.target.value.substring(0, 150))}
              placeholder="A person, activity, or just some quiet time..."
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>
          {/* MOOD-EXPAND-1: Optional expanded dimensions */}
          {!showExpanded && (
            <button onClick={() => setShowExpanded(true)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
              + Tell me more (optional)
            </button>
          )}
          {showExpanded && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">Optional — skip any you don&apos;t want to answer</p>
              <DimensionPicker label="Energy" options={ENERGY_OPTIONS} value={energy} onChange={setEnergy} />
              <DimensionPicker label="Worry" options={WORRY_OPTIONS} value={anxiety} onChange={setAnxiety} />
              <DimensionPicker label="Grumpy" options={GRUMPY_OPTIONS} value={irritability} onChange={setIrritability} />
              <DimensionPicker label="Focus" options={FOCUS_OPTIONS} value={focus} onChange={setFocus} />
            </div>
          )}

          <button onClick={submit}
            className="w-full bg-teal-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-600">
            Submit Check-In
          </button>
        </div>
      )}
    </div>
  )
}

function DimensionPicker({ label, options, value, onChange }: {
  label: string
  options: { score: number; label: string; emoji: string }[]
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="flex gap-1.5 mt-1">
        {options.map(opt => (
          <button key={opt.score} onClick={() => onChange(value === opt.score ? null : opt.score)}
            className={`flex-1 text-center py-1.5 rounded-lg text-xs transition-all ${
              value === opt.score ? 'bg-teal-100 ring-2 ring-teal-300 font-medium' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
            <div className="text-base">{opt.emoji}</div>
            <div className="text-gray-600 mt-0.5">{opt.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
