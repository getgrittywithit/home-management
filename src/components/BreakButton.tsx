'use client'

import { useState } from 'react'

export default function BreakButton({ childName }: { childName: string }) {
  const [status, setStatus] = useState<'idle' | 'sent' | 'already' | 'error'>('idle')

  const flagBreak = async () => {
    try {
      const res = await fetch('/api/kids/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flag_break', kid_name: childName.toLowerCase() })
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setStatus(data.already_flagged ? 'already' : 'sent')
      setTimeout(() => setStatus('idle'), 2500)
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
        className="fixed bottom-[4.5rem] left-4 md:left-auto md:right-[4.5rem] z-40 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium shadow-md hover:bg-green-200 transition-colors border border-green-200"
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

      {status === 'already' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-xs">
            <p className="text-2xl mb-2">💚</p>
            <p className="text-gray-700 font-medium">Mom already knows. Take your time.</p>
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
