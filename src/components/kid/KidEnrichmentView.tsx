'use client'

import { useState, useEffect } from 'react'
import { Loader2, Play, Check, Star, X } from 'lucide-react'
import SpeakerButton from '../SpeakerButton'

// Subjects must match the seeded enrichment_activities library. Do not invent new ones —
// if a chip doesn't exist in the library, it will always show "no activities".
const CATEGORIES = [
  { value: '', label: 'All', emoji: '✨' },
  { value: 'elar', label: 'Reading', emoji: '📚' },
  { value: 'math', label: 'Math', emoji: '🔢' },
  { value: 'science', label: 'Science', emoji: '🔬' },
  { value: 'social_studies', label: 'History', emoji: '🌍' },
  { value: 'financial_literacy', label: 'Money', emoji: '💰' },
  { value: 'art', label: 'Art', emoji: '🎨' },
  { value: 'pe_outdoor', label: 'PE / Outdoor', emoji: '🏃' },
  { value: 'life_skills', label: 'Life Skills', emoji: '🏠' },
]

interface Activity {
  id: string
  title: string
  description: string
  subject: string
  duration_min: number
  gem_reward?: number
  grade_min?: number | null
  grade_max?: number | null
}

interface Props {
  kidName: string
}

export default function KidEnrichmentView({ kidName }: Props) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [completing, setCompleting] = useState(false)
  const [justCompleted, setJustCompleted] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams({ action: 'get_activities', kid_name: kidName })
    if (filter) qs.set('subject', filter)
    fetch(`/api/enrichment?${qs.toString()}`)
      .then(r => r.json())
      .then(d => setActivities(d.activities || []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false))
  }, [kidName, filter])

  // Server already filters by subject + kid grade; nothing more to do client-side.
  const filtered = activities

  const handleFinish = async (activity: Activity) => {
    setCompleting(true)
    try {
      // Canonical: one write into kid_activity_log (activity_source='enrichment', source_id=activity.id).
      // The route also awards gems and records a gem_transaction — no other side-writes needed.
      await fetch('/api/enrichment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_activity',
          kid_name: kidName,
          activity_id: activity.id,
          title: activity.title,
          subject: activity.subject,
          duration_minutes: activity.duration_min,
        }),
      })

      // Award star
      await fetch('/api/digi-pet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'award_stars', kid_name: kidName, amount: 1, source: 'enrichment',
        }),
      }).catch(() => {})

      // Notify parent
      await fetch('/api/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: `${kidName.charAt(0).toUpperCase() + kidName.slice(1)} finished an enrichment activity`,
          message: activity.title,
          source_type: 'activity_logged',
          source_ref: `enrichment-${kidName}-${activity.id}-${Date.now()}`,
          icon: '✨',
        }),
      }).catch(() => {})

      setJustCompleted(activity.id)
      setSelectedActivity(null)
      setTimeout(() => setJustCompleted(null), 3000)
    } finally { setCompleting(false) }
  }

  const cap = kidName.charAt(0).toUpperCase() + kidName.slice(1)

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {justCompleted && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 flex items-center gap-2">
          <Star className="w-4 h-4" /> Nice work! Starred
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl p-5">
        <h2 className="text-xl font-bold">What sounds fun today, {cap}?</h2>
        <p className="text-purple-100 text-sm mt-1">Pick something you want to try. Finish it to earn a star!</p>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === c.value
                ? 'bg-purple-600 text-white shadow'
                : 'bg-white text-gray-700 border hover:bg-purple-50'
            }`}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Activity grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500">No activities in this category right now.</p>
          <p className="text-sm text-gray-400 mt-1">Try another type!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.slice(0, 24).map(activity => {
            const catInfo = CATEGORIES.find(c => c.value === activity.subject) || CATEGORIES[0]
            const done = justCompleted === activity.id
            return (
              <div key={activity.id}
                className={`bg-white rounded-xl border p-4 transition-shadow ${done ? 'border-emerald-300 bg-emerald-50' : 'hover:shadow-md'}`}>
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{catInfo.emoji}</span>
                  {activity.duration_min > 0 && (
                    <span className="text-xs text-gray-400">{activity.duration_min} min</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-800 mt-2 text-sm">{activity.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{activity.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <SpeakerButton steps={[activity.description]} size="sm" rate={0.9} />
                  {done ? (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Done!
                    </span>
                  ) : (
                    <button onClick={() => setSelectedActivity(activity)}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 flex items-center gap-1">
                      <Play className="w-3 h-3" /> Start
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Activity detail modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedActivity(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{selectedActivity.title}</h3>
              <button onClick={() => setSelectedActivity(null)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-700">{selectedActivity.description}</p>
              {selectedActivity.duration_min > 0 && (
                <p className="text-xs text-gray-500">About {selectedActivity.duration_min} minutes</p>
              )}
              <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
                <Star className="w-3.5 h-3.5" /> You will earn 1 star when you finish!
              </div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg">Not now</button>
              <button onClick={() => handleFinish(selectedActivity)} disabled={completing}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
                {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                I finished!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
