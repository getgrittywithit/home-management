'use client'

import { useState, useEffect } from 'react'
import { Layers, Mic, BookOpen, Calculator, Trophy, Star } from 'lucide-react'
import FlashcardReview from './FlashcardReview'
import SpeechPractice from './SpeechPractice'

const DECK_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; badge: string; color: string }> = {
  vocabulary: { icon: BookOpen, badge: '📝', color: 'bg-purple-50 border-purple-200' },
  math: { icon: Calculator, badge: '🔢', color: 'bg-teal-50 border-teal-200' },
  speech_practice: { icon: Mic, badge: '🎤', color: 'bg-pink-50 border-pink-200' },
  staar_prep: { icon: Trophy, badge: '🏆', color: 'bg-amber-50 border-amber-200' },
  custom: { icon: Star, badge: '⭐', color: 'bg-blue-50 border-blue-200' },
}

interface Props { kidName: string }

export default function FlashcardDeckList({ kidName }: Props) {
  const kid = kidName.toLowerCase()
  const [decks, setDecks] = useState<any[]>([])
  const [openDeck, setOpenDeck] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/flashcards?action=decks&kid_name=${kid}`)
      .then(r => r.json()).then(d => { setDecks(d.decks || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kid])

  if (loading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto" /></div>

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-5 rounded-xl">
        <h2 className="text-xl font-bold flex items-center gap-2"><Layers className="w-6 h-6" /> My Flashcards</h2>
        <p className="text-purple-200 text-sm mt-1">{decks.length} deck{decks.length !== 1 ? 's' : ''}</p>
      </div>

      {decks.length === 0 && (
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-sm text-gray-600">Your deck is waiting.</p>
          <p className="text-xs text-gray-400 mt-1">Every word you meet here is one more you&apos;ll know forever.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {decks.map((deck: any) => {
          const meta = DECK_ICONS[deck.deck_type] || DECK_ICONS.custom
          const Icon = meta.icon
          return (
            <button key={deck.id} onClick={() => setOpenDeck(deck)}
              className={`p-4 rounded-xl border text-left ${meta.color} hover:shadow-sm`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-5 h-5" />
                <span className="text-sm font-semibold">{deck.deck_name}</span>
                <span className="text-lg">{meta.badge}</span>
              </div>
              <p className="text-xs text-gray-500">{deck.description || deck.deck_type.replace(/_/g, ' ')}</p>
            </button>
          )
        })}
      </div>

      {openDeck && openDeck.deck_type === 'speech_practice' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <SpeechPractice kidName={kidName} onClose={() => setOpenDeck(null)} />
          </div>
        </div>
      )}
      {openDeck && openDeck.deck_type !== 'speech_practice' && (
        <FlashcardReview kidName={kidName} onClose={() => setOpenDeck(null)} />
      )}
    </div>
  )
}
