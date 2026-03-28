'use client'
import { useState, useEffect } from 'react'
import { X, Home, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface KidZoneStatus {
  kid_name: string
  zone_name: string
  task_count: number
  completed_count: number
  status: 'done' | 'in_progress' | 'not_started'
}

interface Props { open: boolean; onClose: () => void }

const STATUS_CONFIG = {
  done: { label: 'Done', icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700' },
  in_progress: { label: 'In Progress', icon: Clock, bg: 'bg-yellow-100', text: 'text-yellow-700' },
  not_started: { label: 'Not Started', icon: AlertCircle, bg: 'bg-gray-100', text: 'text-gray-500' },
}

const KID_COLORS: Record<string, string> = {
  amos: 'bg-blue-200 text-blue-800',
  ellie: 'bg-purple-200 text-purple-800',
  wyatt: 'bg-green-200 text-green-800',
  hannah: 'bg-pink-200 text-pink-800',
  zoey: 'bg-amber-200 text-amber-800',
  kaylee: 'bg-teal-200 text-teal-800',
}

export default function CheckZonesPanel({ open, onClose }: Props) {
  const [zones, setZones] = useState<KidZoneStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/kids/checklist?action=today_zone_status')
      .then(r => r.json())
      .then(data => { setZones(data.zones || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [open])

  if (!open) return null

  const doneCount = zones.filter(z => z.status === 'done').length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900">Today's Zone Status</h3>
            {!loading && zones.length > 0 && (
              <span className="text-sm text-gray-500 ml-2">{doneCount}/{zones.length} complete</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No zones scheduled today</div>
          ) : (
            <div className="space-y-3">
              {zones.map(z => {
                const config = STATUS_CONFIG[z.status]
                const Icon = config.icon
                const kidColor = KID_COLORS[z.kid_name.toLowerCase()] || 'bg-gray-200 text-gray-800'
                return (
                  <div key={z.kid_name} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${kidColor}`}>
                      {z.kid_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 capitalize">{z.kid_name}</p>
                      <p className="text-sm text-gray-500">{z.zone_name}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {config.label}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
