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

// SCHOOLS
export const SCHOOLS: Record<string, SchoolInfo> = {
  'champion-high': {
    name: 'Samuel V Champion High School',
    address: '1580 Champion Dr, Boerne, TX 78006',
    phone: '(830) 357-2000',
    principal: 'Mr. Johnson',
    website: 'https://chs.bisd.net'
  },
  'princeton-intermediate': {
    name: 'Princeton Intermediate School',
    address: '123 School St, Princeton, TX 75407',
    phone: '(469) 752-8000',
    principal: 'Ms. Anderson'
  },
  'princeton-elementary': {
    name: 'Princeton Elementary School',
    address: '456 Elementary Way, Princeton, TX 75407', 
    phone: '(469) 752-8100',
    principal: 'Mrs. Williams'
  }
}

// CURRENT TEACHER ASSIGNMENTS - UPDATE EACH SEMESTER
export const TEACHER_ASSIGNMENTS: Record<string, TeacherAssignment[]> = {
  'amos': [
    { name: 'Mr. Smith', subject: 'Algebra II', email: 'j.smith@bisd.net', room: '201' },
    { name: 'Mrs. Davis', subject: 'English 10', email: 'm.davis@bisd.net', room: '105' },
    { name: 'Coach Rodriguez', subject: 'PE', email: 'a.rodriguez@bisd.net', room: 'Gym' },
    { name: 'Ms. Thompson', subject: 'World History', email: 's.thompson@bisd.net', room: '302' },
    { name: 'Mr. Chen', subject: 'Biology', email: 'l.chen@bisd.net', room: 'Lab 1' },
    { name: 'Mrs. Garcia', subject: 'Spanish I', email: 'c.garcia@bisd.net', room: '210' }
  ],
  'zoey': [
    { name: 'Ms. Hill', subject: 'English 9', email: 'e.hill@bisd.net', room: '103' },
    { name: 'Mr. Wilson', subject: 'Algebra I', email: 'r.wilson@bisd.net', room: '205' },
    { name: 'Mrs. Brown', subject: 'Physical Science', email: 'l.brown@bisd.net', room: 'Lab 2' },
    { name: 'Mr. Martinez', subject: 'Geography', email: 'd.martinez@bisd.net', room: '301' },
    { name: 'Coach Johnson', subject: 'PE', email: 'm.johnson@bisd.net', room: 'Gym' },
    { name: 'Mrs. Lee', subject: 'Art', email: 'k.lee@bisd.net', room: 'Art Room' }
  ],
  'kaylee': [
    { name: 'Mrs. Foster', subject: 'Language Arts', email: 'j.foster@princeton.edu', room: '7A' },
    { name: 'Mr. Cooper', subject: 'Pre-Algebra', email: 'm.cooper@princeton.edu', room: '7B' },
    { name: 'Ms. Wright', subject: 'Life Science', email: 's.wright@princeton.edu', room: '7C' },
    { name: 'Mr. Turner', subject: 'Texas History', email: 'b.turner@princeton.edu', room: '7D' }
  ],
  'ellie': [
    { name: 'Mrs. Parker', subject: 'Reading', email: 'a.parker@princeton.edu', room: '6A' },
    { name: 'Mr. Bailey', subject: 'Math', email: 'c.bailey@princeton.edu', room: '6B' },
    { name: 'Ms. Kelly', subject: 'Science', email: 'l.kelly@princeton.edu', room: '6C' },
    { name: 'Mrs. Murphy', subject: 'Social Studies', email: 'r.murphy@princeton.edu', room: '6D' }
  ],
  'wyatt': [
    { name: 'Mrs. Adams', subject: 'Homeroom', email: 'd.adams@princeton.edu', room: '4A' },
    { name: 'Mr. Clark', subject: 'Math', email: 's.clark@princeton.edu', room: '4B' },
    { name: 'Ms. Rivera', subject: 'Reading', email: 'm.rivera@princeton.edu', room: '4C' }
  ],
  'hannah': [
    { name: 'Mrs. Collins', subject: 'Homeroom', email: 'h.collins@princeton.edu', room: '3A' },
    { name: 'Miss Torres', subject: 'Reading', email: 'v.torres@princeton.edu', room: '3B' }
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

// SCHOOL ASSIGNMENTS - Update as needed
export const SCHOOL_ASSIGNMENTS = {
  'amos': 'champion-high',
  'zoey': 'champion-high',
  'kaylee': 'princeton-intermediate', 
  'ellie': 'princeton-intermediate',
  'wyatt': 'princeton-elementary',
  'hannah': 'princeton-elementary'
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
    { name: 'Levi', age: 38, role: 'parent' as const },
    { name: 'Lola', age: 36, role: 'parent' as const }
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