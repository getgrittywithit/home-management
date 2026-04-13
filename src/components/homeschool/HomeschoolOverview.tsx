'use client'

import { StudentData } from './types'
import StudentTile from './StudentTile'
import StudentProfile from './StudentProfile'
import type { Subject } from './types'
import TeacherDashboard from '../TeacherDashboard'
import OpportunitiesParentPanel from '../OpportunitiesParentPanel'
import WeeklyFocusBoard from './WeeklyFocusBoard'
import AssessmentScoreEntry from './AssessmentScoreEntry'

interface Props {
  students: StudentData[]
  taskProgress: Record<string, { total_tasks: number; completed_tasks: number; focus_mins: number }>
  selectedStudentId: string | null
  onSelectStudent: (id: string | null) => void
  onStartFocus: (student: StudentData, subject: Subject) => void
}

export default function HomeschoolOverview({ students, taskProgress, selectedStudentId, onSelectStudent, onStartFocus }: Props) {
  const selectedStudent = selectedStudentId ? students.find(s => s.id === selectedStudentId) : null

  if (selectedStudent) {
    return (
      <div>
        <button onClick={() => onSelectStudent(null)} className="text-sm text-teal-600 hover:text-teal-800 mb-3">&larr; All Students</button>
        <StudentProfile student={selectedStudent} onStartFocus={(sub) => onStartFocus(selectedStudent, sub)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-gray-900 mb-3 text-lg">Students</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {students.map(student => (
            <StudentTile key={student.id} student={student} taskData={taskProgress[student.id]} onClick={() => onSelectStudent(student.id)} />
          ))}
        </div>
      </div>
      <WeeklyFocusBoard />
      <AssessmentScoreEntry />
      <TeacherDashboard />
      <OpportunitiesParentPanel />
    </div>
  )
}
