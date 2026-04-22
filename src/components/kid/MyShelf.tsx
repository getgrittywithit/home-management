'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Star, Clock, Flame, Play, X, Check } from 'lucide-react'

interface Props { kidName: string }

export default function MyShelf({ kidName }: Props) {
  const kid = kidName.toLowerCase()
  const [readingNow, setReadingNow] = useState<any[]>([])
  const [wantToRead, setWantToRead] = useState<any[]>([])
  const [finished, setFinished] = useState<any[]>([])
  const [stats, setStats] = useState<Record<string, number>>({ books_finished: 0, total_minutes: 0, streak: 0, want_count: 0 })
  const [loading, setLoading] = useState(true)
  const displayName = kidName.charAt(0).toUpperCase() + kidName.slice(1)

  useEffect(() => {
    Promise.all([
      fetch(`/api/library/books?kid_name=${kid}&status=reading`).then(r => r.json()).catch(() => ({ books: [] })),
      fetch(`/api/library/recommendations?kid_name=${kid}`).then(r => r.json()).catch(() => ({ want_to_read: [] })),
      fetch(`/api/library/books?kid_name=${kid}&status=finished`).then(r => r.json()).catch(() => ({ books: [] })),
      fetch(`/api/library/reviews?kid_name=${kid}`).then(r => r.json()).catch(() => ({ stats: {} })),
    ]).then(([reading, recs, done, reviews]) => {
      setReadingNow(reading.books || [])
      setWantToRead(recs.want_to_read || [])
      setFinished(done.books || [])
      setStats({
        books_finished: (done.books || []).length,
        total_minutes: 0,
        streak: 0,
        want_count: (recs.want_to_read || []).length,
        ...reviews.stats,
      })
      setLoading(false)
    })
  }, [kid])

  const removeFromWantToRead = async (bookId: number) => {
    setWantToRead(prev => prev.filter(b => b.book_id !== bookId))
    // Could add DELETE endpoint
  }

  const RATING_EMOJI: Record<string, string> = { loved: '🌟', liked: '😊', okay: '😐', disliked: '😕', hated: '😖', dnf: '📕' }

  if (loading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto" /></div>

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-5 rounded-xl">
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" /> My Shelf</h2>
        <p className="text-purple-200 text-sm mt-1">Welcome back to your library, {displayName}!</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="bg-green-50 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-green-700">{stats.books_finished}</p>
          <p className="text-[9px] text-green-500">Finished</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-amber-700">{stats.total || stats.loved || 0}</p>
          <p className="text-[9px] text-amber-500">Reviewed</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-blue-700">{readingNow.length}</p>
          <p className="text-[9px] text-blue-500">Reading</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-purple-700">{stats.want_count}</p>
          <p className="text-[9px] text-purple-500">Want to Read</p>
        </div>
      </div>

      {readingNow.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">READING NOW</h3>
          <div className="space-y-2">
            {readingNow.map((book: any) => (
              <div key={book.id} className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 border border-blue-100">
                <div className="w-8 h-11 bg-blue-200 rounded flex items-center justify-center text-xs">📖</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{book.title}</p>
                  <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${book.current_page && book.total_pages ? Math.round(book.current_page / book.total_pages * 100) : 0}%` }} />
                  </div>
                </div>
                <Play className="w-4 h-4 text-blue-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {wantToRead.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">WANT TO READ</h3>
          <div className="space-y-1.5">
            {wantToRead.map((book: any) => (
              <div key={book.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-xs">
                <div className="w-6 h-8 bg-purple-100 rounded flex items-center justify-center text-[10px]">📚</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{book.title}</p>
                  <p className="text-gray-400 text-[10px]">{book.author}</p>
                </div>
                <button onClick={() => removeFromWantToRead(book.book_id)} className="p-1 text-gray-300 hover:text-gray-500"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {finished.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">FINISHED</h3>
          <div className="grid grid-cols-2 gap-2">
            {finished.map((book: any) => (
              <div key={book.id} className="p-2 rounded-lg bg-green-50 border border-green-100 text-center">
                <p className="text-xs font-medium text-gray-900 truncate">{book.title}</p>
                <p className="text-lg mt-1">{RATING_EMOJI[book.kid_rating] || book.kid_rating ? RATING_EMOJI[book.read_status] || '⭐' : '⭐'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {readingNow.length === 0 && finished.length === 0 && wantToRead.length === 0 && (
        <div className="bg-white rounded-xl border p-8 text-center">
          <BookOpen className="w-10 h-10 text-purple-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Your shelf is ready for its first book.</p>
          <p className="text-xs text-gray-400 mt-1">Every story you open becomes part of your reading journey.</p>
        </div>
      )}
    </div>
  )
}
