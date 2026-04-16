'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Home, X, Shield, ArrowLeftRight, LogOut } from 'lucide-react'
import { getAllFamilyData } from '@/lib/familyConfig'

// Matches the kid emojis/gradients used on the landing page so the two
// stay visually consistent.
const KID_EMOJI: Record<string, string> = {
  amos: '🌟',
  zoey: '⚽',
  kaylee: '🎭',
  ellie: '📚',
  wyatt: '🎯',
  hannah: '🎮',
}
const KID_GRADIENT: Record<string, string> = {
  amos: 'from-pink-400 to-purple-400',
  zoey: 'from-blue-400 to-cyan-400',
  kaylee: 'from-purple-400 to-pink-400',
  ellie: 'from-green-400 to-teal-400',
  wyatt: 'from-orange-400 to-red-400',
  hannah: 'from-indigo-400 to-purple-400',
}

interface ProfileSwitcherProps {
  currentProfile?: string
  currentRole?: 'kid' | 'parent'
}

export default function ProfileSwitcher({ currentProfile, currentRole = 'kid' }: ProfileSwitcherProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const family = getAllFamilyData()

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  // D77 AUTH Stage C — full logout (kills session cookie + redirects to /login)
  const logOut = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
    } catch { /* ignore */ }
    setOpen(false)
    window.location.href = '/login'
  }

  const triggerEmoji = currentRole === 'parent'
    ? '👨‍👩‍👧‍👦'
    : (currentProfile ? KID_EMOJI[currentProfile.toLowerCase()] || '👤' : '👤')
  const triggerLabel = currentRole === 'parent' ? 'Parent' : (currentProfile || 'Switch')

  return (
    <>
      {/* Floating trigger — bottom-left, out of the way of AI Buddy (bottom-right) and sidebars */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Switch profile"
        className="fixed bottom-20 md:bottom-6 left-4 md:left-[272px] z-40 bg-white border border-gray-200 shadow-lg hover:shadow-xl rounded-full pl-2 pr-3 py-2 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
      >
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-lg">
          {triggerEmoji}
        </span>
        <span className="text-xs font-semibold text-gray-700 capitalize pr-1">{triggerLabel}</span>
        <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Switch Profile</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parent + Home top row */}
            <div className="px-5 pt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => go('/dashboard')}
                className={`group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all active:scale-95 ${
                  currentRole === 'parent'
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">Parent Portal</div>
                    <div className="text-xs text-gray-500">Levi / Lola</div>
                  </div>
                </div>
                {currentRole === 'parent' && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wide text-blue-600">
                    Current
                  </span>
                )}
              </button>

              <button
                onClick={() => go('/')}
                className="group rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 p-4 text-left transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Home className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">Home</div>
                    <div className="text-xs text-gray-500">Landing page</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Kid grid */}
            <div className="px-5 pt-4 pb-5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1 mb-2">
                Kids
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {family.children.map((kid) => {
                  const key = kid.name.toLowerCase()
                  const emoji = KID_EMOJI[key] || '👤'
                  const gradient = KID_GRADIENT[key] || 'from-blue-400 to-purple-400'
                  const isCurrent = currentRole === 'kid' && currentProfile?.toLowerCase() === key
                  return (
                    <button
                      key={kid.name}
                      onClick={() => go(`/kid/${key}`)}
                      className={`group relative overflow-hidden rounded-xl border-2 p-4 text-center transition-all active:scale-95 ${
                        isCurrent
                          ? 'border-indigo-400 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
                      }`}
                    >
                      <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition-transform`}>
                        {emoji}
                      </div>
                      <div className="font-semibold text-gray-900 text-sm">{kid.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{kid.grade}</div>
                      {isCurrent && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wide text-indigo-600">
                          Current
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer — logout */}
            <div className="border-t border-gray-100 px-5 py-3 flex justify-end">
              <button
                onClick={logOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
