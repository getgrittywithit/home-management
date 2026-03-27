'use client'

import { useState, useEffect } from 'react'
import { Sun, Backpack, Clock } from 'lucide-react'

interface CheckinData {
  checkin_time: string
  points_awarded: number
}

interface MorningCheckinCardProps {
  childName: string
}

export default function MorningCheckinCard({ childName }: MorningCheckinCardProps) {
  const kidKey = childName.toLowerCase()
  const [wake, setWake] = useState<CheckinData | null>(null)
  const [ready, setReady] = useState<CheckinData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [wakeResult, setWakeResult] = useState<{ points: number; label: string } | null>(null)
  const [readyResult, setReadyResult] = useState<{ points: number; label: string } | null>(null)

  const isEligible = ['kaylee', 'zoey'].includes(kidKey)

  useEffect(() => {
    if (!isEligible) return
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    fetch(`/api/kids/zone-tasks?action=get_morning_status&kid=${kidKey}&date=${today}`)
      .then(r => r.json())
      .then(data => {
        if (data.wake) setWake(data.wake)
        if (data.ready) setReady(data.ready)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [kidKey, isEligible])

  // Only show for Kaylee and Zoey on weekdays
  if (!isEligible) return null

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const dayOfWeek = now.getDay()
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  if (!isWeekday) return null

  const currentHour = now.getHours()
  const currentMin = now.getMinutes()
  const mins = currentHour * 60 + currentMin

  // Time windows
  const showWake = mins >= 360 && mins <= 450   // 6:00 - 7:30
  const showReady = mins >= 435 && mins <= 495   // 7:15 - 8:15

  if (!loaded) return null
  if (!showWake && !showReady && !wake && !ready) return null

  const doCheckin = async (type: 'wake' | 'ready') => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/kids/zone-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_morning_checkin', kid: kidKey, checkin_type: type })
      })
      const data = await res.json()
      if (data.success) {
        if (type === 'wake') {
          setWakeResult({ points: data.points_awarded, label: data.label })
          setWake({ checkin_time: data.checkin_time, points_awarded: data.points_awarded })
        } else {
          setReadyResult({ points: data.points_awarded, label: data.label })
          setReady({ checkin_time: data.checkin_time, points_awarded: data.points_awarded })
        }
      }
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  return (
    <div className="space-y-3">
      {/* Wake check-in card */}
      {(showWake || wake) && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-amber-900">
              Good morning, {childName}!
            </h3>
          </div>

          {wake ? (
            <div className="text-sm">
              <p className="text-amber-700">
                You checked in at <span className="font-bold">{formatTime(wake.checkin_time)}</span>
                {' — '}
                <span className={wake.points_awarded >= 4 ? 'text-green-600 font-bold' : wake.points_awarded >= 1 ? 'text-amber-600' : 'text-red-500'}>
                  {wake.points_awarded > 0 ? '+' : ''}{wake.points_awarded} points
                </span>
              </p>
              {wakeResult && <p className="text-xs text-amber-600 mt-1">{wakeResult.label}</p>}
            </div>
          ) : showWake ? (
            <div>
              <p className="text-sm text-amber-700 mb-3">Tap when you&apos;re up and moving</p>
              <button
                onClick={() => doCheckin('wake')}
                disabled={submitting}
                className="bg-amber-500 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-amber-600 active:bg-amber-700 transition-colors disabled:opacity-50 text-sm"
              >
                I&apos;m Up!
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Ready check-in card */}
      {(showReady || ready) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Backpack className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-blue-900">
              Almost time to go!
            </h3>
          </div>

          {ready ? (
            <div className="text-sm">
              <p className="text-blue-700">
                Ready at <span className="font-bold">{formatTime(ready.checkin_time)}</span>
                {' — '}
                <span className={ready.points_awarded >= 3 ? 'text-green-600 font-bold' : ready.points_awarded >= 1 ? 'text-blue-600' : 'text-red-500'}>
                  {ready.points_awarded > 0 ? '+' : ''}{ready.points_awarded} points
                </span>
              </p>
              {readyResult && <p className="text-xs text-blue-600 mt-1">{readyResult.label}</p>}
            </div>
          ) : showReady ? (
            <div>
              <p className="text-sm text-blue-700 mb-1">Dressed, shoes on, backpack ready?</p>
              <p className="text-xs text-blue-500 mb-3">
                <Clock className="w-3 h-3 inline mr-1" />
                Bus: 7:45 &middot; Drive: 8:00
              </p>
              <button
                onClick={() => doCheckin('ready')}
                disabled={submitting}
                className="bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                I&apos;m Ready!
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function formatTime(time: string): string {
  if (!time) return ''
  const parts = time.split(':')
  let h = parseInt(parts[0])
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}
