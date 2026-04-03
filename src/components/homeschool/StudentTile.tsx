'use client'

import { AlertTriangle } from 'lucide-react'
import { StudentData, COLOR_MAP, STATUS_ICON } from './types'

export default function StudentTile({ student, onClick, selected, taskData }: {
  student: StudentData; onClick: () => void; selected?: boolean;
  taskData?: { total_tasks: number; completed_tasks: number; focus_mins: number }
}) {
  const c = COLOR_MAP[student.color] || COLOR_MAP.blue
  const totalTasks = taskData?.total_tasks || 0
  const completedTasks = taskData?.completed_tasks || 0
  const focusMins = taskData?.focus_mins || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all w-full ${
        selected ? `${c.border} ${c.bg} shadow-md` : 'border-gray-200 bg-white hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{student.mascot}</span>
        <div>
          <div className="font-bold text-gray-900">{student.name}</div>
          <div className="text-xs text-gray-500">{student.grade} Grade</div>
        </div>
      </div>

      {totalTasks > 0 ? (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-medium ${progress === 100 ? 'text-green-600' : c.text}`}>
              {completedTasks}/{totalTasks} done
            </span>
            <span className="text-gray-500">{focusMins} min</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress === 100 ? 'bg-green-500' :
                progress >= 50 ? 'bg-blue-500' :
                progress > 0 ? 'bg-amber-500' : 'bg-gray-200'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-0.5 mb-2">
            {student.subjects.slice(0, 4).map(sub => (
              <div key={sub.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span>{STATUS_ICON[sub.status] || '📋'}</span>
                <span className="truncate">{sub.emoji} {sub.name}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${c.text}`}>
              {student.subjects.filter(s => s.status === 'done').length}/{student.subjects.length} done
            </span>
            <span className="text-gray-500">{student.focus_sessions} focus</span>
          </div>
        </>
      )}

      {student.concern_flags.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          {student.concern_flags[0]}
        </div>
      )}
    </button>
  )
}
