'use client'

import { use, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import KidPortalNew from '@/components/KidPortalNew'
import { Lock, Eye } from 'lucide-react'

export default function KidPage({ params }: { params: Promise<{ kidName: string }> }) {
  const { kidName } = use(params)
  const searchParams = useSearchParams()
  const isPreview = searchParams.get('preview') === 'parent'
  const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled' | 'not_found'>('loading')

  useEffect(() => {
    // In preview mode, skip portal settings check
    if (isPreview) {
      setStatus('enabled')
      return
    }

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
      .catch(() => setStatus('enabled'))
  }, [kidName, isPreview])

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

  return (
    <div>
      {/* Preview banner */}
      {isPreview && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-center text-sm text-yellow-800 flex items-center justify-center gap-2 sticky top-0 z-50">
          <Eye className="w-4 h-4" />
          Previewing {kidName.charAt(0).toUpperCase() + kidName.slice(1)}&apos;s Portal — Read Only
          <a href="/dashboard" className="ml-4 underline font-medium hover:text-yellow-900">
            ← Back to Parent Portal
          </a>
        </div>
      )}
      <KidPortalNew kidName={kidName} />
    </div>
  )
}
