'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Star, X, Search } from 'lucide-react'

interface ReadingLogModalProps {
  kidName: string
  onClose: () => void
  onLogged: () => void
}

export default function ReadingLogModal({ kidName, onClose, onLogged }: ReadingLogModalProps) {
  const [currentBook, setCurrentBook] = useState<any>(null)
  const [bookTitle, setBookTitle] = useState('')
  const [minutes, setMinutes] = useState('20')
  const [page, setPage] = useState('')
  const [finished, setFinished] = useState(false)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [saving, setSaving] = useState(false)
  const [showFinishCelebration, setShowFinishCelebration] = useState(false)

  useEffect(() => {
    fetch(`/api/reading?action=get_current_book&kid_name=${kidName.toLowerCase()}`)
      .then(r => r.json())
      .then(data => {
        if (data.book) {
          setCurrentBook(data.book)
          setBookTitle(data.book.book_title)
          if (data.book.current_page) setPage(String(data.book.current_page))
        }
      })
      .catch(() => {})
  }, [kidName])

  const handleLog = async () => {
    if (!bookTitle.trim() || !minutes) return
    setSaving(true)

    await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log_reading',
        kid_name: kidName,
        book_title: bookTitle,
        book_id: currentBook?.book_id || null,
        minutes_read: parseInt(minutes),
        pages_read: page ? parseInt(page) : null,
        finished_book: finished,
      }),
    })

    if (finished && rating > 0) {
      await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rate_book',
          kid_name: kidName,
          book_title: bookTitle,
          rating,
          review: review || null,
        }),
      })
    }

    if (finished) {
      setShowFinishCelebration(true)
      setTimeout(() => { onLogged(); onClose() }, 2000)
    } else {
      onLogged()
      onClose()
    }

    setSaving(false)
  }

  if (showFinishCelebration) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-gray-900">Book Finished!</h3>
          <p className="text-gray-600 mt-2">Great job finishing <strong>{bookTitle}</strong>!</p>
          <div className="flex justify-center gap-1 mt-3">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-6 h-6 ${s <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Log Your Reading
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Book */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">What did you read?</label>
            {currentBook && (
              <button
                onClick={() => setBookTitle(currentBook.book_title)}
                className={`w-full text-left p-3 rounded-lg border mb-2 ${
                  bookTitle === currentBook.book_title ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <span className="text-sm font-medium">📖 {currentBook.book_title}</span>
                <span className="text-xs text-gray-500 ml-2">(currently reading)</span>
              </button>
            )}
            <input
              type="text"
              value={bookTitle}
              onChange={e => setBookTitle(e.target.value)}
              placeholder="Or type a book title..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Minutes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">How long?</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                className="w-24 border rounded-lg px-3 py-2 text-sm text-center"
                min="1"
              />
              <span className="text-sm text-gray-500">minutes</span>
            </div>
          </div>

          {/* Page */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">What page are you on now?</label>
            <input
              type="number"
              value={page}
              onChange={e => setPage(e.target.value)}
              placeholder="optional"
              className="w-24 border rounded-lg px-3 py-2 text-sm text-center"
              min="0"
            />
          </div>

          {/* Finished */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={finished}
              onChange={e => setFinished(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">I finished this book!</span>
          </label>

          {/* Rating (if finished) */}
          {finished && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Rate it!</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)}>
                    <Star className={`w-7 h-7 ${s <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="Short review (optional)"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-2"
              />
            </div>
          )}

          <button
            onClick={handleLog}
            disabled={!bookTitle.trim() || !minutes || saving}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            {saving ? 'Logging...' : `Log Reading +3 ⭐`}
          </button>
        </div>
      </div>
    </div>
  )
}
