'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Clock, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Play, User, Library, Layers, Calendar, Edit3, Save, Plus, X, Sparkles,
  GraduationCap, Trophy, FolderOpen
} from 'lucide-react'
import FocusTimer from './FocusTimer'
import VocabWordsTab from './VocabWordsTab'
import ParentEnrichmentSummary from './ParentEnrichmentSummary'
import FinancialLiteracyPanel from './FinancialLiteracyPanel'
import { ParentLibraryAdmin } from './HomeLibrary'
import ParentPortfolioPanel from './ParentPortfolioPanel'
import TeacherDashboard from './TeacherDashboard'
import OpportunitiesParentPanel from './OpportunitiesParentPanel'
import ParentTaskManager from './ParentTaskManager'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Subject {
  id: string
  name: string
  emoji: string
  status: 'done' | 'in_progress' | 'planned'
}

interface StudentData {
  id: string
  name: string
  grade: string
  mascot: string
  mascotName: string
  color: string
  subjects: Subject[]
  focus_sessions: number
  concern_flags: string[]
  daily_plan: string[]
  books: { title: string; author: string; status: string }[]
  lesson_logs: { date: string; subject: string; notes: string; mood: string }[]
}

interface UnitStudy {
  id: string
  title: string
  description: string
  status: 'active' | 'completed'
  subjects: string[]
  student_names?: string[]
  start_date: string
  end_date?: string
}

interface FamilyBook {
  title: string
  author: string
  current_page?: number
  total_pages?: number
}

interface HomeschoolData {
  students: StudentData[]
  units: UnitStudy[]
  family_read_aloud: FamilyBook | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STUDENT_DEFAULTS: Pick<StudentData, 'id' | 'name' | 'grade' | 'mascot' | 'mascotName' | 'color'>[] = [
  { id: 'amos',   name: 'Amos',   grade: '10th', mascot: '🦉', mascotName: 'Owlbert',  color: 'blue' },
  { id: 'ellie',  name: 'Ellie',  grade: '6th',  mascot: '🐱', mascotName: 'Whiskers', color: 'purple' },
  { id: 'wyatt',  name: 'Wyatt',  grade: '4th',  mascot: '🐕', mascotName: 'Buddy',    color: 'orange' },
  { id: 'hannah', name: 'Hannah', grade: '3rd',  mascot: '🐰', mascotName: 'Clover',   color: 'green' },
]

const COLOR_MAP: Record<string, { accent: string; bg: string; light: string; border: string; text: string; gradient: string }> = {
  blue:   { accent: 'bg-blue-500',   bg: 'bg-blue-50',   light: 'bg-blue-100',   border: 'border-blue-300',   text: 'text-blue-700',   gradient: 'from-blue-500 to-blue-600' },
  purple: { accent: 'bg-purple-500', bg: 'bg-purple-50', light: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', gradient: 'from-purple-500 to-purple-600' },
  orange: { accent: 'bg-orange-500', bg: 'bg-orange-50', light: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', gradient: 'from-orange-500 to-orange-600' },
  green:  { accent: 'bg-green-500',  bg: 'bg-green-50',  light: 'bg-green-100',  border: 'border-green-300',  text: 'text-green-700',  gradient: 'from-green-500 to-green-600' },
}

const STATUS_ICON: Record<string, string> = {
  done: '✅',
  in_progress: '⏳',
  planned: '📋',
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function StudentTile({ student, onClick, selected, taskData }: {
  student: StudentData; onClick: () => void; selected?: boolean;
  taskData?: { total_tasks: number; completed_tasks: number; focus_mins: number }
}) {
  const c = COLOR_MAP[student.color] || COLOR_MAP.blue
  const totalTasks = taskData?.total_tasks || 0
  const completedTasks = taskData?.completed_tasks || 0
  const focusMins = taskData?.focus_mins || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all w-full ${
        selected ? `${c.border} ${c.bg} shadow-md` : 'border-gray-200 bg-white hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{student.mascot}</span>
        <div>
          <div className="font-bold text-gray-900">{student.name}</div>
          <div className="text-xs text-gray-500">{student.grade} Grade</div>
        </div>
      </div>

      {/* Task progress */}
      {totalTasks > 0 ? (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-medium ${progress === 100 ? 'text-green-600' : c.text}`}>
              {completedTasks}/{totalTasks} done
            </span>
            <span className="text-gray-500">{focusMins} min</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress === 100 ? 'bg-green-500' :
                progress >= 50 ? 'bg-blue-500' :
                progress > 0 ? 'bg-amber-500' : 'bg-gray-200'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Fallback: subject status list */}
          <div className="space-y-0.5 mb-2">
            {student.subjects.slice(0, 4).map(sub => (
              <div key={sub.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span>{STATUS_ICON[sub.status] || '📋'}</span>
                <span className="truncate">{sub.emoji} {sub.name}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${c.text}`}>
              {student.subjects.filter(s => s.status === 'done').length}/{student.subjects.length} done
            </span>
            <span className="text-gray-500">{student.focus_sessions} focus</span>
          </div>
        </>
      )}

      {/* Concern flags */}
      {student.concern_flags.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          {student.concern_flags[0]}
        </div>
      )}
    </button>
  )
}

function DailyPlanExpander({ student }: { student: StudentData }) {
  const [open, setOpen] = useState(false)
  const c = COLOR_MAP[student.color] || COLOR_MAP.blue

  return (
    <div className={`rounded-lg border ${open ? c.border : 'border-gray-200'} bg-white`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{student.mascot}</span>
          <span className="font-semibold text-gray-900">{student.name}'s Plan</span>
          <span className="text-xs text-gray-500">{student.grade}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {student.daily_plan.length === 0 && (
            <p className="text-sm text-gray-400 italic">No plan set for today</p>
          )}
          {student.daily_plan.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-gray-400 mt-0.5">{i + 1}.</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StudentProfile({ student, onStartFocus }: { student: StudentData; onStartFocus: (sub: Subject) => void }) {
  const c = COLOR_MAP[student.color] || COLOR_MAP.blue

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`bg-gradient-to-r ${c.gradient} text-white p-5 rounded-xl`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{student.mascot}</span>
          <div>
            <h2 className="text-xl font-bold">{student.name}</h2>
            <p className="text-white/80 text-sm">{student.grade} Grade &middot; {student.mascotName}</p>
          </div>
        </div>
      </div>

      {/* Subjects */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Subjects</h3>
        </div>
        <div className="divide-y">
          {student.subjects.map(sub => (
            <div key={sub.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">{sub.emoji}</span>
              <span className="flex-1 font-medium text-gray-800">{sub.name}</span>
              <span className="text-sm">{STATUS_ICON[sub.status]}</span>
              {sub.status !== 'done' && (
                <button
                  onClick={() => onStartFocus(sub)}
                  className={`flex items-center gap-1 text-xs ${c.text} ${c.light} px-2.5 py-1.5 rounded-lg hover:opacity-80 font-medium`}
                >
                  <Play className="w-3 h-3" /> Focus
                </button>
              )}
            </div>
          ))}
          {student.subjects.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No subjects configured</p>
          )}
        </div>
      </div>

      {/* Today's Plan */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Today's Plan</h3>
        {student.daily_plan.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No plan set for today</p>
        ) : (
          <ul className="space-y-1.5">
            {student.daily_plan.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-gray-400">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Lesson Logs */}
      {student.lesson_logs.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Lessons</h3>
          <div className="space-y-2">
            {student.lesson_logs.slice(0, 5).map((log, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 text-xs mt-0.5">{log.date}</span>
                <span className="font-medium text-gray-700">{log.subject}</span>
                <span className="text-gray-500 flex-1 truncate">{log.notes}</span>
                {log.mood && <span>{log.mood === 'great' ? '😊' : log.mood === 'okay' ? '😐' : '😟'}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BooksView({ students, familyBook }: { students: StudentData[]; familyBook: FamilyBook | null }) {
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filterStudent, setFilterStudent] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', author: '', book_type: 'curriculum', read_type: 'independent',
    student_names: [] as string[], total_pages: '', current_page: '0',
    subject_tag: 'ELAR', school_year: '2025-2026', notes: '',
  })

  const fetchBooks = useCallback(async () => {
    let url = '/api/homeschool?action=get_books'
    if (filterStudent) url += `&student_names=${filterStudent}`
    if (filterStatus) url += `&status=${filterStatus}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      setBooks(data.books || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [filterStudent, filterStatus])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const handleAddBook = async () => {
    if (!form.title) return
    await fetch('/api/homeschool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_book',
        title: form.title,
        author: form.author || null,
        book_type: form.book_type,
        read_type: form.read_type,
        student_names: form.student_names.length > 0 ? form.student_names : null,
        total_pages: form.total_pages ? parseInt(form.total_pages) : null,
        subject_tag: form.subject_tag || null,
        school_year: form.school_year || null,
      }),
    })
    setShowAdd(false)
    setForm({ title: '', author: '', book_type: 'curriculum', read_type: 'independent', student_names: [], total_pages: '', current_page: '0', subject_tag: 'ELAR', school_year: '2025-2026', notes: '' })
    fetchBooks()
  }

  const handleMarkComplete = async (bookId: string) => {
    await fetch('/api/homeschool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_book',
        book_id: bookId,
        status: 'completed',
        completed_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
      }),
    })
    fetchBooks()
  }

  const toggleStudent = (name: string) => {
    setForm(prev => ({
      ...prev,
      student_names: prev.student_names.includes(name)
        ? prev.student_names.filter(n => n !== name)
        : [...prev.student_names, name],
    }))
  }

  return (
    <div className="space-y-4">
      {/* Family Read Aloud */}
      {familyBook && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Library className="w-5 h-5 text-teal-600" />
            Family Read-Aloud
          </h3>
          <div className="bg-teal-50 rounded-lg p-4">
            <p className="font-medium text-teal-800">{familyBook.title}</p>
            <p className="text-sm text-teal-600">{familyBook.author}</p>
            {familyBook.current_page != null && familyBook.total_pages != null && familyBook.total_pages > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-teal-600 mb-1">
                  <span>Page {familyBook.current_page}</span>
                  <span>{familyBook.total_pages} pages</span>
                </div>
                <div className="w-full bg-teal-200 rounded-full h-1.5">
                  <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${(familyBook.current_page / familyBook.total_pages) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Curriculum Books</h3>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700">
          <Plus className="w-4 h-4" /> Add Book
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1">
          {[null, 'Amos', 'Ellie', 'Wyatt', 'Hannah'].map(name => (
            <button key={name || 'all'} onClick={() => setFilterStudent(name)}
              className={`px-2 py-1 rounded text-xs font-medium ${filterStudent === name ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {name || 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[null, 'in_progress', 'completed', 'planned'].map(s => (
            <button key={s || 'all-s'} onClick={() => setFilterStatus(s)}
              className={`px-2 py-1 rounded text-xs font-medium ${filterStatus === s ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s ? s.replace('_', ' ') : 'All Status'}
            </button>
          ))}
        </div>
      </div>

      {/* Book list */}
      {loading ? (
        <p className="text-center text-gray-500 py-4">Loading...</p>
      ) : books.length === 0 ? (
        <div className="bg-white rounded-lg border p-6 text-center text-sm text-gray-400">No books found</div>
      ) : (
        <div className="space-y-2">
          {books.map((book: any) => {
            const progress = book.total_pages > 0 ? Math.round(((book.current_page || 0) / book.total_pages) * 100) : 0
            return (
              <div key={book.id} className="bg-white rounded-lg border shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📖</span>
                      <h4 className="font-medium text-gray-900">{book.title}</h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {book.author && `${book.author} · `}{book.subject_tag || ''} · {book.read_type || 'independent'}
                    </p>
                    {book.student_names && (
                      <p className="text-xs text-gray-400 mt-0.5">Assigned: {(book.student_names || []).join(', ')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      book.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      book.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {book.status === 'in_progress' ? 'Reading' : book.status}
                    </span>
                    {book.status === 'in_progress' && (
                      <button onClick={() => handleMarkComplete(book.id)} className="text-green-600 hover:text-green-800" title="Mark Complete">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                {book.total_pages > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Page {book.current_page || 0}</span>
                      <span>{book.total_pages} pages ({progress}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Book Form */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add Book</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Author</label>
                <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Book Type</label>
                  <select value={form.book_type} onChange={e => setForm(f => ({ ...f, book_type: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="curriculum">Curriculum</option>
                    <option value="read_aloud">Read-Aloud</option>
                    <option value="independent">Independent</option>
                    <option value="reference">Reference</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Read Type</label>
                  <select value={form.read_type} onChange={e => setForm(f => ({ ...f, read_type: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="independent">Independent</option>
                    <option value="read_aloud">Read-Aloud</option>
                    <option value="group">Group</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Assigned Students</label>
                <div className="flex gap-2 mt-1">
                  {['Amos','Ellie','Wyatt','Hannah'].map(name => (
                    <button key={name} type="button" onClick={() => toggleStudent(name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${form.student_names.includes(name) ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Total Pages</label>
                  <input type="number" value={form.total_pages} onChange={e => setForm(f => ({ ...f, total_pages: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Subject</label>
                  <select value={form.subject_tag} onChange={e => setForm(f => ({ ...f, subject_tag: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="ELAR">ELAR</option>
                    <option value="Math">Math</option>
                    <option value="Science">Science</option>
                    <option value="Social Studies">Social Studies</option>
                    <option value="Art">Art</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddBook} disabled={!form.title} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Add Book</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UnitsView({ units: initialUnits }: { units: UnitStudy[] }) {
  const [units, setUnits] = useState(initialUnits)
  const [showAdd, setShowAdd] = useState(false)
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active')
  const [form, setForm] = useState({
    title: '', description: '', subject_tags: [] as string[],
    student_names: [] as string[], start_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
    resources: '',
  })

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch(`/api/homeschool?action=get_units&status=${viewMode}`)
      const data = await res.json()
      setUnits(data.units || [])
    } catch (e) { console.error(e) }
  }, [viewMode])

  useEffect(() => { fetchUnits() }, [fetchUnits])

  const handleCreate = async () => {
    if (!form.title) return
    await fetch('/api/homeschool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_unit',
        title: form.title,
        description: form.description || null,
        subject_tags: form.subject_tags,
        student_names: form.student_names.length > 0 ? form.student_names : ['Amos','Ellie','Wyatt','Hannah'],
        start_date: form.start_date,
        resources: form.resources ? form.resources.split('\n').filter(Boolean) : null,
      }),
    })
    setShowAdd(false)
    setForm({ title: '', description: '', subject_tags: [], student_names: [], start_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }), resources: '' })
    fetchUnits()
  }

  const toggleSubject = (s: string) => setForm(prev => ({
    ...prev,
    subject_tags: prev.subject_tags.includes(s) ? prev.subject_tags.filter(x => x !== s) : [...prev.subject_tags, s],
  }))
  const toggleStudent = (n: string) => setForm(prev => ({
    ...prev,
    student_names: prev.student_names.includes(n) ? prev.student_names.filter(x => x !== n) : [...prev.student_names, n],
  }))

  const displayUnits = units

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('active')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'active' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Active</button>
          <button onClick={() => setViewMode('completed')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'completed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Completed</button>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700">
          <Plus className="w-4 h-4" /> New Unit
        </button>
      </div>

      {displayUnits.length === 0 ? (
        <div className="bg-white rounded-lg border p-6 text-center text-sm text-gray-400">
          {viewMode === 'active' ? 'No active unit studies. Create one to get started!' : 'No completed units yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {displayUnits.map(unit => (
            <div key={unit.id} className="bg-white rounded-lg border shadow-sm p-4">
              <div className="flex items-start justify-between">
                <h4 className="font-bold text-gray-900">{unit.title}</h4>
                {viewMode === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              </div>
              {unit.description && <p className="text-sm text-gray-600 mt-1">{unit.description}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(unit.subjects || []).map((s: string) => (
                  <span key={s} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
              {unit.student_names && (
                <p className="text-xs text-gray-400 mt-2">Students: {(unit.student_names || []).join(', ')}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Started {unit.start_date}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Unit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">New Unit Study</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Ocean Life Unit Study" className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Subject Tags</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['Math','ELAR','Science','Social Studies','Art','PE','Life Skills','Financial Literacy'].map(s => (
                    <button key={s} type="button" onClick={() => toggleSubject(s)}
                      className={`px-2 py-1 rounded text-xs font-medium ${form.subject_tags.includes(s) ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Students</label>
                <div className="flex gap-2 mt-1">
                  {['Amos','Ellie','Wyatt','Hannah'].map(n => (
                    <button key={n} type="button" onClick={() => toggleStudent(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${form.student_names.includes(n) ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Start Date</label>
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Resources (one per line)</label>
                <textarea value={form.resources} onChange={e => setForm(f => ({ ...f, resources: e.target.value }))} rows={3} placeholder="Olive's Ocean&#10;National Geographic kids&#10;YouTube: ocean life series" className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={!form.title} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Create Unit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

type SubTab = 'today' | 'students' | 'books' | 'units' | 'vocab' | 'enrichment' | 'library' | 'tasks' | 'portfolio' | 'teacher' | 'opportunities'

export default function HomeschoolTab() {
  const [data, setData] = useState<HomeschoolData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [subTab, setSubTab] = useState<SubTab>('today')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [focusSession, setFocusSession] = useState<{ student: StudentData; subject: Subject } | null>(null)
  const [taskProgress, setTaskProgress] = useState<Record<string, { total_tasks: number; completed_tasks: number; focus_mins: number }>>({})

  // Fetch task progress for all kids
  const fetchTaskProgress = useCallback(() => {
    fetch('/api/homeschool?action=get_task_progress')
      .then(r => r.json())
      .then(json => {
        const map: Record<string, any> = {}
        for (const p of (json.progress || [])) {
          map[p.kid_name.toLowerCase()] = p
        }
        setTaskProgress(map)
      })
      .catch(() => {})
  }, [])

  // Fetch all homeschool data
  const fetchData = useCallback(() => {
    fetchTaskProgress()
    fetch('/api/homeschool')
      .then(r => r.json())
      .then(raw => {
        // Merge server data with defaults
        const students: StudentData[] = STUDENT_DEFAULTS.map(def => {
          const serverStudent = (raw.students || []).find((s: any) => s.id === def.id || s.name?.toLowerCase() === def.id)
          return {
            ...def,
            subjects: serverStudent?.subjects || [],
            focus_sessions: serverStudent?.focus_sessions || 0,
            concern_flags: serverStudent?.concern_flags || [],
            daily_plan: serverStudent?.daily_plan || [],
            books: serverStudent?.books || [],
            lesson_logs: serverStudent?.lesson_logs || [],
          }
        })
        setData({
          students,
          units: raw.units || [],
          family_read_aloud: raw.family_read_aloud || null,
        })
        setLoaded(true)
      })
      .catch(() => {
        // Provide empty defaults so UI still renders
        setData({
          students: STUDENT_DEFAULTS.map(def => ({
            ...def,
            subjects: [],
            focus_sessions: 0,
            concern_flags: [],
            daily_plan: [],
            books: [],
            lesson_logs: [],
          })),
          units: [],
          family_read_aloud: null,
        })
        setLoaded(true)
      })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleStartFocus = (student: StudentData, subject: Subject) => {
    setFocusSession({ student, subject })
  }

  const handleFocusComplete = (result: { mood: string; elapsed: number; coins: number }) => {
    setFocusSession(null)
    fetchData() // Refresh after focus session
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    )
  }

  if (!data) return null

  const { students, units, family_read_aloud } = data
  const activeUnit = units.find(u => u.status === 'active')
  const selectedStudent = selectedStudentId ? students.find(s => s.id === selectedStudentId) : null

  const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'today',    label: 'Today',    icon: Calendar },
    { id: 'students', label: 'Students', icon: User },
    { id: 'books',    label: 'Books',    icon: Library },
    { id: 'units',    label: 'Units',    icon: Layers },
    { id: 'vocab',    label: 'Vocab',    icon: Sparkles },
    { id: 'tasks',     label: 'Tasks',      icon: CheckCircle2 },
    { id: 'enrichment', label: 'Enrichment', icon: Play },
    { id: 'library',  label: 'Library',  icon: Library },
    { id: 'portfolio', label: 'Portfolio', icon: FolderOpen },
    { id: 'teacher',  label: 'Teacher',   icon: GraduationCap },
    { id: 'opportunities', label: 'Opportunities', icon: Trophy },
  ]

  return (
    <div className="space-y-6">
      {/* Focus Timer overlay */}
      {focusSession && (
        <FocusTimer
          studentName={focusSession.student.name}
          studentId={focusSession.student.id}
          subjectName={focusSession.subject.name}
          subjectId={focusSession.subject.id}
          subjectEmoji={focusSession.subject.emoji}
          plannedMins={25}
          mascot={focusSession.student.mascot}
          mascotName={focusSession.student.mascotName}
          colorTheme={focusSession.student.color}
          onComplete={handleFocusComplete}
        />
      )}

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white p-6 rounded-xl">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-7 h-7" />
          Homeschool
        </h1>
        <p className="text-teal-100 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* ── Today's School — 4-student grid ── */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3 text-lg">Today's School</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {students.map(student => (
            <StudentTile
              key={student.id}
              student={student}
              selected={selectedStudentId === student.id && subTab === 'students'}
              taskData={taskProgress[student.id]}
              onClick={() => {
                setSelectedStudentId(student.id)
                setSubTab('students')
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Active Unit (if any) ── */}
      {activeUnit && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900">Current Unit</h3>
          </div>
          <h4 className="font-bold text-gray-800">{activeUnit.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{activeUnit.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {activeUnit.subjects.map(s => (
              <span key={s} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-tab navigation ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => { setSubTab(tab.id); if (tab.id !== 'students') setSelectedStudentId(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      {subTab === 'today' && (
        <div className="space-y-3">
          {students.map(student => (
            <DailyPlanExpander key={student.id} student={student} />
          ))}
        </div>
      )}

      {subTab === 'students' && (
        <>
          {/* Student selector when no student is selected */}
          {!selectedStudent && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {students.map(student => (
                <StudentTile
                  key={student.id}
                  student={student}
                  onClick={() => setSelectedStudentId(student.id)}
                />
              ))}
            </div>
          )}

          {/* Selected student profile */}
          {selectedStudent && (
            <div>
              <button
                onClick={() => setSelectedStudentId(null)}
                className="text-sm text-teal-600 hover:text-teal-800 mb-3 flex items-center gap-1"
              >
                &larr; All Students
              </button>
              <StudentProfile
                student={selectedStudent}
                onStartFocus={(sub) => handleStartFocus(selectedStudent, sub)}
              />
            </div>
          )}
        </>
      )}

      {subTab === 'books' && (
        <BooksView students={students} familyBook={family_read_aloud} />
      )}

      {subTab === 'units' && (
        <UnitsView units={units} />
      )}

      {subTab === 'vocab' && (
        <VocabWordsTab />
      )}

      {subTab === 'tasks' && (
        <ParentTaskManager />
      )}

      {subTab === 'enrichment' && (
        <div className="space-y-6">
          <ParentEnrichmentSummary />
          <div className="grid gap-4 md:grid-cols-2">
            {students.map(student => (
              <FinancialLiteracyPanel
                key={student.id}
                kidName={student.name}
                isParent={true}
              />
            ))}
          </div>
        </div>
      )}

      {subTab === 'library' && (
        <ParentLibraryAdmin />
      )}

      {subTab === 'portfolio' && (
        <ParentPortfolioPanel />
      )}

      {subTab === 'teacher' && (
        <TeacherDashboard />
      )}

      {subTab === 'opportunities' && (
        <OpportunitiesParentPanel />
      )}
    </div>
  )
}
