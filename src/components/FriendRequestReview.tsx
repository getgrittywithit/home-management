'use client'

import { useState, useEffect } from 'react'
import {
  UserPlus, MapPin, Phone, Mail, Users, Calendar, CheckCircle2,
  XCircle, HelpCircle, Loader2, ExternalLink, Clock, Car,
} from 'lucide-react'

type FriendRequest = {
  id: string; kid_name: string; friend_name: string; visit_type: string
  start_date: string; start_time: string | null; end_date: string | null
  end_time: string | null; return_date: string | null
  location_type: string | null; address: string | null; gate_code: string | null
  has_wifi: boolean | null; activities: string[]; plan_details: string | null
  special_event: string | null; leaving_house: boolean | null; leaving_where: string | null
  ride_there: string | null; ride_home: string | null; ride_other_who: string | null
  travel_details: string | null; destination: string | null; siblings_present: string | null
  notes: string | null; status: string; parent_note: string | null
  parent1_name: string | null; parent1_phone: string | null
  parent2_name: string | null; profile_address: string | null
  created_at: string
}

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
const fmtDate = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  denied: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
  questions: { label: 'Questions sent', color: 'bg-blue-100 text-blue-700', icon: <HelpCircle className="w-3.5 h-3.5" /> },
}

const VISIT_LABELS: Record<string, string> = {
  hangout: 'Hangout', sleepover: 'Sleepover', weekend: 'Weekend Stay', extended: 'Extended Stay',
}

export default function FriendRequestReview() {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [respondAction, setRespondAction] = useState<'approved' | 'denied' | 'questions'>('approved')
  const [parentNote, setParentNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/friends?action=list_requests')
      const data = await res.json()
      setRequests(data.requests || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleRespond(id: string) {
    setSubmitting(true)
    await fetch('/api/friends', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'respond', id, status: respondAction, parent_note: parentNote || null }),
    }).catch(() => {})
    setRespondingId(null)
    setParentNote('')
    flash(respondAction === 'approved' ? 'Approved!' : respondAction === 'denied' ? 'Denied' : 'Questions sent')
    setSubmitting(false)
    load()
  }

  const pending = requests.filter(r => r.status === 'pending')
  const past = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-indigo-500" /> Friend Requests
      </h3>

      {loading && <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>}

      {!loading && requests.length === 0 && (
        <div className="bg-white rounded-lg border p-6 text-center text-gray-400 text-sm">
          No friend requests yet.
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide">Pending ({pending.length})</h4>
          {pending.map(r => (
            <RequestCard key={r.id} request={r} isExpanded={expandedId === r.id}
              onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
              onRespond={(action) => { setRespondingId(r.id); setRespondAction(action); setParentNote('') }}
            />
          ))}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Past ({past.length})</h4>
          {past.map(r => (
            <RequestCard key={r.id} request={r} isExpanded={expandedId === r.id}
              onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}

      {/* Respond modal */}
      {respondingId && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={() => setRespondingId(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3">
            <h4 className="font-bold text-gray-900">
              {respondAction === 'approved' ? 'Approve' : respondAction === 'denied' ? 'Deny' : 'Ask Questions'}
            </h4>
            <textarea value={parentNote} onChange={e => setParentNote(e.target.value)} rows={3}
              placeholder={respondAction === 'questions' ? 'What do you want to ask?' : 'Optional note for the kid...'}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setRespondingId(null)} className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => handleRespond(respondingId)} disabled={submitting}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium ${
                  respondAction === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                  respondAction === 'denied' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
                  respondAction === 'approved' ? 'Approve' : respondAction === 'denied' ? 'Deny' : 'Send Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RequestCard({ request: r, isExpanded, onToggle, onRespond }: {
  request: FriendRequest; isExpanded: boolean; onToggle: () => void
  onRespond?: (action: 'approved' | 'denied' | 'questions') => void
}) {
  const meta = STATUS_META[r.status] || STATUS_META.pending
  const addr = r.address || r.profile_address || ''
  const mapsUrl = addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : null

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${r.status === 'pending' ? 'border-l-4 border-l-amber-400' : ''}`}>
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{cap(r.kid_name)}</span>
            <span className="text-gray-400">→</span>
            <span className="font-semibold text-indigo-700">{r.friend_name}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${meta.color}`}>
              {meta.icon} {meta.label}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {VISIT_LABELS[r.visit_type] || r.visit_type} · {fmtDate(r.start_date)}
            {r.end_date && r.end_date !== r.start_date ? ` – ${fmtDate(r.end_date)}` : ''}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t space-y-3 text-sm">
          {/* Family contact */}
          {(r.parent1_name || r.parent1_phone) && (
            <div className="mt-3 bg-blue-50 rounded-lg p-3 space-y-1">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Friend's Parents</div>
              {r.parent1_name && <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-blue-500" /> {r.parent1_name}</div>}
              {r.parent1_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  <a href={`tel:${r.parent1_phone}`} className="text-blue-600 underline">{r.parent1_phone}</a>
                </div>
              )}
              {r.parent2_name && <div className="flex items-center gap-2 mt-1"><Users className="w-3.5 h-3.5 text-blue-500" /> {r.parent2_name}</div>}
            </div>
          )}

          {/* Address + map */}
          {addr && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-gray-700">{addr}</div>
                {r.gate_code && <div className="text-xs text-gray-500">Gate: {r.gate_code}</div>}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                    <ExternalLink className="w-3 h-3" /> Open in Maps
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Activities */}
          {r.activities && r.activities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {r.activities.map(a => (
                <span key={a} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs border border-teal-200">{a}</span>
              ))}
            </div>
          )}
          {r.plan_details && <p className="text-gray-700">{r.plan_details}</p>}

          {/* Transportation */}
          {(r.ride_there || r.ride_home) && (
            <div className="flex items-start gap-2 text-gray-600">
              <Car className="w-4 h-4 mt-0.5 text-gray-400" />
              <div className="text-xs space-y-0.5">
                {r.ride_there && <div>There: {r.ride_there}</div>}
                {r.ride_home && <div>Home: {r.ride_home}</div>}
                {r.ride_other_who && <div>Who: {r.ride_other_who}</div>}
              </div>
            </div>
          )}

          {r.notes && <p className="text-gray-600 text-xs italic">{r.notes}</p>}

          {/* Parent response note */}
          {r.parent_note && r.status !== 'pending' && (
            <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-700">
              <span className="font-semibold">Parent note:</span> {r.parent_note}
            </div>
          )}

          {/* Action buttons — pending only */}
          {r.status === 'pending' && onRespond && (
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => onRespond('approved')}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={() => onRespond('denied')}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">
                <XCircle className="w-3.5 h-3.5" /> Deny
              </button>
              <button onClick={() => onRespond('questions')}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200">
                <HelpCircle className="w-3.5 h-3.5" /> Ask Questions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
