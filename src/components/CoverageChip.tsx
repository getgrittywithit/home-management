'use client'

import { useState } from 'react'
import { ArrowRight, Pencil } from 'lucide-react'
import { ALL_KIDS, KID_DISPLAY } from '@/lib/constants'

interface Props {
  dutyType: string
  originalKid: string
  coveredBy: string | null
  coveredByType: 'kid' | 'parent' | 'skipped'
  autoAssigned: boolean
  modeId?: number
  onReassign?: (newKid: string) => void
}

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export default function CoverageChip({ dutyType, originalKid, coveredBy, coveredByType, autoAssigned, modeId, onReassign }: Props) {
  const [editing, setEditing] = useState(false)

  const label = coveredByType === 'parent' ? 'Parents' : coveredByType === 'skipped' ? 'Skipped' : KID_DISPLAY[coveredBy || ''] || cap(coveredBy || '')
  const originalLabel = KID_DISPLAY[originalKid] || cap(originalKid)

  return (
    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-xs px-2 py-0.5 rounded-full border border-amber-200">
      <span className="line-through text-amber-500">{originalLabel}</span>
      <ArrowRight className="w-3 h-3 text-amber-400" />
      <span className="font-medium">{label}</span>
      {autoAssigned && <span className="text-amber-400">(auto)</span>}
      {onReassign && !editing && (
        <button onClick={() => setEditing(true)} className="ml-0.5 hover:text-amber-600">
          <Pencil className="w-3 h-3" />
        </button>
      )}
      {editing && (
        <select value={coveredBy || ''} onChange={e => { onReassign?.(e.target.value); setEditing(false) }}
          className="ml-1 text-[10px] border rounded px-1 py-0.5" autoFocus onBlur={() => setEditing(false)}>
          {[...ALL_KIDS].filter(k => k !== originalKid).map(k => (
            <option key={k} value={k}>{KID_DISPLAY[k]}</option>
          ))}
          <option value="parents">Parents</option>
        </select>
      )}
    </span>
  )
}
