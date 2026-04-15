'use client'

import { use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import KidPortalWithNav from '@/components/KidPortalWithNav'
import { Lock, Eye, Loader2 } from 'lucide-react'

export default function KidPage({ params }: { params: Promise<{ kidName: string }> }) {
  const { kidName } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPreview = searchParams.get('preview') === 'parent'
  const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled' | 'not_found' | 'ready'>('loading')
  const [kidData, setKidData] = useState<any>(null)

  // D77 AUTH Stage C — role enforcement
  // Kid can only see their own portal. Parents see any kid portal.
  useEffect(() => {
    fetch('/api/auth?action=me')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.account) {
          router.replace(`/login?next=/kid/${encodeURIComponent(kidName)}`)
          return
        }
        const me = data.account
        if (me.role === 'kid' && me.username !== kidName.toLowerCase()) {
          router.replace(`/kid/${me.username}`)
        }
      })
      .catch(() => { /* allow through on network error */ })
  }, [kidName, router])

  // Save last-visited portal for PWA home screen shortcuts
  useEffect(() => {
    if (!isPreview) {
      try { localStorage.setItem('familyops-last-portal', `/kid/${kidName}`) } catch { /* ignore */ }
    }
  }, [kidName, isPreview])

  useEffect(() => {
    // In preview mode, skip portal settings check
    if (isPreview) {
      loadKidData()
      return
    }

    fetch(`/api/kid-portal?action=get_portal_settings&kid_name=${encodeURIComponent(kidName)}`)
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setStatus('not_found')
        } else if (data.enabled) {
          loadKidData()
        } else {
          setStatus('disabled')
        }
      })
      .catch(() => loadKidData()) // On error, allow through
  }, [kidName, isPreview])

  async function loadKidData() {
    try {
      const res = await fetch(`/api/kid-data?kid_name=${encodeURIComponent(kidName)}`)
      if (!res.ok) {
        setStatus('not_found')
        return
      }
      const data = await res.json()
      setKidData(data)
      setStatus('ready')
    } catch {
      // Provide minimal fallback data so portal still loads
      setKidData({
        profile: { first_name: kidName.charAt(0).toUpperCase() + kidName.slice(1), name: kidName, emoji: '👦' },
        todaysChecklist: [],
        todaysEvents: [],
        weekEvents: [],
        zones: [],
      })
      setStatus('ready')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading portal...
        </div>
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

  if (!kidData) return null

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
      <KidPortalWithNav kidData={kidData} previewMode={isPreview} />
    </div>
  )
}
