'use client'

import { useState, useEffect } from 'react'
import { GraduationCap, ExternalLink, BarChart2 } from 'lucide-react'
import { HOMESCHOOL_KIDS, KID_DISPLAY } from '@/lib/constants'

export default function ParentSchoolQuickLaunch() {
  const [configs, setConfigs] = useState<Record<string, any>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all(
      [...HOMESCHOOL_KIDS].map(async kid => {
        const res = await fetch(`/api/school/kid-portals?kid_name=${kid}`).then(r => r.json()).catch(() => ({}))
        return [kid, res] as const
      })
    ).then(entries => {
      setConfigs(Object.fromEntries(entries))
      setLoaded(true)
    })
  }, [])

  if (!loaded) return null

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
        <GraduationCap className="w-4 h-4 text-teal-500" /> School Quick Links
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[...HOMESCHOOL_KIDS].map(kid => {
          const cfg = configs[kid]
          const url = cfg?.classroom?.classroom_url || 'https://classroom.google.com/h'
          return (
            <a key={kid} href={url} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 text-center">
              <GraduationCap className="w-5 h-5" />
              <span className="text-xs font-medium">{KID_DISPLAY[kid]}</span>
              <span className="text-[10px] text-blue-500">Classroom</span>
            </a>
          )
        })}
      </div>
      <a href="https://www.ixl.com/analytics/child-summary" target="_blank" rel="noopener noreferrer"
        className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-sm font-medium hover:bg-teal-100">
        <BarChart2 className="w-4 h-4" /> IXL Parent Analytics <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
      </a>
    </div>
  )
}
