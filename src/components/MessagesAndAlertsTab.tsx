'use client'

import { useState } from 'react'
import { Bell, MessageCircle, ShoppingCart } from 'lucide-react'
import { useDashboardData } from '@/context/DashboardDataContext'
import MessagesTab from './MessagesTab'
import NeedsBoardTab from './NeedsBoardTab'
import NeedsAttentionPanel from './NeedsAttentionPanel'

type SubTab = 'alerts' | 'messages' | 'needs'

interface MessagesAndAlertsTabProps {
  onNavigate?: (tab: string) => void
}

export default function MessagesAndAlertsTab({ onNavigate }: MessagesAndAlertsTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('alerts')
  const ctx = useDashboardData()
  const msgCount = ctx.loaded
    ? (ctx.flagsData?.messages || []).reduce((sum: number, m: any) => sum + (m.count || 0), 0)
    : 0

  const tabs: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'messages', label: 'Messages', icon: MessageCircle, badge: msgCount },
    { id: 'needs', label: 'Needs Board', icon: ShoppingCart },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {subTab === 'alerts' && <NeedsAttentionPanel onNavigate={onNavigate || (() => {})} />}
      {subTab === 'messages' && <MessagesTab />}
      {subTab === 'needs' && <NeedsBoardTab />}
    </div>
  )
}
