// School information data structure

export interface Teacher {
  id: string
  name: string
  email: string
  phone?: string
  subject: string
  room?: string
  photoUrl?: string
  preferredContact: 'email' | 'phone' | 'both'
  locked: boolean // Admin-controlled fields
}

export interface SchoolClass {
  id: string
  name: string
  subject: string
  teacherId: string
  room: string
  schedule: ClassSchedule[]
  color: string // For visual organization
  locked: boolean
}

export interface ClassSchedule {
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  startTime: string // "08:30"
  endTime: string // "09:25"
  period?: string // "1st Period", "Block A", etc.
}

export interface SchoolLink {
  id: string
  name: string
  url: string
  category: 'portal' | 'resource' | 'assignment' | 'grade' | 'other'
  icon?: string
  description?: string
  locked: boolean // Some links admin-controlled, others kid-added
}

export interface Assignment {
  id: string
  title: string
  subject: string
  dueDate: Date
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  addedBy: 'admin' | 'student'
}

export interface SchoolProfile {
  childId: string
  grade: string
  school: string
  schoolYear: string
  teachers: Teacher[]
  classes: SchoolClass[]
  links: SchoolLink[]
  assignments: Assignment[]
  personalNotes: string // Kid can edit
  schedule?: WeeklySchedule
}

export interface WeeklySchedule {
  monday: DaySchedule[]
  tuesday: DaySchedule[]
  wednesday: DaySchedule[]
  thursday: DaySchedule[]
  friday: DaySchedule[]
}

export interface DaySchedule {
  time: string
  subject: string
  room: string
  teacher: string
}

// Default school links that admins might pre-populate
export const DEFAULT_SCHOOL_LINKS: Omit<SchoolLink, 'id'>[] = [
  {
    name: 'Student Portal',
    url: '',
    category: 'portal',
    icon: '🏫',
    description: 'Main school login portal',
    locked: true
  },
  {
    name: 'Grades',
    url: '',
    category: 'grade',
    icon: '📊',
    description: 'Check current grades',
    locked: true
  },
  {
    name: 'Assignments',
    url: '',
    category: 'assignment',
    icon: '📝',
    description: 'View and submit assignments',
    locked: true
  },
  {
    name: 'Library',
    url: '',
    category: 'resource',
    icon: '📚',
    description: 'School library resources',
    locked: true
  },
  {
    name: 'Calendar',
    url: '',
    category: 'other',
    icon: '📅',
    description: 'School calendar and events',
    locked: true
  }
]

// Common school subjects with colors
export const SUBJECT_COLORS = {
  'Math': '#3B82F6', // blue
  'English': '#EF4444', // red
  'Science': '#10B981', // green
  'History': '#F59E0B', // yellow
  'Art': '#8B5CF6', // purple
  'Music': '#EC4899', // pink
  'PE': '#F97316', // orange
  'Spanish': '#06B6D4', // cyan
  'Computer Science': '#6B7280', // gray
  'Study Hall': '#9CA3AF', // light gray
  'Lunch': '#84CC16', // lime
  'Homeroom': '#1F2937' // dark gray
}

// Grade level configurations
export const GRADE_CONFIGS = {
  'PreK': { maxClasses: 3, allowCustomLinks: false },
  'K': { maxClasses: 4, allowCustomLinks: false },
  '1st': { maxClasses: 5, allowCustomLinks: true },
  '2nd': { maxClasses: 5, allowCustomLinks: true },
  '3rd': { maxClasses: 6, allowCustomLinks: true },
  '4th': { maxClasses: 6, allowCustomLinks: true },
  '5th': { maxClasses: 7, allowCustomLinks: true },
  '6th': { maxClasses: 8, allowCustomLinks: true },
  '7th': { maxClasses: 8, allowCustomLinks: true },
  '8th': { maxClasses: 8, allowCustomLinks: true },
  '9th': { maxClasses: 9, allowCustomLinks: true },
  '10th': { maxClasses: 9, allowCustomLinks: true },
  '11th': { maxClasses: 10, allowCustomLinks: true },
  '12th': { maxClasses: 10, allowCustomLinks: true }
}

// Sample data for development
export const SAMPLE_SCHOOL_DATA: SchoolProfile = {
  childId: 'sample-kid',
  grade: '5th',
  school: 'Greenwood Elementary',
  schoolYear: '2024-2025',
  personalNotes: 'Remember to bring art supplies on Wednesdays!',
  teachers: [
    {
      id: 'teacher-1',
      name: 'Mrs. Johnson',
      email: 'mjohnson@greenwood.edu',
      phone: '(555) 123-4567',
      subject: 'Math & Science',
      room: '205',
      preferredContact: 'email',
      locked: true
    },
    {
      id: 'teacher-2',
      name: 'Mr. Davis',
      email: 'rdavis@greenwood.edu',
      subject: 'English & Social Studies',
      room: '203',
      preferredContact: 'email',
      locked: true
    },
    {
      id: 'teacher-3',
      name: 'Ms. Rodriguez',
      email: 'mrodriguez@greenwood.edu',
      subject: 'Art',
      room: 'Art Room',
      preferredContact: 'email',
      locked: true
    }
  ],
  classes: [
    {
      id: 'class-1',
      name: 'Math',
      subject: 'Math',
      teacherId: 'teacher-1',
      room: '205',
      color: SUBJECT_COLORS['Math'],
      locked: true,
      schedule: [
        { dayOfWeek: 1, startTime: '08:30', endTime: '09:15', period: '1st' },
        { dayOfWeek: 3, startTime: '08:30', endTime: '09:15', period: '1st' },
        { dayOfWeek: 5, startTime: '08:30', endTime: '09:15', period: '1st' }
      ]
    },
    {
      id: 'class-2',
      name: 'English',
      subject: 'English',
      teacherId: 'teacher-2',
      room: '203',
      color: SUBJECT_COLORS['English'],
      locked: true,
      schedule: [
        { dayOfWeek: 1, startTime: '09:20', endTime: '10:05', period: '2nd' },
        { dayOfWeek: 2, startTime: '09:20', endTime: '10:05', period: '2nd' },
        { dayOfWeek: 4, startTime: '09:20', endTime: '10:05', period: '2nd' }
      ]
    }
  ],
  links: [
    {
      id: 'link-1',
      name: 'Greenwood Portal',
      url: 'https://portal.greenwood.edu',
      category: 'portal',
      icon: '🏫',
      description: 'Main school portal',
      locked: true
    },
    {
      id: 'link-2',
      name: 'Khan Academy',
      url: 'https://khanacademy.org',
      category: 'resource',
      icon: '📚',
      description: 'Extra math practice',
      locked: false
    }
  ],
  assignments: [
    {
      id: 'assignment-1',
      title: 'Math Chapter 5 Quiz',
      subject: 'Math',
      dueDate: new Date('2024-08-15'),
      description: 'Multiplication and division review',
      completed: false,
      priority: 'high',
      addedBy: 'admin'
    }
  ]
}