'use client'

import { useState } from 'react'
import { STUDENT_DEFAULTS } from './types'
import MathBuddy from './MathBuddy'
import JourneyMap from './JourneyMap'
import WorkbookTracker from './WorkbookTracker'

type MathView = 'math-buddy' | 'journey-map' | 'workbook'

export default function HomeschoolMath() {
  const [view, setView] = useState<MathView>('math-buddy')
  const [selectedKid, setSelectedKid] = useState('Amos')

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button onClick={() => setView('math-buddy')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === 'math-buddy' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'
          }`}>Math Buddy</button>
        <button onClick={() => setView('journey-map')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === 'journey-map' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'
          }`}>Journey Map</button>
        <button onClick={() => setView('workbook')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === 'workbook' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'
          }`}>Workbook</button>
      </div>

      {/* Kid selector — ALL kids, not just homeschool */}
      <div className="flex gap-2 overflow-x-auto">
        {[...STUDENT_DEFAULTS, { id: 'zoey', name: 'Zoey', grade: '9th', mascot: '🌟', mascotName: 'Star', color: 'pink' }, { id: 'kaylee', name: 'Kaylee', grade: '7th', mascot: '🎭', mascotName: 'Drama', color: 'rose' }].map(s => (
          <button key={s.id} onClick={() => setSelectedKid(s.name)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
              selectedKid === s.name ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s.mascot} {s.name}
          </button>
        ))}
      </div>

      {view === 'math-buddy' && <MathBuddy kidName={selectedKid} />}
      {view === 'journey-map' && <JourneyMap kidName={selectedKid} subject="math" />}
      {view === 'workbook' && <WorkbookTracker kidName={selectedKid.toLowerCase()} />}
    </div>
  )
}
