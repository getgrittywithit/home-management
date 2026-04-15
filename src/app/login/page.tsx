'use client'

// ============================================================================
// D77 AUTH Stage B — /login page
// Family member picker. Tap avatar → PIN pad (kids) or password (parents).
// First-time accounts (no pin_hash / no password_hash) show setup flow.
// Successful login redirects to role-appropriate portal.
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, ArrowLeft, Loader2, Eye, EyeOff, Check } from 'lucide-react'

type Account = {
  id: string
  username: string
  display_name: string
  role: 'parent' | 'kid'
  has_pin: boolean
  has_password: boolean
}

const KID_EMOJI: Record<string, string> = {
  amos: '🌟', zoey: '⚽', kaylee: '🎭',
  ellie: '📚', wyatt: '🎯', hannah: '🎮',
}
const KID_GRADIENT: Record<string, string> = {
  amos: 'from-pink-400 to-purple-400',
  zoey: 'from-blue-400 to-cyan-400',
  kaylee: 'from-purple-400 to-pink-400',
  ellie: 'from-green-400 to-teal-400',
  wyatt: 'from-orange-400 to-red-400',
  hannah: 'from-indigo-400 to-purple-400',
}
const PARENT_EMOJI: Record<string, string> = { mom: '👩', dad: '👨' }

function portalPathFor(account: Account): string {
  if (account.role === 'parent') return '/dashboard'
  return `/kids/${account.username}`
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || null

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Account | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [meRes, listRes] = await Promise.all([
          fetch('/api/auth?action=me').then((r) => r.json()),
          fetch('/api/auth?action=list_accounts').then((r) => r.json()),
        ])
        // Already logged in → skip straight to portal
        if (meRes?.account) {
          const acct = meRes.account as Account
          window.location.replace(nextPath || portalPathFor(acct))
          return
        }
        setAccounts(listRes.accounts || [])
      } catch {
        setAccounts([])
      } finally {
        setLoading(false)
      }
    })()
  }, [nextPath])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-indigo-500 to-purple-600">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (selected) {
    return (
      <CredentialEntry
        account={selected}
        onBack={() => setSelected(null)}
        onSuccess={(acct) => {
          const path = nextPath || portalPathFor(acct)
          try { localStorage.setItem('familyops-last-portal', path) } catch {}
          window.location.replace(path)
        }}
      />
    )
  }

  const parents = accounts.filter((a) => a.role === 'parent')
  const kids = accounts.filter((a) => a.role === 'kid')

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-teal-400 via-indigo-500 to-purple-600 p-4">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
            <span className="text-5xl">🪸</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Coral</h1>
          <p className="text-white/80 text-sm mt-1">The Family Ecosystem</p>
        </div>

        {/* Parent row */}
        <div className="mb-6">
          <div className="text-[11px] font-bold text-white/70 uppercase tracking-wide mb-2 px-1">
            Parents
          </div>
          <div className="grid grid-cols-2 gap-3">
            {parents.map((a) => (
              <AccountCard key={a.id} account={a} onClick={() => setSelected(a)} />
            ))}
          </div>
        </div>

        {/* Kid grid */}
        <div className="mb-6">
          <div className="text-[11px] font-bold text-white/70 uppercase tracking-wide mb-2 px-1">
            Kids
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {kids.map((a) => (
              <AccountCard key={a.id} account={a} onClick={() => setSelected(a)} />
            ))}
          </div>
        </div>

        <p className="text-center text-white/80 text-sm mt-2 mb-4">
          Tap your name to log in
        </p>
      </div>
    </div>
  )
}

function AccountCard({ account, onClick }: { account: Account; onClick: () => void }) {
  const isParent = account.role === 'parent'
  const emoji = isParent
    ? PARENT_EMOJI[account.username] || '👤'
    : KID_EMOJI[account.username] || '👤'
  const gradient = isParent
    ? 'from-blue-400 to-indigo-400'
    : KID_GRADIENT[account.username] || 'from-blue-400 to-purple-400'
  const needsSetup = isParent ? !account.has_password : !account.has_pin

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-white/95 hover:bg-white shadow-xl hover:shadow-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.97]"
    >
      <div
        className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-105 transition-transform`}
      >
        {emoji}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="font-bold text-gray-900 truncate">{account.display_name}</div>
        {needsSetup && (
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mt-0.5">
            First-time setup
          </div>
        )}
      </div>
      {isParent && <Shield className="w-4 h-4 text-blue-500" />}
    </button>
  )
}

function CredentialEntry({
  account, onBack, onSuccess,
}: {
  account: Account
  onBack: () => void
  onSuccess: (account: Account) => void
}) {
  const isParent = account.role === 'parent'
  const isFirstTime = isParent ? !account.has_password : !account.has_pin

  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPinDigit = (d: string) => {
    setError(null)
    if (pin.length >= 6) return
    setPin(pin + d)
  }
  const onPinBack = () => { setError(null); setPin(pin.slice(0, -1)) }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)

    if (isParent) {
      if (!password || password.length < 4) return setError('Password must be at least 4 characters')
      if (isFirstTime && password !== passwordConfirm) return setError('Passwords do not match')
    } else {
      if (pin.length < 4) return setError('PIN must be at least 4 digits')
      if (isFirstTime && pin !== pinConfirm) return setError('PINs do not match')
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: account.username,
          pin: isParent ? undefined : pin,
          password: isParent ? password : undefined,
          remember_me: rememberMe,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        // Clear PIN on failure so kid can re-enter
        if (!isParent) setPin('')
        return
      }
      onSuccess(account)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  // Auto-submit kid PIN on 4 digits if not first-time setup
  useEffect(() => {
    if (isParent || isFirstTime || submitting) return
    if (pin.length === 4) {
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const emoji = isParent
    ? PARENT_EMOJI[account.username] || '👤'
    : KID_EMOJI[account.username] || '👤'
  const gradient = isParent
    ? 'from-blue-400 to-indigo-400'
    : KID_GRADIENT[account.username] || 'from-blue-400 to-purple-400'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-indigo-500 to-purple-600 p-4">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="text-white/90 hover:text-white flex items-center gap-1 text-sm font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-2xl p-6"
        >
          {/* Avatar */}
          <div className="flex flex-col items-center mb-5">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-5xl mb-2`}>
              {emoji}
            </div>
            <div className="text-lg font-bold text-gray-900">{account.display_name}</div>
            {isFirstTime && (
              <div className="text-xs text-amber-600 font-semibold mt-1">
                {isParent ? 'Set your password to protect the portal' : 'Choose a 4-digit PIN'}
              </div>
            )}
          </div>

          {/* Parent password */}
          {isParent ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isFirstTime ? 'New password' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {isFirstTime && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Confirm password
                  </label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>
          ) : (
            // Kid PIN pad
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 ${
                      i < pin.length ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onPinDigit(d)}
                    className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-2xl font-semibold text-gray-900 transition-colors active:scale-95"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onPinBack}
                  className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => onPinDigit('0')}
                  className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-2xl font-semibold text-gray-900 active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPin('')}
                  className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700"
                >
                  Clear
                </button>
              </div>
              {isFirstTime && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 mt-2">
                    Confirm PIN
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-center text-xl tracking-[0.5em]"
                    placeholder="••••"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Mom and Dad keep a backup copy in case you forget.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 text-sm text-red-600 text-center font-medium">{error}</div>
          )}

          {/* Remember me */}
          <label className="mt-4 flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            Remember me on this device
          </label>

          {(isParent || isFirstTime) && (
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-600 hover:to-indigo-600 text-white font-bold transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {isFirstTime ? 'Set & Log In' : 'Log In'}
                </>
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
