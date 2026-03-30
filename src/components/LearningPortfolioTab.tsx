'use client'

import { useState, useEffect } from 'react'
import { Flame, BookOpen, Lightbulb, Image, Plus, Trash2, Star, Check, ChevronDown, ChevronUp, X } from 'lucide-react'

interface Book { id: number; book_title: string; author: string | null; status: string; rating: number | null; notes: string | null; date_completed: string | null }
interface WishItem { id: number; topic: string; notes: string | null; completed: boolean }
interface WorkEntry { id: number; title: string; description: string | null; subject: string | null; work_date: string }
interface LessonLog { id: number; subject_name: string; subject_emoji: string | null; notes: string | null; photo_url: string | null; log_date: string }

const SUBJECT_COLORS: Record<string, string> = {
  Math: 'bg-blue-100 text-blue-700', Writing: 'bg-purple-100 text-purple-700',
  Science: 'bg-green-100 text-green-700', Art: 'bg-orange-100 text-orange-700',
  'Life Skills': 'bg-teal-100 text-teal-700', Other: 'bg-gray-100 text-gray-700',
}

export default function LearningPortfolioTab({ childName }: { childName: string }) {
  const [reading, setReading] = useState<Book[]>([])
  const [streak, setStreak] = useState(0)
  const [readThisMonth, setReadThisMonth] = useState(0)
  const [loggedToday, setLoggedToday] = useState(false)
  const [last30Days, setLast30Days] = useState<string[]>([])
  const [wishlist, setWishlist] = useState<WishItem[]>([])
  const [work, setWork] = useState<WorkEntry[]>([])
  const [lessonLogs, setLessonLogs] = useState<LessonLog[]>([])
  const [currentFocus, setCurrentFocus] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // UI state
  const [showAddBook, setShowAddBook] = useState(false)
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookStatus, setBookStatus] = useState('reading')
  const [showAddTopic, setShowAddTopic] = useState(false)
  const [topicText, setTopicText] = useState('')
  const [durationPick, setDurationPick] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [expandedBook, setExpandedBook] = useState<number | null>(null)
  const [editRating, setEditRating] = useState<number>(0)
  const [editNotes, setEditNotes] = useState('')
  const [expandedWork, setExpandedWork] = useState<number | null>(null)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    Promise.all([
      fetch(`/api/kids/portfolio?action=get_portfolio&kid=${childKey}`).then(r => r.json()),
      // Fetch lesson logs with photos for homeschool portfolio
      fetch(`/api/homeschool?action=get_lesson_logs&student_name=${childKey}&limit=20`).then(r => r.json()).catch(() => ({ logs: [] })),
    ]).then(([data, hsData]) => {
      setReading(data.reading || [])
      setStreak(data.readingStreak || 0)
      setReadThisMonth(data.readThisMonth || 0)
      setLoggedToday(data.loggedToday || false)
      setLast30Days(data.last30Days || [])
      setWishlist(data.wishlist || [])
      setWork(data.work || [])
      setCurrentFocus(data.currentFocus || null)
      // Filter lesson logs that have photos
      const logs = (hsData.logs || []).filter((l: LessonLog) => l.photo_url)
      setLessonLogs(logs)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [childKey])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const logReading = async (minutes: number | null) => {
    setDurationPick(false)
    const res = await fetch('/api/kids/portfolio', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_reading', kid_name: childKey, minutes })
    }).then(r => r.json())
    if (res.alreadyLogged) { showToast('Already logged today!'); return }
    setLoggedToday(true)
    setStreak(res.streak || streak + 1)
    setReadThisMonth(prev => prev + 1)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    setLast30Days(prev => [today, ...prev])
    if (res.newStreakMilestone) showToast(`🎉 7-Day Streak! +${res.points + 15} pts!`)
    else showToast(`+${res.points} pts earned! 🔥 Streak: ${res.streak} days`)
  }

  const addBook = async () => {
    if (!bookTitle.trim()) return
    await fetch('/api/kids/portfolio', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_book', kid_name: childKey, book_title: bookTitle.trim(), author: bookAuthor.trim() || null, status: bookStatus })
    })
    setReading(prev => [{ id: Date.now(), book_title: bookTitle.trim(), author: bookAuthor.trim() || null, status: bookStatus, rating: null, notes: null, date_completed: null }, ...prev])
    setBookTitle(''); setBookAuthor(''); setShowAddBook(false)
  }

  const completeBook = async (book: Book) => {
    await fetch('/api/kids/portfolio', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_book', id: book.id, kid_name: childKey, status: 'completed' })
    })
    setReading(prev => prev.map(b => b.id === book.id ? { ...b, status: 'completed' } : b))
    showToast(`📚 +20 pts for finishing ${book.book_title}!`)
  }

  const saveBookEdit = async (bookId: number) => {
    await fetch('/api/kids/portfolio', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_book', id: bookId, kid_name: childKey, rating: editRating || null, notes: editNotes || null })
    })
    setReading(prev => prev.map(b => b.id === bookId ? { ...b, rating: editRating || null, notes: editNotes || null } : b))
    setExpandedBook(null)
    showToast('Saved!')
  }

  const deleteBook = async (id: number) => {
    await fetch('/api/kids/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_book', id }) })
    setReading(prev => prev.filter(b => b.id !== id))
  }

  const addTopic = async () => {
    if (!topicText.trim()) return
    await fetch('/api/kids/portfolio', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_wishlist', kid_name: childKey, topic: topicText.trim() })
    })
    setWishlist(prev => [{ id: Date.now(), topic: topicText.trim(), notes: null, completed: false }, ...prev])
    setTopicText(''); setShowAddTopic(false)
  }

  const completeTopic = async (id: number) => {
    await fetch('/api/kids/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete_wishlist', id }) })
    setWishlist(prev => prev.map(w => w.id === id ? { ...w, completed: true } : w))
  }

  const deleteTopic = async (id: number) => {
    await fetch('/api/kids/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_wishlist', id }) })
    setWishlist(prev => prev.filter(w => w.id !== id))
  }

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>

  // Calendar dot grid for current month
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const [year, month] = today.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayDay = parseInt(today.split('-')[2])
  const sessionSet = new Set(last30Days)

  const currentlyReading = reading.filter(b => b.status === 'reading')
  const completed = reading.filter(b => b.status === 'completed')
  const wantToRead = reading.filter(b => b.status === 'want_to_read')
  const activeTopic = wishlist.filter(w => !w.completed)
  const doneTopic = wishlist.filter(w => w.completed)

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      {/* Section 1: Reading Streak */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-5 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-amber-300" />
              <span className="text-xl font-bold">{streak > 0 ? `${streak}-Day Streak!` : 'Start your streak today!'}</span>
            </div>
            <p className="text-indigo-200 text-sm mt-1">{readThisMonth} days read this month</p>
          </div>
        </div>

        {loggedToday ? (
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <span className="text-lg">✓ Logged for today!</span>
          </div>
        ) : durationPick ? (
          <div className="space-y-2">
            <p className="text-sm text-indigo-200">How long did you read?</p>
            <div className="flex gap-2 flex-wrap">
              {[{ m: 20, label: '20 min' }, { m: 30, label: '30 min' }, { m: 45, label: '45 min' }, { m: 60, label: '60+ min' }, { m: null as any, label: 'Skip' }].map(opt => (
                <button key={opt.label} onClick={() => logReading(opt.m)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium">{opt.label}</button>
              ))}
            </div>
          </div>
        ) : (
          <button onClick={() => setDurationPick(true)}
            className="w-full bg-amber-400 hover:bg-amber-300 text-amber-900 font-bold py-3 rounded-lg text-lg transition-colors">
            📖 I Read Today — 5 pts
          </button>
        )}

        {/* Calendar dots */}
        <div className="mt-4">
          <p className="text-xs text-indigo-200 mb-2">{new Date(year, month - 1).toLocaleString('en-US', { month: 'long' })}</p>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const logged = sessionSet.has(dateStr)
              const isToday = day === todayDay
              return (
                <div key={day} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  logged ? 'bg-amber-400 text-amber-900' :
                  isToday ? 'ring-2 ring-white/60 bg-white/20' :
                  day > todayDay ? 'bg-white/10' : 'bg-white/20'
                }`} title={dateStr}>
                  {day}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Books */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        {currentFocus && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm text-amber-800"><span className="font-medium">Mom's note:</span> {currentFocus}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-500" /> My Books</h2>
          <button onClick={() => setShowAddBook(true)} className="text-indigo-600 hover:text-indigo-800"><Plus className="w-5 h-5" /></button>
        </div>

        {showAddBook && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border space-y-2">
            <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="Book title" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="text" value={bookAuthor} onChange={e => setBookAuthor(e.target.value)} placeholder="Author (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              {['reading', 'completed', 'want_to_read'].map(s => (
                <button key={s} onClick={() => setBookStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${bookStatus === s ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-gray-100 text-gray-600'}`}>
                  {s === 'reading' ? '📖 Reading' : s === 'completed' ? '✅ Completed' : '📋 Want to Read'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addBook} disabled={!bookTitle.trim()} className="bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-50">Add Book</button>
              <button onClick={() => setShowAddBook(false)} className="text-gray-500 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {reading.length === 0 && !showAddBook && <p className="text-gray-400 text-sm text-center py-4">Add your first book! 📖</p>}

        {/* Shelves */}
        {[
          { label: '📖 Currently Reading', items: currentlyReading },
          { label: '✅ Completed', items: completed },
          { label: '📋 Want to Read', items: wantToRead },
        ].map(shelf => shelf.items.length > 0 && (
          <div key={shelf.label} className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{shelf.label}</h3>
            <div className="space-y-2">
              {shelf.items.map(book => (
                <div key={book.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{book.book_title}</p>
                      {book.author && <p className="text-xs text-gray-500">{book.author}</p>}
                      {book.rating && <div className="flex gap-0.5 mt-1">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3 h-3 ${i < book.rating! ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />)}</div>}
                    </div>
                    <div className="flex gap-1">
                      {book.status === 'reading' && (
                        <button onClick={() => completeBook(book)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200">Done</button>
                      )}
                      {book.status === 'completed' && (
                        <button onClick={() => { setExpandedBook(expandedBook === book.id ? null : book.id); setEditRating(book.rating || 0); setEditNotes(book.notes || '') }}
                          className="text-xs text-indigo-600 hover:text-indigo-800">Edit</button>
                      )}
                      <button onClick={() => deleteBook(book.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {expandedBook === book.id && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={() => setEditRating(s)}>
                            <Star className={`w-5 h-5 ${s <= editRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                          </button>
                        ))}
                      </div>
                      <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes..." className="w-full border rounded px-2 py-1 text-sm" />
                      <button onClick={() => saveBookEdit(book.id)} className="bg-indigo-500 text-white px-3 py-1 rounded text-xs">Save</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Section 3: Topics Wishlist */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-500" /> Topics I Want to Learn</h2>
          <button onClick={() => setShowAddTopic(true)} className="text-amber-600 hover:text-amber-800"><Plus className="w-5 h-5" /></button>
        </div>

        {showAddTopic && (
          <div className="mb-3 flex gap-2">
            <input type="text" value={topicText} onChange={e => setTopicText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTopic()}
              placeholder="What do you want to learn?" className="flex-1 border rounded-lg px-3 py-2 text-sm" autoFocus />
            <button onClick={addTopic} disabled={!topicText.trim()} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">Add</button>
            <button onClick={() => setShowAddTopic(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
          </div>
        )}

        {wishlist.length === 0 && !showAddTopic && <p className="text-gray-400 text-sm text-center py-4">What do you want to learn? Add it here!</p>}

        <div className="space-y-2">
          {activeTopic.map(w => (
            <div key={w.id} className="flex items-center gap-2 text-sm">
              <button onClick={() => completeTopic(w.id)} className="w-5 h-5 border-2 border-gray-300 rounded hover:border-amber-500 flex-shrink-0" />
              <span className="flex-1 text-gray-800">{w.topic}</span>
              <button onClick={() => deleteTopic(w.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {doneTopic.length > 0 && (
            <div className="pt-2 border-t mt-2 space-y-1">
              {doneTopic.map(w => (
                <div key={w.id} className="flex items-center gap-2 text-sm text-gray-400">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="line-through flex-1">{w.topic}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Learned it!</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 4: My Work */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4"><Image className="w-5 h-5 text-rose-500" /> My Work</h2>
        {work.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Mom hasn't added any work yet — check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {work.map(w => (
              <div key={w.id} className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedWork(expandedWork === w.id ? null : w.id)}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SUBJECT_COLORS[w.subject || 'Other'] || SUBJECT_COLORS.Other}`}>{w.subject || 'Other'}</span>
                  <span className="text-xs text-gray-400">{new Date(w.work_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <p className="font-medium text-gray-900 text-sm">{w.title}</p>
                {expandedWork === w.id && w.description && <p className="text-sm text-gray-600 mt-2">{w.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Lesson Log Photos */}
      {lessonLogs.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4"><Image className="w-5 h-5 text-emerald-500" /> Lesson Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {lessonLogs.map(log => (
              <div key={log.id} className="border rounded-lg overflow-hidden">
                <img
                  src={log.photo_url!}
                  alt={log.notes || 'Lesson photo'}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <div className="flex items-center gap-1 mb-1">
                    {log.subject_emoji && <span className="text-sm">{log.subject_emoji}</span>}
                    <span className="text-xs font-medium text-gray-700">{log.subject_name}</span>
                  </div>
                  {log.notes && <p className="text-xs text-gray-500 line-clamp-2">{log.notes}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
