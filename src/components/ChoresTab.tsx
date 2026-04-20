'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Sparkles, ChevronDown, ChevronUp, CheckCircle2, Circle, Camera, Check, RotateCcw, Filter } from 'lucide-react'
import {
  DAILY_FOCUS,
  MONTHLY_HABITS
} from '@/lib/choresConfig'
import { getCurrentZoneAssignments, getCurrentZoneWeek, getCurrentZoneWeekRange, type ZoneName } from '@/lib/zoneRotation'
import VacationCoverageCard from './VacationCoverageCard'

const ZONE_COLORS: Record<ZoneName, string> = {
  'Kitchen': 'bg-amber-100 text-amber-800',
  'Hotspot': 'bg-red-100 text-red-800',
  'Pantry': 'bg-emerald-100 text-emerald-800',
  'Floors': 'bg-orange-100 text-orange-800',
  'Kids Bathroom': 'bg-purple-100 text-purple-800',
  'Guest Bathroom': 'bg-indigo-100 text-indigo-800',
}

interface ZoneProgress {
  kid: string
  zone: ZoneName
  total: number
  completed: number
  tasks: { task_text: string; completed: boolean }[]
}

interface ChoresTabProps {
  familyMembers?: { name: string; age: number; role: 'parent' | 'child' }[]
  isParent?: boolean
}

interface PhotoSubmission {
  id: string
  kid_name: string
  zone_name: string
  photo_url: string
  submitted_at: string
  status: string
  parent_note: string | null
  reviewed_at: string | null
}

export default function ChoresTab({ familyMembers = [], isParent = true }: ChoresTabProps) {
  const [progress, setProgress] = useState<ZoneProgress[]>([])
  const [expandedKid, setExpandedKid] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Photo gallery state
  const [photos, setPhotos] = useState<PhotoSubmission[]>([])
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const [photoFilter, setPhotoFilter] = useState<'pending' | 'approved' | 'all'>('pending')
  const [photoTotal, setPhotoTotal] = useState(0)
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const zoneWeek = getCurrentZoneWeek()
  const { start, end } = getCurrentZoneWeekRange()
  const assignments = getCurrentZoneAssignments()
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const getDayName = (day: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
  const getCurrentMonthHabit = () => MONTHLY_HABITS.find(h => h.month === new Date().getMonth() + 1)

  // Zone key mapping from display names to DB zone_keys
  const ZONE_DB_KEY: Record<string, string> = {
    'Kitchen': 'kitchen_zone',
    'Hotspot': 'hotspot',
    'Pantry': 'pantry',
    'Floors': 'floors',
    'Kids Bathroom': 'kids_bathroom',
    'Guest Bathroom': 'guest_bathroom',
  }

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const fetches = assignments.map(({ kid, zone }) => {
      const zoneKey = ZONE_DB_KEY[zone] || zone.toLowerCase().replace(/\s+/g, '_')
      return fetch(`/api/kids/zone-tasks?action=get_zone_tasks&zone=${zoneKey}&kid=${kid.toLowerCase()}&date=${today}`)
        .then(r => r.json())
        .then(data => ({
          kid,
          zone,
          total: data.total || 0,
          completed: data.completed_count || 0,
          tasks: (data.tasks || []).map((t: any) => ({ task_text: t.task_text, completed: t.completed })),
        }))
        .catch(() => ({ kid, zone, total: 0, completed: 0, tasks: [] }))
    })

    Promise.all(fetches).then(results => {
      setProgress(results)
      setLoaded(true)
    })
  }, [])

  // Fetch zone photos
  const loadPhotos = (filter: 'pending' | 'approved' | 'all') => {
    setPhotosLoaded(false)
    const statusParam = filter === 'all' ? '' : `&status=${filter}`
    fetch(`/api/parent/zone-photos?action=get_history${statusParam}&limit=20`)
      .then(r => r.json())
      .then(data => {
        setPhotos(data.submissions || [])
        setPhotoTotal(data.total || 0)
        setPhotosLoaded(true)
      })
      .catch(() => setPhotosLoaded(true))
  }

  useEffect(() => { if (isParent) loadPhotos(photoFilter) }, [photoFilter])

  const handleApprove = async (id: string) => {
    setReviewingId(id)
    await fetch('/api/parent/zone-photos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', submission_id: id }),
    }).catch(() => {})
    setReviewingId(null)
    loadPhotos(photoFilter)
  }

  const handleRedo = async (id: string, note: string) => {
    setReviewingId(id)
    await fetch('/api/parent/zone-photos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_redo', submission_id: id, parent_note: note || 'Please redo this area' }),
    }).catch(() => {})
    setReviewingId(null)
    loadPhotos(photoFilter)
  }

  const getStatus = (p: ZoneProgress) => {
    if (p.total === 0) return { label: 'No Tasks', color: 'text-gray-400', icon: '—' }
    if (p.completed === p.total) return { label: 'Done', color: 'text-green-600', icon: '✅' }
    if (p.completed > 0) return { label: 'In Progress', color: 'text-amber-600', icon: '🔄' }
    return { label: 'Not Started', color: 'text-gray-400', icon: '⏳' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Family Chore System</h2>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{getDayName(new Date().getDay())}&apos;s Focus: {DAILY_FOCUS[getDayName(new Date().getDay()).toLowerCase() as keyof typeof DAILY_FOCUS]}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Monthly Habit: {getCurrentMonthHabit()?.habit}</span>
          </div>
        </div>
        <p className="text-purple-200 text-sm mt-2">Week {zoneWeek} of 6 &middot; {formatDate(start)} – {formatDate(end)}</p>
      </div>

      {/* Zone Status Board */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-bold text-gray-900">Zone Status Board</h3>
          <p className="text-xs text-gray-500 mt-0.5">Tap a row to see task details</p>
        </div>

        {!loaded ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
          </div>
        ) : (
          <div className="divide-y">
            {progress.map(p => {
              const status = getStatus(p)
              const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
              const isExpanded = expandedKid === p.kid

              return (
                <div key={p.kid}>
                  <button
                    onClick={() => setExpandedKid(isExpanded ? null : p.kid)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-sm text-gray-900 w-20 text-left">{p.kid}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ZONE_COLORS[p.zone] || 'bg-gray-100 text-gray-700'}`}>
                      {p.zone}
                    </span>
                    <div className="flex-1 mx-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                    <span className={`text-xs font-medium w-24 text-right ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {/* Expandable task detail (read-only) */}
                  {isExpanded && (
                    <div className="px-4 pb-3 bg-gray-50">
                      <div className="pl-20 space-y-1">
                        {p.tasks.length > 0 ? (
                          p.tasks.map((t, i) => (
                            <div key={i} className="flex items-center gap-2 py-0.5">
                              {t.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                              )}
                              <span className={`text-xs ${t.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                {t.task_text}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 italic py-1">
                            No tasks set for {p.zone} today.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Zone Photo Gallery — Parents Only */}
      {isParent && <VacationCoverageCard />}

      {isParent && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-gray-900">Zone Photos</h3>
              {photoTotal > 0 && <span className="text-xs text-gray-500">({photoTotal} total)</span>}
            </div>
            <div className="flex gap-1">
              {(['pending', 'approved', 'all'] as const).map(f => (
                <button key={f} onClick={() => setPhotoFilter(f)}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${photoFilter === f ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f === 'pending' ? '⏳ Pending' : f === 'approved' ? '✅ Approved' : '📋 All'}
                </button>
              ))}
            </div>
          </div>

          {!photosLoaded ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : photos.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              {photoFilter === 'pending' ? 'No photos waiting for review' : 'No zone photos yet'}
            </div>
          ) : (
            <div className="divide-y">
              {photos.map(photo => {
                const isExpanded = expandedPhoto === photo.id
                const kidDisplay = photo.kid_name.charAt(0).toUpperCase() + photo.kid_name.slice(1)
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(photo.submitted_at).getTime()
                  const mins = Math.floor(diff / 60000)
                  if (mins < 60) return `${mins}m ago`
                  const hrs = Math.floor(mins / 60)
                  if (hrs < 24) return `${hrs}h ago`
                  return `${Math.floor(hrs / 24)}d ago`
                })()

                return (
                  <div key={photo.id} className="px-4 py-3">
                    <button onClick={() => setExpandedPhoto(isExpanded ? null : photo.id)}
                      className="w-full flex items-center gap-3 text-left">
                      <span className="text-sm font-medium text-gray-900 w-16">{kidDisplay}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{photo.zone_name}</span>
                      <span className="flex-1" />
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        photo.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        photo.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {photo.status === 'pending' ? '⏳ Pending' : photo.status === 'approved' ? '✅ Approved' : '🔄 Redo'}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        {/* Photo */}
                        {photo.photo_url && (
                          <div className="rounded-lg overflow-hidden border max-w-sm">
                            <img src={photo.photo_url} alt={`${kidDisplay}'s ${photo.zone_name} zone`}
                              className="w-full h-auto max-h-64 object-cover" />
                          </div>
                        )}
                        {/* Parent note (if redo) */}
                        {photo.parent_note && (
                          <p className="text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                            <span className="font-medium">Your note:</span> {photo.parent_note}
                          </p>
                        )}
                        {/* Review buttons (pending only) */}
                        {photo.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(photo.id)}
                              disabled={reviewingId === photo.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 disabled:opacity-50">
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => {
                              const note = window.prompt('Note for the kid (optional):')
                              if (note !== null) handleRedo(photo.id, note)
                            }}
                              disabled={reviewingId === photo.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 disabled:opacity-50">
                              <RotateCcw className="w-3.5 h-3.5" /> Redo
                            </button>
                          </div>
                        )}
                        {photo.reviewed_at && (
                          <p className="text-xs text-gray-400">
                            Reviewed {new Date(photo.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
