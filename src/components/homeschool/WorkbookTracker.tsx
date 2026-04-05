'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Plus, Check, X } from 'lucide-react'

const MATH_SKILLS = [
  { id: 'M1', name: 'Number Sense' }, { id: 'M2', name: 'Add/Sub' },
  { id: 'M3', name: 'Mult/Div' }, { id: 'M4', name: 'Fractions' },
  { id: 'M5', name: 'Decimals' }, { id: 'M6', name: 'Measurement' },
  { id: 'M7', name: 'Geometry' }, { id: 'M8', name: 'Patterns' },
  { id: 'M9', name: 'Word Problems' }, { id: 'M10', name: 'Time/Money' },
  { id: 'M11', name: 'Graphs' }, { id: 'M12', name: 'Estimation' },
]

export default function WorkbookTracker({ kidName }: { kidName: string }) {
  const [workbooks, setWorkbooks] = useState<Record<string, any[]>>({})
  const [skillSummary, setSkillSummary] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [logForm, setLogForm] = useState<{ wb: string; page: string; skills: string[]; notes: string } | null>(null)
  const [view, setView] = useState<'workbooks' | 'skills'>('workbooks')

  const fetchData = () => {
    fetch(`/api/learning-engine?action=get_workbooks&kid_name=${kidName}`)
      .then(r => r.json()).then(d => setWorkbooks(d.workbooks || {})).catch(() => {})
    fetch(`/api/learning-engine?action=get_workbook_skills&kid_name=${kidName}`)
      .then(r => r.json()).then(d => setSkillSummary(d.skills || [])).catch(() => {})
  }
  useEffect(() => { fetchData() }, [kidName])

  const handleAddWorkbook = async () => {
    if (!newName.trim()) return
    await fetch('/api/learning-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_workbook', kid_name: kidName, workbook_name: newName.trim() }) })
    setWorkbooks(prev => ({ ...prev, [newName.trim()]: [] }))
    setNewName(''); setShowAdd(false)
  }

  const handleLogPage = async () => {
    if (!logForm || !logForm.page) return
    await fetch('/api/learning-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_workbook_page', kid_name: kidName, workbook_name: logForm.wb,
        page_number: parseInt(logForm.page), skill_tags: logForm.skills, notes: logForm.notes || undefined }) })
    setLogForm(null)
    fetchData()
  }

  const toggleSkill = (skillId: string) => {
    if (!logForm) return
    setLogForm(prev => prev ? {
      ...prev,
      skills: prev.skills.includes(skillId) ? prev.skills.filter(s => s !== skillId) : [...prev.skills, skillId],
    } : prev)
  }

  const wbNames = Object.keys(workbooks)

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500" /> Workbook Tracker
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'skills' ? 'workbooks' : 'skills')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            {view === 'skills' ? 'Workbooks' : 'Skill Summary'}
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600">
            <Plus className="w-3 h-3" /> Add Workbook
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="flex gap-2">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Workbook name (e.g., Saxon Math 5/4)"
            className="flex-1 border rounded px-3 py-1.5 text-sm" />
          <button onClick={handleAddWorkbook} disabled={!newName.trim()}
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 disabled:opacity-50">Add</button>
          <button onClick={() => setShowAdd(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {view === 'workbooks' && (
        <div className="space-y-3">
          {wbNames.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No workbooks added yet. Click &quot;Add Workbook&quot; to start tracking.</p>
          ) : wbNames.map(wb => {
            const pages = workbooks[wb] || []
            const completed = pages.filter((p: any) => p.completed).length
            return (
              <div key={wb} className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-800 text-sm">{wb}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{completed} pages done</span>
                    <button onClick={() => setLogForm({ wb, page: '', skills: [], notes: '' })}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Log Page</button>
                  </div>
                </div>
                {completed > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 rounded-full h-2 transition-all" style={{ width: `${Math.min(100, completed * 2)}%` }} />
                  </div>
                )}
                {pages.slice(-5).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>p.{p.page_number}</span>
                    {(p.skill_tags || []).map((t: string) => (
                      <span key={t} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">{t}</span>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {view === 'skills' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Pages completed per math skill across all workbooks:</p>
          {MATH_SKILLS.map(skill => {
            const count = skillSummary.find((s: any) => s.skill_tag === skill.id)?.page_count || 0
            return (
              <div key={skill.id} className="flex items-center gap-3">
                <span className="text-xs font-mono w-8 text-gray-500">{skill.id}</span>
                <span className="text-xs text-gray-700 w-24">{skill.name}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 rounded-full h-2 transition-all" style={{ width: `${Math.min(100, count * 10)}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Log Page Form */}
      {logForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-800 text-sm">Log Page — {logForm.wb}</h4>
          <div className="flex gap-2">
            <input type="number" value={logForm.page} onChange={e => setLogForm(f => f ? { ...f, page: e.target.value } : f)}
              placeholder="Page #" min={1} className="border rounded px-2 py-1.5 text-sm w-24" />
            <input type="text" value={logForm.notes} onChange={e => setLogForm(f => f ? { ...f, notes: e.target.value } : f)}
              placeholder="Notes (optional)" className="border rounded px-2 py-1.5 text-sm flex-1" />
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1.5">Skill Tags:</p>
            <div className="flex flex-wrap gap-1.5">
              {MATH_SKILLS.map(skill => (
                <button key={skill.id} onClick={() => toggleSkill(skill.id)}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    logForm.skills.includes(skill.id) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {skill.id}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleLogPage} disabled={!logForm.page}
              className="flex-1 bg-blue-500 text-white py-1.5 rounded text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
              <Check className="w-3 h-3 inline mr-1" /> Mark Complete
            </button>
            <button onClick={() => setLogForm(null)} className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
