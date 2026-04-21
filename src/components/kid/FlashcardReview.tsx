'use client'

import { useState, useEffect } from 'react'
import { RotateCcw, Check, X, Star, ChevronRight } from 'lucide-react'

interface Card { id: number; front_text: string; back_text: string; example_sentence?: string; leitner_box: number; deck_name: string }
interface Props { kidName: string; onClose: () => void }

const ENCOURAGEMENTS_CORRECT = ['Nice!', 'You knew it!', 'Onto the next one!', 'Great memory!', 'Nailed it!']
const ENCOURAGEMENTS_WRONG = ["That's okay — we'll see this one again soon.", "No worries — it'll stick next time.", "Good effort — practice makes progress."]

export default function FlashcardReview({ kidName, onClose }: Props) {
  const kid = kidName.toLowerCase()
  const [cards, setCards] = useState<Card[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<Array<{ correct: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())

  useEffect(() => {
    fetch(`/api/flashcards?action=review_queue&kid_name=${kid}&max=10`)
      .then(r => r.json()).then(d => { setCards(d.cards || []); setLoading(false) }).catch(() => setLoading(false))
  }, [kid])

  const current = cards[idx]

  const handleAnswer = async (correct: boolean) => {
    const seconds = Math.round((Date.now() - startTime) / 1000)
    setResults(prev => [...prev, { correct }])

    await fetch('/api/flashcards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review', card_id: current.id, kid_name: kid, result: correct ? 'correct' : 'wrong', time_seconds: seconds }),
    }).catch(() => {})

    if (idx + 1 < cards.length) {
      setIdx(idx + 1)
      setFlipped(false)
      setStartTime(Date.now())
    } else {
      setDone(true)
    }
  }

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" /></div>
    </div>
  )

  if (cards.length === 0) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
        <Star className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-900">Your deck is waiting.</p>
        <p className="text-xs text-gray-500 mt-1">Every word you meet here is one more you&apos;ll know forever. Check back tomorrow.</p>
        <button onClick={onClose} className="mt-4 text-sm text-purple-600">Close</button>
      </div>
    </div>
  )

  if (done) {
    const correct = results.filter(r => r.correct).length
    const total = results.length
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
          <Star className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-gray-900">Great effort!</p>
          <p className="text-sm text-gray-600 mt-2">
            You reviewed {total} cards. {correct} were easy, {total - correct} we'll come back to.
          </p>
          <div className="flex gap-1 justify-center mt-3">
            {results.map((r, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${r.correct ? 'bg-green-400' : 'bg-amber-400'}`} />
            ))}
          </div>
          <button onClick={onClose} className="mt-5 bg-purple-500 text-white px-6 py-2 rounded-xl text-sm font-medium">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-xs text-gray-400">Card {idx + 1} of {cards.length}</span>
          <div className="flex gap-1">
            {cards.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < idx ? (results[i]?.correct ? 'bg-green-400' : 'bg-amber-400') : i === idx ? 'bg-purple-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <button onClick={onClose} className="text-xs text-gray-400">Skip</button>
        </div>

        <button onClick={() => setFlipped(!flipped)} className="w-full p-8 min-h-[200px] flex flex-col items-center justify-center text-center">
          {!flipped ? (
            <>
              <p className="text-lg font-bold text-gray-900">{current.front_text}</p>
              <p className="text-xs text-gray-400 mt-3 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Tap to reveal</p>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-2">{current.front_text}</p>
              <p className="text-lg font-bold text-purple-700">{current.back_text}</p>
              {current.example_sentence && <p className="text-xs text-gray-500 mt-2 italic">{current.example_sentence}</p>}
            </>
          )}
        </button>

        {flipped && (
          <div className="p-4 border-t flex gap-3">
            <button onClick={() => handleAnswer(false)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 py-3 rounded-xl text-sm font-medium hover:bg-amber-100 border border-amber-200">
              <X className="w-4 h-4" /> Not yet
            </button>
            <button onClick={() => handleAnswer(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 text-green-700 py-3 rounded-xl text-sm font-medium hover:bg-green-100 border border-green-200">
              <Check className="w-4 h-4" /> I knew it!
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
