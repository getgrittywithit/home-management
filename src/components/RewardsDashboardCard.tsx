'use client'

import { useState, useEffect } from 'react'
import { Star, Camera, Gift, ChevronRight } from 'lucide-react'
import { useDashboardData } from '@/context/DashboardDataContext'

interface KidMiniBalance {
  kid_name: string
  coin_balance: number
}

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee'
}
const KID_COLORS: Record<string, string> = {
  amos: 'bg-blue-500', ellie: 'bg-purple-500', wyatt: 'bg-green-500',
  hannah: 'bg-pink-500', zoey: 'bg-amber-500', kaylee: 'bg-teal-500'
}
const KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']

interface RewardsDashboardCardProps {
  onNavigate: () => void
}

export default function RewardsDashboardCard({ onNavigate }: RewardsDashboardCardProps) {
  const { rewardsBalances, rewardsPhotos, rewardsRedemptions, loaded } = useDashboardData()

  const rawBals = rewardsBalances.balances || []
  const balances = rawBals.length > 0 ? rawBals : KIDS.map(k => ({ kid_name: k, coin_balance: 0 }))
  const pendingPhotos = (rewardsPhotos.submissions || []).length
  const pendingRedemptions = (rewardsRedemptions.redemptions || []).length

  const totalPending = pendingPhotos + pendingRedemptions

  return (
    <div className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" /> Chore Rewards
        </h3>
        <button
          onClick={onNavigate}
          className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
        >
          Open <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Kid mini-rows */}
      <div className="space-y-2">
        {balances.map(b => (
          <div key={b.kid_name} className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${KID_COLORS[b.kid_name] || 'bg-gray-400'}`}>
              {(KID_DISPLAY[b.kid_name] || b.kid_name)[0]}
            </div>
            <span className="text-sm text-gray-700 flex-1">{KID_DISPLAY[b.kid_name] || b.kid_name}</span>
            <span className="text-sm font-semibold text-amber-600">&#11088; {b.coin_balance}</span>
          </div>
        ))}
      </div>

      {/* Pending badges */}
      {totalPending > 0 && (
        <div className="mt-4 pt-3 border-t flex items-center gap-3">
          {pendingPhotos > 0 && (
            <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              <Camera className="w-3.5 h-3.5" /> {pendingPhotos} photo{pendingPhotos !== 1 ? 's' : ''}
            </span>
          )}
          {pendingRedemptions > 0 && (
            <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
              <Gift className="w-3.5 h-3.5" /> {pendingRedemptions} redemption{pendingRedemptions !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">awaiting approval</span>
        </div>
      )}
    </div>
  )
}
