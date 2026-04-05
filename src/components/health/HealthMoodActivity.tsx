'use client'

import MoodHistoryCard from '../MoodHistoryCard'
import MedMoodTimeline from './MedMoodTimeline'

export default function HealthMoodActivity() {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Activity &amp; Mood Overview</h3>

      {/* Med-Mood Correlation Timeline (MED-MOOD-1) */}
      <MedMoodTimeline />

      {/* Mood Check-In History */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-xl font-bold mb-4">Mood Check-In History</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['Amos', 'Ellie', 'Wyatt', 'Hannah', 'Zoey', 'Kaylee'].map(kid => (
            <MoodHistoryCard key={kid} childName={kid} />
          ))}
        </div>
      </div>
    </div>
  )
}
