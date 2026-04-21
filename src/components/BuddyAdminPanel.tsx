'use client'

import { useState, useEffect } from 'react'
import { Shield, MessageSquare, AlertTriangle, Settings, Users, Save, Check } from 'lucide-react'
import { HOMESCHOOL_KIDS, KID_DISPLAY } from '@/lib/constants'

type Tab = 'conversations' | 'flags' | 'personas' | 'access'

export default function BuddyAdminPanel() {
  const [tab, setTab] = useState<Tab>('flags')
  const [conversations, setConversations] = useState<any[]>([])
  const [flags, setFlags] = useState<any[]>([])
  const [personas, setPersonas] = useState<any[]>([])
  const [accessConfigs, setAccessConfigs] = useState<any[]>([])
  const [editingPrompt, setEditingPrompt] = useState<{ key: string; prompt: string } | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/ai-buddy?action=admin_get_flags').then(r => r.json()).then(d => setFlags(d.flags || [])).catch(() => {})
    fetch('/api/ai-buddy?action=admin_get_personas').then(r => r.json()).then(d => setPersonas(d.personas || [])).catch(() => {})
    fetch('/api/ai-buddy?action=admin_get_access').then(r => r.json()).then(d => setAccessConfigs(d.configs || [])).catch(() => {})
    fetch('/api/ai-buddy?action=admin_get_conversations&limit=30').then(r => r.json()).then(d => setConversations(d.conversations || [])).catch(() => {})
  }, [])

  const reviewFlag = async (id: number, notes?: string) => {
    await fetch('/api/ai-buddy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_review_flag', flag_id: id, parent_notes: notes }),
    }).catch(() => {})
    setFlags(prev => prev.map(f => f.id === id ? { ...f, parent_reviewed: true, parent_notes: notes } : f))
  }

  const savePersona = async (key: string, prompt: string) => {
    await fetch('/api/ai-buddy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_update_persona', persona_key: key, system_prompt: prompt }),
    }).catch(() => {})
    setEditingPrompt(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleAccess = async (kidName: string, personaKey: string, enabled: boolean) => {
    await fetch('/api/ai-buddy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_toggle_access', kid_name: kidName, persona_key: personaKey, access_enabled: enabled }),
    }).catch(() => {})
    setAccessConfigs(prev => prev.map(c => c.kid_name === kidName && c.persona_key === personaKey ? { ...c, access_enabled: enabled } : c))
  }

  const TABS = [
    { id: 'flags' as Tab, label: 'Flags', icon: AlertTriangle, badge: flags.filter(f => !f.parent_reviewed).length },
    { id: 'conversations' as Tab, label: 'Conversations', icon: MessageSquare },
    { id: 'personas' as Tab, label: 'Personas', icon: Settings },
    { id: 'access' as Tab, label: 'Access', icon: Users },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-5 rounded-xl">
        <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> AI Buddy Admin</h2>
        <p className="text-indigo-100 text-sm mt-1">Safety oversight, persona management, and access controls</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${tab === t.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
            {t.badge ? <span className="bg-red-500 text-white text-[10px] min-w-[16px] h-[16px] rounded-full flex items-center justify-center">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'flags' && (
        <div className="bg-white rounded-xl border p-4 space-y-2">
          <h3 className="font-semibold text-sm text-gray-900">Moderation Flags</h3>
          {flags.filter(f => !f.parent_reviewed).length === 0 && <p className="text-xs text-gray-400">No pending flags</p>}
          {flags.filter(f => !f.parent_reviewed).map((f: any) => (
            <div key={f.id} className={`p-3 rounded-lg border ${f.severity === 'crisis' ? 'border-red-300 bg-red-50' : f.severity === 'high' ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{KID_DISPLAY[f.kid_name] || f.kid_name} — {f.persona_key} ({f.direction})</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${f.severity === 'crisis' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>{f.severity}</span>
              </div>
              <p className="text-xs text-gray-700 mb-2">{f.content_snippet}</p>
              <button onClick={() => reviewFlag(f.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                <Check className="w-3 h-3 inline mr-0.5" /> Mark Reviewed
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'conversations' && (
        <div className="bg-white rounded-xl border p-4 space-y-2">
          <h3 className="font-semibold text-sm text-gray-900">Recent Conversations</h3>
          {conversations.length === 0 && <p className="text-xs text-gray-400">No conversations yet</p>}
          {conversations.map((c: any) => (
            <div key={c.id} className="p-2 rounded border border-gray-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">{KID_DISPLAY[c.kid_name] || c.kid_name} → {c.persona_key || c.buddy_type}</span>
                <span className="text-gray-400">{new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <p className="text-gray-600 mt-0.5 truncate">{c.user_message || c.message}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'personas' && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-sm text-gray-900">Persona System Prompts</h3>
          {saved && <p className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Saved!</p>}
          {personas.map((p: any) => (
            <div key={p.persona_key} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{p.icon} {p.display_name}</span>
                <button onClick={() => setEditingPrompt({ key: p.persona_key, prompt: p.system_prompt })}
                  className="text-xs text-indigo-600 hover:text-indigo-700">Edit</button>
              </div>
              {editingPrompt?.key === p.persona_key ? (
                <div className="space-y-2">
                  <textarea value={editingPrompt!.prompt} onChange={e => setEditingPrompt({ key: editingPrompt!.key, prompt: e.target.value })}
                    rows={6} className="w-full border rounded-lg px-3 py-2 text-xs" />
                  <div className="flex gap-2">
                    <button onClick={() => savePersona(p.persona_key, editingPrompt!.prompt)}
                      className="bg-indigo-500 text-white px-3 py-1 rounded text-xs"><Save className="w-3 h-3 inline mr-0.5" /> Save</button>
                    <button onClick={() => setEditingPrompt(null)} className="text-xs text-gray-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 line-clamp-3">{p.system_prompt}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'access' && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">Per-Kid Access Controls</h3>
          <div className="space-y-3">
            {[...HOMESCHOOL_KIDS].map(kid => (
              <div key={kid}>
                <p className="text-xs font-semibold text-gray-500 mb-1">{KID_DISPLAY[kid]}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {personas.map((p: any) => {
                    const cfg = accessConfigs.find((c: any) => c.kid_name === kid && c.persona_key === p.persona_key)
                    const enabled = cfg?.access_enabled !== false
                    return (
                      <button key={p.persona_key} onClick={() => toggleAccess(kid, p.persona_key, !enabled)}
                        className={`px-2 py-1.5 rounded text-[10px] font-medium border ${enabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                        {p.icon} {p.display_name} {enabled ? '✓' : '✗'}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
