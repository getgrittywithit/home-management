'use client'

import { useState } from 'react'
import { X, Send } from 'lucide-react'

export type RequestKind = 'friend_over' | 'screen_time' | 'snack' | 'special' | 'talk_to_parents'

type FieldType = 'text' | 'textarea' | 'tel' | 'email' | 'date' | 'time' | 'select' | 'toggle'

interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]           // for select
  placeholder?: string
  showIf?: (values: Record<string, string>) => boolean
}

interface ConfigDef {
  title: string
  emoji: string
  accentClass: string          // button + header bg
  summaryLine: string          // parent notification header
  fields: FieldDef[]
}

const CONFIGS: Record<RequestKind, ConfigDef> = {
  friend_over: {
    title: 'Friend Over Request',
    emoji: '👋',
    accentClass: 'bg-blue-500 hover:bg-blue-600',
    summaryLine: '📋 Friend Over Request',
    fields: [
      { key: 'friend_name', label: "Friend's name", type: 'text', required: true, placeholder: 'e.g. Jake S.' },
      { key: 'when_date', label: 'When (date)', type: 'date', required: true },
      { key: 'when_time', label: 'Start time', type: 'time', required: true },
      { key: 'how_long', label: 'How long?', type: 'select', required: true,
        options: ['A few hours', 'Half day', 'Afternoon', 'Sleepover'] },
      { key: 'where', label: 'Where?', type: 'select', required: true,
        options: ['Our house', 'Their house', 'Somewhere else'] },
      { key: 'where_details', label: 'Location details', type: 'text', placeholder: 'Address or place name',
        showIf: v => v.where === 'Somewhere else' },
      { key: 'who_else', label: 'Who all is going?', type: 'text', placeholder: 'Optional — other kids or friends' },
      { key: 'need_ride', label: 'Need a ride?', type: 'toggle', required: true },
      { key: 'has_wifi', label: 'Will you have wifi / phone connection?', type: 'toggle', required: true },
      // Parent contact — only for sleepover or their house
      { key: 'parent_name', label: 'Parent / guardian name', type: 'text', required: true,
        showIf: v => v.how_long === 'Sleepover' || v.where === 'Their house' },
      { key: 'parent_phone', label: 'Parent phone', type: 'tel', required: true,
        placeholder: '(210) 555-1234',
        showIf: v => v.how_long === 'Sleepover' || v.where === 'Their house' },
      { key: 'parent_email', label: 'Parent email (optional)', type: 'email',
        showIf: v => v.how_long === 'Sleepover' || v.where === 'Their house' },
      { key: 'gate_code', label: 'Gate code (if gated community)', type: 'text',
        showIf: v => v.how_long === 'Sleepover' || v.where === 'Their house' },
      { key: 'notes', label: 'Any other notes', type: 'textarea',
        placeholder: 'Allergies, pickup time, house rules, etc.' },
    ],
  },
  screen_time: {
    title: 'Screen Time Request',
    emoji: '🎮',
    accentClass: 'bg-purple-500 hover:bg-purple-600',
    summaryLine: '🎮 Screen Time Request',
    fields: [
      { key: 'type', label: 'Type', type: 'select', required: true,
        options: ['Extra screen time', 'Extended screen time', 'Earned reward time'] },
      { key: 'duration', label: 'How long?', type: 'select', required: true,
        options: ['15 min', '30 min', '1 hour', '2 hours'] },
      { key: 'what_for', label: 'What for?', type: 'text', required: true,
        placeholder: 'e.g. YouTube, Roblox, Movie, Homework research' },
      { key: 'device', label: 'Which device?', type: 'select', required: true,
        options: ['iPad', 'Phone', 'Computer', 'TV', 'Xbox', 'Switch'] },
      { key: 'earned_how', label: 'What did you do to earn it?', type: 'textarea',
        placeholder: 'Extra chores, good behavior, etc.',
        showIf: v => v.type === 'Earned reward time' },
    ],
  },
  talk_to_parents: {
    title: 'Talk to Mom & Dad',
    emoji: '💬',
    accentClass: 'bg-teal-500 hover:bg-teal-600',
    summaryLine: '💬 Talk Request',
    fields: [
      { key: 'about', label: "What's this about?", type: 'select', required: true,
        options: ['Question', 'Problem', 'Something happened', 'Idea', 'Just want to talk'] },
      { key: 'message', label: 'Your message', type: 'textarea', required: true,
        placeholder: 'Tell Mom & Dad what you need to say…' },
      { key: 'who_involved', label: "Who's involved?", type: 'text',
        placeholder: 'Other kids, friends, adults' },
      { key: 'about_date', label: 'Is there a date this is about?', type: 'date' },
      { key: 'urgency', label: 'How soon do you need a reply?', type: 'select', required: true,
        options: ['Whenever', 'Today please', 'ASAP'] },
    ],
  },
  snack: {
    title: 'Snack Request',
    emoji: '🍪',
    accentClass: 'bg-green-500 hover:bg-green-600',
    summaryLine: '🍪 Snack Request',
    fields: [
      { key: 'snack', label: 'What snack?', type: 'text', required: true, placeholder: 'e.g. apple + peanut butter' },
      { key: 'need_help', label: 'Need help making it?', type: 'toggle', required: true },
      { key: 'reason', label: 'Any reason?', type: 'text', placeholder: 'Optional — hungry, after practice, etc.' },
    ],
  },
  special: {
    title: 'Special Request',
    emoji: '💝',
    accentClass: 'bg-pink-500 hover:bg-pink-600',
    summaryLine: '💝 Special Request',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Short summary' },
      { key: 'description', label: 'What is the request?', type: 'textarea', required: true },
      { key: 'when_date', label: 'When does this need to happen?', type: 'date' },
      { key: 'where', label: 'Where?', type: 'text' },
      { key: 'cost', label: 'Does it cost money? ($ amount if yes)', type: 'text',
        placeholder: 'Leave blank if no' },
      { key: 'other_notes', label: 'Anything else Mom should know?', type: 'textarea' },
    ],
  },
}

interface Props {
  kind: RequestKind
  kidName: string
  onClose: () => void
  onSent: () => void
}

export default function RequestFormModal({ kind, kidName, onClose, onSent }: Props) {
  const config = CONFIGS[kind]
  const initialValues = Object.fromEntries(
    config.fields.map(f => [f.key, f.type === 'date' && f.key === 'when_date'
      ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      : ''])
  ) as Record<string, string>
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [sending, setSending] = useState(false)

  const update = (key: string, value: string) => setValues(prev => ({ ...prev, [key]: value }))

  const visibleFields = config.fields.filter(f => !f.showIf || f.showIf(values))
  const missingRequired = visibleFields
    .filter(f => f.required)
    .filter(f => {
      if (f.type === 'toggle') return !values[f.key] // must be 'yes' or 'no'
      return !values[f.key]?.trim()
    })

  const buildMessage = (): string => {
    const lines: string[] = []
    lines.push(`${config.summaryLine} — ${kidName.charAt(0).toUpperCase() + kidName.slice(1)}`)
    for (const field of visibleFields) {
      const raw = values[field.key]
      if (!raw || !raw.trim()) continue
      const formatted = field.type === 'toggle'
        ? (raw === 'yes' ? 'Yes' : 'No')
        : raw
      lines.push(`${field.label}: ${formatted}`)
    }
    if (kind === 'talk_to_parents' && values.urgency === 'ASAP') {
      lines.push('⚠️ ASAP — needs quick reply')
    }
    return lines.join('\n')
  }

  const handleSend = async () => {
    if (missingRequired.length > 0) return
    setSending(true)
    try {
      await fetch('/api/kids/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          kid: kidName.toLowerCase(),
          message: buildMessage(),
        }),
      })
      onSent()
    } catch (err) {
      console.error('Request send failed:', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`${config.accentClass} text-white px-5 py-4 flex items-center justify-between rounded-t-2xl`}>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="text-xl">{config.emoji}</span> {config.title}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {visibleFields.map(field => (
            <div key={field.key}>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={values[field.key] || ''}
                  onChange={e => update(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={5}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              ) : field.type === 'select' ? (
                <select
                  value={values[field.key] || ''}
                  onChange={e => update(field.key, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Choose…</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'toggle' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => update(field.key, 'yes')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                      values[field.key] === 'yes'
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >Yes</button>
                  <button
                    onClick={() => update(field.key, 'no')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                      values[field.key] === 'no'
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >No</button>
                </div>
              ) : (
                <input
                  type={field.type}
                  value={values[field.key] || ''}
                  onChange={e => update(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-gray-50 rounded-b-2xl">
          {missingRequired.length > 0 && (
            <p className="text-xs text-amber-600 mb-2">
              Still need: {missingRequired.map(f => f.label).join(', ')}
            </p>
          )}
          <button
            onClick={handleSend}
            disabled={missingRequired.length > 0 || sending}
            className={`w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors ${config.accentClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send to Mom'}
          </button>
        </div>
      </div>
    </div>
  )
}
