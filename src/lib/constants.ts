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
export const PUBLIC_SCHOOL_KIDS = ['zoey', 'kaylee'] as const

// Belle care — Zoey excluded per her request
export const BELLE_KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'kaylee'] as const
export const BELLE_WEEKDAY_MAP: Record<number, string> = { 1: 'kaylee', 2: 'amos', 3: 'hannah', 4: 'wyatt', 5: 'ellie' }
export const BELLE_WEEKEND_ROTATION = ['kaylee', 'amos', 'hannah', 'wyatt', 'ellie'] as const
export const BELLE_WEEKEND_ANCHOR = new Date(2026, 2, 28) // Saturday March 28, 2026 = Week 1

// Dinner manager rotation (Mon-Fri kid assignments)
export const DINNER_MANAGERS: Record<string, string | string[]> = {
  monday: 'kaylee', tuesday: 'zoey', wednesday: 'wyatt',
  thursday: 'amos', friday: ['ellie', 'hannah'],
  saturday: 'parents', sunday: 'parents',
}

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

// ── Feature Access (universal — no hardcoded kid exclusions) ──
export const FEATURE_ACCESS = {
  ai_buddies: ALL_KIDS,
  living_library: ALL_KIDS,
  flashcards: ALL_KIDS,
  teks_dashboard_homeschool: HOMESCHOOL_KIDS,
  teks_dashboard_staar_prep: PUBLIC_SCHOOL_KIDS,
  daily_plan_full: HOMESCHOOL_KIDS,
  daily_plan_opt_in: PUBLIC_SCHOOL_KIDS,
  speech_practice_decks: ['amos', 'wyatt', 'hannah'] as const,
} as const

export function hasFeature(kid: string, feature: keyof typeof FEATURE_ACCESS): boolean {
  return (FEATURE_ACCESS[feature] as readonly string[]).includes(kid.toLowerCase())
}

// ── Pet Care Constants ──
export const PET_LIST = ['belle', 'spike', 'hades', 'midnight'] as const
export type PetKey = typeof PET_LIST[number]

export const PET_DISPLAY: Record<string, string> = {
  belle: 'Belle', spike: 'Spike', hades: 'Hades', midnight: 'Midnight',
}

export const PET_EMOJI: Record<string, string> = {
  belle: '🐕', spike: '🦎', hades: '🐍', midnight: '🐰',
}

export const PET_TYPE: Record<string, string> = {
  belle: 'Dog', spike: 'Bearded Dragon', hades: 'Ball Python', midnight: 'Lionhead Dwarf Bunny',
}

export const PET_PRIMARY: Record<string, string> = {
  belle: 'rotating', spike: 'amos', hades: 'zoey', midnight: 'ellie',
}

export const PET_HELPERS: Record<string, string[]> = {
  belle: ['kaylee', 'amos', 'hannah', 'wyatt', 'ellie'],
  spike: ['kaylee', 'wyatt'],
  hades: [], // Zoey sole caretaker
  midnight: ['hannah', 'wyatt'],
}

// Hades feeding schedule: 2-3 live adult mice every 7-14 days
export const HADES_FEEDING_INTERVAL_DAYS = 10 // default reminder at 10 days
export const HADES_FEEDING_OVERDUE_DAYS = 14 // overdue at 14 days
export const HADES_MICE_PER_FEEDING = 2

// Spike live feeding: crickets and/or roaches a few times per month (bought with Hades mice)
export const SPIKE_LIVE_FEED_INTERVAL_DAYS = 10 // reminder around same pet store trip

export const PET_DAILY_TASKS: Record<string, Array<{ key: string; label: string; emoji: string; time?: string }>> = {
  spike: [
    { key: 'feed', label: 'Feed Spike', emoji: '🍽️', time: 'Morning' },
    { key: 'water', label: 'Fresh Water', emoji: '💧', time: 'Morning' },
    { key: 'spot_clean', label: 'Spot Clean', emoji: '🧹' },
    { key: 'health_check', label: 'Visual Health Check', emoji: '👀' },
  ],
  hades: [
    { key: 'check_water', label: 'Check Water', emoji: '💧', time: 'Morning' },
    { key: 'health_check', label: 'Visual Health Check', emoji: '👀' },
  ],
  midnight: [
    { key: 'feed', label: 'Feed Midnight', emoji: '🥕', time: 'Morning' },
    { key: 'hay', label: 'Fresh Hay', emoji: '🌾', time: 'Morning' },
    { key: 'water', label: 'Fresh Water', emoji: '💧', time: 'Morning' },
    { key: 'spot_clean', label: 'Spot Clean Pellet Box', emoji: '🧹' },
    { key: 'brush', label: 'Brush Mane', emoji: '🐰' },
  ],
}

export const PET_WEEKLY_TASKS: Record<string, Array<{ key: string; label: string; emoji: string; frequency: string }>> = {
  spike: [
    { key: 'warm_bath', label: 'Warm Bath', emoji: '🛁', frequency: '2-3x/week' },
  ],
  midnight: [
    { key: 'full_cage_clean', label: 'Full Cage Clean', emoji: '🧽', frequency: 'Weekly' },
    { key: 'grooming_nail_check', label: 'Grooming & Nail Check', emoji: '✂️', frequency: 'Weekly' },
  ],
}

export const PET_MONTHLY_TASKS: Record<string, Array<{ key: string; label: string; emoji: string }>> = {
  spike: [
    { key: 'full_pen_clean', label: 'Full Pen Clean', emoji: '🧽' },
    { key: 'uvb_bulb_check', label: 'UVB Bulb Check (replace every 6mo)', emoji: '💡' },
  ],
  hades: [
    { key: 'full_pen_clean', label: 'Full Pen Clean + Substrate', emoji: '🧽' },
  ],
  midnight: [
    { key: 'weight_check', label: 'Weight Check', emoji: '⚖️' },
    { key: 'health_assessment', label: 'Monthly Health Assessment', emoji: '🏥' },
  ],
}

export const KID_FLAGS: Record<string, string[]> = {
  amos: ['dyslexia','dyscalculia','speech_delay','apd','color_vision','adhd','autism'],
  zoey: [],
  kaylee: ['speech_delay','autism','suspected_dyslexia'],
  ellie: ['speech_delay','suspected_adhd'],
  wyatt: ['speech_delay','adhd','color_vision'],
  hannah: ['speech_delay','stutter'],
}

// ============================================================================
// Grocery request categories (Kitchen P1-C, D24/25)
// ============================================================================
// Canonical enum used by:
//   - kid_grocery_requests.category (DB CHECK constraint)
//   - /api/grocery submit_grocery_request + submit_bulk_grocery_requests
//   - GroceryRequestBox kid form dropdown
//   - GroceryRequestReview parent display
// Pre-existing kid form categories pet_care/school/wishlist preserved on
// top of Lola's spec'd 10 to keep semantic distinction Hannah uses for
// plant supplies, school lists, and kids' wish-list items.
export const GROCERY_REQUEST_CATEGORIES = [
  'meal_cooking',
  'snack_drink',
  'produce',
  'snacks',
  'dairy',
  'frozen',
  'pantry',
  'household',
  'personal_care',
  'pet_care',
  'school',
  'wishlist',
  'other',
] as const

export type GroceryRequestCategory = typeof GROCERY_REQUEST_CATEGORIES[number]

export const GROCERY_CATEGORY_LABELS: Record<GroceryRequestCategory, string> = {
  meal_cooking: 'Meal / Cooking',
  snack_drink: 'Snack / Drink',
  produce: 'Produce',
  snacks: 'Snacks',
  dairy: 'Dairy',
  frozen: 'Frozen',
  pantry: 'Pantry',
  household: 'Household',
  personal_care: 'Personal Care',
  pet_care: 'Pet Care',
  school: 'School',
  wishlist: 'Wish List',
  other: 'Other',
}

export function isGroceryRequestCategory(v: unknown): v is GroceryRequestCategory {
  return typeof v === 'string' && (GROCERY_REQUEST_CATEGORIES as readonly string[]).includes(v)
}
