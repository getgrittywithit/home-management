// Centralized family configuration - UPDATE EVERYTHING FROM HERE
// This is the single source of truth for all family information

import { ALL_KIDS_BIRTH_DATA } from './aboutMeConfig'

// SCHOOL YEAR 2024-2025 - Update annually
export const CURRENT_SCHOOL_YEAR = '2024-2025'

// TEACHER ASSIGNMENTS - Update annually
export interface TeacherAssignment {
  name: string
  subject?: string
  email?: string
  room?: string
  phone?: string
}

export interface SchoolInfo {
  name: string
  address?: string
  phone?: string
  principal?: string
  website?: string
}

// SCHOOLS - UPDATED TO MATCH ACTUAL SCHEDULES
export const SCHOOLS: Record<string, SchoolInfo> = {
  'champion-high': {
    name: 'BOERNE - SAMUEL V CHAMPION H S',
    address: '1580 Champion Dr, Boerne, TX 78006',
    phone: '(830) 357-2000',
    principal: 'Mr. Johnson',
    website: 'https://chs.bisd.net'
  },
  'boerne-middle-north': {
    name: 'BOERNE MIDDLE NORTH',
    address: 'Boerne, TX',
    phone: '(830) 357-2100',
    principal: 'Ms. Anderson'
  },
  'herff-elementary': {
    name: 'HERFF EL',
    address: 'Boerne, TX', 
    phone: '(830) 357-2200',
    principal: 'Mrs. Williams'
  }
}

// CURRENT TEACHER ASSIGNMENTS - AUTOMATICALLY GENERATED FROM ACTUAL SCHEDULES
export const TEACHER_ASSIGNMENTS: Record<string, TeacherAssignment[]> = {
  'amos': [
    { name: 'Thomas Dillard', subject: 'IPC', room: 'B245' },
    { name: 'Christopher Troilo', subject: 'English II', room: 'B139' },
    { name: 'Kallie Cheves', subject: 'Advisory 10', room: 'A112' },
    { name: 'Raeanna Kempf', subject: 'Astronomy', room: 'B213' },
    { name: 'Stephen Salazar', subject: 'ASL I', room: 'E150' },
    { name: 'Daniel Lawrence', subject: 'Geometry', room: 'B272' },
    { name: 'Isaac Cenoz', subject: 'World History', room: 'A209' },
    { name: 'Dorman Vick', subject: 'Ag Mechanics & Metal Tech', room: 'J303' },
    { name: 'Hannah Kovarcik', subject: 'ART 1', room: 'A113' }
  ],
  'zoey': [
    { name: 'Kendall Reischling', subject: 'Debate I', room: 'T205' },
    { name: 'Isaac Cenoz', subject: 'AP Human Geography', room: 'A209' },
    { name: 'Alejandra Leber', subject: 'Advisory 9', room: 'B222' },
    { name: 'Michael Colvard', subject: 'JROTC 1 PE', room: 'B142' },
    { name: 'Alyse Zingelmann', subject: 'Honors English I', room: 'B111' },
    { name: 'Stacie Murrah', subject: 'CHILD DEVELOP', room: 'B137' },
    { name: 'Peggy Fisher', subject: 'Honors Biology', room: 'B247' },
    { name: 'Jason Sanders', subject: 'Honors Geometry', room: 'T212' },
    { name: 'Joshua Gonzales', subject: 'Art II Drawing I', room: 'A118' }
  ],
  'kaylee': [
    { name: 'Steven McGhee', subject: 'Texas History', room: 'C205' },
    { name: 'Carlie Polson', subject: 'Science 7', room: 'A104' },
    { name: 'Katrina Salinas', subject: 'PHYSICAL ED 7TH', room: 'GYM' },
    { name: 'Michelle Stewart', subject: 'Advisory 7', room: 'C206' },
    { name: 'Sharon Bash', subject: 'ART 2', room: 'A107' },
    { name: 'Samantha Songco-Twiss', subject: 'Math 7', room: 'B107' },
    { name: 'Mary Whitaker', subject: 'FCS', room: 'A112' },
    { name: 'Christy Boerm', subject: 'ELAR 7', room: 'C103' },
    { name: 'Amy Thornton', subject: 'THEATRE 1', room: 'STUD' }
  ],
  'ellie': [
    { name: 'Jonathan Rickman', subject: 'BAND I-A BEGIN / Advisory 6', room: 'BAND' },
    { name: 'Madison Lowe', subject: 'Honors ELAR 6', room: 'C101' },
    { name: 'Taylor Lancaster', subject: 'Math 6', room: 'B103' },
    { name: 'Isabel Hold', subject: 'Science 6', room: 'A102' },
    { name: 'Cheyenne LaFargue', subject: 'Contemporary World Cultures', room: 'C202' },
    { name: 'Courtney Ludy', subject: 'STEM 6', room: 'E101' },
    { name: 'Priscilla Garcia-Meier', subject: 'Digital Literacy 6', room: 'E104' },
    { name: 'Hannah Narvaez', subject: 'Student Leadership / Wellness', room: 'E102' },
    { name: 'Jeremy Boatright', subject: 'PHYSICAL ED 6', room: 'GYM' }
  ],
  'wyatt': [
    { name: 'Mandy Rice', subject: 'HOMEROOM / ELAR / SOCIAL STUDIES 4TH', room: 'C105' },
    { name: 'Allycia English', subject: 'SCIENCE / MATH 4TH GRADE', room: 'C104' },
    { name: 'Matthew Beschoner', subject: 'ART 4TH GRADE', room: 'C129-01' },
    { name: 'Mindy Kaler', subject: 'COMPUTERS 4TH GRADE', room: 'A102-01' },
    { name: 'Travis Clark', subject: 'PE 4TH GRADE', room: 'B108-01' },
    { name: 'Mary Young', subject: 'MUSIC 4TH GRADE', room: 'B119-01' }
  ],
  'hannah': [
    { name: 'Candace Warder', subject: 'HOMEROOM / ELAR / SOCIAL STUDIES 3RD', room: 'C204' },
    { name: 'Megan Varnum', subject: 'SCIENCE / MATH 3RD GRADE', room: 'C201' },
    { name: 'Matthew Beschoner', subject: 'ART 3RD GRADE', room: 'C129-03' },
    { name: 'Mindy Kaler', subject: 'COMPUTERS 3RD GRADE', room: 'A102-03' },
    { name: 'Travis Clark', subject: 'PE 3RD GRADE', room: 'B108-03' },
    { name: 'Mary Young', subject: 'MUSIC 3RD GRADE', room: 'B119-03' }
  ]
}

// Helper function to calculate current age from birth date
export function calculateAge(birthDate: Date): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

// CURRENT GRADES (2024-2025 School Year) - Update annually
export const CURRENT_GRADES = {
  'amos': '10th Grade',
  'zoey': '9th Grade', 
  'kaylee': '7th Grade',
  'ellie': '6th Grade',
  'wyatt': '4th Grade',
  'hannah': '3rd Grade'
} as const

// SCHOOL ASSIGNMENTS - Updated to match actual schedules
export const SCHOOL_ASSIGNMENTS = {
  'amos': 'champion-high',
  'zoey': 'champion-high',
  'kaylee': 'boerne-middle-north', 
  'ellie': 'boerne-middle-north',
  'wyatt': 'herff-elementary',
  'hannah': 'herff-elementary'
} as const

// EXTRACURRICULAR ACTIVITIES - Update as needed
export const EXTRACURRICULARS: Record<string, string[]> = {
  'amos': ['Basketball', 'Math Club', 'Student Council'],
  'zoey': ['Volleyball', 'Drama Club', 'Art Club'],
  'kaylee': ['Soccer', 'Band', 'Student Newspaper'],
  'ellie': ['Track', 'Chess Club', 'Science Fair'],
  'wyatt': ['Soccer', 'Cub Scouts', 'Library Club'],
  'hannah': ['Dance', 'Girl Scouts', 'Reading Club']
}

// CHORE PAY SCALE - Update as needed
export const CHORE_PAY_SCALE = {
  'amos': { monthlyTarget: 40, dailyPaid: 3, requiredDaily: 2 },
  'zoey': { monthlyTarget: 35, dailyPaid: 3, requiredDaily: 2 },
  'kaylee': { monthlyTarget: 25, dailyPaid: 2, requiredDaily: 2 },
  'ellie': { monthlyTarget: 20, dailyPaid: 2, requiredDaily: 2 },
  'wyatt': { monthlyTarget: 15, dailyPaid: 2, requiredDaily: 2 },
  'hannah': { monthlyTarget: 10, dailyPaid: 1, requiredDaily: 2 }
} as const

// COMPREHENSIVE FAMILY MEMBER DATA - All dynamic from above configs
export function getFamilyMemberData(childKey: string) {
  const birthData = ALL_KIDS_BIRTH_DATA[childKey]
  if (!birthData) return null
  
  return {
    id: `${childKey}-child`,
    name: childKey.charAt(0).toUpperCase() + childKey.slice(1),
    fullName: birthData.fullName,
    age: calculateAge(birthData.birthDate),
    grade: CURRENT_GRADES[childKey as keyof typeof CURRENT_GRADES],
    school: SCHOOLS[SCHOOL_ASSIGNMENTS[childKey as keyof typeof SCHOOL_ASSIGNMENTS]],
    teachers: TEACHER_ASSIGNMENTS[childKey] || [],
    extracurriculars: EXTRACURRICULARS[childKey] || [],
    chorePay: CHORE_PAY_SCALE[childKey as keyof typeof CHORE_PAY_SCALE],
    birthDate: birthData.birthDate,
    birthTime: birthData.birthTime,
    birthPlace: birthData.birthPlace
  }
}

// COMPLETE FAMILY DATA
export function getAllFamilyData() {
  const parents = [
    { name: 'Levi', age: calculateAge(new Date('1986-11-20')), role: 'parent' as const },
    { name: 'Lola', age: calculateAge(new Date('1986-12-30')), role: 'parent' as const }
  ]
  
  const children = Object.keys(ALL_KIDS_BIRTH_DATA).map(childKey => {
    const data = getFamilyMemberData(childKey)
    return data ? {
      ...data,
      role: 'child' as const
    } : null
  }).filter((child): child is NonNullable<typeof child> => child !== null)
  
  return {
    parents,
    children,
    allMembers: [...parents, ...children],
    schoolYear: CURRENT_SCHOOL_YEAR
  }
}

// EXPORT INDIVIDUAL CHILD DATA FOR EASY ACCESS
export const AMOS = getFamilyMemberData('amos')!
export const ZOEY = getFamilyMemberData('zoey')!
export const KAYLEE = getFamilyMemberData('kaylee')!
export const ELLIE = getFamilyMemberData('ellie')!
export const WYATT = getFamilyMemberData('wyatt')!
export const HANNAH = getFamilyMemberData('hannah')!