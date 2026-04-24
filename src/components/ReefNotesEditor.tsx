'use client'

import { useState, useEffect } from 'react'
import { X, Save, ExternalLink, AlertTriangle, Calendar, Home } from 'lucide-react'
import { parseDateLocal } from '@/lib/date-local'

interface Props {
  weekStart: string
  onClose: () => void
  onSaveAndPrint: () => void
}

export default function ReefNotesEditor({ weekStart, onClose, onSaveAndPrint }: Props) {
  const [testing, setTesting] = useState('')
  const [events, setEvents] = useState('')
  const [rhythms, setRhythms] = useState('')
  const [autoTesting, setAutoTesting] = useState<any[]>([])
  const [autoEvents, setAutoEvents] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/print-center/reef-notes?week_start=${weekStart}`)
      .then(r => r.json()).then(d => {
        setTesting(d.testing_notes || '')
        setEvents(d.events_notes || '')
        setRhythms(d.rhythms_notes || '')
      }).catch(() => {})

    fetch(`/api/print-center/week-at-a-glance?week_start=${weekStart}`)
      .then(r => r.json()).then(d => {
        setAutoTesting(d.testing_events || [])
        setAutoEvents(d.week_events || [])
      }).catch(() => {})
  }, [weekStart])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/print-center/reef-notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart, testing_notes: testing, events_notes: events, rhythms_notes: rhythms }),
    }).catch(() => {})
    setSaving(false)
    onSaveAndPrint()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h3 className="font-semibold text-gray-900">Reef Notes — Week of {parseDateLocal(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-pink-700 flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Testing — Do NOT Be Late
            </h4>
            {autoTesting.length > 0 && (
              <div className="bg-pink-50 rounded-lg p-2 mb-2 text-xs text-pink-800">
                <p className="font-medium mb-1">Auto-pulled:</p>
                {autoTesting.map((e: any, i: number) => (
                  <p key={i}>{new Date(e.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} — {e.title}</p>
                ))}
              </div>
            )}
            <textarea value={testing} onChange={e => setTesting(e.target.value)} rows={2}
              placeholder="Add testing notes (e.g., 'Zoey needs calculator for EOC')"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <h4 className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5" /> This Week&apos;s Events
            </h4>
            {autoEvents.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-2 mb-2 text-xs text-blue-800 max-h-24 overflow-y-auto">
                {autoEvents.slice(0, 8).map((e: any, i: number) => (
                  <p key={i}>{new Date(e.start_time).toLocaleDateString('en-US', { weekday: 'short' })} — {e.title}</p>
                ))}
              </div>
            )}
            <textarea value={events} onChange={e => setEvents(e.target.value)} rows={2}
              placeholder="Add events (e.g., 'Zoey ColorGuard practice Wed 4pm')"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <h4 className="text-xs font-semibold text-purple-700 flex items-center gap-1 mb-1">
              <Home className="w-3.5 h-3.5" /> Upcoming & Rhythms
            </h4>
            <textarea value={rhythms} onChange={e => setRhythms(e.target.value)} rows={2}
              placeholder="Special notes (e.g., 'Donna visiting Apr 24-27')"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t p-3 flex gap-2">
          <button onClick={onClose} className="flex-1 text-sm text-gray-500 py-2">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-teal-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save & Print'}
          </button>
        </div>
      </div>
    </div>
  )
}
