// Core family management types

export type Role = 'parent' | 'child'

export interface Profile {
  id: string
  user_id?: string
  email: string
  first_name: string
  role: Role
  color_theme?: string
  avatar_url?: string
  dock_time?: string
  grade?: string
  emoji?: string
  primary_parent_id?: string
  screen_time_limit_minutes?: number
  pod_assignment?: 'levi' | 'lola'
  created_at: string
  updated_at: string
}

export type EventType = 'medical' | 'activity' | 'social'
export type EventStatus = 'scheduled' | 'completed' | 'cancelled' | 'moved'

export interface FamilyEvent {
  id: string
  child_id: string
  title: string
  event_type: EventType
  start_time: string
  end_time?: string
  captain_id: string
  backup_id?: string
  location?: string
  contact_info?: string
  gear_needed?: string
  pharmacy?: string
  swap_flag: boolean
  swap_requested_at?: string
  status: EventStatus
  created_at: string
  updated_at: string
  // Joined fields
  child_name?: string
  captain_name?: string
  backup_name?: string
}

export type ZoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
export type ZoneCadence = 'daily' | 'weekly' | 'monthly'

export interface Zone {
  id: string
  name: string
  description?: string
  primary_assignee_id: string
  buddy_id?: string
  cadence: ZoneCadence
  definition_of_done?: string
  status: ZoneStatus
  last_completed_at?: string
  next_due_date?: string
  created_at: string
  updated_at: string
  // Joined fields
  primary_name?: string
  buddy_name?: string
  last_completed?: string
}

export interface ZoneCompletion {
  id: string
  zone_id: string
  completed_by: string
  completion_date: string
  quality_score?: number
  photo_url?: string
  notes?: string
  verified_by?: string
  created_at: string
}

export interface Pet {
  id: string
  name: string
  type: string
  primary_caretaker_id: string
  backup_caretaker_id?: string
  daily_tasks: string[]
  weekly_tasks: string[]
  monthly_tasks: string[]
  special_instructions?: string
  created_at: string
}

export type PetTaskType = 'daily' | 'weekly' | 'monthly'

export interface PetCareLog {
  id: string
  pet_id: string
  caretaker_id: string
  task_type: PetTaskType
  task_description: string
  completed_at: string
  failsafe_triggered: boolean
  created_at: string
}

export type SprintType = 'revenue' | 'fulfill'

export interface MoneySprint {
  id: string
  date: string
  sprint_type: SprintType
  target_amount?: number
  actual_amount: number
  items_listed: number
  items_potted: number
  items_photographed: number
  story_posted: boolean
  completed_by?: string
  created_at: string
}

export interface MoneySale {
  id: string
  date: string
  channel: string
  product: string
  gross_amount: number
  fees: number
  net_amount: number
  notes?: string
  created_at: string
}

export interface OnCallSchedule {
  id: string
  date: string
  on_call_parent_id: string
  manually_set: boolean
  created_at: string
}

export interface DailyGreenlights {
  id: string
  child_id: string
  date: string
  approved_activities: string[]
  special_notes?: string
  posted_by: string
  created_at: string
}

export interface FamilyConfig {
  id: string
  key: string
  value: string
  description?: string
  updated_by?: string
  updated_at: string
}

// Dashboard data aggregation types
export interface DashboardData {
  onCallParent: string
  todaysEvents: FamilyEvent[]
  todaysRevenue: number
  weeklyRevenue: number
  monthlyRevenue: number
  overdueZones: Zone[]
  upcomingPickups: FamilyEvent[]
}

// Form types for components
export interface CreateEventForm {
  child_id: string
  title: string
  event_type: EventType
  start_time: string
  end_time?: string
  captain_id: string
  backup_id?: string
  location?: string
  contact_info?: string
  gear_needed?: string
  pharmacy?: string
}

export interface GreenlightForm {
  child_id: string
  date: string
  approved_activities: string[]
  special_notes?: string
}

export interface SaleEntry {
  channel: string
  product: string
  gross_amount: number
  fees?: number
  notes?: string
}

// Kid Portal Types
export type ChecklistCategory = 'hygiene' | 'chores' | 'backpack' | 'events'

export interface DailyChecklistItem {
  id: string
  child_id: string
  date: string
  category: ChecklistCategory
  title: string
  description?: string
  completed: boolean
  completed_at?: string
  priority: number
  estimated_minutes?: number
  created_at: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type MealRequestStatus = 'pending' | 'approved' | 'denied' | 'prepared'

export interface MealRequest {
  id: string
  child_id: string
  meal_type: MealType
  request_date: string
  meal_description: string
  special_notes?: string
  status: MealRequestStatus
  approved_by?: string
  approved_at?: string
  created_at: string
}

export type NotePriority = 'urgent' | 'normal' | 'low'

export interface KidNote {
  id: string
  child_id: string
  recipient_id?: string
  subject: string
  message: string
  priority: NotePriority
  read: boolean
  read_at?: string
  replied: boolean
  parent_reply?: string
  replied_at?: string
  created_at: string
}

export type KidEventType = 'personal' | 'social' | 'academic' | 'activity'
export type EventRequestStatus = 'pending' | 'approved' | 'denied' | 'needs_info'

export interface KidCalendarRequest {
  id: string
  child_id: string
  title: string
  description?: string
  start_time: string
  end_time?: string
  location?: string
  event_type: KidEventType
  requires_ride: boolean
  contact_info?: string
  gear_needed?: string
  status: EventRequestStatus
  approved_by?: string
  approval_notes?: string
  approved_at?: string
  family_event_id?: string
  created_at: string
}

export type AchievementType = 'chore_streak' | 'perfect_day' | 'helpful' | 'responsible'

export interface KidAchievement {
  id: string
  child_id: string
  achievement_type: AchievementType
  title: string
  description?: string
  points_earned: number
  badge_icon?: string
  earned_date: string
  created_at: string
}

export interface KidPortalData {
  profile: Profile
  todaysChecklist: DailyChecklistItem[]
  todaysEvents: FamilyEvent[]
  weekEvents: FamilyEvent[]
  zones: Zone[]
  achievements?: KidAchievement[]
  pendingRequests?: {
    meals: MealRequest[]
    events: KidCalendarRequest[]
    notes: KidNote[]
  }
}