'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, Eye, EyeOff, RotateCcw, Unlock, ExternalLink, Shield, Sparkles } from 'lucide-react'

interface PortalSettings {
  enabled: boolean
  has_pin: boolean
  last_login: string | null
  login_attempts: number
  is_locked: boolean
  locked_until: string | null
  pin_reset_at: string | null
}

interface PortalSettingsPanelProps {
  kidName: string
}

export default function PortalSettingsPanel({ kidName }: PortalSettingsPanelProps) {
  const [settings, setSettings] = useState<PortalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revealedPin, setRevealedPin] = useState<string | null>(null)
  const [revealLoading, setRevealLoading] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [portalEnabled, setPortalEnabled] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/kid-portal?action=get_portal_settings&kid_name=${encodeURIComponent(kidName)}`)
      const data = await res.json()
      if (res.ok) {
        setSettings(data)
        setPortalEnabled(data.enabled)
      } else {
        setError(data.error || 'Failed to load settings')
      }
    } catch {
      setError('Could not connect')
    }
    setLoading(false)
  }, [kidName])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleRevealPin = async () => {
    setRevealLoading(true)
    try {
      const res = await fetch(`/api/kid-portal?action=reveal_pin&kid_name=${encodeURIComponent(kidName)}`)
      const data = await res.json()
      if (res.ok) {
        setRevealedPin(data.pin)
        setTimeout(() => setRevealedPin(null), 5000)
      }
    } catch { /* ignore */ }
    setRevealLoading(false)
  }

  const handleTogglePortal = async (enabled: boolean) => {
    setPortalEnabled(enabled)
    try {
      const res = await fetch('/api/kid-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_portal', kid_name: kidName, enabled }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPortalEnabled(!enabled) // revert
        setActionMsg(data.error || 'Failed')
      } else {
        setActionMsg(enabled ? 'Portal enabled' : 'Portal disabled')
        fetchSettings()
      }
    } catch {
      setPortalEnabled(!enabled)
    }
    setTimeout(() => setActionMsg(''), 3000)
  }

  const handleResetPin = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      setActionMsg('PIN must be exactly 4 digits')
      return
    }
    setResetLoading(true)
    try {
      const res = await fetch('/api/kid-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_pin', kid_name: kidName, new_pin: newPin }),
      })
      const data = await res.json()
      if (res.ok) {
        setActionMsg('PIN reset successfully')
        setShowResetModal(false)
        setNewPin('')
        fetchSettings()
      } else {
        setActionMsg(data.error || 'Failed to reset PIN')
      }
    } catch {
      setActionMsg('Could not connect')
    }
    setResetLoading(false)
    setTimeout(() => setActionMsg(''), 3000)
  }

  const handleUnlock = async () => {
    try {
      const res = await fetch('/api/kid-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock_portal', kid_name: kidName }),
      })
      const data = await res.json()
      if (res.ok) {
        setActionMsg('Portal unlocked')
        fetchSettings()
      } else {
        setActionMsg(data.error || 'Failed to unlock')
      }
    } catch {
      setActionMsg('Could not connect')
    }
    setTimeout(() => setActionMsg(''), 3000)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    if (isToday) return `Today, ${time}`
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`
    return `${d.toLocaleDateString()} ${time}`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-32" />
          <div className="h-4 bg-gray-100 rounded w-40" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  const displayName = kidName.charAt(0).toUpperCase() + kidName.slice(1)

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <h3 className="font-bold text-lg">Portal Settings — {displayName}</h3>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Action message */}
        {actionMsg && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-3 py-2">
            {actionMsg}
          </div>
        )}

        {/* Toggle: Kid Portal */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">Kid Portal</p>
            <p className="text-xs text-gray-500">Access to the kid dashboard</p>
          </div>
          <button
            onClick={() => handleTogglePortal(!portalEnabled)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              portalEnabled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              portalEnabled ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Divider */}
        <hr className="border-gray-100" />

        {/* Current PIN */}
        <div>
          <p className="font-medium text-gray-800 mb-2">Current PIN</p>
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 rounded-lg px-4 py-2 font-mono text-lg tracking-widest min-w-[100px] text-center">
              {revealedPin ? revealedPin : '\u25CF\u25CF\u25CF\u25CF'}
            </div>
            <button
              onClick={handleRevealPin}
              disabled={revealLoading}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="Reveal PIN for 5 seconds"
            >
              {revealedPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              onClick={() => { setShowResetModal(true); setNewPin('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
          {settings?.pin_reset_at && (
            <p className="text-xs text-gray-400 mt-1">Last reset: {formatDate(settings.pin_reset_at)}</p>
          )}
        </div>

        {/* Divider */}
        <hr className="border-gray-100" />

        {/* Portal Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Portal Status</p>
            <p className="font-medium mt-0.5">
              {settings?.is_locked ? (
                <span className="text-red-600 flex items-center gap-1">
                  <Lock className="w-4 h-4" /> Locked
                </span>
              ) : (
                <span className="text-green-600">Active</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Login</p>
            <p className="font-medium mt-0.5 text-gray-800">{formatDate(settings?.last_login ?? null)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Failed Attempts</p>
            <p className={`font-medium mt-0.5 ${(settings?.login_attempts || 0) > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
              {settings?.login_attempts || 0}
            </p>
          </div>
          {settings?.is_locked && settings.locked_until && (
            <div>
              <p className="text-sm text-gray-500">Locked Until</p>
              <p className="font-medium mt-0.5 text-red-600">{formatDate(settings.locked_until)}</p>
            </div>
          )}
        </div>

        {/* Unlock button (only when locked) */}
        {settings?.is_locked && (
          <>
            <hr className="border-gray-100" />
            <button
              onClick={handleUnlock}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg font-medium hover:bg-amber-100 transition-colors"
            >
              <Unlock className="w-4 h-4" /> Unlock Portal
            </button>
          </>
        )}

        {/* Divider */}
        <hr className="border-gray-100" />

        {/* Parent preview */}
        <div>
          <p className="text-sm text-gray-500 mb-2">Parent Preview</p>
          <a
            href={`/kid/${encodeURIComponent(kidName.toLowerCase())}?preview=parent`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> View {displayName}&apos;s Portal
          </a>
        </div>
      </div>

      {/* Reset PIN Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h4 className="text-lg font-bold text-gray-900 mb-1">Reset PIN for {displayName}</h4>
            <p className="text-sm text-gray-500 mb-4">Enter a new 4-digit PIN. This will also clear any lockouts.</p>
            <div className="flex justify-center mb-4">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map(i => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={newPin[i] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      if (!val && i > 0) return
                      const arr = newPin.split('')
                      arr[i] = val
                      const updated = arr.join('').slice(0, 4)
                      setNewPin(updated)
                      // Auto-focus next input
                      if (val && i < 3) {
                        const next = e.target.parentElement?.parentElement?.querySelectorAll('input')[i + 1]
                        if (next) (next as HTMLInputElement).focus()
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !newPin[i] && i > 0) {
                        const arr = newPin.split('')
                        arr[i - 1] = ''
                        setNewPin(arr.join(''))
                        const prev = (e.target as HTMLElement).parentElement?.parentElement?.querySelectorAll('input')[i - 1]
                        if (prev) (prev as HTMLInputElement).focus()
                      }
                    }}
                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowResetModal(false); setNewPin('') }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPin}
                disabled={newPin.length !== 4 || resetLoading}
                className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? 'Saving...' : 'Save PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
