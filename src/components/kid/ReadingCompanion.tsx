'use client'

import { useState, useEffect } from 'react'
import { BookOpen, MessageCircle, Heart, Brain, Lightbulb, X } from 'lucide-react'
import SpeakerButton from '../SpeakerButton'

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

interface Props {
  bookId: number
  kidName: string
  isParent?: boolean
  onClose: () => void
  onAskBuddy?: (question: string) => void
}

export default function ReadingCompanion({ bookId, kidName, isParent, onClose, onAskBuddy }: Props) {
  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/library/books?kid_name=${kidName.toLowerCase()}&book_id=${bookId}`)
      .then(r => r.json()).then(d => { setBook(d.books?.[0] || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [bookId, kidName])

  if (loading) return <div className="p-6 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto" /></div>
  if (!book) return null

  const growthThemes = book.growth_themes || []
  const therapyConcepts = book.therapy_concepts || []
  const discussionTopics = book.discussion_topics || []
  const starterQuestions = book.companion_starter_questions || []

  const hasContent = growthThemes.length > 0 || therapyConcepts.length > 0 || discussionTopics.length > 0 || starterQuestions.length > 0

  if (!hasContent) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-500" /> Reading Companion
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-4 space-y-5">
          <p className="text-xs text-gray-500">{book.title} by {book.author}</p>

          {growthThemes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-700 flex items-center gap-1 mb-1.5">
                <Heart className="w-3.5 h-3.5" /> Growth Themes
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {growthThemes.map((t: string, i: number) => (
                  <span key={i} className="bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200">
                    {humanize(t)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {therapyConcepts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-1.5">
                <Brain className="w-3.5 h-3.5" /> Themes to Process
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {therapyConcepts.map((t: string, i: number) => (
                  <span key={i} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full border border-blue-200">
                    {humanize(t)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {discussionTopics.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> Things to Think About
              </h4>
              <ul className="space-y-1">
                {discussionTopics.map((t: string, i: number) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{humanize(t)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {starterQuestions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-purple-700 flex items-center gap-1 mb-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Questions to Explore
              </h4>
              <div className="space-y-2">
                {starterQuestions.map((q: string, i: number) => (
                  <div key={i} className="bg-purple-50 rounded-lg p-2.5 flex items-start gap-2">
                    <p className="text-xs text-purple-900 flex-1">{q}</p>
                    <div className="flex gap-1 flex-shrink-0">
                      <SpeakerButton text={q} size="sm" />
                      {onAskBuddy && (
                        <button onClick={() => onAskBuddy(q)}
                          className="text-[9px] bg-purple-500 text-white px-2 py-0.5 rounded-full hover:bg-purple-600">
                          Ask Buddy
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isParent && book.trigger_notes && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold text-red-700 mb-1">Parent Notes (not shown to kids)</h4>
              <p className="text-xs text-gray-600 bg-red-50 rounded-lg p-2">{book.trigger_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
