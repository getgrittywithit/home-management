export interface Subject {
  id: string
  name: string
  emoji: string
  status: 'done' | 'in_progress' | 'planned'
}

export interface StudentData {
  id: string
  name: string
  grade: string
  mascot: string
  mascotName: string
  color: string
  subjects: Subject[]
  focus_sessions: number
  concern_flags: string[]
  daily_plan: string[]
  books: { title: string; author: string; status: string }[]
  lesson_logs: { date: string; subject: string; notes: string; mood: string }[]
}

export interface UnitStudy {
  id: string
  title: string
  description: string
  status: 'active' | 'completed'
  subjects: string[]
  student_names?: string[]
  start_date: string
  end_date?: string
}

export interface FamilyBook {
  title: string
  author: string
  current_page?: number
  total_pages?: number
}

export interface HomeschoolData {
  students: StudentData[]
  units: UnitStudy[]
  family_read_aloud: FamilyBook | null
}

export const STUDENT_DEFAULTS: Pick<StudentData, 'id' | 'name' | 'grade' | 'mascot' | 'mascotName' | 'color'>[] = [
  { id: 'amos',   name: 'Amos',   grade: '10th', mascot: '🦉', mascotName: 'Owlbert',  color: 'blue' },
  { id: 'ellie',  name: 'Ellie',  grade: '6th',  mascot: '🐱', mascotName: 'Whiskers', color: 'purple' },
  { id: 'wyatt',  name: 'Wyatt',  grade: '4th',  mascot: '🐕', mascotName: 'Buddy',    color: 'orange' },
  { id: 'hannah', name: 'Hannah', grade: '3rd',  mascot: '🐰', mascotName: 'Clover',   color: 'green' },
]

export const COLOR_MAP: Record<string, { accent: string; bg: string; light: string; border: string; text: string; gradient: string }> = {
  blue:   { accent: 'bg-blue-500',   bg: 'bg-blue-50',   light: 'bg-blue-100',   border: 'border-blue-300',   text: 'text-blue-700',   gradient: 'from-blue-500 to-blue-600' },
  purple: { accent: 'bg-purple-500', bg: 'bg-purple-50', light: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', gradient: 'from-purple-500 to-purple-600' },
  orange: { accent: 'bg-orange-500', bg: 'bg-orange-50', light: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', gradient: 'from-orange-500 to-orange-600' },
  green:  { accent: 'bg-green-500',  bg: 'bg-green-50',  light: 'bg-green-100',  border: 'border-green-300',  text: 'text-green-700',  gradient: 'from-green-500 to-green-600' },
}

export const STATUS_ICON: Record<string, string> = {
  done: '✅',
  in_progress: '⏳',
  planned: '📋',
}
