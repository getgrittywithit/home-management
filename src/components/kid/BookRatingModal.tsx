'use client'

import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { ALL_KIDS, KID_DISPLAY } from '@/lib/constants'

const RATINGS = [
  { value: 'loved', emoji: '🌟', label: 'Loved it!' },
  { value: 'liked', emoji: '😊', label: 'Liked it' },
  { value: 'okay', emoji: '😐', label: 'It was okay' },
  { value: 'disliked', emoji: '😕', label: "Didn't love it" },
  { value: 'hated', emoji: '😖', label: "Didn't like it" },
  { value: 'dnf', emoji: '📕', label: 'Did Not Finish' },
]

interface Props { kidName: string; bookId: number; bookTitle: string; onClose: () => void }

export default function BookRatingModal({ kidName, bookId, bookTitle, onClose }: Props) {
  const kid = kidName.toLowerCase()
  const [rating, setRating] = useState<string | null>(null)
  const [review, setReview] = useState('')
  const [favoritePart, setFavoritePart] = useState('')
  const [recommendTo, setRecommendTo] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const siblings = [...ALL_KIDS].filter(k => k !== kid)

  const handleSave = async () => {
    if (!rating) return
    setSaving(true)
    await fetch('/api/library/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_review', kid_name: kid, book_id: bookId, rating,
        review_text: review || null, favorite_part: favoritePart || null,
        would_recommend_to: recommendTo.length > 0 ? recommendTo : null,
      }),
    }).catch(() => {})
    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm text-center">
          <Star className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-gray-900">Thanks for sharing!</p>
          <p className="text-sm text-gray-500 mt-1">Your review is on the Family Bookshelf now.</p>
          <p className="text-amber-600 text-sm font-medium mt-2">+{review ? 20 : 15} stars</p>
          <button onClick={onClose} className="mt-4 bg-purple-500 text-white px-6 py-2 rounded-xl text-sm font-medium">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">How did this book feel?</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-gray-500 text-center">{bookTitle}</p>

          <div className="grid grid-cols-3 gap-2">
            {RATINGS.map(r => (
              <button key={r.value} onClick={() => setRating(r.value)}
                className={`p-3 rounded-xl border text-center transition ${rating === r.value ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300' : 'border-gray-200 hover:bg-gray-50'}`}>
                <span className="text-2xl block">{r.emoji}</span>
                <span className="text-[10px] text-gray-600 mt-1 block">{r.label}</span>
              </button>
            ))}
          </div>

          {rating && (
            <>
              <div>
                <label className="text-xs text-gray-500 block mb-1">What was your favorite part? (optional)</label>
                <input value={favoritePart} onChange={e => setFavoritePart(e.target.value)}
                  placeholder="I liked when..." className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Want to say more? (optional)</label>
                <textarea value={review} onChange={e => setReview(e.target.value)} rows={3}
                  placeholder="This book made me feel..." className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Who would love this book?</label>
                <div className="flex flex-wrap gap-1.5">
                  {siblings.map(sib => (
                    <button key={sib} onClick={() => setRecommendTo(prev => prev.includes(sib) ? prev.filter(s => s !== sib) : [...prev, sib])}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${recommendTo.includes(sib) ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {KID_DISPLAY[sib]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full bg-purple-500 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Review'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
