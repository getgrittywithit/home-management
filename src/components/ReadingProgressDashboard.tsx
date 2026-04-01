'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Star } from 'lucide-react'

interface KidProgress {
  kid_name: string
  current_book: { book_title: string; current_page: number; total_pages: number } | null
  week_sessions: number
  week_minutes: number
  books_finished: number
}

export default function ReadingProgressDashboard() {
  const [kids, setKids] = useState<KidProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reading?action=get_all_kids_progress')
      .then(r => r.json())
      .then(data => { setKids(data.kids || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-4 text-center text-gray-400">Loading reading data...</div>

  const KID_ICONS: Record<string, string> = {
    amos: '🦉', ellie: '🐱', wyatt: '🐕', hannah: '🐰', zoey: '📚', kaylee: '📖',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white">
        <h3 className="font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Reading Progress — All Kids
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {kids.filter(k => k.current_book || k.books_finished > 0 || k.week_sessions > 0).map(kid => {
          const book = kid.current_book
          const pct = book && book.total_pages ? Math.round((book.current_page / book.total_pages) * 100) : 0
          return (
            <div key={kid.kid_name} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1">
                <span>{KID_ICONS[kid.kid_name] || '👦'}</span>
                <span className="font-medium text-gray-900 capitalize">{kid.kid_name}</span>
              </div>
              {book ? (
                <div className="ml-6">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{book.book_title}</span>
                    <span className="text-xs text-gray-500">pg {book.current_page}/{book.total_pages} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full">
                    <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              ) : (
                <p className="ml-6 text-xs text-gray-400 italic">No current book</p>
              )}
              <div className="ml-6 flex gap-3 mt-1 text-xs text-gray-500">
                <span>{kid.week_sessions} sessions this week · {kid.week_minutes} min</span>
                <span>Books finished: {kid.books_finished}</span>
              </div>
            </div>
          )
        })}
        {kids.filter(k => k.current_book || k.books_finished > 0 || k.week_sessions > 0).length === 0 && (
          <p className="text-center text-sm text-gray-400 py-4">No reading data yet. Kids will see progress here once they start logging.</p>
        )}
      </div>
    </div>
  )
}
