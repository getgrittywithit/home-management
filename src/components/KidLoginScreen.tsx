'use client'

import { useState } from 'react'
import { Lock, ArrowLeft, UserCog } from 'lucide-react'

const KID_AVATARS = [
  { name: 'Amos', emoji: '🦁', color: 'bg-blue-100 border-blue-400 text-blue-700', ring: 'ring-blue-400' },
  { name: 'Zoey', emoji: '🦋', color: 'bg-pink-100 border-pink-400 text-pink-700', ring: 'ring-pink-400' },
  { name: 'Kaylee', emoji: '🌸', color: 'bg-rose-100 border-rose-400 text-rose-700', ring: 'ring-rose-400' },
  { name: 'Ellie', emoji: '🦄', color: 'bg-purple-100 border-purple-400 text-purple-700', ring: 'ring-purple-400' },
  { name: 'Wyatt', emoji: '🐉', color: 'bg-orange-100 border-orange-400 text-orange-700', ring: 'ring-orange-400' },
  { name: 'Hannah', emoji: '🐸', color: 'bg-green-100 border-green-400 text-green-700', ring: 'ring-green-400' },
]

interface KidLoginScreenProps {
  onLogin: (kidName: string) => void
  onParentLogin?: () => void
}

export default function KidLoginScreen({ onLogin, onParentLogin }: KidLoginScreenProps) {
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleKidSelect = (name: string) => {
    setSelectedKid(name)
    setPin('')
    setError('')
  }

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length === 4) {
      submitPin(newPin)
    }
  }

  const handlePinBackspace = () => {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  const submitPin = async (pinValue: string) => {
    if (!selectedKid) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/kid-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kid_login', kid_name: selectedKid, pin: pinValue })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onLogin(selectedKid)
      } else {
        setError(data.error || 'Wrong PIN')
        setPin('')
      }
    } catch {
      setError('Could not connect')
      setPin('')
    }
    setLoading(false)
  }

  // PIN Entry Screen
  if (selectedKid) {
    const kid = KID_AVATARS.find(k => k.name === selectedKid)!
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <button
          onClick={() => setSelectedKid(null)}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className={`w-20 h-20 rounded-full ${kid.color} border-2 flex items-center justify-center text-4xl mb-4`}>
          {kid.emoji}
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Hi, {selectedKid}!</h2>
        <p className="text-sm text-gray-500 mb-8">Enter your 4-digit PIN</p>

        {/* PIN dots */}
        <div className="flex gap-3 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all ${
              i < pin.length ? 'bg-gray-800 scale-110' : 'bg-gray-200'
            }`} />
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {loading && <p className="text-gray-400 text-sm mb-4">Checking...</p>}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px]">
          {['1','2','3','4','5','6','7','8','9','','0','<'].map(key => {
            if (key === '') return <div key="empty" />
            if (key === '<') {
              return (
                <button key="back" onClick={handlePinBackspace}
                  className="w-16 h-16 rounded-full bg-gray-100 text-gray-600 text-xl font-bold flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )
            }
            return (
              <button key={key} onClick={() => handlePinDigit(key)}
                className="w-16 h-16 rounded-full bg-white border border-gray-200 text-gray-800 text-2xl font-bold flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
                {key}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Avatar Selection Screen
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Lock className="w-8 h-8 text-gray-400 mb-3" />
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Who&apos;s There?</h1>
      <p className="text-sm text-gray-500 mb-8">Tap your name to get started</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-md w-full mb-10">
        {KID_AVATARS.map(kid => (
          <button
            key={kid.name}
            onClick={() => handleKidSelect(kid.name)}
            className={`${kid.color} border-2 rounded-2xl p-5 flex flex-col items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-sm`}
          >
            <span className="text-4xl">{kid.emoji}</span>
            <span className="font-bold text-base">{kid.name}</span>
          </button>
        ))}
      </div>

      {onParentLogin && (
        <button onClick={onParentLogin}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5">
          <UserCog className="w-4 h-4" /> Parent Login
        </button>
      )}
    </div>
  )
}
