'use client'

import { useState, useEffect } from 'react'
import { Info, ChevronDown, ChevronUp } from 'lucide-react'
import SpeakerButton from './SpeakerButton'

interface HelpDropdownProps {
  instructions: string[] | string
  label?: string
  speakerEnabled?: boolean
  compact?: boolean
  className?: string
}

export default function HelpDropdown({
  instructions,
  label = 'How to do this',
  speakerEnabled = true,
  compact = false,
  className = '',
}: HelpDropdownProps) {
  const [expanded, setExpanded] = useState(false)

  // Normalize instructions to array
  const steps: string[] = Array.isArray(instructions)
    ? instructions.filter(s => s && typeof s === 'string' && s.trim())
    : typeof instructions === 'string' && instructions.trim()
      ? [instructions.trim()]
      : []

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  if (steps.length === 0) return null

  // Build speech text from steps
  const speechText = steps.length === 1
    ? steps[0]
    : steps.map((s, i) => `Step ${i + 1}: ${s}`).join('. ')

  return (
    <div className={className} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1 ${compact ? 'text-[11px]' : 'text-xs'} text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1 transition-colors`}
      >
        <Info className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>{label}</span>
        {expanded
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2 relative">
          {speakerEnabled && (
            <div className="absolute top-2 right-2">
              <SpeakerButton text={speechText} size="sm" />
            </div>
          )}
          {steps.length === 1 ? (
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-700 leading-relaxed pr-8`}>
              {steps[0]}
            </p>
          ) : (
            <ol className={`list-decimal list-inside space-y-1.5 ${compact ? 'text-xs' : 'text-sm'} text-gray-700 pr-8`}>
              {steps.map((step, i) => (
                <li key={i} className="leading-snug">{step}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
