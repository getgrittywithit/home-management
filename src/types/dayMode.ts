export interface DayMode {
  id: number
  kid_name: string | null
  date: string
  mode_type: string
  status: 'pending_confirm' | 'active' | 'overridden'
  set_by: 'parent' | 'kid_request' | 'system_auto' | 'bisd_calendar'
  reason: string | null
  config: Record<string, any>
  notify_school: boolean
  parent_confirmed_at: string | null
  created_at: string
  updated_at: string
}

export interface DayModeEffect {
  schoolwork: 'full' | 'hidden' | 'replaced' | 'morning_only' | 'pending_only'
  zones: 'full' | 'bare_basics' | 'skip'
  pets: 'full' | 'shift_if_away'
  manager: 'do_your_day' | 'shift_if_away'
  attendance: 'present' | 'absent_excused' | 'absent_sick' | 'half_day'
  streak: 'active' | 'pause'
  points: 'earn' | 'earn_bonus' | 'no_change'
  banner: string | null
}

export interface CoverageAssignment {
  duty_type: string
  original_kid: string
  covered_by: string | null
  covered_by_type: 'kid' | 'parent' | 'skipped'
  auto_assigned: boolean
}

export const MODE_TYPES = [
  'normal', 'fun_friday', 'off_day', 'vacation', 'sick_day',
  'field_trip', 'work_day', 'half_day', 'catch_up',
] as const

export type ModeType = typeof MODE_TYPES[number]
