'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Star, Play, Check } from 'lucide-react'
import SpeakerButton from '../SpeakerButton'
import FlashcardReview from './FlashcardReview'

interface Props { kidName: string }

export default function MyWords({ kidName }: Props) {
  const kid = kidName.toLowerCase()
  const [words, setWords] = useState<any[]>([])
  const [sets, setSets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewOpen, setReviewOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/vocabulary/baseline?kid_name=${kid}`).then(r => r.json()).catch(() => ({ words: [] })),
      fetch(`/api/vocabulary/study-sets?kid_name=${kid}`).then(r => r.json()).catch(() => ({ sets: [] })),
    ]).then(([b, s]) => {
      setWords(b.words || [])
      setSets(s.sets || [])
      setLoading(false)
    })
  }, [kid])

  const mastered = words.filter(w => w.progress_status === 'mastered').length
  const learning = words.filter(w => w.progress_status === 'learning').length
  const newWords = words.length - mastered - learning
  const displayName = kidName.charAt(0).toUpperCase() + kidName.slice(1)

  if (loading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto" /></div>

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-5 rounded-xl">
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" /> My Words</h2>
        <p className="text-purple-200 text-sm mt-1">Welcome back, {displayName}! Ready for some word practice?</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{mastered}</p>
          <p className="text-[10px] text-green-500">Mastered</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{learning}</p>
          <p className="text-[10px] text-amber-500">Learning</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{newWords}</p>
          <p className="text-[10px] text-blue-500">New</p>
        </div>
      </div>

      <button onClick={() => setReviewOpen(true)}
        className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4 rounded-xl flex items-center justify-center gap-2 hover:from-purple-600 hover:to-indigo-600">
        <Play className="w-5 h-5" /> Start Word Review
      </button>

      {sets.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Your Study Sets</h3>
          <div className="space-y-2">
            {sets.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.set_name}</p>
                  <p className="text-[10px] text-gray-400">{s.description || 'Practice set'}</p>
                </div>
                <Play className="w-4 h-4 text-purple-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {words.filter(w => w.progress_status === 'mastered').length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">RECENTLY MASTERED</h3>
          <div className="space-y-1.5">
            {words.filter(w => w.progress_status === 'mastered').slice(0, 5).map((w: any) => (
              <div key={w.id} className="flex items-center gap-2 text-xs">
                <Check className="w-3 h-3 text-green-500" />
                <span className="font-medium text-gray-900">{w.word}</span>
                <SpeakerButton text={w.word} size="sm" />
                <span className="text-gray-400 ml-auto">{w.mastered_at ? new Date(w.mastered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {words.length === 0 && (
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-sm text-gray-600">Your word bank is ready.</p>
          <p className="text-xs text-gray-400 mt-1">Every word you meet here is one more you&apos;ll know forever.</p>
        </div>
      )}

      {reviewOpen && <FlashcardReview kidName={kidName} onClose={() => setReviewOpen(false)} />}
    </div>
  )
}
