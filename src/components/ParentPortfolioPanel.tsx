'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Flame, Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react'

const KID_DISPLAY: Record<string, string> = { amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee' }
const ALL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
const SUBJECTS = ['Math', 'Writing', 'Science', 'Art', 'Life Skills', 'Other']

interface KidOverview {
  kid_name: string; books_completed: number; currently_reading: string | null
  wishlist_count: number; reading_streak: number; read_this_month: number
  work_entries: number; last_work_date: string | null
}

export default function ParentPortfolioPanel() {
  const [overview, setOverview] = useState<KidOverview[]>([])
  const [loaded, setLoaded] = useState(false)

  // Add work form
  const [workKid, setWorkKid] = useState('amos')
  const [workTitle, setWorkTitle] = useState('')
  const [workDesc, setWorkDesc] = useState('')
  const [workSubject, setWorkSubject] = useState('Other')
  const [workDate, setWorkDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
  const [recentWork, setRecentWork] = useState<any[]>([])

  // Curriculum notes
  const [openKid, setOpenKid] = useState<string | null>(null)
  const [currNotes, setCurrNotes] = useState('')
  const [currFocus, setCurrFocus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/kids/portfolio?action=get_parent_overview')
      .then(r => r.json())
      .then(data => { setOverview(data.kids || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const addWork = async () => {
    if (!workTitle.trim()) return
    await fetch('/api/kids/portfolio', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_work', kid_name: workKid, title: workTitle.trim(), description: workDesc.trim() || null, subject: workSubject, work_date: workDate })
    })
    setRecentWork(prev => [{ id: Date.now(), kid_name: workKid, title: workTitle.trim(), subject: workSubject, work_date: workDate }, ...prev])
    setWorkTitle(''); setWorkDesc('')
  }

  const deleteWork = async (id: number) => {
    await fetch('/api/kids/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_work', id }) })
    setRecentWork(prev => prev.filter(w => w.id !== id))
  }

  const loadCurrNotes = async (kid: string) => {
    if (openKid === kid) { setOpenKid(null); return }
    setOpenKid(kid)
    try {
      const data = await fetch(`/api/kids/portfolio?action=get_curriculum_notes&kid=${kid}`).then(r => r.json())
      setCurrNotes(data.notes || '')
      setCurrFocus(data.current_focus || '')
    } catch { setCurrNotes(''); setCurrFocus('') }
  }

  const saveCurrNotes = async () => {
    if (!openKid) return
    setSaving(true)
    await fetch('/api/kids/portfolio', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_curriculum_notes', kid_name: openKid, notes: currNotes, current_focus: currFocus })
    })
    setSaving(false)
  }

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Learning Portfolio</h1>
        <p className="text-indigo-100">Reading activity, work log, and curriculum notes</p>
      </div>

      {/* Reading Overview */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b"><h2 className="font-bold text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-500" /> Reading Overview</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500">
              <th className="p-3 font-medium">Kid</th>
              <th className="p-3 font-medium">Streak</th>
              <th className="p-3 font-medium">This Month</th>
              <th className="p-3 font-medium">Currently Reading</th>
              <th className="p-3 font-medium text-right">Books Done</th>
            </tr></thead>
            <tbody className="divide-y">
              {overview.map(k => (
                <tr key={k.kid_name}>
                  <td className="p-3 font-medium text-gray-900">{KID_DISPLAY[k.kid_name]}</td>
                  <td className="p-3">{k.reading_streak > 0 ? <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-500" /> {k.reading_streak}</span> : '—'}</td>
                  <td className="p-3 text-gray-600">{k.read_this_month} days</td>
                  <td className="p-3 text-gray-600">{k.currently_reading || '—'}</td>
                  <td className="p-3 text-right text-gray-600">{k.books_completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Work */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-4">Add Work Entry</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Kid</label>
            <select value={workKid} onChange={e => setWorkKid(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
              {ALL_KIDS.map(k => <option key={k} value={k}>{KID_DISPLAY[k]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Subject</label>
            <select value={workSubject} onChange={e => setWorkSubject(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Title</label>
            <input type="text" value={workTitle} onChange={e => setWorkTitle(e.target.value)} placeholder="Project title" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Date</label>
            <input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-600">Description</label>
            <textarea value={workDesc} onChange={e => setWorkDesc(e.target.value)} rows={2} placeholder="What did they do?" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none" />
          </div>
        </div>
        <button onClick={addWork} disabled={!workTitle.trim()} className="mt-3 bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Entry
        </button>

        {recentWork.length > 0 && (
          <div className="mt-4 border-t pt-3 space-y-2">
            <h3 className="text-xs font-medium text-gray-500">Just Added</h3>
            {recentWork.map(w => (
              <div key={w.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                <span>{KID_DISPLAY[w.kid_name]} — {w.title} ({w.subject})</span>
                <button onClick={() => deleteWork(w.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Curriculum Notes */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-4">Curriculum Notes</h2>
        <div className="space-y-2">
          {ALL_KIDS.map(kid => (
            <div key={kid} className="border rounded-lg">
              <button onClick={() => loadCurrNotes(kid)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <span className="font-medium text-gray-900">{KID_DISPLAY[kid]}</span>
                {openKid === kid ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {openKid === kid && (
                <div className="px-4 pb-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Current Focus (shown on kid's tab)</label>
                    <input type="text" value={currFocus} onChange={e => setCurrFocus(e.target.value)} placeholder="Short phrase — e.g., Fractions and reading fluency"
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Notes (private — only you see this)</label>
                    <textarea value={currNotes} onChange={e => setCurrNotes(e.target.value)} rows={4} placeholder="Curriculum planning, goals, observations..."
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none" />
                  </div>
                  <button onClick={saveCurrNotes} disabled={saving}
                    className="bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-1">
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
