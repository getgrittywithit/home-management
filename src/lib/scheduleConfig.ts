// Centralized school schedule configuration
// Public school kids only — Homeschool kids use HomeschoolTab

export interface SchedulePeriod {
  period: string
  course: string
  teacher: string
  room: string
  section?: string
  days: 'A' | 'B' | 'AB' // A/B day schedule or daily
  length: 'Y' | 'S1' | 'S2' // Year, Semester 1, Semester 2
}

export interface StudentSchedule {
  studentName: string
  school: string
  schoolYear: string
  scheduleType: string
  periods: SchedulePeriod[]
  lastUpdated: Date
}

// ZOEY'S ACTUAL SCHEDULE (2025-2026) — Champion High School
const ZOEY_SCHEDULE: StudentSchedule = {
  studentName: 'Zoey Lynn Moses',
  school: 'BOERNE - SAMUEL V CHAMPION H S',
  schoolYear: '2025-2026',
  scheduleType: 'All Year Schedule',
  lastUpdated: new Date('2025-08-16'),
  periods: [
    { period: '1', course: 'Debate I', teacher: 'Kendall Reischling', room: 'T205', section: '1', days: 'A', length: 'Y' },
    { period: '2', course: 'AP Human Geography', teacher: 'Isaac Cenoz', room: 'A209', section: '002', days: 'A', length: 'Y' },
    { period: '0A', course: 'Advisory 9', teacher: 'Alejandra Leber', room: 'B222', section: '11', days: 'A', length: 'Y' },
    { period: '3', course: 'JROTC 1 PE', teacher: 'Michael Colvard', room: 'B142', section: '3', days: 'A', length: 'Y' },
    { period: '4', course: 'Honors English I', teacher: 'Alyse Zingelmann', room: 'B111', section: '4', days: 'A', length: 'Y' },
    { period: '5', course: 'CHILD DEVELOP', teacher: 'Stacie Murrah', room: 'B137', section: '5', days: 'B', length: 'Y' },
    { period: '6', course: 'Honors Biology', teacher: 'Peggy Fisher', room: 'B247', section: '6', days: 'B', length: 'Y' },
    { period: '0B', course: 'Advisory 9', teacher: 'Alejandra Leber', room: 'B222', section: '11', days: 'B', length: 'Y' },
    { period: '7', course: 'Honors Geometry', teacher: 'Jason Sanders', room: 'T212', section: '07', days: 'B', length: 'Y' },
    { period: '8', course: 'Art II Drawing I', teacher: 'Joshua Gonzales', room: 'A118', section: '8', days: 'B', length: 'Y' },
  ]
}

// KAYLEE'S ACTUAL SCHEDULE (2025-2026) — Boerne Middle North
const KAYLEE_SCHEDULE: StudentSchedule = {
  studentName: 'Kaylee Liberty Moses',
  school: 'BOERNE MIDDLE NORTH',
  schoolYear: '2025-2026',
  scheduleType: 'All Year Schedule',
  lastUpdated: new Date('2025-08-16'),
  periods: [
    { period: '1', course: 'Texas History', teacher: 'Steven McGhee', room: 'C205', section: '01', days: 'A', length: 'Y' },
    { period: '2', course: 'Science 7', teacher: 'Carlie Polson', room: 'A104', section: '01', days: 'A', length: 'Y' },
    { period: '3', course: 'PHYSICAL ED 7TH', teacher: 'Katrina Salinas', room: 'GYM', section: '04', days: 'A', length: 'Y' },
    { period: '0A', course: 'Advisory 7', teacher: 'Michelle Stewart', room: 'C206', section: '15', days: 'A', length: 'Y' },
    { period: '4', course: 'ART 2', teacher: 'Sharon Bash', room: 'A107', section: '04', days: 'A', length: 'Y' },
    { period: '5', course: 'Math 7', teacher: 'Samantha Songco-Twiss', room: 'B107', section: '02', days: 'B', length: 'Y' },
    { period: '6', course: 'FCS', teacher: 'Mary Whitaker', room: 'A112', section: '04', days: 'B', length: 'Y' },
    { period: '7', course: 'ELAR 7', teacher: 'Christy Boerm', room: 'C103', section: '04', days: 'B', length: 'Y' },
    { period: '0B', course: 'Advisory 7', teacher: 'Michelle Stewart', room: 'C206', section: '15', days: 'B', length: 'Y' },
    { period: '8', course: 'THEATRE 1', teacher: 'Amy Thornton', room: 'STUD', section: '05', days: 'B', length: 'Y' },
  ]
}

// Only public school kids have schedules here
export const ALL_SCHEDULES: Record<string, StudentSchedule> = {
  'zoey': ZOEY_SCHEDULE,
  'kaylee': KAYLEE_SCHEDULE,
}

// HELPER FUNCTIONS
export function getScheduleForChild(childKey: string): StudentSchedule | null {
  return ALL_SCHEDULES[childKey] || null
}

export function getTodaysPeriodsForChild(childKey: string, dayType: 'A' | 'B'): SchedulePeriod[] {
  const schedule = getScheduleForChild(childKey)
  if (!schedule) return []

  return schedule.periods.filter(period =>
    period.days === dayType || period.days === 'AB'
  ).sort((a, b) => {
    const getPeriodNumber = (period: string) => {
      if (period.startsWith('0')) return 0.5
      return parseInt(period) || 999
    }
    return getPeriodNumber(a.period) - getPeriodNumber(b.period)
  })
}

export function getAllTeachersForChild(childKey: string): string[] {
  const schedule = getScheduleForChild(childKey)
  if (!schedule) return []

  const uniqueTeachers = new Set(schedule.periods.map(period => period.teacher))
  return Array.from(uniqueTeachers)
    .filter(teacher => teacher !== 'TBD')
    .sort()
}

export function getCurrentDayType(): 'A' | 'B' {
  const today = new Date()
  return today.getDate() % 2 === 0 ? 'A' : 'B'
}

export interface DailySchedule {
  studentName: string
  date: Date
  dayType: 'A' | 'B' | null
  periods: SchedulePeriod[]
  isSchoolDay: boolean
}

export function getChildScheduleForDate(childName: string, date: Date = new Date()): DailySchedule | null {
  const childKey = childName.toLowerCase()
  const schedule = getScheduleForChild(childKey)

  if (!schedule) return null

  const dayOfWeek = date.getDay()
  const isSchoolDay = dayOfWeek >= 1 && dayOfWeek <= 5

  if (!isSchoolDay) {
    return { studentName: schedule.studentName, date, dayType: null, periods: [], isSchoolDay: false }
  }

  const dayType = date.getDate() % 2 === 0 ? 'A' : 'B'
  const todaysPeriods = getTodaysPeriodsForChild(childKey, dayType)

  return { studentName: schedule.studentName, date, dayType, periods: todaysPeriods, isSchoolDay: true }
}
