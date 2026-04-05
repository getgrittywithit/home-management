'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function SharePage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/shopping?action=get_share_data&token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">Loading...</p></div>
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-gray-700">This link has expired or is invalid.</p>
        <p className="text-sm text-gray-400">Ask the family for a new shopping link.</p>
      </div>
    </div>
  )

  const profile = data?.profile || {}
  const kidName = (data?.kid_name || '').charAt(0).toUpperCase() + (data?.kid_name || '').slice(1)
  const sizes = typeof profile.sizes === 'string' ? JSON.parse(profile.sizes) : (profile.sizes || {})
  const parse = (v: any) => { if (!v) return []; if (typeof v === 'string') try { return JSON.parse(v) } catch { return [] } return v }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
            {'\uD83D\uDED2'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Shopping Guide for {kidName}</h1>
          <p className="text-sm text-gray-500 mt-1">Shared by the Moses family</p>
        </div>

        {/* Sizes */}
        {Object.keys(sizes).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="font-semibold text-gray-900 mb-3">{'\uD83D\uDCCF'} Sizes</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(sizes).map(([key, val]) => (
                <div key={key} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 uppercase">{key}</p>
                  <p className="font-medium text-gray-900">{val as string}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sensory Notes */}
        {parse(profile.sensory_triggers).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="font-semibold text-amber-900 mb-2">{'\u26A0\uFE0F'} Sensory Notes</h2>
            <p className="text-sm text-amber-800 mb-2">Please avoid items with these features:</p>
            <div className="flex flex-wrap gap-2">
              {parse(profile.sensory_triggers).map((t: string, i: number) => (
                <span key={i} className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">{'\u2764\uFE0F'} Preferences</h2>
          {parse(profile.fabric_preferences).length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Fabrics they like</p>
              <div className="flex flex-wrap gap-1.5">
                {parse(profile.fabric_preferences).map((f: string, i: number) => (
                  <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-sm">{f}</span>
                ))}
              </div>
            </div>
          )}
          {parse(profile.fit_preferences).length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Fit preference</p>
              <p className="text-sm text-gray-700">{parse(profile.fit_preferences).join(', ')}</p>
            </div>
          )}
          {parse(profile.favorite_brands).length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Favorite brands</p>
              <p className="text-sm text-gray-700">{parse(profile.favorite_brands).join(', ')}</p>
            </div>
          )}
        </div>

        {/* Wish List */}
        {parse(profile.wish_list).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="font-semibold text-gray-900 mb-2">{'\uD83C\uDF1F'} Wish List</h2>
            <ul className="space-y-1.5">
              {parse(profile.wish_list).map((item: string, i: number) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-gray-400">{'\u2022'}</span> {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Avoid */}
        {parse(profile.avoid_list).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h2 className="font-semibold text-red-900 mb-2">{'\uD83D\uDEAB'} Please Avoid</h2>
            <ul className="space-y-1">
              {parse(profile.avoid_list).map((item: string, i: number) => (
                <li key={i} className="text-sm text-red-800">{'\u2022'} {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Parent Notes */}
        {profile.notes && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="font-semibold text-gray-900 mb-2">{'\uD83D\uDCDD'} Notes from Mom</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{profile.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-4">
          <p>Shared via Family Ops</p>
          {data?.expires_at && <p>Link expires {new Date(data.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
        </div>
      </div>
    </div>
  )
}
