'use client'

import { useState } from 'react'
import { Zap, Bell, Calendar, Users, X } from 'lucide-react'

const ALL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
const KID_DISPLAY: Record<string, string> = { amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee' }

type ModalType = 'greenlight' | 'alert' | 'event' | 'meeting' | null

const GREENLIGHT_PRESETS = ['Free time earned!', 'Screen time approved', 'Great day today', 'You earned it']
const ALERT_PRESETS = ['Come find Mom — now', 'Phone/device down immediately', 'Family meeting in 10 minutes', 'Stop what you\'re doing and check in']

export default function FamilyQuickActions() {
  const [modal, setModal] = useState<ModalType>(null)
  const [targetKid, setTargetKid] = useState('all')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Event modal state
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
  const [eventTime, setEventTime] = useState('19:00')
  const [eventDuration, setEventDuration] = useState('1')
  const [eventCountdown, setEventCountdown] = useState(false)

  // Meeting modal state
  const [meetingWhen, setMeetingWhen] = useState('tonight')
  const [meetingTime, setMeetingTime] = useState('19:00')
  const [meetingNote, setMeetingNote] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const closeModal = () => {
    setModal(null)
    setTargetKid('all')
    setMessage('')
    setEventTitle('')
    setEventCountdown(false)
    setMeetingNote('')
  }

  const postAnnouncement = async (type: string) => {
    if (!message.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/kids/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_announcement', message: message.trim(), type, target_kid: targetKid })
      })
      showToast(type === 'greenlight' ? '🟢 Greenlight posted!' : '🚨 Alert sent!')
      closeModal()
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const addEvent = async () => {
    if (!eventTitle.trim()) return
    setSubmitting(true)
    try {
      const start = `${eventDate}T${eventTime}:00`
      const endDate = new Date(start)
      endDate.setHours(endDate.getHours() + parseInt(eventDuration))
      const end = endDate.toISOString().replace('Z', '')

      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_event',
          event_data: {
            title: eventTitle.trim(),
            event_type: 'family',
            start_time: start,
            end_time: end,
            location: eventCountdown ? '#countdown' : '',
          }
        })
      })
      showToast('Added to family calendar')
      closeModal()
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const callMeeting = async () => {
    setSubmitting(true)
    try {
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      let meetDate: string
      if (meetingWhen === 'tonight') {
        meetDate = today.toLocaleDateString('en-CA')
      } else if (meetingWhen === 'tomorrow') {
        today.setDate(today.getDate() + 1)
        meetDate = today.toLocaleDateString('en-CA')
      } else {
        meetDate = eventDate
      }

      const timeLabel = formatTimeLabel(meetingTime)
      const announcementMsg = `Family meeting ${meetingWhen === 'tonight' ? 'tonight' : meetingWhen === 'tomorrow' ? 'tomorrow' : `on ${meetDate}`} at ${timeLabel}${meetingNote ? ` — ${meetingNote}` : ''}`

      await Promise.all([
        fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_event',
            event_data: {
              title: 'Family Meeting',
              event_type: 'family',
              start_time: `${meetDate}T${meetingTime}:00`,
              end_time: `${meetDate}T${String(parseInt(meetingTime.split(':')[0]) + 1).padStart(2, '0')}:${meetingTime.split(':')[1]}:00`,
              location: meetingNote || 'Living room',
            }
          })
        }).catch(() => {}),
        fetch('/api/kids/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_announcement', message: announcementMsg, type: 'alert', target_kid: 'all' })
        }).catch(() => {}),
      ])
      showToast('Family meeting called — calendar + announcement sent')
      closeModal()
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  return (
    <>
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Family Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => setModal('greenlight')} className="p-4 border rounded-lg hover:bg-green-50 text-center transition-colors">
            <Zap className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-sm font-medium">Post Greenlight</div>
          </button>
          <button onClick={() => setModal('alert')} className="p-4 border rounded-lg hover:bg-amber-50 text-center transition-colors">
            <Bell className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <div className="text-sm font-medium">Send Alert</div>
          </button>
          <button onClick={() => setModal('event')} className="p-4 border rounded-lg hover:bg-purple-50 text-center transition-colors">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-sm font-medium">Add Event</div>
          </button>
          <button onClick={() => setModal('meeting')} className="p-4 border rounded-lg hover:bg-pink-50 text-center transition-colors">
            <Users className="w-6 h-6 mx-auto mb-2 text-pink-500" />
            <div className="text-sm font-medium">Family Meeting</div>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 text-sm animate-pulse">
          {toast}
        </div>
      )}

      {/* Greenlight Modal */}
      {modal === 'greenlight' && (
        <Modal title="Post a Greenlight" icon="🟢" onClose={closeModal}>
          <KidSelector value={targetKid} onChange={setTargetKid} />
          <p className="text-sm text-gray-600 mt-3 mb-2">Quick presets:</p>
          <div className="flex flex-wrap gap-2">
            {GREENLIGHT_PRESETS.map(p => (
              <button key={p} onClick={() => setMessage(p)} className={`text-xs px-3 py-1.5 rounded-full border ${message === p ? 'bg-green-100 border-green-400 text-green-700' : 'hover:bg-gray-50'}`}>
                {p}
              </button>
            ))}
          </div>
          <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="Or write your own..." className="w-full mt-3 border rounded px-3 py-2 text-sm" />
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={closeModal} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
            <button onClick={() => postAnnouncement('greenlight')} disabled={submitting || !message.trim()} className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
              Post Greenlight
            </button>
          </div>
        </Modal>
      )}

      {/* Alert Modal */}
      {modal === 'alert' && (
        <Modal title="Send an Alert" icon="🚨" onClose={closeModal}>
          <KidSelector value={targetKid} onChange={setTargetKid} />
          <p className="text-sm text-gray-600 mt-3 mb-2">Quick presets:</p>
          <div className="flex flex-wrap gap-2">
            {ALERT_PRESETS.map(p => (
              <button key={p} onClick={() => setMessage(p)} className={`text-xs px-3 py-1.5 rounded-full border ${message === p ? 'bg-amber-100 border-amber-400 text-amber-700' : 'hover:bg-gray-50'}`}>
                {p}
              </button>
            ))}
          </div>
          <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="Or write your own..." className="w-full mt-3 border rounded px-3 py-2 text-sm" />
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={closeModal} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
            <button onClick={() => postAnnouncement('alert')} disabled={submitting || !message.trim()} className="text-sm bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50">
              Send Alert
            </button>
          </div>
        </Modal>
      )}

      {/* Event Modal */}
      {modal === 'event' && (
        <Modal title="Add Family Event" icon="📅" onClose={closeModal}>
          <input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Event title" className="w-full border rounded px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-xs text-gray-500">Date</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Time</label>
              <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500">Duration</label>
            <select value={eventDuration} onChange={e => setEventDuration(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="0.5">30 minutes</option>
              <option value="1">1 hour</option>
              <option value="2">2 hours</option>
              <option value="3">3 hours</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm">
            <input type="checkbox" checked={eventCountdown} onChange={e => setEventCountdown(e.target.checked)} />
            Show countdown card on kids&apos; tabs
          </label>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={closeModal} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
            <button onClick={addEvent} disabled={submitting || !eventTitle.trim()} className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
              Add to Calendar
            </button>
          </div>
        </Modal>
      )}

      {/* Meeting Modal */}
      {modal === 'meeting' && (
        <Modal title="Call a Family Meeting" icon="👨‍👩‍👧‍👦" onClose={closeModal}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">When?</label>
              <select value={meetingWhen} onChange={e => setMeetingWhen(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="tonight">Tonight</option>
                <option value="tomorrow">Tomorrow</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Time</label>
              <input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500">Location / note (optional)</label>
            <input type="text" value={meetingNote} onChange={e => setMeetingNote(e.target.value)} placeholder="Living room — all devices down" className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={closeModal} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
            <button onClick={callMeeting} disabled={submitting} className="text-sm bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 disabled:opacity-50">
              Call the Meeting
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function Modal({ title, icon, onClose, children }: { title: string; icon: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>{icon}</span> {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function KidSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm text-gray-600">Who is this for?</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1">
        <option value="all">All Kids</option>
        {ALL_KIDS.map(k => <option key={k} value={k}>{KID_DISPLAY[k]}</option>)}
      </select>
    </div>
  )
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}
