'use client'

import { useState, useEffect, useRef } from 'react'
import { BookOpen, Play, Square, Clock, Star, X } from 'lucide-react'

interface Props { kidName: string; onClose: () => void; preselectedBookId?: number }

export default function ReadingSessionLogger({ kidName, onClose, preselectedBookId }: Props) {
  const kid = kidName.toLowerCase()
  const [books, setBooks] = useState<any[]>([])
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [startPage, setStartPage] = useState('')
  const [endPage, setEndPage] = useState('')
  const [chapterFinished, setChapterFinished] = useState('')
  const [reading, setReading] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [starsEarned, setStarsEarned] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch(`/api/library/books?kid_name=${kid}&status=reading&limit=20`)
      .then(r => r.json()).then(d => {
        const list = d.books || []
        setBooks(list)
        if (preselectedBookId) {
          const pre = list.find((b: any) => b.id === preselectedBookId)
          if (pre) { setSelectedBook(pre); setStartPage(String(pre.current_page || '')) }
        }
      }).catch(() => {})
  }, [kid, preselectedBookId])

  const startReading = () => {
    setReading(true)
    setStartTime(Date.now())
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - Date.now()) / 1000)), 1000)
    // Fix: use a stable start reference
    const start = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
  }

  const endReading = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    const minutes = Math.max(1, Math.floor(elapsed / 60))
    const stars = Math.min(40, Math.floor(minutes / 15) * 10 + 10)

    if (selectedBook) {
      await fetch('/api/library/reading-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_progress', kid_name: kid, book_id: selectedBook.id,
          current_chapter: chapterFinished ? parseInt(chapterFinished) : undefined,
          current_page: endPage ? parseInt(endPage) : undefined,
        }),
      }).catch(() => {})

      await fetch('/api/flashcards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_card', kid_name: kid, deck_type: 'vocabulary', front_text: '', back_text: '' }),
      }).catch(() => {}) // Stars handled below
    }

    // Award stars
    await fetch('/api/digi-pet', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'award_task_stars', kid_name: kid, task_type: 'reading_session', source_ref: `reading-${Date.now()}` }),
    }).catch(() => {})

    setStarsEarned(stars)
    setDone(true)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const displayName = kidName.charAt(0).toUpperCase() + kidName.slice(1)

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm text-center">
          <Star className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-gray-900">Great read, {displayName}!</p>
          <p className="text-sm text-gray-600 mt-2">
            {endPage && startPage ? `You read ${parseInt(endPage) - parseInt(startPage)} pages in ${formatTime(elapsed)}` : `${formatTime(elapsed)} of reading`}
          </p>
          <p className="text-amber-600 font-semibold mt-1">+{starsEarned} stars earned</p>
          <button onClick={onClose} className="mt-4 bg-purple-500 text-white px-6 py-2 rounded-xl text-sm font-medium">Done</button>
        </div>
      </div>
    )
  }

  if (reading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center space-y-4">
          <p className="text-sm text-gray-500">Reading {selectedBook?.title}...</p>
          <p className="text-4xl font-mono text-purple-700">{formatTime(elapsed)}</p>
          <div className="space-y-3">
            <input type="number" value={endPage} onChange={e => setEndPage(e.target.value)}
              placeholder="What page did you get to?" className="w-full border rounded-xl px-4 py-2.5 text-sm text-center" />
            <input type="number" value={chapterFinished} onChange={e => setChapterFinished(e.target.value)}
              placeholder="Chapter just finished? (optional)" className="w-full border rounded-xl px-4 py-2.5 text-sm text-center" />
          </div>
          <button onClick={endReading} className="w-full bg-green-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
            <Square className="w-4 h-4" /> Done Reading
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-500" /> Start Reading</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <select value={selectedBook?.id || ''} onChange={e => {
            const book = books.find((b: any) => String(b.id) === e.target.value)
            setSelectedBook(book || null)
            if (book) setStartPage(String(book.current_page || ''))
          }} className="w-full border rounded-xl px-3 py-2.5 text-sm">
            <option value="">What are you reading?</option>
            {books.map((b: any) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <input type="number" value={startPage} onChange={e => setStartPage(e.target.value)}
            placeholder="What page are you on?" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
          <button onClick={startReading} disabled={!selectedBook}
            className="w-full bg-purple-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Play className="w-4 h-4" /> Start Reading
          </button>
        </div>
      </div>
    </div>
  )
}
