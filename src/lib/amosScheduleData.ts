// Amos's actual school schedule data from 2025-2026

import { EnhancedSchoolProfile, SCHEDULE_TYPES, PERIOD_COLORS } from './enhancedSchoolConfig'
import { Teacher, SchoolClass, SchoolLink } from './schoolConfig'

// Amos's teachers
export const AMOS_TEACHERS: Teacher[] = [
  {
    id: 'thomas-dillard',
    name: 'Thomas Dillard',
    email: 'thomas.dillard@bisd.net',
    subject: 'IPC (Integrated Physics & Chemistry)',
    room: 'B245',
    preferredContact: 'email',
    locked: true
  },
  {
    id: 'christopher-troilo',
    name: 'Christopher Troilo',
    email: 'christopher.troilo@bisd.net',
    subject: 'English II',
    room: 'B139',
    preferredContact: 'email',
    locked: true
  },
  {
    id: 'kallie-cheves',
    name: 'Kallie Cheves',
    email: 'kallie.cheves@bisd.net',
    subject: 'Advisory',
    room: 'A112',
    preferredContact: 'email',
    locked: true
  },
  {
    id: 'raeanna-kempf',
    name: 'Raeanna Kempf',
    email: 'raeanna.kempf@bisd.net',
    subject: 'Astronomy',
    room: 'B213',
    preferredContact: 'email',
    locked: true
  },
  {
    id: 'stephen-salazar',
    name: 'Stephen Salazar',
    email: 'stephen.salazar@bisd.net',
    subject: 'ASL I (American Sign Language)',
    room: 'E150',
    preferredContact: 'email',
    locked: true
  },
  {
    id: 'daniel-lawrence',
    name: 'Daniel Lawrence',
    email: 'daniel.lawrence@bisd.net',
    subject: 'Geometry',
    room: 'B272',
    preferredContact: 'email',
    locked: true
  },
  {
    id: 'isaac-cenoz',
    name: 'Isaac Cenoz',
    email: 'isaac.cenoz@bisd.net',
    subject: 'World History',
    room: 'A209',
    preferredContact: 'email',
    locked: true
  },
  {
    id: 'dorman-vick',
    name: 'Dorman Vick',
    email: 'dorman.vick@bisd.net',
    subject: 'Ag Mechanics & Metal Tech',
    room: 'J303',
    preferredContact: 'email',
    locked: true
  },
  {
    id: 'hannah-kovarcik',
    name: 'Hannah Kovarcik',
    email: 'hannah.kovarcik@bisd.net',
    subject: 'Art I',
    room: 'A113',
    preferredContact: 'email',
    locked: true
  }
]

// Amos's class periods (assuming standard high school times - may need adjustment)
export const AMOS_PERIODS = [
  // A Day Schedule
  {
    id: 'amos-1st-a',
    period: '1st',
    subject: 'IPC 1N',
    teacherId: 'thomas-dillard',
    teacherName: 'Thomas Dillard',
    room: 'B245',
    startTime: '08:25',
    endTime: '09:58',
    duration: 93,
    scheduleType: 'A' as const,
    color: PERIOD_COLORS[0]
  },
  {
    id: 'amos-2nd-a',
    period: '2nd',
    subject: 'English II 02N',
    teacherId: 'christopher-troilo',
    teacherName: 'Christopher Troilo',
    room: 'B139',
    startTime: '10:06',
    endTime: '11:39',
    duration: 93,
    scheduleType: 'A' as const,
    color: PERIOD_COLORS[1]
  },
  {
    id: 'amos-advisory-a',
    period: '0A',
    subject: 'Advisory 10',
    teacherId: 'kallie-cheves',
    teacherName: 'Kallie Cheves',
    room: 'A112',
    startTime: '11:47',
    endTime: '12:17',
    duration: 30,
    scheduleType: 'A' as const,
    color: '#94A3B8' // Gray for advisory
  },
  {
    id: 'amos-3rd-a',
    period: '3rd',
    subject: 'Astronomy 3',
    teacherId: 'raeanna-kempf',
    teacherName: 'Raeanna Kempf',
    room: 'B213',
    startTime: '12:25',
    endTime: '13:58',
    duration: 93,
    scheduleType: 'A' as const,
    color: PERIOD_COLORS[2]
  },
  {
    id: 'amos-4th-a',
    period: '4th',
    subject: 'ASL I 41',
    teacherId: 'stephen-salazar',
    teacherName: 'Stephen Salazar',
    room: 'E150',
    startTime: '14:06',
    endTime: '15:39',
    duration: 93,
    scheduleType: 'A' as const,
    color: PERIOD_COLORS[3]
  },
  
  // B Day Schedule
  {
    id: 'amos-5th-b',
    period: '5th',
    subject: 'Geometry 05N',
    teacherId: 'daniel-lawrence',
    teacherName: 'Daniel Lawrence',
    room: 'B272',
    startTime: '08:25',
    endTime: '09:58',
    duration: 93,
    scheduleType: 'B' as const,
    color: PERIOD_COLORS[4]
  },
  {
    id: 'amos-6th-b',
    period: '6th',
    subject: 'World History 06N',
    teacherId: 'isaac-cenoz',
    teacherName: 'Isaac Cenoz',
    room: 'A209',
    startTime: '10:06',
    endTime: '11:39',
    duration: 93,
    scheduleType: 'B' as const,
    color: PERIOD_COLORS[5]
  },
  {
    id: 'amos-advisory-b',
    period: '0B',
    subject: 'Advisory 10',
    teacherId: 'kallie-cheves',
    teacherName: 'Kallie Cheves',
    room: 'A112',
    startTime: '11:47',
    endTime: '12:17',
    duration: 30,
    scheduleType: 'B' as const,
    color: '#94A3B8' // Gray for advisory
  },
  {
    id: 'amos-7th-b',
    period: '7th',
    subject: 'Ag Mechanics & Metal Tech 7',
    teacherId: 'dorman-vick',
    teacherName: 'Dorman Vick',
    room: 'J303',
    startTime: '12:25',
    endTime: '13:58',
    duration: 93,
    scheduleType: 'B' as const,
    color: PERIOD_COLORS[6]
  },
  {
    id: 'amos-8th-b',
    period: '8th',
    subject: 'Art I 8',
    teacherId: 'hannah-kovarcik',
    teacherName: 'Hannah Kovarcik',
    room: 'A113',
    startTime: '14:06',
    endTime: '15:39',
    duration: 93,
    scheduleType: 'B' as const,
    color: PERIOD_COLORS[7]
  }
]

// Amos's school links
export const AMOS_SCHOOL_LINKS: SchoolLink[] = [
  {
    id: 'skyward-portal',
    name: 'Skyward Student Portal',
    url: 'https://skyward-student.bisd.net',
    category: 'portal',
    icon: '🏫',
    description: 'Main student portal for grades and assignments',
    locked: true
  },
  {
    id: 'bisd-website',
    name: 'Boerne ISD Website',
    url: 'https://www.bisd.net',
    category: 'other',
    icon: '🌐',
    description: 'District website and information',
    locked: true
  },
  {
    id: 'champion-hs',
    name: 'Champion High School',
    url: 'https://chs.bisd.net',
    category: 'other',
    icon: '🏆',
    description: 'School website and announcements',
    locked: true
  },
  {
    id: 'google-classroom',
    name: 'Google Classroom',
    url: 'https://classroom.google.com',
    category: 'assignment',
    icon: '📚',
    description: 'Class assignments and materials',
    locked: true
  }
]

// Complete Amos profile
export const AMOS_SCHOOL_PROFILE: EnhancedSchoolProfile = {
  childId: 'amos-moses-504640',
  grade: '10th',
  school: 'Samuel V Champion High School',
  schoolYear: '2025-2026',
  scheduleType: SCHEDULE_TYPES[1], // A/B Alternating
  teachers: AMOS_TEACHERS,
  classes: [], // Will be populated from periods
  periods: AMOS_PERIODS,
  links: AMOS_SCHOOL_LINKS,
  abSchedule: {
    startDate: new Date('2025-08-12'), // First day of school
    pattern: 'A-start', // Assuming A day starts first
    exceptions: [
      // Add holidays and breaks as needed
      new Date('2025-09-02'), // Labor Day
      new Date('2025-11-28'), // Thanksgiving break start
      new Date('2025-11-29'), // Thanksgiving break
      new Date('2025-12-23'), // Winter break start
      new Date('2025-12-24'), // Christmas Eve
      new Date('2025-12-25'), // Christmas
      new Date('2025-12-26'), // Christmas break
      new Date('2025-12-27'), // Christmas break
      new Date('2025-12-30'), // New Year break
      new Date('2025-12-31'), // New Year's Eve
      new Date('2026-01-01'), // New Year's Day
      new Date('2026-01-20'), // MLK Day
      new Date('2026-02-17'), // Presidents Day
      new Date('2026-03-10'), // Spring break (example)
      new Date('2026-03-11'), // Spring break
      new Date('2026-03-12'), // Spring break
      new Date('2026-03-13'), // Spring break
      new Date('2026-03-14'), // Spring break
    ]
  },
  calendarEvents: [], // Will be generated from periods
  settings: {
    showABIndicator: true,
    defaultCalendarView: 'week',
    enableNotifications: true,
    reminderMinutes: [15, 5]
  }
}

// Helper function to get today's schedule type
export const getTodaysScheduleType = (): 'A' | 'B' | 'No School' => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  
  // Weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'No School'
  }
  
  // Check if it's a holiday/exception
  const isException = AMOS_SCHOOL_PROFILE.abSchedule?.exceptions.some(
    exception => exception.toDateString() === today.toDateString()
  )
  
  if (isException) {
    return 'No School'
  }
  
  // Calculate A/B day based on school start date
  const startDate = AMOS_SCHOOL_PROFILE.abSchedule?.startDate || new Date('2025-08-12')
  const schoolDaysElapsed = getSchoolDaysElapsed(startDate, today)
  
  return schoolDaysElapsed % 2 === 0 ? 'A' : 'B'
}

// Helper function to calculate school days elapsed (excluding weekends and holidays)
export const getSchoolDaysElapsed = (startDate: Date, endDate: Date): number => {
  let count = 0
  const current = new Date(startDate)
  
  while (current < endDate) {
    const dayOfWeek = current.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = AMOS_SCHOOL_PROFILE.abSchedule?.exceptions.some(
      exception => exception.toDateString() === current.toDateString()
    )
    
    if (!isWeekend && !isHoliday) {
      count++
    }
    
    current.setDate(current.getDate() + 1)
  }
  
  return count
}