'use client'

import { useState } from 'react'

export default function BreakButton({ childName }: { childName: string }) {
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  const flagBreak = async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const key = `break-flag-${childName.toLowerCase()}-${today}`

    // Only send once per day
    if (sessionStorage.getItem(key)) {
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 2000)
      return
    }

    try {
      const res = await fetch('/api/kids/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flag_break', kid_name: childName.toLowerCase() })
      })
      if (!res.ok) throw new Error(`${res.status}`)
      sessionStorage.setItem(key, '1')
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      console.error('Break flag failed:', err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <>
      <button
        onClick={flagBreak}
        className="fixed bottom-6 right-6 z-40 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium shadow-md hover:bg-green-200 transition-colors border border-green-200"
      >
        🌿 I Need a Break
      </button>

      {status === 'sent' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-xs">
            <p className="text-2xl mb-2">🌿</p>
            <p className="text-gray-700 font-medium">Got it. Mom will know.</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-xs">
            <p className="text-2xl mb-2">😕</p>
            <p className="text-gray-700 font-medium">Couldn&apos;t send — try again or find Mom</p>
          </div>
        </div>
      )}
    </>
  )
}
