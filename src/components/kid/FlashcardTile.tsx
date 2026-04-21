'use client'

import { useState, useEffect } from 'react'
import { Layers } from 'lucide-react'
import { HOMESCHOOL_KIDS } from '@/lib/constants'
import FlashcardReview from './FlashcardReview'

export default function FlashcardTile({ kidName }: { kidName: string }) {
  const kid = kidName.toLowerCase()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)

  if (!(HOMESCHOOL_KIDS as readonly string[]).includes(kid)) return null

  useEffect(() => {
    fetch(`/api/flashcards?action=due_count&kid_name=${kid}`)
      .then(r => r.json()).then(d => setCount(d.count || 0)).catch(() => {})
  }, [kid])

  if (count === 0) return null

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3 flex items-center gap-3 hover:from-purple-100 hover:to-indigo-100 text-left">
        <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
          <Layers className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-purple-900">{count} flashcard{count !== 1 ? 's' : ''} ready</p>
          <p className="text-[10px] text-purple-500">Tap to start your review</p>
        </div>
      </button>
      {open && <FlashcardReview kidName={kidName} onClose={() => { setOpen(false); setCount(0) }} />}
    </>
  )
}
