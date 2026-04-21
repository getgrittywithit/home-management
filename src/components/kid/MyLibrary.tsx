'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Star, Check, ChevronRight } from 'lucide-react'

interface Book {
  id: number; title: string; author: string; cover_url?: string
  reading_grade_equivalent?: string; genre?: string; interest_tags?: string[]
  read_status?: string; current_page?: number; kid_rating?: number
  has_bookbuddy_prompts?: boolean
}

interface Props {
  kidName: string
  onSelectBook?: (bookId: number) => void
}

export default function MyLibrary({ kidName, onSelectBook }: Props) {
  const kid = kidName.toLowerCase()
  const [books, setBooks] = useState<Book[]>([])
  const [recs, setRecs] = useState<Book[]>([])
  const [filter, setFilter] = useState<'all' | 'reading' | 'finished' | 'unread'>('all')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/library/books?kid_name=${kid}&status=${filter === 'all' ? '' : filter}`).then(r => r.json()).catch(() => ({ books: [] })),
      fetch(`/api/library/kid-recommendations?kid_name=${kid}`).then(r => r.json()).catch(() => ({ recommendations: [] })),
    ]).then(([booksData, recsData]) => {
      setBooks(booksData.books || [])
      setRecs(recsData.recommendations || [])
      setLoaded(true)
    })
  }, [kid, filter])

  const startReading = async (bookId: number) => {
    await fetch('/api/library/books', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start_reading', kid_name: kid, book_id: bookId }),
    }).catch(() => {})
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, read_status: 'reading' } : b))
    onSelectBook?.(bookId)
  }

  if (!loaded) return <div className="p-4 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto" /></div>

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4">
        <h3 className="font-bold text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" /> My Library</h3>
        <p className="text-xs text-purple-200 mt-0.5">{books.length} books available</p>
      </div>

      {recs.length > 0 && (
        <div className="p-3 bg-purple-50 border-b">
          <p className="text-[10px] font-semibold text-purple-600 mb-1.5">RECOMMENDED FOR YOU</p>
          <div className="flex gap-2 overflow-x-auto">
            {recs.map(book => (
              <button key={book.id} onClick={() => startReading(book.id)}
                className="flex-shrink-0 w-28 rounded-lg border border-purple-200 bg-white p-2 text-left hover:border-purple-400">
                <div className="w-full h-16 bg-purple-100 rounded mb-1.5 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-300" />
                </div>
                <p className="text-[10px] font-medium text-gray-900 line-clamp-2">{book.title}</p>
                <p className="text-[8px] text-gray-400">{book.author}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 p-2 border-b">
        {(['all', 'reading', 'finished', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${filter === f ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {f === 'all' ? 'All' : f === 'reading' ? 'Reading' : f === 'finished' ? 'Loved' : 'New'}
          </button>
        ))}
      </div>

      <div className="p-2 space-y-1.5 max-h-80 overflow-y-auto">
        {books.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No books match this filter</p>}
        {books.map(book => (
          <div key={book.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => book.read_status === 'reading' ? onSelectBook?.(book.id) : startReading(book.id)}>
            <div className="w-10 h-14 bg-purple-100 rounded flex-shrink-0 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{book.title}</p>
              <p className="text-[10px] text-gray-400">{book.author}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {book.reading_grade_equivalent && <span className="text-[9px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded">{book.reading_grade_equivalent}</span>}
                {book.genre && <span className="text-[9px] text-gray-400">{book.genre}</span>}
                {book.read_status === 'reading' && <span className="text-[9px] text-blue-600 font-medium">Reading p.{book.current_page || '?'}</span>}
                {book.read_status === 'finished' && <span className="text-[9px] text-green-600 flex items-center gap-0.5"><Check className="w-2.5 h-2.5" /> Done</span>}
                {book.kid_rating && (
                  <span className="text-[9px] text-amber-500 flex items-center gap-0.5">
                    {Array.from({ length: book.kid_rating }).map((_, i) => <Star key={i} className="w-2 h-2 fill-amber-400" />)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
