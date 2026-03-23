'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, CheckCircle2, Users, Sparkles, Home } from 'lucide-react'
import { 
  ZONES, 
  DAILY_ROUTINES, 
  WEEKLY_BLESSING, 
  DAILY_FOCUS,
  AGE_APPROPRIATE_CHORES,
  MONTHLY_HABITS
} from '@/lib/choresConfig'

interface ChoresTabProps {
  familyMembers?: { name: string; age: number; role: 'parent' | 'child' }[]
}

export default function ChoresTab({ familyMembers = [] }: ChoresTabProps) {
  const [currentZone, setCurrentZone] = useState(1)
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  
  // Calculate current zone based on date
  useEffect(() => {
    const today = new Date()
    const dayOfMonth = today.getDate()
    let zone = 1
    
    if (dayOfMonth <= 7) zone = 1
    else if (dayOfMonth <= 14) zone = 2
    else if (dayOfMonth <= 21) zone = 3
    else if (dayOfMonth <= 28) zone = 4
    else zone = 5
    
    setCurrentZone(zone)
  }, [])

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[day]
  }

  const getCurrentMonthHabit = () => {
    const currentMonth = new Date().getMonth() + 1
    return MONTHLY_HABITS.find(h => h.month === currentMonth)
  }

  const getAgeGroup = (age: number) => {
    if (age >= 4 && age <= 6) return '4-6'
    if (age >= 7 && age <= 9) return '7-9'
    if (age >= 10 && age <= 12) return '10-12'
    if (age >= 13) return '13+'
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header with current focus */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Family Chore System</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{getDayName(new Date().getDay())}'s Focus: {DAILY_FOCUS[getDayName(new Date().getDay()).toLowerCase() as keyof typeof DAILY_FOCUS]}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Monthly Habit: {getCurrentMonthHabit()?.habit}</span>
          </div>
        </div>
      </div>

      {/* Daily Routines */}
      <div className="bg-white p-6 rounded-lg border-2 border-blue-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Daily Routines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DAILY_ROUTINES.map(routine => (
            <div key={routine.name} className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-blue-900">{routine.name}</h4>
              </div>
              <ul className="space-y-1">
                {routine.tasks.map((task, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-2">For: {routine.ageGroup}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Home Blessing */}
      <div className="bg-white p-6 rounded-lg border-2 border-green-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Weekly Home Blessing (Monday)
        </h3>
        <p className="text-gray-600 mb-4">Quick maintenance tasks to keep the house running smoothly</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {WEEKLY_BLESSING.tasks.map((task, index) => {
            const taskId = `blessing-${index}`
            return (
              <div 
                key={taskId}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  completedTasks.includes(taskId) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <button
                  onClick={() => toggleTask(taskId)}
                  className="mt-1"
                >
                  {completedTasks.includes(taskId) ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                </button>
                <div className="flex-1">
                  <h5 className="font-medium">{task.name}</h5>
                  <p className="text-sm text-gray-600">{task.room}</p>
                  <p className="text-xs text-gray-500">{task.duration} min • {task.assignTo}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-2">Family Progress</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold">{completedTasks.length}</p>
            <p className="text-sm">Tasks Completed</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{currentZone}/5</p>
            <p className="text-sm">Current Zone</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{new Date().getDate()}</p>
            <p className="text-sm">Day of Month</p>
          </div>
        </div>
      </div>
    </div>
  )
}