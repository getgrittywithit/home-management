'use client'

import { useState, useEffect } from 'react'

interface ActivityItem {
  id: string
  type: string
  kid_name: string
  text: string
  icon: string
  time_ago: string
}

export default function FamilyActivityFeed() {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/parent/activity?limit=15')
      .then(r => r.json())
      .then(d => setActivity(d.activity || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-xl font-bold mb-4">Recent Family Activity</h2>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 h-10 rounded-lg" />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No recent activity — quiet day 🏡</p>
      ) : (
        <div className="space-y-1">
          {activity.map(item => (
            <div key={item.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{item.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.time_ago}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
