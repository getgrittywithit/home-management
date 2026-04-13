'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Star, X, Check } from 'lucide-react'

interface WorkbookLogModalProps {
  kidName: string
  workbookName: string
  subject?: string  // 'math' | 'elar' | other; drives the skill chip set
  onClose: () => void
  onLogged: () => void
}

const MATH_SKILL_CHIPS = [
  { id: 'M1', label: '🔢 Number Sense', short: 'Numbers' },
  { id: 'M2', label: '➕ Addition/Subtraction', short: 'Add/Sub' },
  { id: 'M3', label: '✖️ Multiplication/Division', short: 'Mult/Div' },
  { id: 'M4', label: '🥧 Fractions', short: 'Fractions' },
  { id: 'M5', label: '🔄 Patterns', short: 'Patterns' },
  { id: 'M7', label: '📏 Measurement', short: 'Measurement' },
  { id: 'M8', label: '💰 Money/Time', short: 'Money/Time' },
  { id: 'M9', label: '📐 Geometry', short: 'Geometry' },
  { id: 'M12', label: '🧩 Word Problems', short: 'Word Prob' },
]

const ELAR_SKILL_CHIPS = [
  { id: 'E1', label: '📖 Reading', short: 'Reading' },
  { id: 'E2', label: '✍️ Writing', short: 'Writing' },
  { id: 'E3', label: '📝 Grammar', short: 'Grammar' },
  { id: 'E4', label: '💬 Vocabulary', short: 'Vocabulary' },
  { id: 'E5', label: '🧠 Comprehension', short: 'Comprehension' },
  { id: 'E6', label: '🔤 Phonics', short: 'Phonics' },
  { id: 'E7', label: '🔠 Spelling', short: 'Spelling' },
  { id: 'E8', label: '✨ Creative Writing', short: 'Creative' },
]

function isElarWorkbook(workbookName: string, subject?: string): boolean {
  if (subject && ['elar', 'ela', 'english', 'reading', 'language arts'].includes(subject.toLowerCase())) return true
  const lower = workbookName.toLowerCase()
  return lower.includes('elar') || lower.includes('reading') || lower.includes('writing') || lower.includes('language')
}

export default function WorkbookLogModal({ kidName, workbookName, subject, onClose, onLogged }: WorkbookLogModalProps) {
  const SKILL_CHIPS = isElarWorkbook(workbookName, subject) ? ELAR_SKILL_CHIPS : MATH_SKILL_CHIPS
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [dailyTarget, setDailyTarget] = useState(2)
  const [pageFrom, setPageFrom] = useState('')
  const [pageTo, setPageTo] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [sectionInfo, setSectionInfo] = useState<string | null>(null)

  useEffect(() => {
    // Load current progress
    fetch(`/api/workbook?action=get_progress&kid_name=${kidName.toLowerCase()}`)
      .then(r => r.json())
      .then(data => {
        const wb = (data.workbooks || []).find((w: any) => w.workbook_name === workbookName)
        if (wb) {
          setCurrentPage(wb.current_page || 0)
          setTotalPages(wb.total_pages || 0)
          setDailyTarget(wb.daily_target || 2)
          setPageFrom(String(wb.current_page || 1))
        }
      })
      .catch(() => {})
  }, [kidName, workbookName])

  // Check skill map when pageTo changes
  useEffect(() => {
    if (!pageTo) return
    fetch(`/api/workbook?action=get_skill_map&workbook=${encodeURIComponent(workbookName)}&page=${pageTo}`)
      .then(r => r.json())
      .then(data => {
        if (data.maps?.length > 0) {
          setSectionInfo(data.maps[0].section_name || null)
        }
      })
      .catch(() => {})
  }, [pageTo, workbookName])

  const handleSave = async () => {
    const from = parseInt(pageFrom) || 0
    const to = parseInt(pageTo) || 0
    if (to <= 0) return
    setSaving(true)

    await fetch('/api/workbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log_pages',
        kid_name: kidName,
        workbook_name: workbookName,
        pages_completed: Math.max(to - from, 1),
        page_start: from,
        page_end: to,
        skill_tags: selectedSkills.length > 0 ? selectedSkills : null,
      }),
    }).catch(() => {})

    setSaving(false)
    onLogged()
    onClose()
  }

  const toggleSkill = (id: string) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) :
      prev.length < 3 ? [...prev, id] : prev
    )
  }

  const to = parseInt(pageTo) || 0
  const pagesLogged = Math.max(to - (parseInt(pageFrom) || 0), 0)
  const newProgress = totalPages > 0 ? Math.round((Math.max(to, currentPage) / totalPages) * 100) : 0
  const exceededTarget = pagesLogged > dailyTarget

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> {workbookName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Page range */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">What pages did you do today?</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Pages</span>
              <input type="number" value={pageFrom} onChange={e => setPageFrom(e.target.value)}
                className="w-20 border rounded-lg px-3 py-2 text-sm text-center" min="1" />
              <span className="text-gray-400">to</span>
              <input type="number" value={pageTo} onChange={e => setPageTo(e.target.value)}
                className="w-20 border rounded-lg px-3 py-2 text-sm text-center" min="1" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Your target: {dailyTarget} pages/day</p>
            {exceededTarget && <p className="text-xs text-green-600 mt-0.5">Nice — you exceeded your target! Bonus star incoming.</p>}
          </div>

          {/* Progress bar */}
          {totalPages > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress: pg {Math.max(to, currentPage)}/{totalPages}</span>
                <span>{newProgress}% complete</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${newProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(newProgress, 100)}%` }} />
              </div>
            </div>
          )}

          {/* Section info */}
          {sectionInfo && (
            <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">{sectionInfo}</p>
          )}

          {/* Skill picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              What did you practice? <span className="text-gray-400">(tap 1-3)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_CHIPS.map(skill => (
                <button key={skill.id} onClick={() => toggleSkill(skill.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedSkills.includes(skill.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {skill.short}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={!pageTo || saving}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> {saving ? 'Saving...' : `Done +${exceededTarget ? '3' : '2'} ⭐`}
          </button>
        </div>
      </div>
    </div>
  )
}
