'use client'

import { useState, useEffect } from 'react'
import {
  FolderOpen, Plus, Search, Loader2, ExternalLink, FileText, Image, Link2,
  Users, X, Check, Clock,
} from 'lucide-react'

type Resource = {
  id: number; title: string; description: string | null; file_url: string | null
  file_type: 'pdf' | 'image' | 'link' | 'canva' | null; subject: string | null
  grade_level: string | null; tags: string[] | null; times_used: number
  canva_link: string | null; created_at: string
}

const SUBJECTS = ['elar', 'math', 'science', 'history', 'art', 'life_skills', 'other']
const GRADES = ['2nd-3rd', '4th-5th', '6th-8th', '9th-10th']
const KIDS = ['Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah']
const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-5 h-5 text-red-500" />,
  image: <Image className="w-5 h-5 text-blue-500" />,
  link: <Link2 className="w-5 h-5 text-indigo-500" />,
  canva: <ExternalLink className="w-5 h-5 text-teal-500" />,
}

export default function TeacherResourceLibrary() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [assignTarget, setAssignTarget] = useState<Resource | null>(null)
  const [toast, setToast] = useState('')

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) {
        params.set('action', 'search')
        params.set('q', search.trim())
      } else {
        params.set('action', 'list')
        if (filterSubject) params.set('subject', filterSubject)
        if (filterGrade) params.set('grade_level', filterGrade)
      }
      const res = await fetch(`/api/teacher-library?${params.toString()}`)
      const data = await res.json()
      setResources(data.resources || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [filterSubject, filterGrade])

  const bySubject: Record<string, Resource[]> = {}
  for (const r of resources) {
    const key = r.subject || 'other'
    if (!bySubject[key]) bySubject[key] = []
    bySubject[key].push(r)
  }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-indigo-500" /> Teacher Resource Library
        </h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Upload
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search worksheets..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All subjects</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All grades</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {loading && <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>}

      {!loading && resources.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
          <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="font-medium">No resources yet</p>
          <p className="text-sm mt-1">Upload PDFs, images, or paste Canva links to build your library.</p>
        </div>
      )}

      {!loading && resources.length > 0 && (
        <div className="space-y-6">
          {Object.entries(bySubject).sort(([a], [b]) => a.localeCompare(b)).map(([subject, items]) => (
            <div key={subject}>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                {subject === 'elar' ? '📖 ELAR' : subject === 'math' ? '🔢 Math' : subject === 'science' ? '🔬 Science' : subject === 'history' ? '🌍 Social Studies' : `📦 ${subject}`}
                <span className="ml-2 text-gray-400 font-normal normal-case">({items.length})</span>
              </h3>
              <div className="space-y-1.5">
                {items.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 bg-white border rounded-lg hover:bg-gray-50">
                    {FILE_ICONS[r.file_type || 'pdf'] || FILE_ICONS.pdf}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{r.title}</div>
                      {r.grade_level && <span className="text-xs text-gray-500">{r.grade_level}</span>}
                      {r.tags && r.tags.length > 0 && (
                        <span className="text-xs text-gray-400 ml-2">{r.tags.join(', ')}</span>
                      )}
                    </div>
                    {r.times_used > 0 && (
                      <span className="text-[10px] text-gray-400">{r.times_used}x</span>
                    )}
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-blue-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => setAssignTarget(r)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100">
                      <Users className="w-3 h-3" /> Assign
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Resource Modal */}
      {showAdd && <AddResourceModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); flash('Resource added'); load() }} />}

      {/* Assign Modal */}
      {assignTarget && (
        <AssignModal resource={assignTarget} onClose={() => setAssignTarget(null)}
          onAssigned={() => { setAssignTarget(null); flash('Assigned to kid(s)'); load() }} />
      )}
    </div>
  )
}

function AddResourceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileType, setFileType] = useState('pdf')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [tags, setTags] = useState('')
  const [canvaLink, setCanvaLink] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    await fetch('/api/teacher-library', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add', title: title.trim(), file_url: fileUrl || null,
        file_type: fileType, subject: subject || null, grade_level: grade || null,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        canva_link: canvaLink || null, source: canvaLink ? 'canva' : 'uploaded',
      }),
    }).catch(() => {})
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add Resource</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *"
            className="w-full px-3 py-2 border rounded-lg text-sm" />
          <input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="File URL (Supabase Storage or external)"
            className="w-full px-3 py-2 border rounded-lg text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <select value={fileType} onChange={e => setFileType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="pdf">PDF</option><option value="image">Image</option><option value="link">Link</option><option value="canva">Canva</option>
            </select>
            <select value={subject} onChange={e => setSubject(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Subject</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={grade} onChange={e => setGrade(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Grade</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma-separated)"
            className="w-full px-3 py-2 border rounded-lg text-sm" />
          <input value={canvaLink} onChange={e => setCanvaLink(e.target.value)} placeholder="Canva edit link (optional)"
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving || !title.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

function AssignModal({ resource, onClose, onAssigned }: { resource: Resource; onClose: () => void; onAssigned: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const toggle = (k: string) => setSelected(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])

  const save = async () => {
    if (!selected.length) return
    setSaving(true)
    await fetch('/api/teacher-library', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assign', resource_id: resource.id, kid_names: selected, due_date: dueDate || null, notes: notes || null }),
    }).catch(() => {})
    setSaving(false)
    onAssigned()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b">
          <h3 className="font-bold text-gray-900">Assign: {resource.title}</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {KIDS.map(k => (
              <button key={k} onClick={() => toggle(k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  selected.includes(k) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}>{k}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="flex-1 px-3 py-1.5 border rounded-lg text-sm" />
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes for kid (optional)"
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving || !selected.length}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  )
}
