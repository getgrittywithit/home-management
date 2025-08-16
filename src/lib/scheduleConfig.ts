// Centralized school schedule configuration
// Single source of truth for all children's schedules

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
  scheduleType: string // "All Year Schedule", "Fall Semester", etc.
  periods: SchedulePeriod[]
  lastUpdated: Date
}

// AMOS'S CURRENT SCHEDULE (2025-2026)
const AMOS_SCHEDULE: StudentSchedule = {
  studentName: 'Amos Lee Moses',
  school: 'BOERNE - SAMUEL V CHAMPION H S',
  schoolYear: '2025-2026',
  scheduleType: 'All Year Schedule',
  lastUpdated: new Date('2025-08-16'),
  periods: [
    {
      period: '1',
      course: 'IPC',
      teacher: 'Thomas Dillard',
      room: 'B245',
      section: '1N',
      days: 'A',
      length: 'Y'
    },
    {
      period: '2',
      course: 'English II',
      teacher: 'Christopher Troilo',
      room: 'B139',
      section: '02N',
      days: 'A',
      length: 'Y'
    },
    {
      period: '0A',
      course: 'Advisory 10',
      teacher: 'Kallie Cheves',
      room: 'A112',
      section: '05',
      days: 'A',
      length: 'Y'
    },
    {
      period: '3',
      course: 'Astronomy',
      teacher: 'Raeanna Kempf',
      room: 'B213',
      section: '3',
      days: 'A',
      length: 'Y'
    },
    {
      period: '4',
      course: 'ASL I',
      teacher: 'Stephen Salazar',
      room: 'E150',
      section: '41',
      days: 'A',
      length: 'Y'
    },
    {
      period: '5',
      course: 'Geometry',
      teacher: 'Daniel Lawrence',
      room: 'B272',
      section: '05N',
      days: 'B',
      length: 'Y'
    },
    {
      period: '6',
      course: 'World History',
      teacher: 'Isaac Cenoz',
      room: 'A209',
      section: '06N',
      days: 'B',
      length: 'Y'
    },
    {
      period: '0B',
      course: 'Advisory 10',
      teacher: 'Kallie Cheves',
      room: 'A112',
      section: '05',
      days: 'B',
      length: 'Y'
    },
    {
      period: '7',
      course: 'Ag Mechanics & Metal Tech',
      teacher: 'Dorman Vick',
      room: 'J303',
      section: '7',
      days: 'B',
      length: 'Y'
    },
    {
      period: '8',
      course: 'ART 1',
      teacher: 'Hannah Kovarcik',
      room: 'A113',
      section: '8',
      days: 'B',
      length: 'Y'
    }
  ]
}

// ZOEY'S ACTUAL SCHEDULE (2025-2026)
const ZOEY_SCHEDULE: StudentSchedule = {
  studentName: 'Zoey Lynn Moses',
  school: 'BOERNE - SAMUEL V CHAMPION H S',
  schoolYear: '2025-2026',
  scheduleType: 'All Year Schedule',
  lastUpdated: new Date('2025-08-16'),
  periods: [
    {
      period: '1',
      course: 'Debate I',
      teacher: 'Kendall Reischling',
      room: 'T205',
      section: '1',
      days: 'A',
      length: 'Y'
    },
    {
      period: '2',
      course: 'AP Human Geography',
      teacher: 'Isaac Cenoz',
      room: 'A209',
      section: '002',
      days: 'A',
      length: 'Y'
    },
    {
      period: '0A',
      course: 'Advisory 9',
      teacher: 'Alejandra Leber',
      room: 'B222',
      section: '11',
      days: 'A',
      length: 'Y'
    },
    {
      period: '3',
      course: 'JROTC 1 PE',
      teacher: 'Michael Colvard',
      room: 'B142',
      section: '3',
      days: 'A',
      length: 'Y'
    },
    {
      period: '4',
      course: 'Honors English I',
      teacher: 'Alyse Zingelmann',
      room: 'B111',
      section: '4',
      days: 'A',
      length: 'Y'
    },
    {
      period: '5',
      course: 'CHILD DEVELOP',
      teacher: 'Stacie Murrah',
      room: 'B137',
      section: '5',
      days: 'B',
      length: 'Y'
    },
    {
      period: '6',
      course: 'Honors Biology',
      teacher: 'Peggy Fisher',
      room: 'B247',
      section: '6',
      days: 'B',
      length: 'Y'
    },
    {
      period: '0B',
      course: 'Advisory 9',
      teacher: 'Alejandra Leber',
      room: 'B222',
      section: '11',
      days: 'B',
      length: 'Y'
    },
    {
      period: '7',
      course: 'Honors Geometry',
      teacher: 'Jason Sanders',
      room: 'T212',
      section: '07',
      days: 'B',
      length: 'Y'
    },
    {
      period: '8',
      course: 'Art II Drawing I',
      teacher: 'Joshua Gonzales',
      room: 'A118',
      section: '8',
      days: 'B',
      length: 'Y'
    }
  ]
}

const KAYLEE_SCHEDULE: StudentSchedule = {
  studentName: 'Kaylee Liberty Moses',
  school: 'BOERNE MIDDLE NORTH',
  schoolYear: '2025-2026',
  scheduleType: 'All Year Schedule',
  lastUpdated: new Date('2025-08-16'),
  periods: [
    {
      period: '1',
      course: 'Texas History',
      teacher: 'Steven McGhee',
      room: 'C205',
      section: '01',
      days: 'A',
      length: 'Y'
    },
    {
      period: '2',
      course: 'Science 7',
      teacher: 'Carlie Polson',
      room: 'A104',
      section: '01',
      days: 'A',
      length: 'Y'
    },
    {
      period: '3',
      course: 'PHYSICAL ED 7TH',
      teacher: 'Katrina Salinas',
      room: 'GYM',
      section: '04',
      days: 'A',
      length: 'Y'
    },
    {
      period: '0A',
      course: 'Advisory 7',
      teacher: 'Michelle Stewart',
      room: 'C206',
      section: '15',
      days: 'A',
      length: 'Y'
    },
    {
      period: '4',
      course: 'ART 2',
      teacher: 'Sharon Bash',
      room: 'A107',
      section: '04',
      days: 'A',
      length: 'Y'
    },
    {
      period: '5',
      course: 'Math 7',
      teacher: 'Samantha Songco-Twiss',
      room: 'B107',
      section: '02',
      days: 'B',
      length: 'Y'
    },
    {
      period: '6',
      course: 'FCS',
      teacher: 'Mary Whitaker',
      room: 'A112',
      section: '04',
      days: 'B',
      length: 'Y'
    },
    {
      period: '7',
      course: 'ELAR 7',
      teacher: 'Christy Boerm',
      room: 'C103',
      section: '04',
      days: 'B',
      length: 'Y'
    },
    {
      period: '0B',
      course: 'Advisory 7',
      teacher: 'Michelle Stewart',
      room: 'C206',
      section: '15',
      days: 'B',
      length: 'Y'
    },
    {
      period: '8',
      course: 'THEATRE 1',
      teacher: 'Amy Thornton',
      room: 'STUD',
      section: '05',
      days: 'B',
      length: 'Y'
    }
  ]
}

const ELLIE_SCHEDULE: StudentSchedule = {
  studentName: 'Ellie Mae Moses',
  school: 'BOERNE MIDDLE NORTH',
  schoolYear: '2025-2026',
  scheduleType: 'All Year Schedule',
  lastUpdated: new Date('2025-08-16'),
  periods: [
    {
      period: '1',
      course: 'BAND I-A BEGIN',
      teacher: 'Jonathan Rickman',
      room: 'BAND',
      section: '01',
      days: 'A',
      length: 'Y'
    },
    {
      period: '2',
      course: 'Honors ELAR 6',
      teacher: 'Madison Lowe',
      room: 'C101',
      section: '03',
      days: 'A',
      length: 'Y'
    },
    {
      period: '3',
      course: 'Math 6',
      teacher: 'Taylor Lancaster',
      room: 'B103',
      section: '01',
      days: 'A',
      length: 'Y'
    },
    {
      period: '0A',
      course: 'Advisory 6',
      teacher: 'Jonathan Rickman',
      room: 'BAND',
      section: '19',
      days: 'A',
      length: 'Y'
    },
    {
      period: '4',
      course: 'Science 6',
      teacher: 'Isabel Hold',
      room: 'A102',
      section: '03',
      days: 'A',
      length: 'Y'
    },
    {
      period: '5',
      course: 'Contemporary World Cultures',
      teacher: 'Cheyenne LaFargue',
      room: 'C202',
      section: '06',
      days: 'B',
      length: 'Y'
    },
    {
      period: '6',
      course: 'STEM 6',
      teacher: 'Courtney Ludy',
      room: 'E101',
      section: '07',
      days: 'B',
      length: 'S1'
    },
    {
      period: '6',
      course: 'Digital Literacy 6',
      teacher: 'Priscilla Garcia-Meier',
      room: 'E104',
      section: '08',
      days: 'B',
      length: 'S2'
    },
    {
      period: '7',
      course: 'Student Leadership',
      teacher: 'Hannah Narvaez',
      room: 'E102',
      section: '05',
      days: 'B',
      length: 'S1'
    },
    {
      period: '7',
      course: 'Wellness',
      teacher: 'Hannah Narvaez',
      room: 'E102',
      section: '05',
      days: 'B',
      length: 'S2'
    },
    {
      period: '0B',
      course: 'Advisory 6',
      teacher: 'Jonathan Rickman',
      room: 'BAND',
      section: '19',
      days: 'B',
      length: 'Y'
    },
    {
      period: '8',
      course: 'PHYSICAL ED 6',
      teacher: 'Jeremy Boatright',
      room: 'GYM',
      section: '07',
      days: 'B',
      length: 'Y'
    }
  ]
}

const WYATT_SCHEDULE: StudentSchedule = {
  studentName: 'Wyatt James Moses',
  school: 'HERFF EL',
  schoolYear: '2025-2026',
  scheduleType: 'All Year Schedule',
  lastUpdated: new Date('2025-08-16'),
  periods: [
    {
      period: '2',
      course: 'HOMEROOM 4TH GRADE',
      teacher: 'Mandy Rice',
      room: 'C105',
      section: '01',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '3',
      course: 'ELAR Grade 4',
      teacher: 'Mandy Rice',
      room: 'C105',
      section: '01',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '4',
      course: 'SCIENCE 4TH GRADE',
      teacher: 'Allycia English',
      room: 'C104',
      section: '01',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '4',
      course: 'SOCIAL STUDIES 4TH GRADE',
      teacher: 'Mandy Rice',
      room: 'C105',
      section: '01',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '4',
      course: 'ART 4TH GRADE',
      teacher: 'Matthew Beschoner',
      room: 'C129-01',
      section: '01',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '4',
      course: 'COMPUTERS 4TH GRADE',
      teacher: 'Mindy Kaler',
      room: 'A102-01',
      section: '01',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '4',
      course: 'PE 4TH GRADE',
      teacher: 'Travis Clark',
      room: 'B108-01',
      section: '01',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '4',
      course: 'MUSIC 4TH GRADE',
      teacher: 'Mary Young',
      room: 'B119-01',
      section: '01',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '5',
      course: 'MATH 4TH GRADE',
      teacher: 'Allycia English',
      room: 'C104',
      section: '01',
      days: 'AB',
      length: 'Y'
    }
  ]
}

const HANNAH_SCHEDULE: StudentSchedule = {
  studentName: 'Hannah Joy Moses',
  school: 'HERFF EL',
  schoolYear: '2025-2026',
  scheduleType: 'All Year Schedule',
  lastUpdated: new Date('2025-08-16'),
  periods: [
    {
      period: '1',
      course: 'SCIENCE 3RD GRADE',
      teacher: 'Megan Varnum',
      room: 'C201',
      section: '03',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '2',
      course: 'HOMEROOM 3RD GRADE',
      teacher: 'Candace Warder',
      room: 'C204',
      section: '03',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '3',
      course: 'ART 3RD GRADE',
      teacher: 'Matthew Beschoner',
      room: 'C129-03',
      section: '03',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '3',
      course: 'COMPUTERS 3RD GRADE',
      teacher: 'Mindy Kaler',
      room: 'A102-03',
      section: '03',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '3',
      course: 'PE 3RD GRADE',
      teacher: 'Travis Clark',
      room: 'B108-03',
      section: '03',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '3',
      course: 'MUSIC 3RD GRADE',
      teacher: 'Mary Young',
      room: 'B119-03',
      section: '03',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '4',
      course: 'ELAR Grade 3',
      teacher: 'Candace Warder',
      room: 'C204',
      section: '03',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '5',
      course: 'MATH 3RD GRADE',
      teacher: 'Megan Varnum',
      room: 'C201',
      section: '03',
      days: 'AB',
      length: 'Y'
    },
    {
      period: '6',
      course: 'SOCIAL STUDIES 3RD GRADE',
      teacher: 'Candace Warder',
      room: 'C204',
      section: '03',
      days: 'AB',
      length: 'Y'
    }
  ]
}

// MASTER SCHEDULE REGISTRY
export const ALL_SCHEDULES: Record<string, StudentSchedule> = {
  'amos': AMOS_SCHEDULE,
  'zoey': ZOEY_SCHEDULE,
  'kaylee': KAYLEE_SCHEDULE,
  'ellie': ELLIE_SCHEDULE,
  'wyatt': WYATT_SCHEDULE,
  'hannah': HANNAH_SCHEDULE
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
    // Sort by period number, handling special cases like '0A', '0B'
    const getPeriodNumber = (period: string) => {
      if (period.startsWith('0')) return 0.5 // Advisory periods
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
  // Simple logic - in a real app, this would check school calendar
  const today = new Date()
  return today.getDate() % 2 === 0 ? 'A' : 'B'
}

// UPDATE TEACHER ASSIGNMENTS IN familyConfig.ts BASED ON ACTUAL SCHEDULES
export function updateTeacherAssignments() {
  const assignments: Record<string, Array<{name: string, subject: string, room: string}>> = {}
  
  Object.keys(ALL_SCHEDULES).forEach(childKey => {
    const schedule = getScheduleForChild(childKey)
    if (!schedule) return
    
    assignments[childKey] = schedule.periods.map(period => ({
      name: period.teacher,
      subject: period.course,
      room: period.room
    })).filter(teacher => teacher.name !== 'TBD')
  })
  
  return assignments
}