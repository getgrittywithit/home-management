'use client'

import { StudentData } from './types'
import ParentTaskManager from '../ParentTaskManager'

interface Props {
  students: StudentData[]
}

export default function HomeschoolDailyPlan({ students }: Props) {
  return (
    <div className="space-y-4">
      <ParentTaskManager />
    </div>
  )
}
