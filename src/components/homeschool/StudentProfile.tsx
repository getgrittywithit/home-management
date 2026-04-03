'use client'

import { Play } from 'lucide-react'
import { StudentData, Subject, COLOR_MAP, STATUS_ICON } from './types'

export default function StudentProfile({ student, onStartFocus }: { student: StudentData; onStartFocus: (sub: Subject) => void }) {
  const c = COLOR_MAP[student.color] || COLOR_MAP.blue

  return (
    <div className="space-y-4">
      <div className={`bg-gradient-to-r ${c.gradient} text-white p-5 rounded-xl`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{student.mascot}</span>
          <div>
            <h2 className="text-xl font-bold">{student.name}</h2>
            <p className="text-white/80 text-sm">{student.grade} Grade &middot; {student.mascotName}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Subjects</h3>
        </div>
        <div className="divide-y">
          {student.subjects.map(sub => (
            <div key={sub.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">{sub.emoji}</span>
              <span className="flex-1 font-medium text-gray-800">{sub.name}</span>
              <span className="text-sm">{STATUS_ICON[sub.status]}</span>
              {sub.status !== 'done' && (
                <button
                  onClick={() => onStartFocus(sub)}
                  className={`flex items-center gap-1 text-xs ${c.text} ${c.light} px-2.5 py-1.5 rounded-lg hover:opacity-80 font-medium`}
                >
                  <Play className="w-3 h-3" /> Focus
                </button>
              )}
            </div>
          ))}
          {student.subjects.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No subjects configured</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Today&apos;s Plan</h3>
        {student.daily_plan.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No plan set for today</p>
        ) : (
          <ul className="space-y-1.5">
            {student.daily_plan.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-gray-400">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {student.lesson_logs.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Lessons</h3>
          <div className="space-y-2">
            {student.lesson_logs.slice(0, 5).map((log, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 text-xs mt-0.5">{log.date}</span>
                <span className="font-medium text-gray-700">{log.subject}</span>
                <span className="text-gray-500 flex-1 truncate">{log.notes}</span>
                {log.mood && <span>{log.mood === 'great' ? '😊' : log.mood === 'okay' ? '😐' : '😟'}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
