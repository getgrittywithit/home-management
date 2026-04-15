'use client'

// ============================================================================
// D77 AUTH Stage D — Family Accounts admin
// Parent-only. Lists the 8 family_accounts with view/change actions.
// Uses /api/auth ?action=list_credentials (AES-decrypted plaintexts) and
// set_pin / set_password POST actions.
// ============================================================================

import { useEffect, useState } from 'react'
import {
  Shield, Key, Eye, EyeOff, Edit3, Loader2, Check, X, AlertTriangle, ShieldCheck,
} from 'lucide-react'

type Credential = {
  username: string
  display_name: string
  role: 'parent' | 'kid'
  credential_type: 'pin' | 'password'
  credential: string | null
}

export default function FamilyAccountsPanel() {
  const [loading, setLoading] = useState(true)
  const [creds, setCreds] = useState<Credential[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reveal, setReveal] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<Credential | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_credentials' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed (${res.status})`)
      }
      const data = await res.json()
      setCreds(data.credentials || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load credentials')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function toggleReveal(username: string) {
    setReveal((r) => ({ ...r, [username]: !r[username] }))
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setReveal((r) => ({ ...r, [username]: false }))
    }, 5000)
  }

  const parents = creds.filter((c) => c.role === 'parent')
  const kids = creds.filter((c) => c.role === 'kid')

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            Family Accounts
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Passwords and PINs for everyone in the house. Kid PINs are stored
            encrypted so you can recover them if they forget.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Could not load credentials</div>
            <div className="text-xs mt-0.5">{error}</div>
            <div className="text-xs text-red-600 mt-1">
              This usually means CREDENTIAL_ENCRYPTION_KEY isn't set in
              Vercel yet. Login still works; recovery does not.
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {parents.length > 0 && (
            <Section title="Parents">
              {parents.map((c) => (
                <AccountRow
                  key={c.username}
                  credential={c}
                  revealed={!!reveal[c.username]}
                  onReveal={() => toggleReveal(c.username)}
                  onEdit={() => setEditing(c)}
                />
              ))}
            </Section>
          )}
          {kids.length > 0 && (
            <Section title="Kids">
              {kids.map((c) => (
                <AccountRow
                  key={c.username}
                  credential={c}
                  revealed={!!reveal[c.username]}
                  onReveal={() => toggleReveal(c.username)}
                  onEdit={() => setEditing(c)}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      {editing && (
        <EditModal
          credential={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function AccountRow({
  credential: c, revealed, onReveal, onEdit,
}: {
  credential: Credential
  revealed: boolean
  onReveal: () => void
  onEdit: () => void
}) {
  const isSet = c.credential != null
  const isPin = c.credential_type === 'pin'
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50/40">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center flex-shrink-0">
        {isPin ? <Key className="w-4 h-4 text-indigo-600" /> : <Shield className="w-4 h-4 text-blue-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{c.display_name}</div>
        <div className="text-xs text-gray-500">
          {isPin ? 'PIN' : 'Password'} ·{' '}
          {isSet ? (
            <span className="font-mono">
              {revealed ? c.credential : (isPin ? '••••' : '••••••••')}
            </span>
          ) : (
            <span className="text-amber-600 font-medium">Not set yet</span>
          )}
        </div>
      </div>
      {isSet && (
        <button
          onClick={onReveal}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded"
          title={revealed ? 'Hide' : 'Reveal for 5s'}
        >
          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
      <button
        onClick={onEdit}
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded"
        title="Change"
      >
        <Edit3 className="w-4 h-4" />
      </button>
    </div>
  )
}

function EditModal({
  credential: c, onClose, onSaved,
}: {
  credential: Credential
  onClose: () => void
  onSaved: () => void
}) {
  const isPin = c.credential_type === 'pin'
  const [newValue, setNewValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    if (!newValue) return setError('Enter a new value')
    if (isPin && !/^\d{4,6}$/.test(newValue)) return setError('PIN must be 4-6 digits')
    if (!isPin && newValue.length < 4) return setError('Password must be at least 4 characters')
    if (newValue !== confirm) return setError('Values do not match')

    setSaving(true)
    try {
      const body: any = { username: c.username }
      if (isPin) {
        body.action = 'set_pin'
        body.pin = newValue
      } else {
        body.action = 'set_password'
        body.password = newValue
      }
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed (${res.status})`)
      }
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            Change {isPin ? 'PIN' : 'password'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-sm text-gray-700">
            <span className="font-semibold">{c.display_name}</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              New {isPin ? 'PIN' : 'password'}
            </label>
            <input
              type={isPin ? 'tel' : 'password'}
              inputMode={isPin ? 'numeric' : undefined}
              pattern={isPin ? '\\d*' : undefined}
              maxLength={isPin ? 6 : 128}
              value={newValue}
              onChange={(e) => setNewValue(isPin ? e.target.value.replace(/\D/g, '') : e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none"
              placeholder={isPin ? '1234' : '••••••••'}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm</label>
            <input
              type={isPin ? 'tel' : 'password'}
              inputMode={isPin ? 'numeric' : undefined}
              pattern={isPin ? '\\d*' : undefined}
              maxLength={isPin ? 6 : 128}
              value={confirm}
              onChange={(e) => setConfirm(isPin ? e.target.value.replace(/\D/g, '') : e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none"
              placeholder={isPin ? '1234' : '••••••••'}
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 font-medium">{error}</div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={save}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
