'use client'

import { useState, useEffect } from 'react'
import { 
  CheckSquare, Clock, Users, TrendingUp, 
  Award, AlertCircle, CheckCircle2
} from 'lucide-react'
import { getAllFamilyData } from '@/lib/familyConfig'

interface ChildProgress {
  childName: string
  totalPoints: number
  categories: {
    [key: string]: {
      totalTasks: number
      completedTasks: number
      points: number
    }
  }
}

interface KidsChecklistOverviewProps {
  date?: Date
}

export default function KidsChecklistOverview({ date = new Date() }: KidsChecklistOverviewProps) {
  const [childrenProgress, setChildrenProgress] = useState<ChildProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  const familyData = getAllFamilyData()
  const children = familyData.children

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      loadChecklistOverview()
    }
  }, [date, isClient])

  const loadChecklistOverview = async () => {
    try {
      setIsLoading(true)
      const dateStr = date.toISOString().split('T')[0]
      
      const response = await fetch(`/api/kids/checklist?date=${dateStr}`, {
        method: 'PUT' // Using PUT for the summary endpoint
      })
      
      if (response.ok) {
        const data = await response.json()
        setChildrenProgress(data.children || [])
      } else {
        // Generate mock data for display
        const mockProgress = children.map(child => ({
          childName: child.name,
          totalPoints: 0,
          categories: {}
        }))
        setChildrenProgress(mockProgress)
      }
    } catch (error) {
      console.error('Failed to load checklist overview:', error)
      setChildrenProgress([])
    } finally {
      setIsLoading(false)
    }
  }

  const getChildProgress = (childName: string) => {
    const progress = childrenProgress.find(p => p.childName === childName)
    if (!progress || !progress.categories) {
      return {
        requiredComplete: 0,
        requiredTotal: 2, // dishes + 1 required chore
        totalPoints: 0,
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0
      }
    }

    const required = (progress.categories.dishes || { completedTasks: 0, totalTasks: 1 })
    const requiredChore = (progress.categories.required_chore || { completedTasks: 0, totalTasks: 1 })
    const hygiene = (progress.categories.hygiene || { completedTasks: 0, totalTasks: 3 })
    const schoolPrep = (progress.categories.school_prep || { completedTasks: 0, totalTasks: 0 })
    const paidChores = (progress.categories.paid_chore || { completedTasks: 0, totalTasks: 3 })

    const totalTasks = required.totalTasks + requiredChore.totalTasks + hygiene.totalTasks + schoolPrep.totalTasks + paidChores.totalTasks
    const completedTasks = required.completedTasks + requiredChore.completedTasks + hygiene.completedTasks + schoolPrep.completedTasks + paidChores.completedTasks

    return {
      requiredComplete: required.completedTasks + requiredChore.completedTasks,
      requiredTotal: required.totalTasks + requiredChore.totalTasks,
      totalPoints: progress.totalPoints,
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    }
  }

  const getOverallStats = () => {
    const totalChildren = children.length
    const childrenWithRequiredDone = childrenProgress.filter(child => {
      const progress = getChildProgress(child.childName)
      return progress.requiredComplete >= progress.requiredTotal
    }).length

    const totalPoints = childrenProgress.reduce((sum, child) => sum + child.totalPoints, 0)
    const avgCompletion = childrenProgress.length > 0 
      ? Math.round(childrenProgress.reduce((sum, child) => {
          const progress = getChildProgress(child.childName)
          return sum + progress.completionRate
        }, 0) / childrenProgress.length)
      : 0

    return {
      totalChildren,
      childrenWithRequiredDone,
      totalPoints,
      avgCompletion
    }
  }

  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const stats = getOverallStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kids Daily Checklist Overview</h1>
            <p className="text-green-100">{isClient ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Loading...'}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.avgCompletion}%</div>
            <div className="text-sm text-green-100">Average Completion</div>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{stats.childrenWithRequiredDone}/{stats.totalChildren}</div>
              <div className="text-sm text-gray-600">Required Done</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold">{stats.totalPoints}</div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{stats.totalChildren}</div>
              <div className="text-sm text-gray-600">Kids Tracked</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-2xl font-bold">{stats.avgCompletion}%</div>
              <div className="text-sm text-gray-600">Avg Complete</div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Child Progress */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Individual Progress</h2>
        </div>
        
        <div className="divide-y">
          {children.map(child => {
            const progress = getChildProgress(child.name)
            const hasRequiredDone = progress.requiredComplete >= progress.requiredTotal
            
            return (
              <div key={child.name} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">👦</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{child.name}</h3>
                      <p className="text-sm text-gray-600">Age {child.age} • {child.grade}</p>
                    </div>
                    {hasRequiredDone && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Required Complete
                      </div>
                    )}
                    {!hasRequiredDone && progress.requiredComplete > 0 && (
                      <div className="flex items-center gap-1 text-orange-600 text-sm">
                        <Clock className="w-4 h-4" />
                        In Progress
                      </div>
                    )}
                    {progress.requiredComplete === 0 && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        Not Started
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{progress.completionRate}%</div>
                    <div className="text-sm text-gray-500">{progress.completedTasks}/{progress.totalTasks} tasks</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Overall Progress</span>
                    <span>{progress.completedTasks}/{progress.totalTasks}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        progress.completionRate === 100 ? 'bg-green-500' :
                        progress.completionRate >= 60 ? 'bg-blue-500' :
                        progress.completionRate >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${progress.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Task breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="text-center">
                    <div className={`font-bold ${hasRequiredDone ? 'text-green-600' : 'text-red-600'}`}>
                      {progress.requiredComplete}/{progress.requiredTotal}
                    </div>
                    <div className="text-gray-500">Required</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-600">{progress.totalPoints}</div>
                    <div className="text-gray-500">Points</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-600">{progress.completedTasks}</div>
                    <div className="text-gray-500">Done</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-600">{progress.totalTasks - progress.completedTasks}</div>
                    <div className="text-gray-500">Remaining</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-3 border rounded-lg hover:bg-gray-50 text-center">
            <CheckSquare className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-sm font-medium">Send Reminder</div>
          </button>
          <button className="p-3 border rounded-lg hover:bg-gray-50 text-center">
            <Award className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-sm font-medium">Award Bonus</div>
          </button>
          <button className="p-3 border rounded-lg hover:bg-gray-50 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="text-sm font-medium">Family Meeting</div>
          </button>
          <button className="p-3 border rounded-lg hover:bg-gray-50 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-sm font-medium">View Trends</div>
          </button>
        </div>
      </div>
    </div>
  )
}