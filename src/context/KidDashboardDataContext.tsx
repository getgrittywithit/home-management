'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface KidDashboardData {
  kidName: string
  dashboardEvents: any[]
  homeExtras: { familyEvents: any[]; countdownEvents: any[]; lolaStatus: { status: string; note: string | null } }
  announcements: any[]
  mealRequest: any | null
  onboardingComplete: boolean | null
  homeschoolTasks: any[]
  tasksBySubject: Record<string, any[]>
  totalTasks: number
  completedTasks: number
  taskInstructions: Record<string, string[]>
  wordOfTheDay: any | null
  currentlyReading: string
  zoneTasks: any
  starBalance: any
  digiPet: any
  loaded: boolean
  refresh: () => void
}

const defaults: KidDashboardData = {
  kidName: '',
  dashboardEvents: [],
  homeExtras: { familyEvents: [], countdownEvents: [], lolaStatus: { status: 'available', note: null } },
  announcements: [],
  mealRequest: null,
  onboardingComplete: null,
  homeschoolTasks: [],
  tasksBySubject: {},
  totalTasks: 0,
  completedTasks: 0,
  taskInstructions: {},
  wordOfTheDay: null,
  currentlyReading: '',
  zoneTasks: null,
  starBalance: null,
  digiPet: null,
  loaded: false,
  refresh: () => {},
}

const KidDashboardDataContext = createContext<KidDashboardData>(defaults)
export const useKidDashboardData = () => useContext(KidDashboardDataContext)

const safeFetch = async (url: string, fallback: any, timeoutMs = 10000) => {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const r = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!r.ok) return fallback
    return await r.json()
  } catch { return fallback }
}

interface ProviderProps {
  children: ReactNode
  kidName: string
  isHomeschool: boolean
  isDinnerDay: boolean
  todayStr: string
}

export function KidDashboardDataProvider({ children, kidName, isHomeschool, isDinnerDay, todayStr }: ProviderProps) {
  const [data, setData] = useState<KidDashboardData>({ ...defaults, kidName })
  const childKey = kidName.toLowerCase()

  const loadAll = useCallback(async () => {
    try {
      // Batch 1: Core data (6 calls)
      const [dashboard, homeExtras, profile, announcements, zoneTasks, starBal] = await Promise.all([
        safeFetch(`/api/kids/dashboard?child=${childKey}`, { events: [] }),
        safeFetch('/api/kids/dashboard?action=get_home_extras', { familyEvents: [], countdownEvents: [], lolaStatus: { status: 'available', note: null } }),
        safeFetch(`/api/kid-profile?action=get_profile&kid_name=${childKey}`, { profile: null }),
        safeFetch('/api/kids/messages?action=get_announcements', { announcements: [] }),
        safeFetch(`/api/kids/zone-tasks?action=get_morning_status&kid=${childKey}`, {}),
        safeFetch(`/api/stars?action=get_balance&kid_name=${childKey}`, {}),
      ])

      // Batch 2: Homeschool + meal + pet (conditional, ≤6 calls)
      const batch2: Promise<any>[] = [
        safeFetch(`/api/digi-pet?action=get_pet&kid_name=${childKey}`, {}),
      ]
      const batch2Keys = ['pet']

      if (isHomeschool) {
        batch2.push(safeFetch(`/api/homeschool?action=get_todays_tasks&kid_name=${childKey}`, { tasks: [], by_subject: {} }))
        batch2Keys.push('tasks')
        batch2.push(safeFetch('/api/homeschool?action=get_task_instructions', { instructions: [] }))
        batch2Keys.push('instructions')
        batch2.push(safeFetch('/api/vocab?action=get_word_of_the_day', {}))
        batch2Keys.push('vocab')
      }

      if (isDinnerDay) {
        batch2.push(safeFetch(`/api/parent/meal-requests?action=my_request&kid=${childKey}&date=${todayStr}`, { request: null }))
        batch2Keys.push('meal')
      }

      const batch2Results = await Promise.all(batch2)

      let homeschoolTasks: any[] = []
      let tasksBySubject: Record<string, any[]> = {}
      let totalTasks = 0
      let completedTasks = 0
      let taskInstructions: Record<string, string[]> = {}
      let wordOfTheDay: any = null
      let mealRequest: any = null
      let digiPet: any = null

      batch2Keys.forEach((key, i) => {
        const result = batch2Results[i]
        if (key === 'pet') digiPet = result
        if (key === 'tasks') {
          homeschoolTasks = result.tasks || []
          tasksBySubject = result.by_subject || {}
          totalTasks = result.total_tasks || 0
          completedTasks = result.completed_tasks || 0
        }
        if (key === 'instructions') {
          const instrMap: Record<string, string[]> = {}
          for (const instr of (result.instructions || [])) {
            instrMap[`${instr.task_source}:${instr.task_key}`] = instr.steps
          }
          taskInstructions = instrMap
        }
        if (key === 'vocab') wordOfTheDay = result.word ? result : null
        if (key === 'meal') mealRequest = result.request || null
      })

      setData(prev => ({
        ...prev,
        kidName,
        dashboardEvents: dashboard.events || [],
        homeExtras: {
          familyEvents: homeExtras.familyEvents || [],
          countdownEvents: homeExtras.countdownEvents || [],
          lolaStatus: homeExtras.lolaStatus || defaults.homeExtras.lolaStatus,
        },
        onboardingComplete: profile.profile?.onboarding_complete ?? true,
        announcements: announcements.announcements || [],
        zoneTasks,
        starBalance: starBal,
        digiPet,
        homeschoolTasks,
        tasksBySubject,
        totalTasks,
        completedTasks,
        taskInstructions,
        wordOfTheDay,
        mealRequest,
        loaded: true,
      }))
    } catch {
      setData(prev => ({ ...prev, loaded: true }))
    }
  }, [childKey, kidName, isHomeschool, isDinnerDay, todayStr])

  useEffect(() => { loadAll() }, [loadAll])

  return (
    <KidDashboardDataContext.Provider value={{ ...data, refresh: loadAll }}>
      {children}
    </KidDashboardDataContext.Provider>
  )
}
