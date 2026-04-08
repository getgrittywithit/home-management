'use client'

import { useState, useEffect } from 'react'
import { DollarSign, ChevronRight, Lock, CheckCircle2, Star, Camera, Send } from 'lucide-react'

interface FinancialProgress {
  kid_name: string
  current_level: number
  level_1_complete: boolean
  level_2_complete: boolean
  level_3_complete: boolean
  level_4_complete: boolean
  level_5_complete: boolean
  level_6_complete: boolean
}

interface Activity {
  id: string
  title: string
  description: string
  duration_min: number
  materials: string[]
  financial_level: number
}

interface FinancialLiteracyPanelProps {
  kidName: string
  isParent?: boolean
  onStarEarned?: (amount: number, source: string) => void
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Coin Identification',
  2: 'Making Change',
  3: 'Dollar Bills & Budgeting',
  4: 'Sales & Percentages',
  5: 'Savings & Banking',
  6: 'Adult Real-World Costs',
}

const LEVEL_ICONS: Record<number, string> = {
  1: '🪙',
  2: '💰',
  3: '💵',
  4: '🏷️',
  5: '🏦',
  6: '🏠',
}

export default function FinancialLiteracyPanel({ kidName, isParent, onStarEarned }: FinancialLiteracyPanelProps) {
  const [progress, setProgress] = useState<FinancialProgress | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [expanding, setExpanding] = useState(false)
  const [advanceLoading, setAdvanceLoading] = useState(false)
  const [completions, setCompletions] = useState<Record<string, boolean>>({})
  const [showWork, setShowWork] = useState<string | null>(null)
  const [workText, setWorkText] = useState('')
  const [workPhotos, setWorkPhotos] = useState<string[]>([])
  const [submittingWork, setSubmittingWork] = useState(false)

  const kid = kidName.toLowerCase()

  useEffect(() => {
    const load = async () => {
      try {
        // Get level from new financial-literacy API (defaults to 1)
        const compRes = await fetch(`/api/financial-literacy?action=get_progress&kid_name=${kid}`)
        const compJson = await compRes.json()
        const currentLevel = compJson.current_level || 1

        // Get activities for the CORRECT level (pass level explicitly)
        const res = await fetch(`/api/homeschool?action=get_financial_level&kid_name=${kid}&level=${currentLevel}`)
        const json = await res.json()
        // Override the level from the new API (source of truth)
        setProgress({ ...(json.progress || {}), kid_name: kid, current_level: currentLevel } as any)
        setActivities(json.activities || [])

        // Map completions
        const compMap: Record<string, boolean> = {}
        for (const a of (compJson.activities || [])) compMap[a.activity_id] = true
        setCompletions(compMap)
      } catch (err) {
        console.error('Failed to load financial literacy:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [kid])

  const handleCompleteActivity = async (activityId: string) => {
    if (!workText.trim() && workPhotos.length === 0) return // require evidence
    setSubmittingWork(true)
    try {
      await fetch('/api/financial-literacy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_activity', kid_name: kid, level: progress?.current_level || 1, activity_id: activityId, answer_text: workText.trim() || null, photos: workPhotos }),
      })
      setCompletions(prev => ({ ...prev, [activityId]: true }))
      setShowWork(null)
      setWorkText('')
      setWorkPhotos([])
      onStarEarned?.(3, 'financial_literacy')
    } catch { /* ignore */ }
    setSubmittingWork(false)
  }

  const handleAddWorkPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || workPhotos.length >= 3) return
    const reader = new FileReader()
    reader.onload = () => { if (reader.result) setWorkPhotos(prev => [...prev, reader.result as string]) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const completedCount = activities.filter(a => completions[a.id]).length
  const allComplete = activities.length > 0 && completedCount === activities.length

  const handleAdvanceLevel = async () => {
    if (!progress) return
    setAdvanceLoading(true)
    try {
      const res = await fetch('/api/homeschool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance_financial_level', kid_name: kid }),
      })
      const json = await res.json()
      if (json.progress) {
        setProgress(json.progress)
        // Award stars for level up
        await fetch('/api/digi-pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'award_task_stars',
            kid_name: kid,
            task_type: 'financial_level_up',
            source_ref: `fin-levelup-${kid}-${json.progress.current_level}-${Date.now()}`,
          }),
        })
        onStarEarned?.(10, 'financial_level_up')
        // Reload activities for new level
        const actRes = await fetch(`/api/homeschool?action=get_financial_level&kid_name=${kid}`)
        const actJson = await actRes.json()
        setActivities(actJson.activities || [])
      }
    } catch (err) {
      console.error('Failed to advance level:', err)
    } finally {
      setAdvanceLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-center text-gray-500 text-sm">
        Loading financial literacy...
      </div>
    )
  }

  if (!progress) return null

  const currentLevel = progress.current_level
  const levelName = LEVEL_NAMES[currentLevel] || `Level ${currentLevel}`
  const levelIcon = LEVEL_ICONS[currentLevel] || '💲'

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header with level badge */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{levelIcon}</div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {kidName} — Financial Literacy
              </h3>
              <p className="text-sm text-emerald-100">
                Level {currentLevel} — {levelName}
              </p>
            </div>
          </div>
          {isParent && currentLevel < 6 && (
            <button
              onClick={handleAdvanceLevel}
              disabled={advanceLoading || !allComplete}
              title={!allComplete ? `Complete all activities first (${completedCount}/${activities.length})` : ''}
              className="bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              {advanceLoading ? 'Advancing...' : !allComplete ? `${completedCount}/${activities.length} done` : 'Advance Level'}
            </button>
          )}
        </div>

        {/* Level progress dots */}
        <div className="flex gap-2 mt-3">
          {[1, 2, 3, 4, 5, 6].map((lvl) => {
            const isComplete = (progress as any)[`level_${lvl}_complete`]
            const isCurrent = lvl === currentLevel
            const isLocked = lvl > currentLevel

            return (
              <div
                key={lvl}
                className={`flex-1 h-2 rounded-full ${
                  isComplete
                    ? 'bg-yellow-300'
                    : isCurrent
                    ? 'bg-white/60'
                    : 'bg-white/20'
                }`}
                title={`Level ${lvl}: ${LEVEL_NAMES[lvl]}${isComplete ? ' (Complete)' : isCurrent ? ' (Current)' : ' (Locked)'}`}
              />
            )
          })}
        </div>
      </div>

      {/* Level map */}
      <div className="p-4">
        <button
          onClick={() => setExpanding(!expanding)}
          className="text-sm text-gray-600 hover:text-gray-800 mb-3 flex items-center gap-1"
        >
          {expanding ? 'Hide' : 'Show'} all levels
          <ChevronRight className={`w-3 h-3 transition-transform ${expanding ? 'rotate-90' : ''}`} />
        </button>

        {expanding && (
          <div className="space-y-2 mb-4">
            {[1, 2, 3, 4, 5, 6].map((lvl) => {
              const isComplete = (progress as any)[`level_${lvl}_complete`]
              const isCurrent = lvl === currentLevel
              const isLocked = lvl > currentLevel

              return (
                <div
                  key={lvl}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isCurrent
                      ? 'bg-emerald-50 border border-emerald-200'
                      : isComplete
                      ? 'bg-gray-50'
                      : 'opacity-50'
                  }`}
                >
                  <span className="text-xl">{LEVEL_ICONS[lvl]}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Level {lvl}: {LEVEL_NAMES[lvl]}</div>
                  </div>
                  {isComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {isCurrent && <Star className="w-4 h-4 text-yellow-500" />}
                  {isLocked && <Lock className="w-4 h-4 text-gray-300" />}
                </div>
              )
            })}
          </div>
        )}

        {/* Current level activities */}
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          {levelIcon} Level {currentLevel} Activities
        </h4>
        <div className="space-y-2">
          {activities.map((activity) => {
            const isDone = completions[activity.id]
            const isExpanded = showWork === activity.id
            return (
              <div key={activity.id}
                className={`rounded-lg border p-3 transition-colors ${isDone ? 'border-green-200 bg-green-50/50' : 'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm text-gray-900 flex items-center gap-1.5">
                      {isDone && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {activity.title}
                    </h5>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                      <span>~{activity.duration_min} min</span>
                      {activity.materials.length > 0 && <span>Need: {activity.materials.slice(0, 3).join(', ')}</span>}
                      {isDone && <span className="text-green-600 font-medium">+3 gems</span>}
                    </div>
                  </div>
                  {!isDone && !isParent && (
                    <button onClick={() => { setShowWork(isExpanded ? null : activity.id); setWorkText(''); setWorkPhotos([]) }}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 rounded hover:bg-emerald-50">
                      {isExpanded ? 'Cancel' : 'Show My Work'}
                    </button>
                  )}
                </div>
                {/* Show My Work form */}
                {isExpanded && !isDone && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <textarea value={workText} onChange={e => setWorkText(e.target.value)}
                      placeholder="Describe what you did or learned..."
                      rows={2} className="w-full border rounded px-2 py-1.5 text-sm resize-none" />
                    <div className="flex items-center gap-2">
                      {workPhotos.map((p, i) => (
                        <div key={i} className="w-12 h-12 rounded border overflow-hidden">
                          <img src={p} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {workPhotos.length < 3 && (
                        <label className="flex items-center gap-1 px-2 py-1 rounded border border-dashed text-xs text-gray-500 cursor-pointer hover:border-emerald-300">
                          <Camera className="w-3 h-3" /> Photo
                          <input type="file" accept="image/*" capture="environment" onChange={handleAddWorkPhoto} className="hidden" />
                        </label>
                      )}
                    </div>
                    <button onClick={() => handleCompleteActivity(activity.id)}
                      disabled={submittingWork || (!workText.trim() && workPhotos.length === 0)}
                      className="w-full bg-emerald-500 text-white py-1.5 rounded text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-1">
                      <Send className="w-3 h-3" /> {submittingWork ? 'Saving...' : 'Mark Complete (+3 gems)'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          {activities.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No activities found for this level.
            </p>
          )}
        </div>

        {currentLevel < 6 && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            Complete these activities, then {isParent ? 'tap Advance Level' : 'ask Mom'} to move to Level {currentLevel + 1}! (+10 gems)
          </p>
        )}
        {currentLevel >= 6 && (
          <p className="text-xs text-emerald-600 mt-3 text-center font-medium">
            Max level reached! Keep practicing real-world money skills.
          </p>
        )}
      </div>
    </div>
  )
}
