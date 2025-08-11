// Enhanced school configuration with A/B day support and calendar integration

import { Teacher, SchoolClass, SchoolLink } from './schoolConfig'

export interface ScheduleType {
  id: string
  name: string
  description: string
  pattern: 'daily' | 'ab-alternating' | 'rotating' | 'block' | 'custom'
}

export interface ABDaySchedule {
  type: 'A' | 'B'
  date: Date
  periods: ClassPeriod[]
}

export interface ClassPeriod {
  id: string
  period: string | number // "1st", "2nd", "A1", "B3", etc.
  subject: string
  teacherId: string
  teacherName: string
  room: string
  startTime: string // "08:30"
  endTime: string // "09:25"
  duration: number // minutes
  scheduleType: 'A' | 'B' | 'Daily' | 'Both' // Which days this period occurs
  color?: string // For visual calendar display
}

export interface SchoolCalendarEvent {
  id: string
  title: string
  type: 'class' | 'assignment' | 'test' | 'project' | 'meeting' | 'event'
  date: Date
  startTime?: string
  endTime?: string
  allDay: boolean
  location?: string
  teacherId?: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  category: 'school' | 'chores' | 'family' | 'personal'
  recurring?: RecurringPattern
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'ab-schedule'
  daysOfWeek?: number[] // [1,3,5] for Mon, Wed, Fri
  endDate?: Date
  exceptions?: Date[] // Dates to skip
}

export interface EnhancedSchoolProfile {
  childId: string
  grade: string
  school: string
  schoolYear: string
  scheduleType: ScheduleType
  teachers: Teacher[]
  classes: SchoolClass[]
  periods: ClassPeriod[]
  links: SchoolLink[]
  abSchedule?: {
    startDate: Date // First day of school to calculate A/B pattern
    pattern: 'A-start' | 'B-start' // Which day the school year starts with
    exceptions: Date[] // Days when normal pattern is disrupted
  }
  calendarEvents: SchoolCalendarEvent[]
  settings: {
    showABIndicator: boolean
    defaultCalendarView: 'month' | 'week' | 'day' | 'agenda'
    enableNotifications: boolean
    reminderMinutes: number[]
  }
}

// Predefined schedule types
export const SCHEDULE_TYPES: ScheduleType[] = [
  {
    id: 'traditional',
    name: 'Traditional Daily',
    description: 'Same schedule every day',
    pattern: 'daily'
  },
  {
    id: 'ab-alternating',
    name: 'A/B Alternating Days',
    description: 'Two different schedules that alternate',
    pattern: 'ab-alternating'
  },
  {
    id: 'block-schedule',
    name: 'Block Schedule',
    description: 'Longer periods, fewer classes per day',
    pattern: 'block'
  },
  {
    id: 'rotating',
    name: 'Rotating Schedule',
    description: 'Schedule rotates through multiple patterns',
    pattern: 'rotating'
  }
]

// Period time templates
export const COMMON_PERIOD_TIMES = {
  'traditional-hs': [
    { period: '1st', start: '08:00', end: '08:50' },
    { period: '2nd', start: '08:55', end: '09:45' },
    { period: '3rd', start: '09:50', end: '10:40' },
    { period: '4th', start: '10:45', end: '11:35' },
    { period: '5th', start: '11:40', end: '12:30' },
    { period: '6th', start: '12:35', end: '13:25' },
    { period: '7th', start: '13:30', end: '14:20' },
    { period: '8th', start: '14:25', end: '15:15' }
  ],
  'block-ab': [
    { period: 'A1', start: '08:00', end: '09:30' },
    { period: 'A2', start: '09:35', end: '11:05' },
    { period: 'A3', start: '11:10', end: '12:40' },
    { period: 'A4', start: '13:15', end: '14:45' }
  ],
  'middle-school': [
    { period: '1st', start: '08:30', end: '09:15' },
    { period: '2nd', start: '09:20', end: '10:05' },
    { period: '3rd', start: '10:10', end: '10:55' },
    { period: '4th', start: '11:00', end: '11:45' },
    { period: '5th', start: '11:50', end: '12:35' },
    { period: '6th', start: '12:40', end: '13:25' },
    { period: '7th', start: '13:30', end: '14:15' }
  ]
}

// Calendar event categories with colors
export const EVENT_CATEGORIES = {
  school: { name: 'School', color: '#3B82F6', icon: '📚' },
  chores: { name: 'Chores', color: '#10B981', icon: '🧹' },
  family: { name: 'Family', color: '#8B5CF6', icon: '👨‍👩‍👧‍👦' },
  personal: { name: 'Personal', color: '#F59E0B', icon: '⭐' }
}

// Utility functions
export const calculateABDay = (date: Date, startDate: Date, startsWith: 'A' | 'B' = 'A'): 'A' | 'B' => {
  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const isEven = daysDiff % 2 === 0
  
  // Skip weekends
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return calculateABDay(new Date(date.getTime() - 86400000), startDate, startsWith)
  }
  
  if (startsWith === 'A') {
    return isEven ? 'A' : 'B'
  } else {
    return isEven ? 'B' : 'A'
  }
}

export const getPeriodsForDay = (periods: ClassPeriod[], dayType: 'A' | 'B' | 'Daily'): ClassPeriod[] => {
  return periods.filter(period => 
    period.scheduleType === dayType || 
    period.scheduleType === 'Both' || 
    period.scheduleType === 'Daily'
  )
}

export const generateSchoolCalendarEvents = (
  profile: EnhancedSchoolProfile,
  startDate: Date,
  endDate: Date
): SchoolCalendarEvent[] => {
  const events: SchoolCalendarEvent[] = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const dayType = profile.abSchedule 
        ? calculateABDay(currentDate, profile.abSchedule.startDate, profile.abSchedule.pattern === 'A-start' ? 'A' : 'B')
        : 'Daily'
      
      const dayPeriods = getPeriodsForDay(profile.periods, dayType as any)
      
      dayPeriods.forEach(period => {
        events.push({
          id: `${period.id}-${currentDate.toISOString().split('T')[0]}`,
          title: period.subject,
          type: 'class',
          date: new Date(currentDate),
          startTime: period.startTime,
          endTime: period.endTime,
          allDay: false,
          location: `Room ${period.room}`,
          teacherId: period.teacherId,
          description: `${period.subject} with ${period.teacherName}`,
          priority: 'medium',
          category: 'school'
        })
      })
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return events
}

// Sample Amos data template (to be filled with actual schedule info)
export const SAMPLE_AMOS_PROFILE: EnhancedSchoolProfile = {
  childId: 'amos-2025',
  grade: '10th',
  school: 'Boerne High School',
  schoolYear: '2024-2025',
  scheduleType: SCHEDULE_TYPES[1], // A/B Alternating
  teachers: [
    // To be filled with actual teacher data
  ],
  classes: [
    // To be filled with actual class data
  ],
  periods: [
    // To be filled with actual period data
  ],
  links: [
    {
      id: 'skyward-portal',
      name: 'Skyward Student Portal',
      url: 'https://skyward-student.bisd.net',
      category: 'portal',
      description: 'Main student portal for grades and assignments',
      locked: true
    }
  ],
  abSchedule: {
    startDate: new Date('2024-08-26'), // First day of school - to be confirmed
    pattern: 'A-start',
    exceptions: [] // Holidays, teacher workdays, etc.
  },
  calendarEvents: [],
  settings: {
    showABIndicator: true,
    defaultCalendarView: 'week',
    enableNotifications: true,
    reminderMinutes: [15, 5]
  }
}

export const PERIOD_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#EC4899', // Pink
]