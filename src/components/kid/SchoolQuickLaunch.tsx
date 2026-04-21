'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, BookOpen, Calculator, GraduationCap } from 'lucide-react'
import { HOMESCHOOL_KIDS } from '@/lib/constants'

interface Props { kidName: string }

export default function SchoolQuickLaunch({ kidName }: Props) {
  const kid = kidName.toLowerCase()
  const [data, setData] = useState<any>(null)

  if (!(HOMESCHOOL_KIDS as readonly string[]).includes(kid)) return null

  useEffect(() => {
    fetch(`/api/school/kid-portals?kid_name=${kid}`)
      .then(r => r.json()).then(setData).catch(() => {})
  }, [kid])

  if (!data?.ixl && !data?.classroom) return null

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
        <GraduationCap className="w-4 h-4 text-teal-500" /> Your Learning Apps
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {data.ixl?.ixl_math_url && (
          <a href={data.ixl.ixl_math_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-sm font-medium hover:bg-teal-100">
            <Calculator className="w-4 h-4" /> IXL Math <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
          </a>
        )}
        {data.ixl?.ixl_ela_url && (
          <a href={data.ixl.ixl_ela_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-sm font-medium hover:bg-purple-100">
            <BookOpen className="w-4 h-4" /> IXL Reading <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
          </a>
        )}
      </div>
      {data.classroom && (
        <a href={data.classroom.classroom_url || 'https://classroom.google.com/h'} target="_blank" rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium hover:bg-blue-100 w-full">
          <GraduationCap className="w-4 h-4" /> Open My Classroom <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
        </a>
      )}
      {data.workbooks?.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {data.workbooks.map((wb: any) => {
            const pct = wb.total_pages ? Math.round((wb.last_page_completed / wb.total_pages) * 100) : 0
            return (
              <div key={wb.id} className="text-xs text-gray-500 flex items-center gap-2">
                <span className="flex-1">{wb.workbook_type === 'summer_bridge' ? '📚 Summer Bridge' : '➕ Ultimate Math'}: p.{wb.last_page_completed}</span>
                {wb.total_pages && (
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
