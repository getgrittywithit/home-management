'use client'

import { useState, useEffect } from 'react'
import { Star, ChevronRight } from 'lucide-react'
import { HOMESCHOOL_KIDS } from '@/lib/constants'

interface Props { kidName: string }

export default function FunFridayTracker({ kidName }: Props) {
  const kid = kidName.toLowerCase()
  const [data, setData] = useState<any>(null)

  const isHomeschool = (HOMESCHOOL_KIDS as readonly string[]).includes(kid)
  const dow = new Date().getDay()
  const isFriday = dow === 5
  const isWeekend = dow === 0 || dow === 6
  const isMonday = dow === 1

  useEffect(() => {
    if (!isHomeschool || isMonday || isWeekend) return
    fetch(`/api/fun-friday?action=get_kid_status&kid_name=${kid}`)
      .then(r => r.json()).then(setData).catch(() => {})
  }, [kid, isHomeschool, isMonday, isWeekend])

  if (!isHomeschool || isMonday || isWeekend || !data) return null

  if (data.status === 'earned_picked') {
    return (
      <div className="bg-gradient-to-r from-yellow-400 to-amber-400 text-white p-4 rounded-xl">
        <p className="text-sm font-medium flex items-center gap-2">
          <Star className="w-4 h-4 fill-white" /> Fun Friday earned! Your pick: {data.pick?.option_text_snapshot}
        </p>
      </div>
    )
  }

  if (data.status === 'earned_unpicked') {
    return (
      <div className="bg-gradient-to-r from-yellow-400 to-amber-400 text-white p-4 rounded-xl cursor-pointer hover:from-yellow-500 hover:to-amber-500">
        <p className="text-sm font-medium flex items-center gap-2">
          <Star className="w-4 h-4 fill-white" /> You earned Fun Friday! Pick your plan <ChevronRight className="w-4 h-4" />
        </p>
      </div>
    )
  }

  if (data.status === 'not_earned') {
    return (
      <div className="bg-gray-100 text-gray-600 p-3 rounded-xl text-xs">
        Friday this week is a normal day. Next week starts fresh!
      </div>
    )
  }

  if (data.status === 'in_progress') {
    const { days_hit, days_required, days_checked } = data
    const pct = days_required > 0 ? Math.round((days_hit / days_required) * 100) : 0
    const isThursday = dow === 4

    return (
      <div className={`rounded-xl p-3 border ${isThursday ? 'bg-amber-50 border-amber-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            Fun Friday tracker
          </p>
          <span className="text-xs text-amber-600">{days_hit}/{days_required} days</span>
        </div>
        <div className="w-full bg-amber-200 rounded-full h-1.5 mt-2">
          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <p className="text-[11px] text-amber-700 mt-1.5">
          {isThursday
            ? `Last day! You've hit your goal ${days_hit} of ${days_checked} days so far. Finish today to qualify.`
            : `You've hit your goal ${days_hit} of ${days_checked} days so far. Need ${days_required} by Thursday.`}
        </p>
      </div>
    )
  }

  return null
}
