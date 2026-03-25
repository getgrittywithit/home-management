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

export default function DailyCheckInCard({ childName }: { childName: string }) {
  const [moodScore, setMoodScore] = useState<number | null>(null)
  const [oneWin, setOneWin] = useState('')
  const [oneHard, setOneHard] = useState('')
  const [whatHelped, setWhatHelped] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [existingMood, setExistingMood] = useState<number | null>(null)
  const [isAfternoon, setIsAfternoon] = useState(false)
  const [loaded, setLoaded] = useState(false)

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
          <button onClick={submit}
            className="w-full bg-teal-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-600">
            Submit Check-In
          </button>
        </div>
      )}
    </div>
  )
}
