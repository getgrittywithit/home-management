'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, X, Award, ClipboardList, Download } from 'lucide-react'
import { createPDF, addHeader, addFooter, addSectionTitle, addKeyValue, addTable } from '@/lib/pdf/generate'

const KIDS = [
  { id: 'amos', label: 'Amos', grade: '10th' },
  { id: 'ellie', label: 'Ellie', grade: '6th' },
  { id: 'wyatt', label: 'Wyatt', grade: '4th' },
  { id: 'hannah', label: 'Hannah', grade: '3rd' },
]

const SUBJECTS = ['ELAR', 'Math', 'Science', 'Social Studies', 'Art', 'PE', 'Life Skills', 'Financial Literacy']
const GRADING_PERIODS = ['Q1 2025-26', 'Q2 2025-26', 'Q3 2025-26', 'Q4 2025-26']

export default function HomeschoolRecords() {
  const [selectedKid, setSelectedKid] = useState('amos')
  const [grades, setGrades] = useState<any[]>([])
  const [testScores, setTestScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddGrade, setShowAddGrade] = useState(false)
  const [showAddTest, setShowAddTest] = useState(false)
  const [gradeForm, setGradeForm] = useState({ subject: 'ELAR', grading_period: 'Q3 2025-26', grade: '', percentage: '', credits: '0.5', notes: '' })
  const [testForm, setTestForm] = useState({ test_name: '', subject: '', score: '', percentile: '', date_taken: '', notes: '' })

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/academic-records?action=get_grades&kid_name=${selectedKid}`).then(r => r.json()),
      fetch(`/api/academic-records?action=get_test_scores&kid_name=${selectedKid}`).then(r => r.json()),
    ]).then(([g, t]) => {
      setGrades(g.grades || [])
      setTestScores(t.scores || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedKid])

  const saveGrade = async () => {
    if (!gradeForm.grade) return
    await fetch('/api/academic-records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_grade', kid_name: selectedKid, ...gradeForm, percentage: gradeForm.percentage ? Number(gradeForm.percentage) : null, credits: Number(gradeForm.credits) }),
    })
    setShowAddGrade(false)
    setGradeForm({ subject: 'ELAR', grading_period: 'Q3 2025-26', grade: '', percentage: '', credits: '0.5', notes: '' })
    // Refresh
    const g = await fetch(`/api/academic-records?action=get_grades&kid_name=${selectedKid}`).then(r => r.json())
    setGrades(g.grades || [])
  }

  const saveTest = async () => {
    if (!testForm.test_name) return
    await fetch('/api/academic-records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_test_score', kid_name: selectedKid, ...testForm, percentile: testForm.percentile ? Number(testForm.percentile) : null }),
    })
    setShowAddTest(false)
    setTestForm({ test_name: '', subject: '', score: '', percentile: '', date_taken: '', notes: '' })
    const t = await fetch(`/api/academic-records?action=get_test_scores&kid_name=${selectedKid}`).then(r => r.json())
    setTestScores(t.scores || [])
  }

  const kidInfo = KIDS.find(k => k.id === selectedKid)

  // Group grades by grading period
  const gradesByPeriod: Record<string, any[]> = {}
  grades.forEach(g => {
    if (!gradesByPeriod[g.grading_period]) gradesByPeriod[g.grading_period] = []
    gradesByPeriod[g.grading_period].push(g)
  })

  const totalCredits = grades.reduce((sum, g) => sum + (Number(g.credits) || 0), 0)

  const exportPdf = () => {
    const info = KIDS.find((k) => k.id === selectedKid)
    const doc = createPDF({
      title: `${info?.label || selectedKid} — Academic Transcript`,
      subtitle: `${info?.grade || ''} · 2025-2026`,
    })
    let y = addHeader(doc, `${info?.label || selectedKid} — Academic Transcript`, info?.grade || '')
    y += 2

    y = addKeyValue(doc, 'Student', info?.label || selectedKid, y)
    y = addKeyValue(doc, 'Grade', info?.grade || '—', y)
    y = addKeyValue(doc, 'Total Credits', `${totalCredits}`, y)
    y = addKeyValue(doc, 'Generated', new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), y)
    y += 3

    for (const [period, periodGrades] of Object.entries(gradesByPeriod)) {
      y = addSectionTitle(doc, period, y, '📚')
      const rows = (periodGrades as any[]).map((g) => [
        g.subject,
        g.grade || '—',
        g.percentage != null ? `${g.percentage}%` : '—',
        `${Number(g.credits || 0)} cr`,
        g.notes || '',
      ])
      y = addTable(doc, ['Subject', 'Grade', 'Percentage', 'Credits', 'Notes'], rows, y, [45, 25, 30, 25, 60])
      y += 4
    }

    if (testScores.length > 0) {
      y = addSectionTitle(doc, 'Test Scores', y, '📝')
      const rows = testScores.map((t) => [
        t.test_name,
        t.subject || '—',
        t.score || '—',
        t.percentile != null ? `${t.percentile}%ile` : '—',
        t.date_taken || '—',
      ])
      y = addTable(doc, ['Test', 'Subject', 'Score', 'Percentile', 'Date'], rows, y, [50, 35, 25, 30, 35])
    }

    addFooter(doc, `Family Hub — Generated ${new Date().toISOString().slice(0, 10)}`)
    doc.save(`${(info?.label || selectedKid).toLowerCase()}-transcript-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="space-y-6">
      {/* Kid selector */}
      <div className="flex gap-2">
        {KIDS.map(kid => (
          <button key={kid.id} onClick={() => setSelectedKid(kid.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedKid === kid.id ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {kid.label} ({kid.grade})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading records...</div>
      ) : (
        <>
          {/* Grades Section */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" /> Subject Grades — {kidInfo?.label}
              </h3>
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{totalCredits} credits total</span>
                <button onClick={() => setShowAddGrade(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600">
                  <Plus className="w-3 h-3" /> Add Grade
                </button>
              </div>
            </div>

            {Object.keys(gradesByPeriod).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No grades entered yet. Click &quot;Add Grade&quot; to start.</p>
            ) : Object.entries(gradesByPeriod).map(([period, periodGrades]) => (
              <div key={period} className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{period}</h4>
                <div className="space-y-1">
                  {periodGrades.map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded text-sm">
                      <span className="font-medium text-gray-800">{g.subject}</span>
                      <div className="flex items-center gap-3">
                        {g.percentage && <span className="text-gray-500">{g.percentage}%</span>}
                        <span className={`font-bold ${g.grade === 'A' || g.grade === 'A+' ? 'text-green-600' : g.grade === 'B' ? 'text-blue-600' : 'text-gray-700'}`}>{g.grade}</span>
                        <span className="text-xs text-gray-400">{g.credits} cr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Add Grade Form */}
            {showAddGrade && (
              <div className="bg-blue-50 rounded-lg p-4 mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-800">Add Grade</h4>
                  <button onClick={() => setShowAddGrade(false)}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={gradeForm.subject} onChange={e => setGradeForm(f => ({ ...f, subject: e.target.value }))}
                    className="border rounded px-2 py-1.5 text-sm">
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={gradeForm.grading_period} onChange={e => setGradeForm(f => ({ ...f, grading_period: e.target.value }))}
                    className="border rounded px-2 py-1.5 text-sm">
                    {GRADING_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="text" value={gradeForm.grade} onChange={e => setGradeForm(f => ({ ...f, grade: e.target.value }))}
                    placeholder="Grade (A, B+, etc.)" className="border rounded px-2 py-1.5 text-sm" />
                  <input type="number" value={gradeForm.percentage} onChange={e => setGradeForm(f => ({ ...f, percentage: e.target.value }))}
                    placeholder="Percentage" className="border rounded px-2 py-1.5 text-sm" />
                </div>
                <button onClick={saveGrade} disabled={!gradeForm.grade}
                  className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-600 disabled:opacity-50">Save Grade</button>
              </div>
            )}
          </div>

          {/* Test Scores Section */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" /> Test Scores
              </h3>
              <button onClick={() => setShowAddTest(true)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-500 text-white hover:bg-purple-600">
                <Plus className="w-3 h-3" /> Add Score
              </button>
            </div>

            {testScores.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No test scores entered. Add MAP, STAAR, or other scores here.</p>
            ) : (
              <div className="space-y-2">
                {testScores.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{t.test_name}</span>
                      {t.subject && <span className="text-gray-500 ml-2">({t.subject})</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900">{t.score}</span>
                      {t.percentile && <span className="text-xs text-purple-600">{t.percentile}th %ile</span>}
                      {t.date_taken && <span className="text-xs text-gray-400">{new Date(t.date_taken).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Test Form */}
            {showAddTest && (
              <div className="bg-purple-50 rounded-lg p-4 mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-800">Add Test Score</h4>
                  <button onClick={() => setShowAddTest(false)}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={testForm.test_name} onChange={e => setTestForm(f => ({ ...f, test_name: e.target.value }))}
                    placeholder="Test name (MAP, STAAR...)" className="border rounded px-2 py-1.5 text-sm" />
                  <input type="text" value={testForm.subject} onChange={e => setTestForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Subject" className="border rounded px-2 py-1.5 text-sm" />
                  <input type="text" value={testForm.score} onChange={e => setTestForm(f => ({ ...f, score: e.target.value }))}
                    placeholder="Score" className="border rounded px-2 py-1.5 text-sm" />
                  <input type="number" value={testForm.percentile} onChange={e => setTestForm(f => ({ ...f, percentile: e.target.value }))}
                    placeholder="Percentile" className="border rounded px-2 py-1.5 text-sm" />
                  <input type="date" value={testForm.date_taken} onChange={e => setTestForm(f => ({ ...f, date_taken: e.target.value }))}
                    className="border rounded px-2 py-1.5 text-sm" />
                </div>
                <button onClick={saveTest} disabled={!testForm.test_name}
                  className="bg-purple-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-purple-600 disabled:opacity-50">Save Score</button>
              </div>
            )}
          </div>

          {/* Transcript Link */}
          <div className={`rounded-lg border p-4 flex items-center justify-between ${
            selectedKid === 'amos' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div>
              <p className={`text-sm font-semibold ${selectedKid === 'amos' ? 'text-amber-900' : 'text-gray-800'}`}>
                {selectedKid === 'amos' ? 'Transcript' : 'Academic Report'} for {kidInfo?.label} ({kidInfo?.grade})
              </p>
              <p className={`text-xs mt-0.5 ${selectedKid === 'amos' ? 'text-amber-700' : 'text-gray-500'}`}>
                {totalCredits} credit{totalCredits !== 1 ? 's' : ''} · {grades.length} course entr{grades.length === 1 ? 'y' : 'ies'} · {testScores.length} test score{testScores.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={exportPdf}
              disabled={grades.length === 0 && testScores.length === 0}
              className={`flex items-center gap-1 px-3 py-1.5 text-white rounded text-sm font-medium disabled:opacity-50 ${
                selectedKid === 'amos' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
