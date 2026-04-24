'use client'

import { useState, useEffect } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, RotateCw, Check } from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

interface VocabWord {
  id: string
  word: string
  definition: string
  example_sentence: string | null
}

interface Props {
  kidName: string
}

export default function VocabPracticeCard({ kidName }: Props) {
  const [focus, setFocus] = useState<any>(null)
  const [words, setWords] = useState<VocabWord[]>([])
  const [practiced, setPracticed] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState<'list' | 'flashcard'>('list')
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    fetch(`/api/assessments?action=get_weekly_focus&week_start=${today}`)
      .then(r => r.json())
      .then(async data => {
        const f = data.focus
        setFocus(f)
        if (f?.vocab_book_id) {
          const url = f.vocab_set_name
            ? `/api/assessments?action=get_vocab_words&book_id=${f.vocab_book_id}&set_name=${encodeURIComponent(f.vocab_set_name)}`
            : `/api/assessments?action=get_vocab_words&book_id=${f.vocab_book_id}`
          const wordsRes = await fetch(url).then(r => r.json())
          setWords(wordsRes.words || [])
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [kidName])

  if (!loaded) return null
  if (!focus?.vocab_book_id || words.length === 0) return null

  const markPracticed = (wordId: string) => {
    if (practiced.has(wordId)) return
    setPracticed(prev => new Set(prev).add(wordId))
    fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_vocab_practice', kid_name: kidName, word_id: wordId }),
    }).catch(() => {})
  }

  const testDate = focus.vocab_test_date
    ? parseDateLocal(focus.vocab_test_date).toLocaleDateString('en-US', { weekday: 'long' })
    : 'Friday'

  if (mode === 'flashcard') {
    const card = words[cardIdx]
    if (!card) {
      setMode('list')
      return null
    }
    return (
      <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Flashcard {cardIdx + 1} of {words.length}
          </h3>
          <button
            onClick={() => { setMode('list'); setFlipped(false) }}
            className="text-xs text-gray-500 hover:text-gray-900"
          >
            Back to list
          </button>
        </div>

        <div
          onClick={() => setFlipped(f => !f)}
          className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 min-h-[180px] flex items-center justify-center cursor-pointer select-none"
        >
          <div className="text-center">
            {!flipped ? (
              <>
                <p className="text-3xl font-bold text-gray-900 mb-2">{card.word}</p>
                <p className="text-xs text-gray-500 italic">Tap to see definition</p>
              </>
            ) : (
              <>
                <p className="text-lg text-gray-800 leading-relaxed">{card.definition}</p>
                {card.example_sentence && (
                  <p className="text-sm text-gray-500 mt-3 italic">"{card.example_sentence}"</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => { setCardIdx(i => Math.max(0, i - 1)); setFlipped(false) }}
            disabled={cardIdx === 0}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => { markPracticed(card.id); setFlipped(false) }}
            className={`text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-1 ${
              practiced.has(card.id)
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {practiced.has(card.id) ? <><Check className="w-4 h-4" /> Got It</> : 'Mark Practiced'}
          </button>
          <button
            onClick={() => { setCardIdx(i => Math.min(words.length - 1, i + 1)); setFlipped(false) }}
            disabled={cardIdx === words.length - 1}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((cardIdx + 1) / words.length) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            This Week's Words
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {words.length} words · Test on {testDate}
          </p>
        </div>
        <button
          onClick={() => { setMode('flashcard'); setCardIdx(0); setFlipped(false) }}
          className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-1"
        >
          <RotateCw className="w-3 h-3" /> Flashcards
        </button>
      </div>

      <ul className="space-y-1.5 max-h-64 overflow-y-auto">
        {words.map(w => (
          <li key={w.id} className="text-sm border-b border-gray-50 pb-1.5">
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-gray-900">{w.word}</span>
              <span className="text-gray-400">—</span>
              <span className="text-gray-600">{w.definition}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="text-xs text-gray-500 pt-1 border-t flex items-center gap-1">
        <span>Progress: {practiced.size}/{words.length} practiced</span>
        {practiced.size === words.length && <span className="text-green-600 font-medium">⭐ All done!</span>}
      </div>
    </div>
  )
}
