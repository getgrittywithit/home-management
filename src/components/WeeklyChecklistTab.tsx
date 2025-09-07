'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Printer, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface ChecklistItem {
  id: string
  category: 'personal' | 'business'
  subcategory: string
  name: string
  requires_daily: boolean
  order_index: number
}

interface ChecklistCompletion {
  id: string
  user_id: string
  week_year: number
  week_number: number
  item_id: string
  day_of_week: number
  completed: boolean
  completed_at?: string
}

interface WeeklyData {
  year: number
  week: number
  items: ChecklistItem[]
  completions: ChecklistCompletion[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Default checklist items based on your spreadsheet
const DEFAULT_PERSONAL_ITEMS = [
  // Health & Supplements
  { subcategory: 'Health', items: ['NAD', 'SLEEP', 'FOCUS', 'MAGNA CALM', 'B+ VITAMIN', 'TRI-MAG', 'Modern Man'] },
  { subcategory: 'Supplements', items: ['OREGANO', 'VITAMIN D3', 'ASHWAGANDHA', 'ADHD MEDS'] },
  // Personal Care
  { subcategory: 'Personal Care', items: ['BRUSH TEETH', 'FLOSS', 'SHOWER', 'SHAVE'] },
  // Activities
  { subcategory: 'Activities', items: ['FAMILY TIME', 'HOUSE CHORES', 'WORKOUT-BOARD', 'WALK'] },
  // Schedule
  { subcategory: 'Schedule', items: ['WAKE TIME', 'LEAVE HOUSE', 'TO SLEEP TIME', 'WEIGH IN'] },
]

const DEFAULT_BUSINESS_ITEMS = [
  { subcategory: 'Morning Customer Contact', items: [
    'EMAILS - Save/Delete',
    'TRITON PHONE - Call back',
    'TRITON PHONE - Text back',
    'New Leads Folder',
    'Personal phone - Calls/text'
  ]},
  { subcategory: 'Afternoon Customer Contact', items: [
    'EMAILS - Save/Delete',
    'TRITON PHONE - Call back', 
    'TRITON PHONE - Text back',
    'Personal phone - Calls/text',
    'Asana - Triton sales check in'
  ]},
  { subcategory: 'File Organization', items: [
    '10 Min. Cloud File Organize',
    'Scan Docs and file'
  ]},
  { subcategory: 'Bookkeeping', items: [
    'Business',
    'Personal'
  ]},
  { subcategory: 'Code', items: [
    'Website work',
    'Planning',
    'Product creative'
  ]}
]

export default function WeeklyChecklistTab() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState<{ year: number, week: number } | null>(null)
  const [isPrintMode, setIsPrintMode] = useState(false)

  // Get current week number
  const getCurrentWeek = () => {
    const now = new Date()
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
    return { year: now.getFullYear(), week: weekNumber }
  }

  // Initialize current week
  useEffect(() => {
    const week = getCurrentWeek()
    setCurrentWeek(week)
  }, [])

  // Load weekly data
  const loadWeeklyData = async (year: number, week: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/weekly-checklist?action=week&userId=levi&year=${year}&week=${week}`)
      const result = await response.json()
      
      if (result.data) {
        setWeeklyData(result.data)
      }
    } catch (error) {
      console.error('Error loading weekly data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load data when week changes
  useEffect(() => {
    if (currentWeek) {
      loadWeeklyData(currentWeek.year, currentWeek.week)
    }
  }, [currentWeek])

  // Toggle completion
  const toggleCompletion = async (itemId: string, dayOfWeek: number) => {
    if (!currentWeek || !weeklyData) return

    try {
      const response = await fetch('/api/weekly-checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle-completion',
          userId: 'levi',
          itemId,
          dayOfWeek,
          week: currentWeek.week,
          year: currentWeek.year
        })
      })

      if (response.ok) {
        // Reload data to get updated state
        loadWeeklyData(currentWeek.year, currentWeek.week)
      }
    } catch (error) {
      console.error('Error toggling completion:', error)
    }
  }

  // Check if item is completed for a specific day
  const isCompleted = (itemId: string, dayOfWeek: number): boolean => {
    if (!weeklyData) return false
    return weeklyData.completions.some(
      c => c.item_id === itemId && c.day_of_week === dayOfWeek && c.completed
    )
  }

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    if (!currentWeek) return

    let newWeek = currentWeek.week + (direction === 'next' ? 1 : -1)
    let newYear = currentWeek.year

    if (newWeek > 52) {
      newWeek = 1
      newYear++
    } else if (newWeek < 1) {
      newWeek = 52
      newYear--
    }

    setCurrentWeek({ year: newYear, week: newWeek })
  }

  // Get week date range
  const getWeekDateRange = (year: number, week: number) => {
    const firstDayOfYear = new Date(year, 0, 1)
    const daysToFirstWeek = (week - 1) * 7 - firstDayOfYear.getDay()
    const firstDayOfWeek = new Date(year, 0, 1 + daysToFirstWeek)
    const lastDayOfWeek = new Date(firstDayOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000)
    
    return {
      start: firstDayOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: lastDayOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading weekly checklist...</div>
      </div>
    )
  }

  // Initialize default checklist if no items exist
  const initializeChecklist = async () => {
    try {
      const response = await fetch('/api/weekly-checklist/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'levi' })
      })

      if (response.ok) {
        // Reload data after initialization
        if (currentWeek) {
          loadWeeklyData(currentWeek.year, currentWeek.week)
        }
      }
    } catch (error) {
      console.error('Error initializing checklist:', error)
    }
  }

  if (!weeklyData || !currentWeek) {
    return (
      <div className="text-center py-8">
        <div className="text-lg mb-4">No checklist data available</div>
        <div className="space-x-2">
          <button 
            onClick={() => currentWeek && loadWeeklyData(currentWeek.year, currentWeek.week)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
          <button 
            onClick={initializeChecklist}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Initialize Default Checklist
          </button>
        </div>
      </div>
    )
  }

  // If no items exist, show initialization option
  if (weeklyData.items.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-lg mb-4">No checklist items configured</div>
        <p className="text-gray-600 mb-6">
          Initialize your weekly checklist with default personal and business items based on your spreadsheet.
        </p>
        <button 
          onClick={initializeChecklist}
          className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
        >
          <Plus className="inline-block w-4 h-4 mr-2" />
          Initialize Default Checklist
        </button>
      </div>
    )
  }

  const dateRange = getWeekDateRange(currentWeek.year, currentWeek.week)
  const personalItems = weeklyData.items.filter(item => item.category === 'personal')
  const businessItems = weeklyData.items.filter(item => item.category === 'business')

  // Group items by subcategory
  const groupBySubcategory = (items: ChecklistItem[]) => {
    const grouped: { [key: string]: ChecklistItem[] } = {}
    items.forEach(item => {
      if (!grouped[item.subcategory]) {
        grouped[item.subcategory] = []
      }
      grouped[item.subcategory].push(item)
    })
    return grouped
  }

  const personalGroups = groupBySubcategory(personalItems)
  const businessGroups = groupBySubcategory(businessItems)

  return (
    <div className={`space-y-6 ${isPrintMode ? 'print-mode' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-ocean-50 to-teal-50 p-6 rounded-xl border border-ocean-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-ocean-600 to-teal-600 bg-clip-text text-transparent">
            🌊 Levi's Weekly Checklist
          </h2>
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-ocean-200">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-1 hover:bg-ocean-100 rounded-md transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-ocean-600" />
            </button>
            <div className="font-semibold text-ocean-800 px-2">
              Week {currentWeek.week}, {currentWeek.year}
            </div>
            <button
              onClick={() => navigateWeek('next')}
              className="p-1 hover:bg-ocean-100 rounded-md transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-ocean-600" />
            </button>
          </div>
          <div className="text-sm text-ocean-600 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full border border-ocean-200">
            📅 {dateRange.start} - {dateRange.end}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsPrintMode(!isPrintMode)}
            className="flex items-center space-x-2 bg-gradient-to-r from-ocean-500 to-cyan-500 hover:from-ocean-600 hover:to-cyan-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <Printer className="h-4 w-4" />
            <span>{isPrintMode ? 'Exit Print' : 'Print View'}</span>
          </button>
          {isPrintMode && (
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
          )}
        </div>
      </div>

      {/* Personal Section */}
      <div className="bg-gradient-to-br from-white to-cyan-50 rounded-xl shadow-lg border border-cyan-200 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-100/50 to-ocean-100/50 rounded-full -translate-y-16 translate-x-16"></div>
        <h3 className="text-xl font-semibold mb-4 text-cyan-700 flex items-center gap-2 relative z-10">
          💫 Personal Wellness
        </h3>
        
        {Object.entries(personalGroups).map(([subcategory, items]) => (
          <div key={subcategory} className="mb-6 relative z-10">
            <h4 className="font-medium text-ocean-600 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-ocean-400 rounded-full"></span>
              {subcategory}
            </h4>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="grid grid-cols-8 gap-2 items-center bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-cyan-100 hover:border-cyan-200 transition-colors">
                  <div className="col-span-1 text-sm font-medium truncate text-ocean-700">
                    {item.name}
                  </div>
                  {DAYS.map((day, dayIndex) => (
                    <div key={day} className="text-center">
                      <div className="text-xs text-ocean-500 mb-1 font-medium">{day}</div>
                      <input
                        type="checkbox"
                        checked={isCompleted(item.id, dayIndex)}
                        onChange={() => toggleCompletion(item.id, dayIndex)}
                        className="w-4 h-4 text-cyan-600 rounded-md focus:ring-cyan-400 focus:ring-2 transition-all duration-200 cursor-pointer hover:scale-110"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Business Section */}
      <div className="bg-gradient-to-br from-white to-teal-50 rounded-xl shadow-lg border border-teal-200 p-6 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-teal-100/50 to-emerald-100/50 rounded-full translate-y-20 -translate-x-20"></div>
        <h3 className="text-xl font-semibold mb-4 text-teal-700 flex items-center gap-2 relative z-10">
          🚀 Business - Triton
        </h3>
        
        {Object.entries(businessGroups).map(([subcategory, items]) => (
          <div key={subcategory} className="mb-6 relative z-10">
            <h4 className="font-medium text-teal-600 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"></span>
              {subcategory}
            </h4>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="grid grid-cols-8 gap-2 items-center bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-teal-100 hover:border-teal-200 transition-colors">
                  <div className="col-span-1 text-sm font-medium truncate text-teal-700">
                    {item.name}
                  </div>
                  {DAYS.map((day, dayIndex) => (
                    <div key={day} className="text-center">
                      <div className="text-xs text-teal-500 mb-1 font-medium">{day}</div>
                      <input
                        type="checkbox"
                        checked={isCompleted(item.id, dayIndex)}
                        onChange={() => toggleCompletion(item.id, dayIndex)}
                        className="w-4 h-4 text-teal-600 rounded-md focus:ring-teal-400 focus:ring-2 transition-all duration-200 cursor-pointer hover:scale-110"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print-mode {
            font-size: 11px;
            background: white !important;
          }
          .print-mode * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print-mode button {
            display: none !important;
          }
          .print-mode .bg-white {
            background: white !important;
            border: 1px solid #000 !important;
            box-shadow: none !important;
          }
          .print-mode .grid-cols-8 {
            display: grid;
            grid-template-columns: 3fr repeat(7, 1fr);
            gap: 4px;
            border-bottom: 1px solid #ddd;
            padding: 4px 0;
          }
          .print-mode input[type="checkbox"] {
            width: 14px !important;
            height: 14px !important;
            border: 2px solid #000 !important;
            margin: 0 auto;
            display: block;
          }
          .print-mode input[type="checkbox"]:checked {
            background-color: #000 !important;
          }
          .print-mode h2, .print-mode h3, .print-mode h4 {
            margin: 8px 0 4px 0 !important;
            page-break-after: avoid;
          }
          .print-mode .space-y-6 > * {
            margin-top: 0 !important;
            margin-bottom: 12px !important;
          }
          .print-mode .space-y-2 > * {
            margin-top: 0 !important;
            margin-bottom: 2px !important;
          }
          .print-mode .text-xs {
            font-size: 9px !important;
          }
          .print-mode .text-sm {
            font-size: 10px !important;
          }
          .print-mode .p-6 {
            padding: 12px !important;
          }
          .print-mode .mb-6 {
            margin-bottom: 8px !important;
          }
          .print-mode .mb-4 {
            margin-bottom: 6px !important;
          }
          .print-mode .mb-3 {
            margin-bottom: 4px !important;
          }
          @page {
            margin: 0.4in;
            size: landscape;
          }
          .print-mode .text-blue-600 {
            color: #000 !important;
            font-weight: bold !important;
          }
          .print-mode .text-green-600 {
            color: #000 !important;
            font-weight: bold !important;
          }
          .print-mode .text-gray-500, .print-mode .text-gray-600, .print-mode .text-gray-700 {
            color: #333 !important;
          }
        }
      `}</style>
    </div>
  )
}