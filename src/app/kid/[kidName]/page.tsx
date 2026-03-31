'use client'

import { use, useState, useEffect } from 'react'
import KidPortalNew from '@/components/KidPortalNew'
import { Lock } from 'lucide-react'

export default function KidPage({ params }: { params: Promise<{ kidName: string }> }) {
  const { kidName } = use(params)
  const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled' | 'not_found'>('loading')

  useEffect(() => {
    fetch(`/api/kid-portal?action=get_portal_settings&kid_name=${encodeURIComponent(kidName)}`)
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setStatus('not_found')
        } else if (data.enabled) {
          setStatus('enabled')
        } else {
          setStatus('disabled')
        }
      })
      .catch(() => setStatus('enabled')) // On error, allow through
  }, [kidName])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Lock className="w-10 h-10 text-gray-300 mb-3" />
        <h1 className="text-xl font-bold text-gray-700 mb-1">Kid Not Found</h1>
        <p className="text-sm text-gray-500">No profile found for &ldquo;{kidName}&rdquo;.</p>
      </div>
    )
  }

  if (status === 'disabled') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Lock className="w-10 h-10 text-gray-300 mb-3" />
        <h1 className="text-xl font-bold text-gray-700 mb-1">Portal Not Enabled</h1>
        <p className="text-sm text-gray-500">Ask Mom to turn on your portal access.</p>
      </div>
    )
  }

  return <KidPortalNew kidName={kidName} />
}
