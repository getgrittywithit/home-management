'use client'

import { useState } from 'react'
import { Mail, X, Check, Copy } from 'lucide-react'

const SCHOOL_CONTACTS: Record<string, { primary: { name: string; email: string }; cc?: { name: string; email: string } }> = {
  zoey: {
    primary: { name: 'Donna Gardner', email: 'donna.gardner@boerneisd.net' },
    cc: { name: 'Susan Collentine', email: 'Susan.Collentine@boerneisd.net' },
  },
  kaylee: {
    primary: { name: 'Ashlie D\'Spain', email: 'ashlie.dspain@boerneisd.net' },
    cc: { name: 'Heather Risner', email: 'Heather.Risner@boerneisd.net' },
  },
}

const KID_GRADES: Record<string, string> = { zoey: '9th grade', kaylee: '7th grade' }

const REASON_LINES: Record<string, (name: string, reason?: string) => string> = {
  sick_day: (name, reason) => `${name} is home sick today${reason ? ` with ${reason}` : ''}.`,
  off_day: (name) => `${name} will be home for a family day.`,
  vacation: (name) => `${name} will be out of town for family travel.`,
  field_trip: (name, reason) => `${name} will be out for ${reason || 'a scheduled appointment'}.`,
}

interface Props {
  kidName: string
  modeType: string
  date: string
  reason?: string
  onClose: () => void
}

export default function ExcuseEmailDraft({ kidName, modeType, date, reason, onClose }: Props) {
  const kid = kidName.toLowerCase()
  const contact = SCHOOL_CONTACTS[kid]
  if (!contact) return null

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const displayName = cap(kid)
  const grade = KID_GRADES[kid] || ''
  const lastName = contact.primary.name.split(' ').pop()
  const reasonLine = REASON_LINES[modeType]?.(displayName, reason) || `${displayName} will be absent.`

  const dateDisplay = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const [to, setTo] = useState(contact.primary.email)
  const [cc, setCc] = useState(contact.cc?.email || '')
  const [includeCC, setIncludeCC] = useState(false)
  const [subject, setSubject] = useState(`${displayName} Moses — Absent ${dateDisplay}`)
  const [body, setBody] = useState(
    `Hello Ms. ${lastName},\n\nPlease mark ${displayName} Moses (${grade}) as excused for ${dateDisplay}. ${reasonLine}\n\nPlease let me know if you need anything additional.\n\nThank you,\nLola Moses\n\n(Email reply preferred — hard of hearing)`
  )
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(`To: ${to}${includeCC ? `\nCC: ${cc}` : ''}\nSubject: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveDraft = async () => {
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create', title: `Excuse email drafted for ${displayName}`,
        message: `To: ${contact.primary.name} — ${subject}`,
        source_type: 'excuse_email', source_ref: `excuse-${kid}-${date}`,
        icon: '📧', link_tab: 'email',
      }),
    }).catch(() => {})
    setSent(true)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" /> Excuse Email — {displayName}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-gray-700 font-medium">Draft saved!</p>
            <p className="text-xs text-gray-500 mt-1">Review and send from mosesfamily2008@gmail.com</p>
            <button onClick={onClose} className="mt-4 text-sm text-blue-600 hover:text-blue-700">Close</button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500">To</label>
              <input value={to} onChange={e => setTo(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
            </div>
            {contact.cc && (
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={includeCC} onChange={e => setIncludeCC(e.target.checked)} id="cc-toggle" />
                <label htmlFor="cc-toggle" className="text-xs text-gray-600">CC {contact.cc.name} ({contact.cc.email})</label>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Body</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={8}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
                <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
              <button onClick={handleSaveDraft}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600">
                Save Draft
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center">Gmail OAuth not configured — copy and send manually, or save as draft notification</p>
          </div>
        )}
      </div>
    </div>
  )
}
