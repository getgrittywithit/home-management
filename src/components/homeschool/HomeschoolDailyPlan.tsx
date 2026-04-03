'use client'

import { useState } from 'react'
import { StudentData } from './types'
import ParentTaskManager from '../ParentTaskManager'

interface Props {
  students: StudentData[]
}

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

export default function HomeschoolDailyPlan({ students }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-900 text-lg">Daily Plans</h2>
      <div className="space-y-3">
        {students.map(s => <DailyPlanExpander key={s.id} student={s} />)}
      </div>
      <div className="mt-6">
        <h2 className="font-semibold text-gray-900 text-lg mb-3">Parent Tasks</h2>
        <ParentTaskManager />
      </div>
    </div>
  )
}
