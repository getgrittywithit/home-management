'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface DashboardData {
  kidsChecklist: { weekOf: string; kids: any[] }
  taskProgress: { progress: any[] }
  habitsData: { habits_by_member: Record<string, any[]>; date: string }
  flagsData: any
  pointsBalances: { balances: any[]; settings: any; sickDayCounts: any }
  familyGoals: { familyGoals: any[] }
  rewardsBalances: { balances: any[] }
  rewardsPhotos: { submissions: any[] }
  rewardsRedemptions: { redemptions: any[] }
  loaded: boolean
  refresh: () => void
}

const defaults: DashboardData = {
  kidsChecklist: { weekOf: '', kids: [] },
  taskProgress: { progress: [] },
  habitsData: { habits_by_member: {}, date: '' },
  flagsData: {},
  pointsBalances: { balances: [], settings: { mode: 'points', conversion_rate: 0.10 }, sickDayCounts: {} },
  familyGoals: { familyGoals: [] },
  rewardsBalances: { balances: [] },
  rewardsPhotos: { submissions: [] },
  rewardsRedemptions: { redemptions: [] },
  loaded: false,
  refresh: () => {},
}

const DashboardDataContext = createContext<DashboardData>(defaults)
export const useDashboardData = () => useContext(DashboardDataContext)

const safeFetch = async (url: string, fallback: any) => {
  try {
    const r = await fetch(url)
    if (!r.ok) return fallback
    return await r.json()
  } catch { return fallback }
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData>(defaults)

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  const loadAll = useCallback(async () => {
    try {
      // Batch 1: 6 calls (within browser's 6-connection limit)
      const [checklist, tasks, habits, flags, rwdBal, rwdPhotos] = await Promise.all([
        safeFetch('/api/kids/checklist?action=get_all_completion', { weekOf: '', kids: [] }),
        safeFetch('/api/homeschool?action=get_task_progress', { progress: [] }),
        safeFetch(`/api/habits?action=get_all_habits_today&date=${today}`, { habits_by_member: {} }),
        safeFetch('/api/parent/flags?action=get_all_flags', {}),
        safeFetch('/api/rewards?action=balances', { balances: [] }),
        safeFetch('/api/rewards?action=photo_submissions', { submissions: [] }),
      ])

      // Batch 2: 3 calls (after batch 1 connections close)
      const [rwdRedeem, ptsBal, ptsGoals] = await Promise.all([
        safeFetch('/api/rewards?action=redemptions', { redemptions: [] }),
        safeFetch('/api/kids/points?action=get_all_balances', { balances: [], settings: {}, sickDayCounts: {} }),
        safeFetch('/api/kids/points?action=get_family_goals', { familyGoals: [] }),
      ])

      setData(prev => ({
        ...prev,
        kidsChecklist: checklist,
        taskProgress: tasks,
        habitsData: habits,
        flagsData: flags,
        pointsBalances: ptsBal,
        familyGoals: ptsGoals,
        rewardsBalances: rwdBal,
        rewardsPhotos: rwdPhotos,
        rewardsRedemptions: rwdRedeem,
        loaded: true,
      }))
    } catch {
      setData(prev => ({ ...prev, loaded: true }))
    }
  }, [today])

  useEffect(() => { loadAll() }, [loadAll])

  return (
    <DashboardDataContext.Provider value={{ ...data, refresh: loadAll }}>
      {children}
    </DashboardDataContext.Provider>
  )
}
