'use client'

import { User, Heart, Star, Palette, Gift, Eye, Edit3 } from 'lucide-react'
import { useDashboardData } from '@/context/DashboardDataContext'

interface Snapshot {
  kid_name: string
  display_name: string | null
  favorite_color: string | null
  favorite_animal: string | null
  favorite_food: string | null
  interests: string[]
  self_description: string | null
  photo_url: string | null
  updated_at: string | null
  wishes: { id: number; item_name: string }[]
}

interface KidSnapshotCardsProps {
  onViewFull?: (kidName: string) => void
  onEdit?: (kidName: string) => void
}

const COLOR_BG: Record<string, string> = {
  red: 'bg-red-100 border-red-300',
  blue: 'bg-blue-100 border-blue-300',
  green: 'bg-green-100 border-green-300',
  purple: 'bg-purple-100 border-purple-300',
  pink: 'bg-pink-100 border-pink-300',
  orange: 'bg-orange-100 border-orange-300',
  teal: 'bg-teal-100 border-teal-300',
  yellow: 'bg-yellow-100 border-yellow-300',
}

export default function KidSnapshotCards({ onViewFull, onEdit }: KidSnapshotCardsProps) {
  const ctx = useDashboardData()
  const snapshots: Snapshot[] = ctx.kidSnapshots?.snapshots || []
  const loaded = ctx.loaded

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (snapshots.length === 0) return null

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-teal-500" />
          Kid Profiles
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Snapshot of each child&apos;s favorites and interests</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {snapshots.map(snap => {
          const name = snap.kid_name.charAt(0).toUpperCase() + snap.kid_name.slice(1)
          const colorClass = snap.favorite_color ? (COLOR_BG[snap.favorite_color] || 'bg-gray-100 border-gray-300') : 'bg-gray-100 border-gray-300'

          return (
            <div key={snap.kid_name} className={`rounded-lg border p-4 ${colorClass}`}>
              <div className="flex items-center gap-3 mb-3">
                {snap.photo_url ? (
                  <img src={snap.photo_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{snap.display_name || name}</p>
                  {snap.updated_at && (
                    <p className="text-xs text-gray-500">
                      Updated {new Date(snap.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Favorites summary */}
              <div className="space-y-1 text-xs text-gray-700 mb-3">
                {snap.favorite_color && (
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3 h-3 text-gray-400" />
                    <span className="capitalize">{snap.favorite_color}</span>
                  </div>
                )}
                {snap.favorite_animal && (
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-3 h-3 text-gray-400" />
                    <span>{snap.favorite_animal}</span>
                  </div>
                )}
                {snap.favorite_food && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-gray-400" />
                    <span>{snap.favorite_food}</span>
                  </div>
                )}
              </div>

              {/* Interests */}
              {snap.interests?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {snap.interests.slice(0, 3).map(i => (
                    <span key={i} className="bg-white/60 text-gray-700 px-2 py-0.5 rounded-full text-xs">{i}</span>
                  ))}
                  {snap.interests.length > 3 && (
                    <span className="text-xs text-gray-500">+{snap.interests.length - 3}</span>
                  )}
                </div>
              )}

              {/* Wish list */}
              {snap.wishes?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">Wishes:</p>
                  {snap.wishes.slice(0, 2).map(w => (
                    <div key={w.id} className="flex items-center gap-1 text-xs text-gray-700">
                      <Gift className="w-3 h-3 text-amber-400" />
                      <span>{w.item_name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => window.open(`/kid/${snap.kid_name.toLowerCase()}?preview=parent`, '_blank')}
                  className="flex items-center gap-1 text-xs bg-white/60 hover:bg-white px-2.5 py-1.5 rounded-lg text-gray-700"
                  title={`Preview ${snap.kid_name}'s portal`}
                >
                  <Eye className="w-3 h-3" /> Preview Portal
                </button>
                {onViewFull && (
                  <button
                    onClick={() => onViewFull(snap.kid_name)}
                    className="flex items-center gap-1 text-xs bg-white/60 hover:bg-white px-2.5 py-1.5 rounded-lg text-gray-700"
                  >
                    <Eye className="w-3 h-3" /> View Full
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(snap.kid_name)}
                    className="flex items-center gap-1 text-xs bg-white/60 hover:bg-white px-2.5 py-1.5 rounded-lg text-gray-700"
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
