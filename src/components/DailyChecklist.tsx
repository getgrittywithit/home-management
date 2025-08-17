'use client'

import { useState, useEffect } from 'react'
import { 
  CheckSquare, Square, Clock, School, Utensils, 
  Sparkles, DollarSign, Lock, Trophy
} from 'lucide-react'
import { getChildScheduleForDate } from '@/lib/scheduleConfig'
import { getAllFamilyData } from '@/lib/familyConfig'

interface ChecklistItem {
  id: string
  category: 'required_chore' | 'dishes' | 'paid_chore' | 'hygiene' | 'school_prep'
  title: string
  description?: string
  completed: boolean
  points: number
  icon: React.ReactNode
  required?: boolean
}

interface DailyChecklistProps {
  childName: string
  date?: Date
}

export default function DailyChecklist({ childName, date = new Date() }: DailyChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [paidChoresUnlocked, setPaidChoresUnlocked] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Get child data for age-appropriate tasks
  const familyData = getAllFamilyData()
  const child = familyData.children.find(c => c.name.toLowerCase() === childName.toLowerCase())
  const todaySchedule = isClient && child ? getChildScheduleForDate(child.name, date) : null

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      loadDailyChecklist()
    }
  }, [childName, date, isClient])

  useEffect(() => {
    // Check if required chores are complete to unlock paid chores
    const requiredChores = checklist.filter(item => 
      (item.category === 'required_chore' || item.category === 'dishes') && item.required
    )
    const requiredComplete = requiredChores.every(item => item.completed)
    setPaidChoresUnlocked(requiredComplete)
  }, [checklist])

  const loadDailyChecklist = async () => {
    try {
      setIsLoading(true)
      
      // Load existing completion status from database
      const response = await fetch(`/api/kids/checklist?childName=${childName}&date=${date.toISOString().split('T')[0]}`)
      let completedTasks: any[] = []
      
      if (response.ok) {
        const data = await response.json()
        completedTasks = data.completedTasks || []
      }

      // Generate today's checklist
      const todayChecklist = generateDailyChecklist(completedTasks)
      setChecklist(todayChecklist)
    } catch (error) {
      console.error('Failed to load checklist:', error)
      // Generate checklist without completion status
      setChecklist(generateDailyChecklist([]))
    } finally {
      setIsLoading(false)
    }
  }

  const generateDailyChecklist = (completedTasks: any[]): ChecklistItem[] => {
    const isCompleted = (category: string, title: string) => 
      completedTasks.some(task => task.category === category && task.task_title === title)

    const items: ChecklistItem[] = []

    // 1. Required "Because You Live Here" Chores
    items.push({
      id: 'dishes-daily',
      category: 'dishes',
      title: '5 Dishes Complete',
      description: 'Wash, dry, and put away 5 dishes',
      completed: isCompleted('dishes', '5 Dishes Complete'),
      points: 0,
      icon: <Utensils className="w-5 h-5" />,
      required: true
    })

    // Add age-appropriate required chore
    const ageChore = getAgeAppropriateChore(child?.age || 8)
    items.push({
      id: 'required-chore',
      category: 'required_chore',
      title: ageChore.title,
      description: ageChore.description,
      completed: isCompleted('required_chore', ageChore.title),
      points: 0,
      icon: <CheckSquare className="w-5 h-5" />,
      required: true
    })

    // 2. Hygiene Tasks
    const hygieneItems = [
      { title: 'Brush Teeth', description: 'Morning and evening' },
      { title: 'Get Dressed', description: 'Clean clothes for the day' },
      { title: 'Make Bed', description: 'Tidy up bedroom' }
    ]

    hygieneItems.forEach((item, index) => {
      items.push({
        id: `hygiene-${index}`,
        category: 'hygiene',
        title: item.title,
        description: item.description,
        completed: isCompleted('hygiene', item.title),
        points: 0,
        icon: <Sparkles className="w-5 h-5" />
      })
    })

    // 3. School Prep (only on school days)
    if (todaySchedule && todaySchedule.periods.length > 0) {
      items.push({
        id: 'school-prep',
        category: 'school_prep',
        title: 'Backpack Ready',
        description: 'Homework done, supplies packed',
        completed: isCompleted('school_prep', 'Backpack Ready'),
        points: 0,
        icon: <School className="w-5 h-5" />
      })
    }

    // 4. Paid Chores (3 available)
    const paidChores = getPaidChores(child?.age || 8)
    paidChores.forEach((chore, index) => {
      items.push({
        id: `paid-${index}`,
        category: 'paid_chore',
        title: chore.title,
        description: chore.description,
        completed: isCompleted('paid_chore', chore.title),
        points: chore.points,
        icon: <DollarSign className="w-5 h-5" />
      })
    })

    return items
  }

  const getAgeAppropriateChore = (age: number) => {
    if (age <= 6) {
      return { title: 'Put Toys Away', description: 'Tidy up play areas' }
    } else if (age <= 9) {
      return { title: 'Set/Clear Table', description: 'Help with meal setup and cleanup' }
    } else if (age <= 12) {
      return { title: 'Empty Trash Cans', description: 'Collect and empty small trash cans' }
    } else {
      return { title: 'Vacuum One Room', description: 'Vacuum assigned room thoroughly' }
    }
  }

  const getPaidChores = (age: number) => {
    const basePoints = Math.floor(age * 0.5) // Age-based points
    
    if (age <= 6) {
      return [
        { title: 'Sort Socks', description: 'Match and fold sock pairs', points: basePoints },
        { title: 'Water Plants', description: 'Water indoor plants', points: basePoints },
        { title: 'Wipe Baseboards', description: 'Clean baseboards in one room', points: basePoints }
      ]
    } else if (age <= 9) {
      return [
        { title: 'Load Dishwasher', description: 'Load and start dishwasher', points: basePoints + 1 },
        { title: 'Sweep Floor', description: 'Sweep kitchen or dining room', points: basePoints + 1 },
        { title: 'Organize Pantry', description: 'Tidy and organize pantry items', points: basePoints }
      ]
    } else if (age <= 12) {
      return [
        { title: 'Clean Bathroom', description: 'Clean sink, mirror, and counter', points: basePoints + 2 },
        { title: 'Mop Floor', description: 'Mop kitchen or bathroom floor', points: basePoints + 2 },
        { title: 'Fold Laundry', description: 'Fold and put away laundry', points: basePoints + 1 }
      ]
    } else {
      return [
        { title: 'Deep Clean Room', description: 'Thoroughly clean assigned room', points: basePoints + 3 },
        { title: 'Meal Prep Help', description: 'Help prepare family meal', points: basePoints + 2 },
        { title: 'Organize Garage', description: 'Tidy and organize garage area', points: basePoints + 2 }
      ]
    }
  }

  const toggleItem = async (itemId: string) => {
    const item = checklist.find(i => i.id === itemId)
    if (!item) return

    // Don't allow paid chores if required chores aren't done
    if (item.category === 'paid_chore' && !paidChoresUnlocked) {
      return
    }

    const newCompleted = !item.completed

    try {
      // Update database
      await fetch('/api/kids/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName,
          date: date.toISOString().split('T')[0],
          category: item.category,
          taskTitle: item.title,
          taskDescription: item.description,
          completed: newCompleted,
          pointsEarned: newCompleted ? item.points : 0
        })
      })

      // Update local state
      setChecklist(prev => prev.map(i => 
        i.id === itemId ? { ...i, completed: newCompleted } : i
      ))
    } catch (error) {
      console.error('Failed to update checklist:', error)
    }
  }

  const getCompletionStats = () => {
    const requiredItems = checklist.filter(item => item.required)
    const requiredComplete = requiredItems.filter(item => item.completed).length
    const totalPoints = checklist.filter(item => item.completed).reduce((sum, item) => sum + item.points, 0)
    const totalItems = checklist.length
    const completedItems = checklist.filter(item => item.completed).length

    return {
      requiredComplete,
      requiredTotal: requiredItems.length,
      totalPoints,
      completedItems,
      totalItems,
      percentage: Math.round((completedItems / totalItems) * 100)
    }
  }

  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const stats = getCompletionStats()

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Daily Checklist</h1>
            <p className="text-blue-100">{isClient ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Loading...'}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.percentage}%</div>
            <div className="text-sm text-blue-100">Complete</div>
          </div>
        </div>
        
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span>{stats.totalPoints} points earned</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            <span>{stats.completedItems}/{stats.totalItems} tasks done</span>
          </div>
        </div>
      </div>

      {/* School Schedule (if school day) */}
      {todaySchedule && todaySchedule.periods.length > 0 && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <School className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold">Today's Schedule</h2>
            {todaySchedule.dayType && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                {todaySchedule.dayType} Day
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            {todaySchedule.periods.slice(0, 3).map((period, index) => (
              <div key={index} className="flex justify-between">
                <span className="font-medium">{period.course}</span>
                <span className="text-gray-500">{period.teacher}</span>
              </div>
            ))}
            {todaySchedule.periods.length > 3 && (
              <div className="text-gray-500 text-xs">+{todaySchedule.periods.length - 3} more classes</div>
            )}
          </div>
        </div>
      )}

      {/* Required Tasks */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-red-600">Required "Because You Live Here"</h2>
          <span className="text-sm text-gray-500">
            {stats.requiredComplete}/{stats.requiredTotal} complete
          </span>
        </div>
        <div className="space-y-3">
          {checklist.filter(item => item.required).map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                item.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className={`flex-shrink-0 ${item.completed ? 'text-green-600' : 'text-gray-400'}`}
              >
                {item.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </button>
              {item.icon}
              <div className="flex-1">
                <div className={`font-medium ${item.completed ? 'line-through text-gray-500' : ''}`}>
                  {item.title}
                </div>
                {item.description && (
                  <div className="text-sm text-gray-500">{item.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hygiene & School Prep */}
      <div className="bg-white p-4 rounded-lg border">
        <h2 className="font-semibold mb-3">Daily Care</h2>
        <div className="space-y-3">
          {checklist.filter(item => item.category === 'hygiene' || item.category === 'school_prep').map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                item.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className={`flex-shrink-0 ${item.completed ? 'text-green-600' : 'text-gray-400'}`}
              >
                {item.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </button>
              {item.icon}
              <div className="flex-1">
                <div className={`font-medium ${item.completed ? 'line-through text-gray-500' : ''}`}>
                  {item.title}
                </div>
                {item.description && (
                  <div className="text-sm text-gray-500">{item.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paid Chores */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-green-600">Earn Money Chores</h2>
          {!paidChoresUnlocked && (
            <div className="flex items-center gap-1 text-sm text-orange-600">
              <Lock className="w-4 h-4" />
              Complete required tasks first
            </div>
          )}
        </div>
        <div className="space-y-3">
          {checklist.filter(item => item.category === 'paid_chore').map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                item.completed ? 'bg-green-50 border-green-200' : 
                !paidChoresUnlocked ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                disabled={!paidChoresUnlocked}
                className={`flex-shrink-0 ${
                  item.completed ? 'text-green-600' : 
                  !paidChoresUnlocked ? 'text-gray-300' : 'text-gray-400'
                }`}
              >
                {item.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </button>
              {item.icon}
              <div className="flex-1">
                <div className={`font-medium ${item.completed ? 'line-through text-gray-500' : ''}`}>
                  {item.title}
                </div>
                {item.description && (
                  <div className="text-sm text-gray-500">{item.description}</div>
                )}
              </div>
              <div className="text-sm font-medium text-green-600">
                +{item.points} pts
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}