'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Calculator, Microscope, Globe, Printer, Save, ClipboardCheck, RefreshCw } from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

interface Book {
  id: string
  title: string
  author_or_publisher: string
  sets: string[] | null
  word_count: number
}

interface MathFocus {
  kid_name: string
  skill_area: string
  grade_level: number
}

interface Focus {
  id?: string
  week_start: string
  vocab_book_id: string | null
  vocab_book_title?: string | null
  vocab_set_name: string | null
  vocab_test_date: string | null
  science_unit: string | null
  history_unit: string | null
  notes: string | null
}

const KIDS = [
  { name: 'Amos',   grade: 2 },
  { name: 'Ellie',  grade: 6 },
  { name: 'Wyatt',  grade: 4 },
  { name: 'Hannah', grade: 3 },
]

const SKILL_OPTIONS = [
  { value: 'addition',       label: 'Addition' },
  { value: 'subtraction',    label: 'Subtraction' },
  { value: 'multiplication', label: 'Multiplication' },
  { value: 'division',       label: 'Division' },
  { value: 'fractions',      label: 'Fractions' },
  { value: 'money',          label: 'Money' },
  { value: 'time',           label: 'Time' },
  { value: 'measurement',    label: 'Measurement' },
  { value: 'place_value',    label: 'Place Value' },
  { value: 'decimals',       label: 'Decimals' },
  { value: 'mixed',          label: 'Mixed Skills' },
]

function mondayOf(dateStr: string): string {
  const d = parseDateLocal(dateStr)
  const dow = d.getDay()
  const diff = (dow + 6) % 7
  d.setDate(d.getDate() - diff)
  return d.toLocaleDateString('en-CA')
}

function addDays(dateStr: string, days: number): string {
  const d = parseDateLocal(dateStr)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA')
}

export default function WeeklyFocusBoard() {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const [weekStart, setWeekStart] = useState(mondayOf(todayStr))
  const [focus, setFocus] = useState<Focus | null>(null)
  const [mathFocus, setMathFocus] = useState<MathFocus[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Form state (separate from saved focus so user can edit)
  const [bookId, setBookId] = useState('')
  const [setName, setSetName] = useState('')
  const [testDate, setTestDate] = useState('')
  const [scienceUnit, setScienceUnit] = useState('')
  const [historyUnit, setHistoryUnit] = useState('')
  const [notes, setNotes] = useState('')
  const [mathForm, setMathForm] = useState<Record<string, { skill: string; grade: number }>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [focusRes, booksRes] = await Promise.all([
        fetch(`/api/assessments?action=get_weekly_focus&week_start=${weekStart}`).then(r => r.json()),
        fetch('/api/assessments?action=get_books_with_vocab').then(r => r.json()),
      ])
      setBooks(booksRes.books || [])
      const f: Focus | null = focusRes.focus
      setFocus(f)
      if (f) {
        setBookId(f.vocab_book_id || '')
        setSetName(f.vocab_set_name || '')
        setTestDate(f.vocab_test_date || addDays(weekStart, 4))
        setScienceUnit(f.science_unit || '')
        setHistoryUnit(f.history_unit || '')
        setNotes(f.notes || '')
      } else {
        setBookId('')
        setSetName('')
        setTestDate(addDays(weekStart, 4))
        setScienceUnit('')
        setHistoryUnit('')
        setNotes('')
      }
      const mf: MathFocus[] = focusRes.math_focus || []
      setMathFocus(mf)
      const next: Record<string, { skill: string; grade: number }> = {}
      for (const k of KIDS) {
        const existing = mf.find(x => x.kid_name.toLowerCase() === k.name.toLowerCase())
        next[k.name] = {
          skill: existing?.skill_area || 'mixed',
          grade: existing?.grade_level || k.grade,
        }
      }
      setMathForm(next)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const body = {
        action: 'set_weekly_focus',
        week_start: weekStart,
        vocab_book_id: bookId || null,
        vocab_set_name: setName || null,
        vocab_test_date: testDate || null,
        science_unit: scienceUnit || null,
        history_unit: historyUnit || null,
        notes: notes || null,
        math_focus: KIDS.map(k => ({
          kid_name: k.name,
          skill_area: mathForm[k.name]?.skill || 'mixed',
          grade_level: mathForm[k.name]?.grade || k.grade,
        })),
      }
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSaveMsg('Saved ✓')
      await load()
    } catch (err: any) {
      setSaveMsg('Error — ' + (err.message || 'failed'))
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  const copyLastWeek = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copy_last_week', week_start: weekStart }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nothing to copy')
      setSaveMsg('Copied from last week ✓')
      await load()
    } catch (err: any) {
      setSaveMsg('Error — ' + (err.message || 'failed'))
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  const selectedBook = books.find(b => b.id === bookId)
  const availableSets = selectedBook?.sets || []

  const openVocabTest = () => {
    if (!bookId) return
    const title = encodeURIComponent(selectedBook?.title || 'Vocab Test')
    const url = `/assessments/vocab-test?book_id=${bookId}&set_name=${encodeURIComponent(setName || '')}&test_date=${testDate}&title=${title}`
    window.open(url, '_blank')
  }

  const openMathTest = () => {
    const kids = KIDS.map(k => {
      const mf = mathForm[k.name]
      return `${k.name.toLowerCase()}:${mf?.skill || 'mixed'}:${mf?.grade || k.grade}`
    }).join(',')
    window.open(`/assessments/math-test?kids=${kids}&test_date=${testDate}`, '_blank')
  }

  const weekLabel = parseDateLocal(weekStart).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric',
  })

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            This Week's Focus
          </h3>
          <p className="text-xs text-gray-500">Week of {weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={weekStart}
            onChange={e => setWeekStart(mondayOf(e.target.value))}
            className="text-xs border rounded px-2 py-1"
          />
          <button
            onClick={copyLastWeek}
            disabled={saving}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Copy last week
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-8">Loading…</div>
      ) : (
        <>
          {/* Vocab */}
          <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/50">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-sm text-blue-900">Vocab Book</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select
                value={bookId}
                onChange={e => { setBookId(e.target.value); setSetName('') }}
                className="border rounded-lg px-2 py-2 text-sm md:col-span-2"
              >
                <option value="">— Choose a book —</option>
                {books.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.word_count} words)
                  </option>
                ))}
              </select>
              <select
                value={setName}
                onChange={e => setSetName(e.target.value)}
                disabled={availableSets.length === 0}
                className="border rounded-lg px-2 py-2 text-sm disabled:bg-gray-50"
              >
                <option value="">All sets</option>
                {availableSets.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs text-gray-600">Test date:</label>
              <input
                type="date"
                value={testDate}
                onChange={e => setTestDate(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              />
              <button
                onClick={openVocabTest}
                disabled={!bookId}
                className="ml-auto text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Printer className="w-3 h-3" /> Generate Vocab Test
              </button>
            </div>
          </div>

          {/* Math focus */}
          <div className="border border-emerald-100 rounded-lg p-4 bg-emerald-50/50">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-emerald-600" />
              <h4 className="font-semibold text-sm text-emerald-900">Math Speed Focus</h4>
            </div>
            <div className="space-y-2">
              {KIDS.map(kid => {
                const mf = mathForm[kid.name] || { skill: 'mixed', grade: kid.grade }
                return (
                  <div key={kid.name} className="flex items-center gap-2 text-sm">
                    <span className="w-16 font-medium text-gray-700">{kid.name}</span>
                    <select
                      value={mf.skill}
                      onChange={e => setMathForm(p => ({ ...p, [kid.name]: { ...mf, skill: e.target.value } }))}
                      className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
                    >
                      {SKILL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select
                      value={mf.grade}
                      onChange={e => setMathForm(p => ({ ...p, [kid.name]: { ...mf, grade: parseInt(e.target.value, 10) } }))}
                      className="w-20 border rounded-lg px-2 py-1.5 text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(g => <option key={g} value={g}>Gr {g}</option>)}
                    </select>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={openMathTest}
                className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 flex items-center gap-1"
              >
                <Printer className="w-3 h-3" /> Generate Math Tests
              </button>
            </div>
          </div>

          {/* Science + History units */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-purple-100 rounded-lg p-4 bg-purple-50/50">
              <div className="flex items-center gap-2 mb-2">
                <Microscope className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold text-sm text-purple-900">Science Unit</h4>
              </div>
              <input
                type="text"
                value={scienceUnit}
                onChange={e => setScienceUnit(e.target.value)}
                placeholder="e.g. Owl Cam — Bird Behavior & Habitats"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="border border-amber-100 rounded-lg p-4 bg-amber-50/50">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-amber-600" />
                <h4 className="font-semibold text-sm text-amber-900">History Unit</h4>
              </div>
              <input
                type="text"
                value={historyUnit}
                onChange={e => setHistoryUnit(e.target.value)}
                placeholder="e.g. Explorers of the New World"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-600 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything special about this week…"
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Save */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            {saveMsg && <span className="text-xs text-gray-600">{saveMsg}</span>}
            <button
              onClick={save}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Focus'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
