'use client'

import { useState, useEffect, useCallback } from 'react'
import { Library, Plus, X, CheckCircle2 } from 'lucide-react'
import { StudentData, FamilyBook } from './types'

export default function BooksView({ students, familyBook }: { students: StudentData[]; familyBook: FamilyBook | null }) {
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
        action: 'add_book', title: form.title, author: form.author || null,
        book_type: form.book_type, read_type: form.read_type,
        student_names: form.student_names.length > 0 ? form.student_names : null,
        total_pages: form.total_pages ? parseInt(form.total_pages) : null,
        subject_tag: form.subject_tag || null, school_year: form.school_year || null,
      }),
    })
    setShowAdd(false)
    setForm({ title: '', author: '', book_type: 'curriculum', read_type: 'independent', student_names: [], total_pages: '', current_page: '0', subject_tag: 'ELAR', school_year: '2025-2026', notes: '' })
    fetchBooks()
  }

  const handleMarkComplete = async (bookId: string) => {
    await fetch('/api/homeschool', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_book', book_id: bookId, status: 'completed', completed_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) }),
    })
    fetchBooks()
  }

  const toggleStudent = (name: string) => {
    setForm(prev => ({ ...prev, student_names: prev.student_names.includes(name) ? prev.student_names.filter(n => n !== name) : [...prev.student_names, name] }))
  }

  return (
    <div className="space-y-4">
      {familyBook && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Library className="w-5 h-5 text-teal-600" /> Family Read-Aloud
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

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Curriculum Books</h3>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700">
          <Plus className="w-4 h-4" /> Add Book
        </button>
      </div>

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
                    {book.student_names && <p className="text-xs text-gray-400 mt-0.5">Assigned: {(book.student_names || []).join(', ')}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${book.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : book.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
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

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add Book</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Author</label>
                <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-semibold text-gray-600 uppercase">Book Type</label>
                  <select value={form.book_type} onChange={e => setForm(f => ({ ...f, book_type: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="curriculum">Curriculum</option><option value="read_aloud">Read-Aloud</option><option value="independent">Independent</option><option value="reference">Reference</option>
                  </select></div>
                <div><label className="text-xs font-semibold text-gray-600 uppercase">Subject</label>
                  <select value={form.subject_tag} onChange={e => setForm(f => ({ ...f, subject_tag: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="ELAR">ELAR</option><option value="Math">Math</option><option value="Science">Science</option><option value="Social Studies">Social Studies</option><option value="Art">Art</option>
                  </select></div>
              </div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Assigned Students</label>
                <div className="flex gap-2 mt-1">
                  {['Amos','Ellie','Wyatt','Hannah'].map(name => (
                    <button key={name} type="button" onClick={() => toggleStudent(name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${form.student_names.includes(name) ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{name}</button>
                  ))}
                </div></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Total Pages</label>
                <input type="number" value={form.total_pages} onChange={e => setForm(f => ({ ...f, total_pages: e.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" /></div>
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
