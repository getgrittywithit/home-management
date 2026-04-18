export const MOOD_VALUES = ['great', 'good', 'ok', 'rough', 'bad'] as const
export type MoodValue = typeof MOOD_VALUES[number]

export const SICK_REASONS = ['Headache', 'Stomach', 'Nausea', 'Fatigue', 'Fever', 'Anxiety', 'Not feeling well', 'Other'] as const
export type SickReason = typeof SICK_REASONS[number]

export const SICK_SEVERITY = ['Mild', 'Moderate', "Couldn't get out of bed"] as const
export type SickSeverity = typeof SICK_SEVERITY[number]

export const FINANCE_ENTITIES = ['personal', 'triton', 'grit_collective'] as const
export type FinanceEntity = typeof FINANCE_ENTITIES[number]

export const APPOINTMENT_TYPES = ['checkup', 'specialist', 'dental', 'vision', 'urgent', 'followup', 'lab', 'imaging'] as const
export type AppointmentType = typeof APPOINTMENT_TYPES[number]

export const MEMBER_GROUPS = ['parents', 'kids'] as const
export type MemberGroup = typeof MEMBER_GROUPS[number]

export const POINTS_TRANSACTION_TYPES = ['earned', 'deducted', 'payout'] as const
export type PointsTransactionType = typeof POINTS_TRANSACTION_TYPES[number]

export const BELLE_TASKS = ['am_feed', 'am_walk', 'pm_feed', 'pm_walk', 'poop_patrol', 'brush_fur', 'brush_teeth'] as const
export type BelleTask = typeof BELLE_TASKS[number]

// Column naming: 15 tables use `child_name`, ~170 use `kid_name`.
// Tables with child_name: kid_daily_checklist, kid_mood_log, kid_daily_care,
// kid_daily_care_log, kid_dental_*, kid_health_requests, kid_wellness_log,
// kid_activity_log, daily_checklist_completion, earn_money_chores,
// homeschool_checklist, parent_tasks.
// Migration prepared at migrations/dispatch_115_column_standardization.sql

export const MED_KIDS = ['amos', 'wyatt'] as const
export const ALL_KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah'] as const
export const HOMESCHOOL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah'] as const

export const KID_AGES: Record<string, number> = {
  amos: 17, zoey: 15, kaylee: 13, ellie: 12, wyatt: 10, hannah: 8,
}

export const KID_GRADES: Record<string, number> = {
  amos: 10, zoey: 9, kaylee: 7, ellie: 6, wyatt: 4, hannah: 3,
}

export const KID_GRADE_LABELS: Record<string, string> = {
  amos: '10th grade', zoey: '9th grade', kaylee: '7th grade',
  ellie: '6th grade', wyatt: '4th grade', hannah: '3rd grade',
}

export const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', zoey: 'Zoey', kaylee: 'Kaylee',
  ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah',
}

export const KID_SCHOOL_TYPE: Record<string, 'homeschool' | 'public'> = {
  amos: 'homeschool', zoey: 'public', kaylee: 'public',
  ellie: 'homeschool', wyatt: 'homeschool', hannah: 'homeschool',
}
