'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Shuffle, Pause, Play, SkipForward, Plus, X, Search,
  CheckCircle2, Clock, Circle, Archive, Printer, RefreshCw, Lock,
  Unlock, ChevronDown, ChevronUp, LayoutGrid, FileText, Layers,
  Sparkles, Eye, EyeOff, Loader2, Upload, Library, Dices
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface VocabWord {
  id: string
  word: string
  part_of_speech: string | null
  definition: string
  simple_hint: string | null
  category: string | null
  book_id: string | null
  source_book: string | null
  day_number: number
  is_active: boolean
  status?: 'done' | 'active' | 'upcoming'
}

interface VocabBook {
  id: string
  title: string
  author: string | null
  grade_level: string | null
  cover_color: string
  notes: string | null
  word_count: number
  is_archived: boolean
}

interface RotationStatus {
  id: string
  status: string
  current_word_id: string
  current_day_number: number
  current_word: string
  total_words: number
  paused_at: string | null
}

interface WordSearchGrid {
  grid: string[][]
  placed_words: { word: string; row: number; col: number; direction: string }[]
  size: number
}

// ── Sub-tab types ──────────────────────────────────────────────────────────────

type SubTab = 'words' | 'books' | 'mixer' | 'worksheets'

// ── Color map for book cards ──────────────────────────────────────────────────

const BOOK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '#6366f1': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700' },
  '#8b5cf6': { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700' },
  '#ec4899': { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
  '#f97316': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  '#14b8a6': { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700' },
  '#3b82f6': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  '#22c55e': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  '#ef4444': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
}

function getBookColorClasses(color: string) {
  return BOOK_COLORS[color] || { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' }
}

// ── Category badge colors ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  noun: 'bg-blue-100 text-blue-700',
  verb: 'bg-green-100 text-green-700',
  adjective: 'bg-purple-100 text-purple-700',
  adverb: 'bg-orange-100 text-orange-700',
  science: 'bg-teal-100 text-teal-700',
  math: 'bg-indigo-100 text-indigo-700',
  literature: 'bg-pink-100 text-pink-700',
  history: 'bg-amber-100 text-amber-700',
}

function getCategoryColor(cat: string | null) {
  if (!cat) return 'bg-gray-100 text-gray-600'
  return CATEGORY_COLORS[cat.toLowerCase()] || 'bg-gray-100 text-gray-600'
}

// ── Scramble helper ───────────────────────────────────────────────────────────

function scrambleWord(word: string): string {
  const arr = word.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const result = arr.join('')
  return result === word ? scrambleWord(word) : result
}

function misspellWord(word: string): string {
  if (word.length < 3) return word
  const idx = 1 + Math.floor(Math.random() * (word.length - 2))
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  let replacement = word[idx]
  while (replacement === word[idx]) {
    replacement = letters[Math.floor(Math.random() * 26)]
  }
  return word.slice(0, idx) + replacement + word.slice(idx + 1)
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VocabWordsTab() {
  const [subTab, setSubTab] = useState<SubTab>('words')

  const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'words', label: 'Word List', icon: BookOpen },
    { id: 'books', label: 'Book Library', icon: Library },
    { id: 'mixer', label: 'Mixer', icon: Shuffle },
    { id: 'worksheets', label: 'Worksheet Builder', icon: FileText },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-5 rounded-xl">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Vocabulary System
        </h2>
        <p className="text-indigo-100 text-sm mt-1">Word of the Day, Mixer, Quizzes & Worksheets</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {subTab === 'words' && <WordListTab />}
      {subTab === 'books' && <BookLibraryTab />}
      {subTab === 'mixer' && <MixerTab />}
      {subTab === 'worksheets' && <WorksheetBuilderTab />}
    </div>
  )
}

// ============================================================================
// WORD LIST TAB
// ============================================================================

function WordListTab() {
  const [rotation, setRotation] = useState<RotationStatus | null>(null)
  const [books, setBooks] = useState<VocabBook[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null)
  const [showAddWord, setShowAddWord] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchRotation = useCallback(async () => {
    try {
      const res = await fetch('/api/vocab?action=get_rotation_status')
      const data = await res.json()
      setRotation(data.rotation)
    } catch (e) { console.error(e) }
  }, [])

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/vocab?action=get_books')
      const data = await res.json()
      setBooks(data.books || [])
      if (!selectedBookId && data.books?.length > 0) {
        setSelectedBookId(data.books[0].id)
      }
    } catch (e) { console.error(e) }
  }, [selectedBookId])

  const fetchWords = useCallback(async () => {
    if (!selectedBookId) return
    try {
      const res = await fetch(`/api/vocab?action=get_all_words&book_id=${selectedBookId}`)
      const data = await res.json()
      setWords(data.words || [])
    } catch (e) { console.error(e) }
  }, [selectedBookId])

  useEffect(() => {
    Promise.all([fetchRotation(), fetchBooks()]).then(() => setLoading(false))
  }, [fetchRotation, fetchBooks])

  useEffect(() => {
    if (selectedBookId) fetchWords()
  }, [selectedBookId, fetchWords])

  const handlePauseResume = async () => {
    setActionLoading(true)
    const action = rotation?.status === 'running' ? 'pause_rotation' : 'resume_rotation'
    await fetch('/api/vocab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    await fetchRotation()
    setActionLoading(false)
  }

  const handleSkip = async () => {
    setActionLoading(true)
    await fetch('/api/vocab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'advance_rotation' }) })
    await fetchRotation()
    await fetchWords()
    setActionLoading(false)
  }

  const handleActivate = async (wordId: string) => {
    setActionLoading(true)
    await fetch('/api/vocab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'activate_word', word_id: wordId }) })
    await fetchRotation()
    await fetchWords()
    setSelectedWord(null)
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading vocabulary...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Rotation Control Panel */}
      {rotation && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                rotation.status === 'running'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {rotation.status}
              </span>
              <div>
                <p className="text-sm text-gray-500">Current Word</p>
                <p className="font-bold text-gray-900 text-lg">{rotation.current_word || 'None'}</p>
              </div>
              <div className="text-sm text-gray-500">
                Word <span className="font-semibold text-gray-700">{rotation.current_day_number}</span> of{' '}
                <span className="font-semibold text-gray-700">{rotation.total_words}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePauseResume}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {rotation.status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {rotation.status === 'running' ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={handleSkip}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4" /> Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book selector */}
      {books.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {books.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBookId(b.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedBookId === b.id
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {b.title} ({b.word_count})
            </button>
          ))}
        </div>
      )}

      {/* Add Word button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddWord(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Word
        </button>
      </div>

      {/* Word list */}
      <div className="bg-white rounded-lg border shadow-sm divide-y">
        {words.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">No words in this book yet</div>
        )}
        {words.map(w => (
          <button
            key={w.id}
            onClick={() => setSelectedWord(w)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="flex-shrink-0">
              {w.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {w.status === 'active' && <Sparkles className="w-5 h-5 text-indigo-500" />}
              {w.status === 'upcoming' && <Circle className="w-5 h-5 text-gray-300" />}
            </span>
            <div className="flex-1 min-w-0">
              <span className={`font-medium ${w.status === 'active' ? 'text-indigo-700' : 'text-gray-900'}`}>
                {w.word}
              </span>
              {w.part_of_speech && (
                <span className="text-xs text-gray-400 ml-1.5 italic">({w.part_of_speech})</span>
              )}
            </div>
            {w.category && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(w.category)}`}>
                {w.category}
              </span>
            )}
            <span className="text-xs text-gray-400 flex-shrink-0">Day {w.day_number}</span>
          </button>
        ))}
      </div>

      {/* Word Detail Modal */}
      {selectedWord && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedWord(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedWord.word}</h3>
                {selectedWord.part_of_speech && (
                  <p className="text-sm text-gray-500 italic">{selectedWord.part_of_speech}</p>
                )}
              </div>
              <button onClick={() => setSelectedWord(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Definition</p>
                <p className="text-gray-800">{selectedWord.definition}</p>
              </div>
              {selectedWord.simple_hint && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Hint</p>
                  <p className="text-gray-700">{selectedWord.simple_hint}</p>
                </div>
              )}
              {selectedWord.category && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Category</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(selectedWord.category)}`}>
                    {selectedWord.category}
                  </span>
                </div>
              )}
              {selectedWord.source_book && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Source Book</p>
                  <p className="text-gray-700">{selectedWord.source_book}</p>
                </div>
              )}
              <div className="text-xs text-gray-400">Day {selectedWord.day_number} &middot; Status: {selectedWord.status}</div>
            </div>
            {selectedWord.status !== 'active' && (
              <button
                onClick={() => handleActivate(selectedWord.id)}
                disabled={actionLoading}
                className="mt-4 w-full px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Set as Active Word
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add Word Modal */}
      {showAddWord && (
        <AddWordModal
          bookId={selectedBookId}
          books={books}
          onClose={() => setShowAddWord(false)}
          onAdded={() => { setShowAddWord(false); fetchWords(); fetchRotation() }}
        />
      )}
    </div>
  )
}

// ── Add Word Modal ────────────────────────────────────────────────────────────

function AddWordModal({ bookId, books, onClose, onAdded }: {
  bookId: string | null
  books: VocabBook[]
  onClose: () => void
  onAdded: () => void
}) {
  const [form, setForm] = useState({
    word: '', part_of_speech: '', definition: '', simple_hint: '', category: '', book_id: bookId || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.word || !form.definition) return
    setSaving(true)
    await fetch('/api/vocab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_word', ...form })
    })
    setSaving(false)
    onAdded()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Add New Word</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Word *</label>
            <input value={form.word} onChange={e => setForm(f => ({ ...f, word: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Part of Speech</label>
            <select value={form.part_of_speech} onChange={e => setForm(f => ({ ...f, part_of_speech: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">Select...</option>
              <option value="noun">Noun</option>
              <option value="verb">Verb</option>
              <option value="adjective">Adjective</option>
              <option value="adverb">Adverb</option>
              <option value="preposition">Preposition</option>
              <option value="conjunction">Conjunction</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Definition *</label>
            <textarea value={form.definition} onChange={e => setForm(f => ({ ...f, definition: e.target.value }))}
              rows={2} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Simple Hint</label>
            <input value={form.simple_hint} onChange={e => setForm(f => ({ ...f, simple_hint: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Category</label>
            <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="e.g. science, literature"
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Book</label>
            <select value={form.book_id} onChange={e => setForm(f => ({ ...f, book_id: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">No book</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.word || !form.definition}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Word'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// BOOK LIBRARY TAB
// ============================================================================

function BookLibraryTab() {
  const [books, setBooks] = useState<VocabBook[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddBook, setShowAddBook] = useState(false)

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/vocab?action=get_books')
      const data = await res.json()
      setBooks(data.books || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const handleArchive = async (bookId: string) => {
    if (!confirm('Archive this book? Its words will remain but it will be hidden.')) return
    await fetch('/api/vocab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive_book', book_id: bookId })
    })
    fetchBooks()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading books...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAddBook(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Book
        </button>
      </div>

      {books.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">No books yet. Add your first vocab book!</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {books.map(book => {
          const colors = getBookColorClasses(book.cover_color)
          return (
            <div key={book.id} className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-4 shadow-sm`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`font-bold ${colors.text}`}>{book.title}</h3>
                  {book.author && <p className="text-sm text-gray-600">{book.author}</p>}
                </div>
                <button onClick={() => handleArchive(book.id)} className="text-gray-400 hover:text-gray-600" title="Archive">
                  <Archive className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span className="font-medium">{book.word_count} words</span>
                {book.grade_level && <span>Grade: {book.grade_level}</span>}
              </div>
              {book.notes && <p className="mt-2 text-xs text-gray-500">{book.notes}</p>}
            </div>
          )
        })}
      </div>

      {/* Add Book Modal */}
      {showAddBook && (
        <AddBookModal onClose={() => setShowAddBook(false)} onAdded={() => { setShowAddBook(false); fetchBooks() }} />
      )}
    </div>
  )
}

function AddBookModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ title: '', author: '', grade_level: '', cover_color: '#6366f1', notes: '' })
  const [saving, setSaving] = useState(false)

  const colorOptions = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#3b82f6', '#22c55e', '#ef4444']

  const handleSave = async () => {
    if (!form.title) return
    setSaving(true)
    await fetch('/api/vocab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_book', ...form })
    })
    setSaving(false)
    onAdded()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Add New Book</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Author</label>
            <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Grade Level</label>
            <input value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))}
              placeholder="e.g. 3rd-4th"
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Cover Color</label>
            <div className="mt-1 flex gap-2">
              {colorOptions.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, cover_color: c }))}
                  className={`w-8 h-8 rounded-full border-2 ${form.cover_color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Book'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MIXER TAB
// ============================================================================

function MixerTab() {
  const [books, setBooks] = useState<VocabBook[]>([])
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([])
  const [wordCount, setWordCount] = useState(20)
  const [category, setCategory] = useState('all')
  const [previewWords, setPreviewWords] = useState<VocabWord[]>([])
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [shuffling, setShuffling] = useState(false)

  useEffect(() => {
    fetch('/api/vocab?action=get_books')
      .then(r => r.json())
      .then(data => { setBooks(data.books || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleShuffle = async () => {
    setShuffling(true)
    const bookParam = selectedBookIds.length > 0 ? `&book_ids=${selectedBookIds.join(',')}` : ''
    const catParam = category !== 'all' ? `&category=${category}` : ''
    const res = await fetch(`/api/vocab?action=get_mixer_preview${bookParam}&count=${wordCount}${catParam}`)
    const data = await res.json()
    // Keep locked words, replace rest
    const locked = previewWords.filter(w => lockedIds.has(w.id))
    const newWords = (data.words || []).filter((w: VocabWord) => !lockedIds.has(w.id))
    const combined = [...locked, ...newWords].slice(0, wordCount)
    setPreviewWords(combined)
    setShuffling(false)
  }

  const toggleBookSelect = (bookId: string) => {
    setSelectedBookIds(prev =>
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    )
  }

  const toggleLock = (wordId: string) => {
    setLockedIds(prev => {
      const next = new Set(prev)
      if (next.has(wordId)) next.delete(wordId)
      else next.add(wordId)
      return next
    })
  }

  const swapWord = async (wordId: string) => {
    const res = await fetch(`/api/vocab?action=get_mixer_preview&count=1&book_ids=${selectedBookIds.join(',')}`)
    const data = await res.json()
    if (data.words?.[0]) {
      setPreviewWords(prev => prev.map(w => w.id === wordId ? data.words[0] : w))
    }
  }

  const handleSaveSession = async () => {
    await fetch('/api/vocab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_mixer_session',
        name: `Mixer ${new Date().toLocaleDateString()}`,
        source_book_ids: selectedBookIds,
        word_ids: previewWords.map(w => w.id),
        word_count: previewWords.length,
        output_type: 'review',
        source_mode: 'manual'
      })
    })
    alert('Session saved!')
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...</div>
  }

  return (
    <div className="space-y-4">
      {/* Book Selector */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Select Books</h3>
        <div className="flex flex-wrap gap-2">
          {books.map(b => {
            const selected = selectedBookIds.includes(b.id)
            const colors = getBookColorClasses(b.cover_color)
            return (
              <button
                key={b.id}
                onClick={() => toggleBookSelect(b.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                  selected ? `${colors.border} ${colors.bg} ${colors.text}` : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {selected && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                {b.title} ({b.word_count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Config row */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Word Count</label>
            <select value={wordCount} onChange={e => setWordCount(Number(e.target.value))}
              className="mt-1 block px-3 py-2 border rounded-lg text-sm bg-white">
              {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n} words</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="mt-1 block px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="all">All Categories</option>
              <option value="noun">Noun</option>
              <option value="verb">Verb</option>
              <option value="adjective">Adjective</option>
              <option value="science">Science</option>
              <option value="literature">Literature</option>
            </select>
          </div>
          <button onClick={handleShuffle} disabled={shuffling}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {shuffling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
            Shuffle
          </button>
        </div>
      </div>

      {/* Preview List */}
      {previewWords.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Mix Preview ({previewWords.length} words)</h3>
            <div className="flex gap-2">
              <button onClick={handleShuffle} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Re-shuffle
              </button>
              <button onClick={handleSaveSession} className="text-xs text-green-600 hover:text-green-800 font-medium">
                Save Session
              </button>
            </div>
          </div>
          <div className="divide-y">
            {previewWords.map(w => (
              <div key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                <button onClick={() => toggleLock(w.id)} className="text-gray-400 hover:text-gray-600" title={lockedIds.has(w.id) ? 'Unlock' : 'Lock'}>
                  {lockedIds.has(w.id) ? <Lock className="w-4 h-4 text-indigo-500" /> : <Unlock className="w-4 h-4" />}
                </button>
                <span className="font-medium text-gray-900 flex-1">{w.word}</span>
                {w.category && <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(w.category)}`}>{w.category}</span>}
                <span className="text-xs text-gray-400">{w.source_book}</span>
                <button onClick={() => swapWord(w.id)} className="text-gray-400 hover:text-indigo-600" title="Swap">
                  <Dices className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// WORKSHEET BUILDER TAB
// ============================================================================

type WorksheetType = 'word_search' | 'vocab_quiz' | 'fill_blank' | 'flashcard' | 'definition_match'

function WorksheetBuilderTab() {
  const [books, setBooks] = useState<VocabBook[]>([])
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([])
  const [worksheetType, setWorksheetType] = useState<WorksheetType>('word_search')
  const [gridSize, setGridSize] = useState(14)
  const [wordCount, setWordCount] = useState(10)
  const [previewWords, setPreviewWords] = useState<VocabWord[]>([])
  const [wordSearchGrid, setWordSearchGrid] = useState<WordSearchGrid | null>(null)
  const [showAnswerKey, setShowAnswerKey] = useState(false)
  const [seed, setSeed] = useState(Date.now().toString())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/vocab?action=get_books')
      .then(r => r.json())
      .then(data => { setBooks(data.books || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleBookSelect = (bookId: string) => {
    setSelectedBookIds(prev =>
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    )
  }

  const generatePreview = async () => {
    setGenerating(true)
    const bookParam = selectedBookIds.length > 0 ? `&book_ids=${selectedBookIds.join(',')}` : ''
    const res = await fetch(`/api/vocab?action=get_mixer_preview${bookParam}&count=${wordCount}`)
    const data = await res.json()
    const words = data.words || []
    setPreviewWords(words)

    if (worksheetType === 'word_search' && words.length > 0) {
      const wordIds = words.map((w: VocabWord) => w.id).join(',')
      const newSeed = Date.now().toString()
      setSeed(newSeed)
      const gridRes = await fetch(`/api/vocab?action=get_word_search_grid&word_ids=${wordIds}&grid_size=${gridSize}&seed=${newSeed}`)
      const gridData = await gridRes.json()
      setWordSearchGrid(gridData)
    }
    setGenerating(false)
  }

  const handleReshuffle = () => {
    setSeed(Date.now().toString())
    generatePreview()
  }

  const handlePrint = () => {
    window.print()
  }

  const WORKSHEET_TYPES: { id: WorksheetType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: 'word_search', label: 'Word Search', icon: LayoutGrid, desc: 'Hidden words in a letter grid' },
    { id: 'vocab_quiz', label: 'Vocab Quiz', icon: FileText, desc: 'Unscramble, Spot Error, Sentences, Match' },
    { id: 'fill_blank', label: 'Fill in Blank', icon: FileText, desc: 'Sentences with missing words' },
    { id: 'flashcard', label: 'Flashcard', icon: Layers, desc: 'Print-ready flashcards' },
    { id: 'definition_match', label: 'Definition Match', icon: Shuffle, desc: 'Draw lines to match' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Config Panel */}
        <div className="space-y-4">
          {/* Book Source */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Word Source</h3>
            <div className="flex flex-wrap gap-2">
              {books.map(b => {
                const selected = selectedBookIds.includes(b.id)
                const colors = getBookColorClasses(b.cover_color)
                return (
                  <button key={b.id} onClick={() => toggleBookSelect(b.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      selected ? `${colors.border} ${colors.bg} ${colors.text}` : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}>
                    {selected && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                    {b.title}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Activity Type */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Activity Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WORKSHEET_TYPES.map(t => {
                const Icon = t.icon
                const active = worksheetType === t.id
                return (
                  <button key={t.id} onClick={() => setWorksheetType(t.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border-2 text-left transition-colors ${
                      active ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div>
                      <p className={`text-sm font-medium ${active ? 'text-indigo-700' : 'text-gray-800'}`}>{t.label}</p>
                      <p className="text-xs text-gray-500">{t.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Config Options */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Options</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Word Count</label>
                <select value={wordCount} onChange={e => setWordCount(Number(e.target.value))}
                  className="mt-1 block px-3 py-2 border rounded-lg text-sm bg-white">
                  {[5, 8, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {worksheetType === 'word_search' && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Grid Size</label>
                  <select value={gridSize} onChange={e => setGridSize(Number(e.target.value))}
                    className="mt-1 block px-3 py-2 border rounded-lg text-sm bg-white">
                    <option value={12}>12x12</option>
                    <option value={14}>14x14</option>
                    <option value={16}>16x16</option>
                  </select>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={generatePreview} disabled={generating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate
              </button>
              {previewWords.length > 0 && (
                <>
                  <button onClick={handleReshuffle}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50">
                    <RefreshCw className="w-4 h-4" /> Re-shuffle
                  </button>
                  <button onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Preview Panel */}
        <div className="bg-white rounded-lg border shadow-sm p-4 print:shadow-none print:border-0">
          <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>

          {previewWords.length === 0 && !generating && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Select books and click Generate to preview your worksheet
            </div>
          )}

          {generating && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Generating...
            </div>
          )}

          {/* Word Search Preview */}
          {worksheetType === 'word_search' && wordSearchGrid && !generating && (
            <WordSearchPreview grid={wordSearchGrid} showAnswerKey={showAnswerKey}
              onToggleKey={() => setShowAnswerKey(!showAnswerKey)} />
          )}

          {/* Vocab Quiz Preview */}
          {worksheetType === 'vocab_quiz' && previewWords.length > 0 && !generating && (
            <VocabQuizPreview words={previewWords} />
          )}

          {/* Fill in Blank Preview */}
          {worksheetType === 'fill_blank' && previewWords.length > 0 && !generating && (
            <FillBlankPreview words={previewWords} />
          )}

          {/* Flashcard Preview */}
          {worksheetType === 'flashcard' && previewWords.length > 0 && !generating && (
            <FlashcardPreview words={previewWords} />
          )}

          {/* Definition Match Preview */}
          {worksheetType === 'definition_match' && previewWords.length > 0 && !generating && (
            <DefinitionMatchPreview words={previewWords} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Word Search Preview ───────────────────────────────────────────────────────

function WordSearchPreview({ grid, showAnswerKey, onToggleKey }: {
  grid: WordSearchGrid
  showAnswerKey: boolean
  onToggleKey: () => void
}) {
  // Build highlight set for answer key
  const highlightCells = new Set<string>()
  if (showAnswerKey) {
    const DIRS: Record<string, [number, number]> = {
      RIGHT: [0, 1], DOWN: [1, 0], DOWN_RIGHT: [1, 1], UP_RIGHT: [-1, 1],
      LEFT: [0, -1], UP: [-1, 0], UP_LEFT: [-1, -1], DOWN_LEFT: [1, -1],
    }
    for (const pw of grid.placed_words) {
      const [dr, dc] = DIRS[pw.direction] || [0, 0]
      for (let i = 0; i < pw.word.length; i++) {
        highlightCells.add(`${pw.row + dr * i},${pw.col + dc * i}`)
      }
    }
  }

  const cellSize = grid.size <= 12 ? 'w-7 h-7 text-sm' : grid.size <= 14 ? 'w-6 h-6 text-xs' : 'w-5 h-5 text-[10px]'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{grid.placed_words.length} words placed in {grid.size}x{grid.size} grid</p>
        <button onClick={onToggleKey}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
          {showAnswerKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showAnswerKey ? 'Hide' : 'Show'} Answer Key
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${grid.size}, minmax(0, 1fr))` }}>
          {grid.grid.map((row, r) =>
            row.map((cell, c) => {
              const highlighted = highlightCells.has(`${r},${c}`)
              return (
                <div key={`${r}-${c}`}
                  className={`${cellSize} flex items-center justify-center font-mono font-bold border border-gray-200 ${
                    highlighted ? 'bg-indigo-100 text-indigo-800' : 'bg-white text-gray-700'
                  }`}>
                  {cell}
                </div>
              )
            })
          )}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Find these words:</p>
        <div className="flex flex-wrap gap-1.5">
          {grid.placed_words.map(pw => (
            <span key={pw.word} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
              {pw.word}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Vocab Quiz Preview ────────────────────────────────────────────────────────

function VocabQuizPreview({ words }: { words: VocabWord[] }) {
  const quizWords = words.slice(0, 20)
  const section1 = quizWords.slice(0, 5)   // Unscramble
  const section2 = quizWords.slice(5, 10)  // Spot the Error
  const section3 = quizWords.slice(10, 15) // Write Sentence
  const section4 = quizWords.slice(15, 20) // Match It

  return (
    <div className="space-y-6 text-sm">
      {/* Section 1: Unscramble */}
      {section1.length > 0 && (
        <div>
          <h4 className="font-bold text-gray-900 mb-2">1. Unscramble the Word</h4>
          <div className="space-y-2">
            {section1.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3">
                <span className="text-gray-400 w-5">{i + 1}.</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded tracking-widest">
                  {scrambleWord(w.word.toUpperCase())}
                </span>
                <span className="text-gray-400">_______________</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Spot the Error */}
      {section2.length > 0 && (
        <div>
          <h4 className="font-bold text-gray-900 mb-2">2. Spot the Error (circle the misspelled word)</h4>
          <div className="space-y-2">
            {section2.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3">
                <span className="text-gray-400 w-5">{i + 1}.</span>
                <span className="font-medium">{misspellWord(w.word)}</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500 text-xs italic">Correct it: _______________</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Write a Sentence */}
      {section3.length > 0 && (
        <div>
          <h4 className="font-bold text-gray-900 mb-2">3. Use the Word in a Sentence</h4>
          <div className="space-y-3">
            {section3.map((w, i) => (
              <div key={w.id}>
                <span className="text-gray-400 mr-2">{i + 1}.</span>
                <span className="font-bold text-indigo-700">{w.word}</span>
                <span className="text-xs text-gray-400 ml-1 italic">({w.part_of_speech || 'word'})</span>
                <div className="mt-1 border-b border-gray-300 h-6" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Match It */}
      {section4.length > 0 && (
        <div>
          <h4 className="font-bold text-gray-900 mb-2">4. Match the Word to Its Definition</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {section4.map((w, i) => (
                <div key={w.id} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-medium">{w.word}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[...section4].sort(() => Math.random() - 0.5).map((w, i) => (
                <div key={w.id} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="text-gray-700 text-xs">{w.definition}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {quizWords.length < 5 && (
        <p className="text-gray-400 text-center text-xs">Add more words for a complete quiz (need at least 5 per section)</p>
      )}
    </div>
  )
}

// ── Fill in Blank Preview ─────────────────────────────────────────────────────

function FillBlankPreview({ words }: { words: VocabWord[] }) {
  return (
    <div className="space-y-4 text-sm">
      <h4 className="font-bold text-gray-900">Fill in the Blank</h4>
      <div className="mb-3 p-3 bg-indigo-50 rounded-lg">
        <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Word Bank</p>
        <div className="flex flex-wrap gap-1.5">
          {words.map(w => (
            <span key={w.id} className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {w.word}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {words.map((w, i) => (
          <div key={w.id}>
            <span className="text-gray-400 mr-2">{i + 1}.</span>
            <span className="text-gray-700">{w.definition}</span>
            <div className="mt-1 inline-block ml-2">
              <span className="border-b-2 border-gray-400 inline-block w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Flashcard Preview ─────────────────────────────────────────────────────────

function FlashcardPreview({ words }: { words: VocabWord[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-bold text-gray-900 text-sm">Flashcards (cut along dashed lines)</h4>
      <div className="grid grid-cols-2 gap-3">
        {words.map(w => (
          <div key={w.id} className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
            <p className="font-bold text-lg text-indigo-700">{w.word}</p>
            {w.part_of_speech && <p className="text-xs text-gray-400 italic">{w.part_of_speech}</p>}
            <hr className="my-2 border-dashed border-gray-300" />
            <p className="text-xs text-gray-700">{w.definition}</p>
            {w.simple_hint && <p className="text-xs text-gray-400 mt-1">Hint: {w.simple_hint}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Definition Match Preview ──────────────────────────────────────────────────

function DefinitionMatchPreview({ words }: { words: VocabWord[] }) {
  const shuffledDefs = [...words].sort(() => Math.random() - 0.5)

  return (
    <div className="space-y-4 text-sm">
      <h4 className="font-bold text-gray-900">Match Each Word to Its Definition</h4>
      <p className="text-xs text-gray-500">Draw a line from each word on the left to its definition on the right.</p>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          {words.map((w, i) => (
            <div key={w.id} className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-800 text-xs flex items-center justify-center font-bold flex-shrink-0">
                {i + 1}
              </span>
              <span className="font-bold text-indigo-700">{w.word}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {shuffledDefs.map((w, i) => (
            <div key={w.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-gray-700 text-xs">{w.definition}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
