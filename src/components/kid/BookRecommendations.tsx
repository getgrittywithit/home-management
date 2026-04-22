'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Plus, ChevronRight } from 'lucide-react'

interface Props { kidName: string }

export default function BookRecommendations({ kidName }: Props) {
  const kid = kidName.toLowerCase()
  const [recs, setRecs] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/library/recommendations?kid_name=${kid}`)
      .then(r => r.json()).then(d => { setRecs(d.recommendations || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [kid])

  const addToWantToRead = async (bookId: number) => {
    await fetch('/api/library/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_to_want_to_read', kid_name: kid, book_id: bookId, source: 'coral_suggest' }),
    }).catch(() => {})
    setRecs(prev => prev.filter(r => r.id !== bookId))
  }

  if (!loaded || recs.length === 0) return null

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
        <BookOpen className="w-4 h-4 text-purple-500" /> Books for You
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {recs.slice(0, 5).map((book: any) => (
          <div key={book.id} className="flex-shrink-0 w-32 rounded-xl border p-2.5 hover:shadow-sm">
            <div className="w-full h-20 bg-purple-50 rounded-lg flex items-center justify-center mb-2">
              <BookOpen className="w-6 h-6 text-purple-300" />
            </div>
            <p className="text-[11px] font-medium text-gray-900 line-clamp-2 leading-tight">{book.title}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{book.author}</p>
            {book.reason && (
              <p className="text-[9px] text-purple-600 mt-1 line-clamp-1">{book.reason}</p>
            )}
            <button onClick={() => addToWantToRead(book.id)}
              className="mt-2 w-full flex items-center justify-center gap-1 bg-purple-50 text-purple-700 py-1 rounded-lg text-[10px] font-medium hover:bg-purple-100">
              <Plus className="w-3 h-3" /> Want to Read
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
