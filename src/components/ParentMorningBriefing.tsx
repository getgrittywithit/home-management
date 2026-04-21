'use client'

import { useState, useEffect } from 'react'
import { Sun, AlertTriangle, Calendar, Copy, Check } from 'lucide-react'
import { HOMESCHOOL_KIDS, KID_DISPLAY } from '@/lib/constants'

const KID_EMOJI: Record<string, string> = { amos: '🧡', ellie: '🌻', wyatt: '⚡', hannah: '🌱' }

export default function ParentMorningBriefing() {
  const [plans, setPlans] = useState<Record<string, any[]>>({})
  const [flags, setFlags] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const hour = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Chicago' }).format(new Date()))
  const isMorning = hour >= 6 && hour < 11

  useEffect(() => {
    if (!isMorning) { setLoaded(true); return }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    Promise.all(
      [...HOMESCHOOL_KIDS].map(async kid => {
        const res = await fetch(`/api/homeschool?action=get_daily_tasks&kid_name=${kid}&date=${today}`).then(r => r.json()).catch(() => ({ tasks: [] }))
        return [kid, res.tasks || []] as const
      })
    ).then(entries => {
      setPlans(Object.fromEntries(entries))
      const f: string[] = []
      for (const [kid, tasks] of entries) {
        if (tasks.length === 0) f.push(`${KID_DISPLAY[kid]} has no plan generated yet`)
      }
      setFlags(f)
      setLoaded(true)
    })
  }, [isMorning])

  if (!isMorning || !loaded) return null

  const hasPlans = Object.values(plans).some(t => t.length > 0)
  if (!hasPlans && flags.length === 0) return null

  const generateClassroomPost = (kid: string) => {
    const tasks = plans[kid] || []
    const name = KID_DISPLAY[kid]
    const lines = tasks.map((t: any) => {
      const icon = t.subject_name === 'Math' ? '➕' : t.subject_name === 'ELAR' ? '📚' : t.subject_name === 'Enrichment' ? '🌟' : '📖'
      return `${icon} ${t.task_title || t.title}`
    })
    return `Good morning, ${name}! 🌱\n\nHere's your learning plan for today:\n\n${lines.join('\n')}\n\nTake your time, you've got this! — Mom`
  }

  const copyForKid = (kid: string) => {
    navigator.clipboard.writeText(generateClassroomPost(kid))
    setCopied(kid)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
        <Sun className="w-4 h-4 text-amber-500" /> Morning Briefing
      </h3>

      {flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
          {flags.map((f, i) => (
            <p key={i} className="text-xs text-amber-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {f}</p>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {[...HOMESCHOOL_KIDS].map(kid => {
          const tasks = plans[kid] || []
          if (tasks.length === 0) return null
          return (
            <div key={kid} className="flex items-start gap-2">
              <span className="text-sm mt-0.5">{KID_EMOJI[kid]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700">{KID_DISPLAY[kid]}</p>
                <p className="text-[11px] text-gray-500 truncate">
                  {tasks.map((t: any) => t.task_title || t.title).join(' · ')}
                </p>
              </div>
              <button onClick={() => copyForKid(kid)} title={`Copy Classroom post for ${KID_DISPLAY[kid]}`}
                className="p-1 rounded hover:bg-gray-100 flex-shrink-0">
                {copied === kid ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
