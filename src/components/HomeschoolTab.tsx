'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Layers } from 'lucide-react'
import FocusTimer from './FocusTimer'
import { HomeschoolData, StudentData, Subject, STUDENT_DEFAULTS } from './homeschool/types'
import StudentTile from './homeschool/StudentTile'
import HomeschoolOverview from './homeschool/HomeschoolOverview'
import HomeschoolDailyPlan from './homeschool/HomeschoolDailyPlan'
import HomeschoolELAR from './homeschool/HomeschoolELAR'
import HomeschoolMath from './homeschool/HomeschoolMath'
import HomeschoolEnrichment from './homeschool/HomeschoolEnrichment'
import HomeschoolRecords from './homeschool/HomeschoolRecords'
import HomeschoolPortfolio from './homeschool/HomeschoolPortfolio'
import UnitsView from './homeschool/UnitsView'
import AttendanceLogger from './homeschool/AttendanceLogger'

type SubTabId = 'overview' | 'daily-plan' | 'elar' | 'math' | 'enrichment' | 'records' | 'attendance' | 'portfolio' | 'units'

const SUB_TABS: { id: SubTabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'daily-plan', label: 'Daily Plan', icon: '📋' },
  { id: 'elar', label: 'ELAR', icon: '📖' },
  { id: 'math', label: 'Math', icon: '🔢' },
  { id: 'enrichment', label: 'Enrichment', icon: '🎯' },
  { id: 'records', label: 'Records', icon: '📁' },
  { id: 'attendance', label: 'Attendance', icon: '✅' },
  { id: 'portfolio', label: 'Portfolio', icon: '🎨' },
  { id: 'units', label: 'Unit Studies', icon: '🔬' },
]

export default function HomeschoolTab() {
  const [data, setData] = useState<HomeschoolData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [focusSession, setFocusSession] = useState<{ student: StudentData; subject: Subject } | null>(null)
  const [taskProgress, setTaskProgress] = useState<Record<string, { total_tasks: number; completed_tasks: number; focus_mins: number }>>({})

  const fetchData = useCallback(() => {
    fetch('/api/homeschool?action=get_task_progress').then(r => r.json())
      .then(json => {
        const map: Record<string, any> = {}
        for (const p of (json.progress || [])) map[p.kid_name.toLowerCase()] = p
        setTaskProgress(map)
      }).catch(() => {})

    fetch('/api/homeschool').then(r => r.json())
      .then(raw => {
        const students: StudentData[] = STUDENT_DEFAULTS.map(def => {
          const s = (raw.students || []).find((x: any) => x.id === def.id || x.name?.toLowerCase() === def.id)
          return { ...def, subjects: s?.subjects || [], focus_sessions: s?.focus_sessions || 0, concern_flags: s?.concern_flags || [], daily_plan: s?.daily_plan || [], books: s?.books || [], lesson_logs: s?.lesson_logs || [] }
        })
        setData({ students, units: raw.units || [], family_read_aloud: raw.family_read_aloud || null })
        setLoaded(true)
      })
      .catch(() => {
        setData({ students: STUDENT_DEFAULTS.map(def => ({ ...def, subjects: [], focus_sessions: 0, concern_flags: [], daily_plan: [], books: [], lesson_logs: [] })), units: [], family_read_aloud: null })
        setLoaded(true)
      })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
  if (!data) return null

  const { students, units, family_read_aloud } = data
  const activeUnit = units.find(u => u.status === 'active')

  const renderSubTab = () => {
    switch (activeSubTab) {
      case 'overview':
        return <HomeschoolOverview students={students} taskProgress={taskProgress} selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId} onStartFocus={(student, subject) => setFocusSession({ student, subject })} />
      case 'daily-plan':
        return <HomeschoolDailyPlan students={students} />
      case 'elar':
        return <HomeschoolELAR students={students} familyBook={family_read_aloud} />
      case 'math':
        return <HomeschoolMath />
      case 'enrichment':
        return <HomeschoolEnrichment students={students} />
      case 'records':
        return <HomeschoolRecords />
      case 'attendance':
        return <AttendanceLogger />
      case 'portfolio':
        return <HomeschoolPortfolio />
      case 'units':
        return <UnitsView units={units} />
      default:
        return <HomeschoolOverview students={students} taskProgress={taskProgress} selectedStudentId={null}
          onSelectStudent={setSelectedStudentId} onStartFocus={(student, subject) => setFocusSession({ student, subject })} />
    }
  }

  return (
    <div className="space-y-6">
      {focusSession && (
        <FocusTimer studentName={focusSession.student.name} studentId={focusSession.student.id}
          subjectName={focusSession.subject.name} subjectId={focusSession.subject.id}
          subjectEmoji={focusSession.subject.emoji} plannedMins={25}
          mascot={focusSession.student.mascot} mascotName={focusSession.student.mascotName}
          colorTheme={focusSession.student.color}
          onComplete={() => { setFocusSession(null); fetchData() }} />
      )}

      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white p-6 rounded-xl">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-7 h-7" /> Homeschool</h1>
        <p className="text-teal-100 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {activeUnit && activeSubTab === 'overview' && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2"><Layers className="w-5 h-5 text-teal-600" /><h3 className="font-semibold text-gray-900">Current Unit</h3></div>
          <h4 className="font-bold text-gray-800">{activeUnit.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{activeUnit.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">{activeUnit.subjects.map(s => <span key={s} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{s}</span>)}</div>
        </div>
      )}

      {/* 8-tab navigation */}
      <div className="flex gap-2 overflow-x-auto border-b pb-2 mb-4">
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveSubTab(tab.id); setSelectedStudentId(null) }}
            className={`px-3 py-2 rounded-t whitespace-nowrap text-sm font-medium transition-colors ${
              activeSubTab === tab.id
                ? 'bg-white border-b-2 border-teal-500 text-teal-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {renderSubTab()}
    </div>
  )
}
