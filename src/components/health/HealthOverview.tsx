'use client'

import { useState } from 'react'

interface HealthOverviewProps {
  kidRequests: any[]
  onUpdateRequest: (id: number, status: string, response: string) => Promise<void>
  themeColor: string
}

const categoryLabels: Record<string, string> = {
  head: '🤕 Head / Headache', stomach: '🤢 Stomach', skin: '🩹 Skin / Rash',
  eyes: '👁️ Eyes / Vision', teeth: '🦷 Teeth / Mouth', ears: '👂 Ears',
  sick: '🤒 Feeling Sick', injury: '🩼 Hurt / Injury', checkup: '✅ Just Need a Checkup',
  other: '❓ Something Else'
}
const severityLabels: Record<string, string> = { mild: '😊 Not bad', medium: '😐 Medium', severe: '😟 Really bothering me' }
const durationLabels: Record<string, string> = { today: 'Today', few_days: 'A few days', week: 'About a week', awhile: 'A while now' }

export default function HealthOverview({ kidRequests, onUpdateRequest, themeColor }: HealthOverviewProps) {
  return (
    <div className="space-y-4">
      {kidRequests.length === 0 ? (
        <div className="bg-white rounded-lg p-8 shadow-sm border text-center text-gray-400">
          No health requests from kids yet.
        </div>
      ) : (
        kidRequests.map(req => {
          const isPending = req.status === 'pending'
          return (
            <div key={req.id} className={`bg-white rounded-lg p-5 shadow-sm border ${isPending ? 'border-amber-300' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {req.child_name.charAt(0).toUpperCase() + req.child_name.slice(1)}
                  </div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {categoryLabels[req.category] || req.category}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                  req.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  req.status === 'handled' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {req.status === 'pending' ? 'Pending' : req.status === 'scheduled' ? 'Appointment Scheduled' : req.status === 'handled' ? 'Handled at Home' : 'Dismissed'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-500">Severity</div>
                  <div>{severityLabels[req.severity] || req.severity}</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-500">Duration</div>
                  <div>{durationLabels[req.duration] || req.duration}</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-500">Submitted</div>
                  <div>{new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
              </div>

              {req.notes && (
                <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 mb-3">
                  <span className="font-medium">Kid says:</span> {req.notes}
                </div>
              )}

              {req.parent_response && (
                <div className="text-sm text-teal-700 bg-teal-50 rounded p-2 mb-3">
                  <span className="font-medium">Your response:</span> {req.parent_response}
                </div>
              )}

              {isPending && (
                <KidRequestActions
                  requestId={req.id}
                  onUpdate={(status, response) => onUpdateRequest(req.id, status, response)}
                  themeColor={themeColor}
                />
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function KidRequestActions({ requestId, onUpdate, themeColor }: { requestId: number; onUpdate: (status: string, response: string) => void; themeColor: string }) {
  const [response, setResponse] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAction = async (status: string) => {
    setSaving(true)
    await onUpdate(status, response)
    setSaving(false)
  }

  return (
    <div className="border-t pt-3 mt-3 space-y-2">
      <input
        type="text"
        value={response}
        onChange={e => setResponse(e.target.value)}
        placeholder="Optional note back to kid..."
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="flex gap-2">
        <button onClick={() => handleAction('scheduled')} disabled={saving}
          className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition disabled:opacity-50">
          Appointment Scheduled
        </button>
        <button onClick={() => handleAction('handled')} disabled={saving}
          className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition disabled:opacity-50">
          Handled at Home
        </button>
        <button onClick={() => handleAction('dismissed')} disabled={saving}
          className="flex-1 bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-500 transition disabled:opacity-50">
          Dismiss
        </button>
      </div>
    </div>
  )
}
