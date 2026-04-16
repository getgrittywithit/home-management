'use client'

import { useState } from 'react'
import { STUDENT_DEFAULTS } from './types'
import HistoryBuddy from './HistoryBuddy'
import JourneyMap from './JourneyMap'
import PlacementQuiz from './PlacementQuiz'
import { Sparkles } from 'lucide-react'

type HistView = 'history-buddy' | 'journey-map'

export default function HomeschoolSocialStudies() {
  const [view, setView] = useState<HistView>('history-buddy')
  const [selectedKid, setSelectedKid] = useState('Amos')
  const [showPlacement, setShowPlacement] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button onClick={() => setView('history-buddy')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === 'history-buddy' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500'
          }`}>History Buddy</button>
        <button onClick={() => setView('journey-map')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === 'journey-map' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500'
          }`}>Journey Map</button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2 overflow-x-auto">
          {[...STUDENT_DEFAULTS, { id: 'zoey', name: 'Zoey', grade: '9th', mascot: '🌟', mascotName: 'Star', color: 'pink' }, { id: 'kaylee', name: 'Kaylee', grade: '7th', mascot: '🎭', mascotName: 'Drama', color: 'rose' }].map(s => (
            <button key={s.id} onClick={() => setSelectedKid(s.name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                selectedKid === s.name ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

      {showPlacement && (
        <PlacementQuiz
          kidName={selectedKid}
          subject="history"
          onClose={() => setShowPlacement(false)}
        />
      )}

      {view === 'history-buddy' && <HistoryBuddy kidName={selectedKid} />}
      {view === 'journey-map' && <JourneyMap kidName={selectedKid} subject="history" />}
    </div>
  )
}
