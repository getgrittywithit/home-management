'use client'

import { useState } from 'react'
import { StudentData, FamilyBook } from './types'
import BooksView from './BooksView'
import VocabWordsTab from '../VocabWordsTab'
import ReadingProgressDashboard from '../ReadingProgressDashboard'
import { ParentLibraryAdmin } from '../HomeLibrary'
import BookBuddy from './BookBuddy'
import JourneyMap from './JourneyMap'
import VocabMixer from './VocabMixer'
import PlacementQuiz from './PlacementQuiz'
import { Sparkles } from 'lucide-react'

interface Props {
  students: StudentData[]
  familyBook: FamilyBook | null
}

type ElarView = 'overview' | 'book-buddy' | 'journey-map' | 'books' | 'vocab' | 'vocab-mixer' | 'library'

export default function HomeschoolELAR({ students, familyBook }: Props) {
  const [view, setView] = useState<ElarView>('overview')
  const [selectedKid, setSelectedKid] = useState(students[0]?.name || 'Amos')
  const [showPlacement, setShowPlacement] = useState(false)

  const VIEWS: { id: ElarView; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'book-buddy', label: 'Book Buddy' },
    { id: 'journey-map', label: 'Journey Map' },
    { id: 'books', label: 'Books' },
    { id: 'vocab', label: 'Vocab' },
    { id: 'vocab-mixer', label: 'Vocab Mixer' },
    { id: 'library', label: 'Library' },
  ]

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              view === v.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Kid selector for buddy/journey views — ALL kids, not just homeschool */}
      {(view === 'book-buddy' || view === 'journey-map') && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-2 overflow-x-auto">
            {[...students, { id: 'zoey', name: 'Zoey', mascot: '🌟' }, { id: 'kaylee', name: 'Kaylee', mascot: '🎭' }]
              .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i) // dedupe
              .map(s => (
              <button key={s.id} onClick={() => setSelectedKid(s.name)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  selectedKid === s.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s.mascot} {s.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPlacement(true)}
            className="ml-auto inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-lg hover:bg-indigo-200 font-medium"
          >
            <Sparkles className="w-3 h-3" /> Start Placement Quiz
          </button>
        </div>
      )}

      {showPlacement && (
        <PlacementQuiz
          kidName={selectedKid}
          subject="elar"
          onClose={() => setShowPlacement(false)}
        />
      )}

      {view === 'overview' && <ReadingProgressDashboard />}
      {view === 'book-buddy' && <BookBuddy kidName={selectedKid} />}
      {view === 'journey-map' && <JourneyMap kidName={selectedKid} subject="elar" />}
      {view === 'books' && <BooksView students={students} familyBook={familyBook} />}
      {view === 'vocab' && <VocabWordsTab />}
      {view === 'vocab-mixer' && <VocabMixer kidName={selectedKid.toLowerCase()} />}
      {view === 'library' && <ParentLibraryAdmin />}
    </div>
  )
}
