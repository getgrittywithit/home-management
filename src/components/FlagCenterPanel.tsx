'use client'

import { useState, useEffect } from 'react'
import { useDashboardData } from '@/context/DashboardDataContext'
import {
  Bell, MessageCircle, AlertTriangle, Heart, CheckCircle,
  Calendar, Dog, GraduationCap, X, ChevronRight, Zap, ChefHat, ChevronDown, FileText
} from 'lucide-react'

interface MealRequest {
  id: number
  kid_name: string
  assigned_date: string
  meal_name: string
  theme?: string
  sides?: string
  selected_starch?: string
  selected_veggie?: string
  sub_option_label?: string
  sub_option_heat?: string
}

interface FlagData {
  messages: { from_kid: string; count: number }[]
  breaks: { kid_name: string; created_at: string }[]
  sick_days: { kid_name: string; sick_date: string }[]
  missed_chores: { child_name: string; event_id: string }[]
  pet_care: { pet: string; issue: string; severity: string }[]
  upcoming_meetings: { kid_name: string; next_meeting_date: string; next_meeting_time: string; plan_type: string }[]
  upcoming_meetings_30d: { kid_name: string; plan_type: string; plan_label?: string; next_meeting_date: string }[]
  expiring_exemptions: { kid_name: string; display_name?: string; vaccine_exemption_expiry: string }[]
  expiring_documents: { kid_name: string; doc_type: string; doc_label?: string; expiration_date: string }[]
  calendar_events: unknown[]
  zone_status: { completed: number; total: number }
  checklist_status: { completed: number; total: number }
  points_today: number
  total_unread: number
  meal_requests: MealRequest[]
}

interface FlagItem {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  description: string
  navigateTo?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onNavigate: (tab: string) => void
}

export default function FlagCenterPanel({ open, onClose, onNavigate }: Props) {
  const ctx = useDashboardData()
  const data = (ctx.loaded ? ctx.flagsData : null) as FlagData | null
  const loading = !ctx.loaded

  const [swapOpenId, setSwapOpenId] = useState<number | null>(null)
  const [swapMeals, setSwapMeals] = useState<{ id: number; name: string }[]>([])
  const [swapLoading, setSwapLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const getSeason = () => {
    const month = new Date().getMonth() + 1
    return (month >= 3 && month <= 8) ? 'spring-summer' : 'fall-winter'
  }

  const handleApproveMeal = async (requestId: number) => {
    setActionLoading(requestId)
    try {
      await fetch('/api/parent/meal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', requestId }),
      })
      ctx.refresh()
    } catch (err) {
      console.error('Approve error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleOpenSwap = async (requestId: number, theme: string) => {
    setSwapOpenId(requestId)
    setSwapLoading(true)
    try {
      const res = await fetch(`/api/parent/meal-requests?action=available_meals&theme=${theme}&season=${getSeason()}`)
      const data = await res.json()
      setSwapMeals(data.meals || [])
    } catch {
      setSwapMeals([])
    } finally {
      setSwapLoading(false)
    }
  }

  const handleSwapMeal = async (requestId: number, newMealId: number) => {
    setActionLoading(requestId)
    try {
      await fetch('/api/parent/meal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'swap', requestId, newMealId }),
      })
      setSwapOpenId(null)
      ctx.refresh()
    } catch (err) {
      console.error('Swap error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Build sections from data
  const needsAttention: FlagItem[] = []
  const overdueIncomplete: FlagItem[] = []
  const comingUp: FlagItem[] = []
  const statusSnapshot: FlagItem[] = []

  if (data) {
    // -- Needs Attention Now --
    if (data.breaks.length > 0) {
      data.breaks.forEach(b => {
        needsAttention.push({
          icon: Heart,
          iconColor: 'text-red-500',
          title: `${b.kid_name} requested a break`,
          description: 'Mood check-in flagged — needs parent attention',
          navigateTo: 'health',
        })
      })
    }

    if (data.sick_days.length > 0) {
      data.sick_days.forEach(s => {
        needsAttention.push({
          icon: AlertTriangle,
          iconColor: 'text-orange-500',
          title: `${s.kid_name} reported sick today`,
          description: 'Self-reported sick day',
          navigateTo: 'health',
        })
      })
    }

    if (data.messages.length > 0) {
      data.messages.forEach(m => {
        needsAttention.push({
          icon: MessageCircle,
          iconColor: 'text-blue-500',
          title: `${m.count} unread message${m.count > 1 ? 's' : ''} from ${m.from_kid}`,
          description: 'Tap to read and respond',
          navigateTo: 'messages-alerts',
        })
      })
    }

    // Meal requests are rendered separately with action buttons (not as FlagItems)

    // -- Overdue / Incomplete --
    if (data.missed_chores.length > 0) {
      const grouped: Record<string, number> = {}
      data.missed_chores.forEach(c => {
        grouped[c.child_name] = (grouped[c.child_name] || 0) + 1
      })
      Object.entries(grouped).forEach(([kid, count]) => {
        overdueIncomplete.push({
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          title: `${kid}: ${count} zone task${count > 1 ? 's' : ''} incomplete`,
          description: 'Yesterday\'s zone chores were not finished',
          navigateTo: 'chores',
        })
      })
    }

    if (data.pet_care.length > 0) {
      data.pet_care.forEach(p => {
        overdueIncomplete.push({
          icon: Dog,
          iconColor: 'text-amber-600',
          title: `${p.pet} care overdue`,
          description: p.issue,
          navigateTo: 'belle-care',
        })
      })
    }

    // -- Coming Up --
    if (data.upcoming_meetings.length > 0) {
      data.upcoming_meetings.forEach(m => {
        const dateStr = new Date(m.next_meeting_date).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', timeZone: 'America/Chicago'
        })
        comingUp.push({
          icon: GraduationCap,
          iconColor: 'text-emerald-600',
          title: `${m.kid_name} — ${m.plan_type} meeting`,
          description: `${dateStr}${m.next_meeting_time ? ' at ' + m.next_meeting_time : ''}`,
          navigateTo: 'homeschool',
        })
      })
    }

    // Upcoming ARD/504 meetings (30-day window, from student_plans)
    if (data.upcoming_meetings_30d?.length > 0) {
      data.upcoming_meetings_30d.forEach(m => {
        // Avoid duplicate if already shown in the 7-day meetings above
        const alreadyShown = data.upcoming_meetings.some(
          um => um.kid_name === m.kid_name && um.next_meeting_date === m.next_meeting_date
        )
        if (alreadyShown) return

        if (!m.next_meeting_date) return
        const meetDate = new Date(m.next_meeting_date + 'T12:00:00')
        if (isNaN(meetDate.getTime())) return
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const daysUntil = Math.ceil((meetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const dateStr = meetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const kidDisplay = m.kid_name.charAt(0).toUpperCase() + m.kid_name.slice(1)
        comingUp.push({
          icon: GraduationCap,
          iconColor: 'text-purple-500',
          title: `${kidDisplay} ${m.plan_type?.toUpperCase() || 'ARD'} meeting in ${daysUntil} days — ${dateStr}`,
          description: `${m.plan_type?.toUpperCase() || 'ARD'} plan meeting`,
          navigateTo: 'homeschool',
        })
      })
    }

    // Vaccine exemptions expiring
    if (data.expiring_exemptions?.length > 0) {
      data.expiring_exemptions.forEach(ex => {
        if (!ex.vaccine_exemption_expiry) return
        const expDate = new Date(ex.vaccine_exemption_expiry + 'T12:00:00')
        if (isNaN(expDate.getTime())) return
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const kidDisplay = (ex.display_name || ex.kid_name).charAt(0).toUpperCase() + (ex.display_name || ex.kid_name).slice(1)
        comingUp.push({
          icon: AlertTriangle,
          iconColor: 'text-red-500',
          title: `${kidDisplay} vaccine exemption expires in ${daysUntil} days`,
          description: expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          navigateTo: 'homeschool',
        })
      })
    }

    // Documents expiring
    if (data.expiring_documents?.length > 0) {
      data.expiring_documents.forEach(doc => {
        const expDate = new Date(doc.expiration_date + 'T12:00:00')
        const kidDisplay = doc.kid_name.charAt(0).toUpperCase() + doc.kid_name.slice(1)
        const docLabel = doc.doc_label || doc.doc_type || 'document'
        comingUp.push({
          icon: FileText,
          iconColor: 'text-teal-500',
          title: `${kidDisplay} ${docLabel} expires ${expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          description: `Document expiration`,
          navigateTo: 'homeschool',
        })
      })
    }

    // -- Today's Status Snapshot --
    statusSnapshot.push({
      icon: CheckCircle,
      iconColor: data.zone_status.completed === data.zone_status.total ? 'text-green-500' : 'text-gray-400',
      title: `Zones: ${data.zone_status.completed}/${data.zone_status.total} kids complete`,
      description: data.zone_status.completed === data.zone_status.total && data.zone_status.total > 0
        ? 'All zones done!'
        : `${data.zone_status.total - data.zone_status.completed} still in progress`,
      navigateTo: 'chores',
    })

    statusSnapshot.push({
      icon: CheckCircle,
      iconColor: data.checklist_status.completed === data.checklist_status.total ? 'text-green-500' : 'text-gray-400',
      title: `Checklists: ${data.checklist_status.completed}/${data.checklist_status.total} kids complete`,
      description: data.checklist_status.completed === data.checklist_status.total && data.checklist_status.total > 0
        ? 'All checklists done!'
        : `${data.checklist_status.total - data.checklist_status.completed} still working`,
      navigateTo: 'kids-checklist',
    })

    statusSnapshot.push({
      icon: Zap,
      iconColor: 'text-amber-500',
      title: `${data.points_today} points earned today`,
      description: 'Family-wide total',
      navigateTo: 'stars-rewards',
    })
  }

  const sections = [
    { title: 'Needs Attention Now', items: needsAttention, color: 'text-red-600', bgColor: 'bg-red-50' },
    { title: 'Overdue / Incomplete', items: overdueIncomplete, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { title: 'Coming Up', items: comingUp, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: "Today's Status", items: statusSnapshot, color: 'text-gray-700', bgColor: 'bg-gray-50' },
  ]

  const handleNavigate = (tab?: string) => {
    if (tab) onNavigate(tab)
  }

  // Skeleton loader
  const Skeleton = () => (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h2 className="text-lg font-bold">Notification Center</h2>
            {data && data.total_unread > 0 && (
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                {data.total_unread} new
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-64px)]">
          {loading || !data ? (
            <Skeleton />
          ) : (Object.keys(data).length === 0 && !loading) ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No flags or alerts right now.</p>
              <button
                onClick={() => ctx.refresh()}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-5">
              {sections.map(section => {
                const mealCount = section.title === 'Needs Attention Now' ? (data.meal_requests?.length || 0) : 0
                const totalCount = section.items.length + mealCount
                if (totalCount === 0 && section.title !== "Today's Status") return null
                return (
                  <div key={section.title}>
                    {/* Section header */}
                    <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${section.bgColor} mb-2`}>
                      <h3 className={`text-sm font-semibold ${section.color}`}>
                        {section.title}
                      </h3>
                      <span className={`text-xs font-medium ${section.color}`}>
                        {totalCount}
                      </span>
                    </div>

                    {/* Items */}
                    {section.items.length === 0 ? (
                      <p className="text-sm text-gray-400 px-3 py-2">Nothing here right now</p>
                    ) : (
                      <div className="space-y-1.5">
                        {section.items.map((item, idx) => {
                          const Icon = item.icon
                          return (
                            <button
                              key={idx}
                              onClick={() => handleNavigate(item.navigateTo)}
                              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                            >
                              <div className="mt-0.5 flex-shrink-0">
                                <Icon className={`w-5 h-5 ${item.iconColor}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {item.description}
                                </p>
                              </div>
                              {item.navigateTo && (
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 mt-1 flex-shrink-0" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Meal request action cards in Needs Attention section */}
                    {section.title === 'Needs Attention Now' && data.meal_requests?.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {data.meal_requests.map(mr => {
                          const dateObj = new Date(mr.assigned_date + 'T12:00:00')
                          const dateLabel = dateObj.toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago'
                          })
                          const kidDisplay = mr.kid_name.charAt(0).toUpperCase() + mr.kid_name.slice(1)
                          const isActioning = actionLoading === mr.id

                          return (
                            <div key={mr.id} className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                              <div className="flex items-start gap-3">
                                <ChefHat className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">
                                    {kidDisplay} requested {mr.meal_name}{mr.sub_option_label ? ` — ${mr.sub_option_label} (${mr.sub_option_heat === 'hot' ? '🔥 Hot' : '😌 Mild'})` : ''}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    For {dateLabel}{(mr.selected_starch || mr.selected_veggie)
                                      ? ` · Sides: ${[mr.selected_starch, mr.selected_veggie].filter(Boolean).join(' + ')}`
                                      : mr.sides ? ` · Sides: ${mr.sides}` : ''}
                                  </p>
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() => handleApproveMeal(mr.id)}
                                      disabled={isActioning}
                                      className="bg-green-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                                    >
                                      {isActioning ? '...' : 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => handleOpenSwap(mr.id, mr.theme || '')}
                                      disabled={isActioning}
                                      className="bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                      Swap <ChevronDown className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {/* Swap dropdown */}
                                  {swapOpenId === mr.id && (
                                    <div className="mt-2 bg-white border rounded-lg shadow-sm p-2 space-y-1">
                                      {swapLoading ? (
                                        <p className="text-xs text-gray-400 p-2">Loading alternatives...</p>
                                      ) : swapMeals.length === 0 ? (
                                        <p className="text-xs text-gray-400 p-2">No alternatives available</p>
                                      ) : (
                                        swapMeals.map(meal => (
                                          <button
                                            key={meal.id}
                                            onClick={() => handleSwapMeal(mr.id, meal.id)}
                                            disabled={isActioning}
                                            className="w-full text-left text-sm px-3 py-2 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                                          >
                                            {meal.name}
                                          </button>
                                        ))
                                      )}
                                      <button
                                        onClick={() => setSwapOpenId(null)}
                                        className="w-full text-xs text-gray-400 py-1 hover:text-gray-600"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* All clear message */}
              {needsAttention.length === 0 && overdueIncomplete.length === 0 && comingUp.length === 0 && (data.meal_requests?.length || 0) === 0 && (
                <div className="text-center py-6">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">All clear!</p>
                  <p className="text-xs text-gray-500 mt-1">No urgent flags right now</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
