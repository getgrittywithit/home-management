'use client'

import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import SpeakerButton from '../SpeakerButton'

interface Props {
  kidName: string
  bookId: number
  bookTitle: string
  contentWarnings: string[]
  mainThemes: string[]
  triggerNotes?: string
  onProceed: () => void
  onDecline: () => void
}

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export default function ContentWarningModal({ kidName, bookId, bookTitle, contentWarnings, mainThemes, triggerNotes, onProceed, onDecline }: Props) {
  const [saving, setSaving] = useState(false)
  const kid = kidName.toLowerCase()

  const handleChoice = async (proceed: boolean) => {
    setSaving(true)
    await fetch('/api/library/books', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'acknowledge_warning', kid_name: kid, book_id: bookId,
        shown_warnings: contentWarnings, kid_chose_to_proceed: proceed,
        trigger_notes_snippet: triggerNotes?.substring(0, 200),
      }),
    }).catch(() => {})
    setSaving(false)
    proceed ? onProceed() : onDecline()
  }

  const warningText = `This book has: ${contentWarnings.map(humanize).join(', ')}. It talks about: ${mainThemes.map(humanize).join(', ')}.`

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" /> Heads up about <em>{bookTitle}</em>
            </h3>
            <button onClick={onDecline}><X className="w-4 h-4 text-gray-400" /></button>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <p className="text-sm text-gray-700">{warningText}</p>
              <SpeakerButton text={warningText} size="sm" />
            </div>

            {triggerNotes && (
              <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg p-2">
                {triggerNotes.substring(0, 200)}{triggerNotes.length > 200 ? '...' : ''}
              </p>
            )}
          </div>

          <div className="border-t pt-3">
            <p className="text-xs text-gray-500 text-center mb-3">Think about it — do you still want to read this book?</p>
            <div className="flex gap-2">
              <button onClick={() => handleChoice(false)} disabled={saving}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50">
                Maybe later
              </button>
              <button onClick={() => handleChoice(true)} disabled={saving}
                className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
                Yes, I want to read it
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
