'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Clock, CheckCircle2, Calendar, User, Library, Layers, Sparkles,
  Play, GraduationCap, Trophy, FolderOpen
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
import ReadingProgressDashboard from './ReadingProgressDashboard'

// Sub-components extracted to homeschool/
import { HomeschoolData, StudentData, Subject, STUDENT_DEFAULTS } from './homeschool/types'
import StudentTile from './homeschool/StudentTile'
import StudentProfile from './homeschool/StudentProfile'
import BooksView from './homeschool/BooksView'
import UnitsView from './homeschool/UnitsView'

type SubTab = 'today' | 'students' | 'books' | 'units' | 'vocab' | 'enrichment' | 'library' | 'tasks' | 'portfolio' | 'teacher' | 'opportunities'

function DailyPlanExpander({ student }: { student: StudentData }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-lg border ${open ? 'border-gray-300' : 'border-gray-200'} bg-white`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-left">
        <div className="flex items-center gap-2">
          <span className="text-lg">{student.mascot}</span>
          <span className="font-semibold text-gray-900">{student.name}&apos;s Plan</span>
          <span className="text-xs text-gray-500">{student.grade}</span>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {student.daily_plan.length === 0 && <p className="text-sm text-gray-400 italic">No plan set for today</p>}
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

export default function HomeschoolTab() {
  const [data, setData] = useState<HomeschoolData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [subTab, setSubTab] = useState<SubTab>('today')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [focusSession, setFocusSession] = useState<{ student: StudentData; subject: Subject } | null>(null)
  const [taskProgress, setTaskProgress] = useState<Record<string, { total_tasks: number; completed_tasks: number; focus_mins: number }>>({})

  const fetchTaskProgress = useCallback(() => {
    fetch('/api/homeschool?action=get_task_progress')
      .then(r => r.json())
      .then(json => {
        const map: Record<string, any> = {}
        for (const p of (json.progress || [])) map[p.kid_name.toLowerCase()] = p
        setTaskProgress(map)
      })
      .catch(() => {})
  }, [])

  const fetchData = useCallback(() => {
    fetchTaskProgress()
    fetch('/api/homeschool')
      .then(r => r.json())
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
  const selectedStudent = selectedStudentId ? students.find(s => s.id === selectedStudentId) : null

  const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'students', label: 'Students', icon: User },
    { id: 'books', label: 'Books', icon: Library },
    { id: 'units', label: 'Units', icon: Layers },
    { id: 'vocab', label: 'Vocab', icon: Sparkles },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
    { id: 'enrichment', label: 'Enrichment', icon: Play },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'portfolio', label: 'Portfolio', icon: FolderOpen },
    { id: 'teacher', label: 'Teacher', icon: GraduationCap },
    { id: 'opportunities', label: 'Opportunities', icon: Trophy },
  ]

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

      <div>
        <h2 className="font-semibold text-gray-900 mb-3 text-lg">Today&apos;s School</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {students.map(student => (
            <StudentTile key={student.id} student={student} selected={selectedStudentId === student.id && subTab === 'students'}
              taskData={taskProgress[student.id]} onClick={() => { setSelectedStudentId(student.id); setSubTab('students') }} />
          ))}
        </div>
      </div>

      {activeUnit && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2"><Layers className="w-5 h-5 text-teal-600" /><h3 className="font-semibold text-gray-900">Current Unit</h3></div>
          <h4 className="font-bold text-gray-800">{activeUnit.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{activeUnit.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">{activeUnit.subjects.map(s => <span key={s} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{s}</span>)}</div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => { setSubTab(tab.id); if (tab.id !== 'students') setSelectedStudentId(null) }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                subTab === tab.id ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          )
        })}
      </div>

      {subTab === 'today' && <div className="space-y-3">{students.map(s => <DailyPlanExpander key={s.id} student={s} />)}</div>}

      {subTab === 'students' && (
        <>
          {!selectedStudent && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{students.map(s => <StudentTile key={s.id} student={s} onClick={() => setSelectedStudentId(s.id)} />)}</div>}
          {selectedStudent && (
            <div>
              <button onClick={() => setSelectedStudentId(null)} className="text-sm text-teal-600 hover:text-teal-800 mb-3">&larr; All Students</button>
              <StudentProfile student={selectedStudent} onStartFocus={(sub) => setFocusSession({ student: selectedStudent, subject: sub })} />
            </div>
          )}
        </>
      )}

      {subTab === 'books' && <BooksView students={students} familyBook={family_read_aloud} />}
      {subTab === 'units' && <UnitsView units={units} />}
      {subTab === 'vocab' && <VocabWordsTab />}
      {subTab === 'tasks' && <ParentTaskManager />}
      {subTab === 'enrichment' && (
        <div className="space-y-6">
          <ReadingProgressDashboard />
          <ParentEnrichmentSummary />
          <div className="grid gap-4 md:grid-cols-2">
            {students.map(s => <FinancialLiteracyPanel key={s.id} kidName={s.name} isParent={true} />)}
          </div>
        </div>
      )}
      {subTab === 'library' && <ParentLibraryAdmin />}
      {subTab === 'portfolio' && <ParentPortfolioPanel />}
      {subTab === 'teacher' && <TeacherDashboard />}
      {subTab === 'opportunities' && <OpportunitiesParentPanel />}
    </div>
  )
}
