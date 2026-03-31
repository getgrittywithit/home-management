'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Clock, Users, MapPin, Check, X } from 'lucide-react'

interface EnrichmentActivity {
  id: string
  title: string
  description: string
  subject: string
  duration_min: number
  location: string
  solo_or_group: string
  min_players: number
  max_players: number
  materials: string[]
  accessibility_conflicts: string[]
}

interface EnrichmentCardProps {
  kidName: string
  subject: string
  onStarEarned?: (amount: number, source: string) => void
}

export default function EnrichmentCard({ kidName, subject, onStarEarned }: EnrichmentCardProps) {
  const [activities, setActivities] = useState<EnrichmentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [picked, setPicked] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/homeschool?action=get_enrichment_options&kid_name=${kidName}&subject=${subject}`
      )
      const json = await res.json()
      setActivities(json.activities || [])
    } catch (err) {
      console.error('Failed to load enrichment options:', err)
    } finally {
      setLoading(false)
    }
  }, [kidName, subject])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const handlePick = async (activityId: string) => {
    setPicked(activityId)
    try {
      await fetch('/api/homeschool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_enrichment_pick',
          kid_name: kidName,
          activity_id: activityId,
        }),
      })
    } catch (err) {
      console.error('Failed to log pick:', err)
    }
  }

  const handleComplete = async () => {
    if (!picked) return
    setCompleted(true)
    try {
      await fetch('/api/homeschool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_enrichment_complete',
          kid_name: kidName,
          activity_id: picked,
        }),
      })
      // Award star
      await fetch('/api/digi-pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'award_task_stars',
          kid_name: kidName.toLowerCase(),
          task_type: 'enrichment_complete',
          source_ref: `enrichment-${picked}-${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })}`,
        }),
      })
      onStarEarned?.(1, 'enrichment')
    } catch (err) {
      console.error('Failed to log completion:', err)
    }
  }

  if (dismissed || loading) return null
  if (activities.length === 0) return null

  const selectedActivity = activities.find((a) => a.id === picked)

  const locationIcon = (loc: string) => {
    switch (loc) {
      case 'indoor': return '🏠'
      case 'outdoor': return '🌳'
      default: return '📍'
    }
  }

  const groupIcon = (g: string) => {
    switch (g) {
      case 'solo': return '🙋'
      case 'partner': return '👫'
      case 'group': return '👨‍👩‍👧‍👦'
      default: return '🎯'
    }
  }

  // Picked view — show selected activity details + mark complete
  if (picked && selectedActivity) {
    return (
      <div className="mt-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-green-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {completed ? 'Nice work!' : 'You picked:'}
          </h3>
          {completed && (
            <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
              +1 Star
            </span>
          )}
        </div>

        <div className="bg-white rounded-lg p-3 border border-green-100">
          <h4 className="font-medium text-gray-900">{selectedActivity.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{selectedActivity.description}</p>
          <div className="flex gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {selectedActivity.duration_min} min
            </span>
            <span>{locationIcon(selectedActivity.location)} {selectedActivity.location}</span>
            <span>{groupIcon(selectedActivity.solo_or_group)} {selectedActivity.solo_or_group}</span>
          </div>
          {selectedActivity.materials.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Need: {selectedActivity.materials.join(', ')}
            </p>
          )}
        </div>

        {!completed && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleComplete}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Done!
            </button>
            <button
              onClick={() => { setPicked(null); setDismissed(true) }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Never mind
            </button>
          </div>
        )}
      </div>
    )
  }

  // Default view — show 3 options
  return (
    <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-blue-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Nice work! Want to keep going?
        </h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-blue-600 mb-3">Here are 3 ideas for your free time today:</p>

      <div className="space-y-2">
        {activities.map((activity) => (
          <button
            key={activity.id}
            onClick={() => handlePick(activity.id)}
            className="w-full text-left bg-white rounded-lg p-3 border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm">{activity.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{activity.description}</p>
              </div>
              <div className="flex gap-2 text-xs text-gray-400 ml-2 shrink-0">
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {activity.duration_min}m
                </span>
                <span>{locationIcon(activity.location)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white"
      >
        Maybe later — I'm done for now
      </button>
    </div>
  )
}
