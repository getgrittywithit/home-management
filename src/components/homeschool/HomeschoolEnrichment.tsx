'use client'

import { StudentData } from './types'
import ParentEnrichmentSummary from '../ParentEnrichmentSummary'
import FinancialLiteracyPanel from '../FinancialLiteracyPanel'

interface Props {
  students: StudentData[]
}

export default function HomeschoolEnrichment({ students }: Props) {
  return (
    <div className="space-y-6">
      <ParentEnrichmentSummary />
      <div className="grid gap-4 md:grid-cols-2">
        {students.map(s => <FinancialLiteracyPanel key={s.id} kidName={s.name} isParent={true} />)}
      </div>
      {/* Phase 5.9 placeholder: Typing Race, Enrichment Activity Loops */}
    </div>
  )
}
