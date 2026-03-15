// Modern FlyLady-inspired chore system configuration

export interface Zone {
  id: string
  name: string
  areas: string[]
  weekOfMonth: number // 1-5
  tasks: ZoneTask[]
}

export interface ZoneTask {
  name: string
  description: string
  ageMinimum: number // Minimum age for this task
  duration: number // Minutes
  frequency: 'daily' | 'weekly' | 'zone-week'
}

export interface DailyRoutine {
  name: string
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime'
  tasks: string[]
  ageGroup: 'parent' | 'teen' | 'child' | 'all'
}

export interface WeeklyBlessing {
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  tasks: BlessingTask[]
}

export interface BlessingTask {
  name: string
  room: string
  duration: number
  assignTo: 'parent' | 'child' | 'anyone'
}

// Modern zones adapted for contemporary homes
export const ZONES: Zone[] = [
  {
    id: 'zone1',
    name: 'Entry & Social Areas',
    areas: ['Front Entrance', 'Mudroom', 'Dining Room', 'Front Porch'],
    weekOfMonth: 1,
    tasks: [
      {
        name: 'Declutter entry surfaces',
        description: 'Clear mail, keys, and items from entry tables',
        ageMinimum: 8,
        duration: 10,
        frequency: 'zone-week'
      },
      {
        name: 'Organize shoes & coats',
        description: 'Put away shoes, hang coats, organize closet',
        ageMinimum: 5,
        duration: 15,
        frequency: 'zone-week'
      },
      {
        name: 'Deep clean dining table',
        description: 'Clear, wipe down, and polish dining table and chairs',
        ageMinimum: 10,
        duration: 15,
        frequency: 'zone-week'
      },
      {
        name: 'Vacuum/sweep entry areas',
        description: 'Thorough vacuum or sweep of all zone floors',
        ageMinimum: 10,
        duration: 15,
        frequency: 'zone-week'
      }
    ]
  },
  {
    id: 'zone2',
    name: 'Kitchen & Pantry',
    areas: ['Kitchen', 'Pantry', 'Breakfast Nook'],
    weekOfMonth: 2,
    tasks: [
      {
        name: 'Deep clean appliances',
        description: 'Clean microwave, oven, dishwasher exterior',
        ageMinimum: 12,
        duration: 20,
        frequency: 'zone-week'
      },
      {
        name: 'Organize one cabinet/drawer',
        description: 'Pick one area to declutter and organize',
        ageMinimum: 8,
        duration: 15,
        frequency: 'zone-week'
      },
      {
        name: 'Clean refrigerator',
        description: 'Remove expired items, wipe shelves',
        ageMinimum: 10,
        duration: 20,
        frequency: 'zone-week'
      },
      {
        name: 'Scrub sink & counters',
        description: 'Deep clean sink and sanitize countertops',
        ageMinimum: 10,
        duration: 15,
        frequency: 'zone-week'
      }
    ]
  },
  {
    id: 'zone3',
    name: 'Bathrooms & Laundry',
    areas: ['Main Bathroom', 'Kids Bathroom', 'Powder Room', 'Laundry Room'],
    weekOfMonth: 3,
    tasks: [
      {
        name: 'Deep clean toilets',
        description: 'Scrub toilets inside and out, including base',
        ageMinimum: 12,
        duration: 15,
        frequency: 'zone-week'
      },
      {
        name: 'Organize bathroom cabinets',
        description: 'Declutter and organize under-sink storage',
        ageMinimum: 10,
        duration: 15,
        frequency: 'zone-week'
      },
      {
        name: 'Scrub showers/tubs',
        description: 'Deep clean shower walls, doors, and tub',
        ageMinimum: 12,
        duration: 20,
        frequency: 'zone-week'
      },
      {
        name: 'Laundry room organization',
        description: 'Organize supplies, clean lint traps, wipe machines',
        ageMinimum: 10,
        duration: 15,
        frequency: 'zone-week'
      }
    ]
  },
  {
    id: 'zone4',
    name: 'Bedrooms',
    areas: ['Master Bedroom', 'Kids Bedrooms', 'Guest Room', 'Closets'],
    weekOfMonth: 4,
    tasks: [
      {
        name: 'Change all bed linens',
        description: 'Strip beds, wash sheets, remake beds',
        ageMinimum: 8,
        duration: 20,
        frequency: 'zone-week'
      },
      {
        name: 'Declutter nightstands',
        description: 'Clear and organize bedside tables',
        ageMinimum: 6,
        duration: 10,
        frequency: 'zone-week'
      },
      {
        name: 'Organize one dresser drawer',
        description: 'Pick a drawer to sort and organize',
        ageMinimum: 7,
        duration: 15,
        frequency: 'zone-week'
      },
      {
        name: 'Vacuum under beds',
        description: 'Move items and vacuum under all beds',
        ageMinimum: 10,
        duration: 15,
        frequency: 'zone-week'
      }
    ]
  },
  {
    id: 'zone5',
    name: 'Living Areas & Office',
    areas: ['Living Room', 'Family Room', 'Home Office', 'Playroom'],
    weekOfMonth: 5,
    tasks: [
      {
        name: 'Dust electronics & surfaces',
        description: 'Dust TV, shelves, and all surfaces',
        ageMinimum: 9,
        duration: 15,
        frequency: 'zone-week'
      },
      {
        name: 'Organize media/toys',
        description: 'Sort games, books, toys into proper places',
        ageMinimum: 5,
        duration: 15,
        frequency: 'zone-week'
      },
      {
        name: 'Vacuum furniture',
        description: 'Vacuum couches, chairs, and cushions',
        ageMinimum: 10,
        duration: 15,
        frequency: 'zone-week'
      },
      {
        name: 'Clean windows/mirrors',
        description: 'Wipe down windows and mirrors in zone',
        ageMinimum: 8,
        duration: 15,
        frequency: 'zone-week'
      }
    ]
  }
]

// Daily routines adapted for modern families
export const DAILY_ROUTINES: DailyRoutine[] = [
  {
    name: 'Morning Launch',
    timeOfDay: 'morning',
    ageGroup: 'all',
    tasks: [
      'Make bed',
      'Get dressed & ready',
      'Eat breakfast & clear dishes',
      'Quick bathroom tidy',
      'Check backpack/work bag'
    ]
  },
  {
    name: 'After School Reset',
    timeOfDay: 'afternoon',
    ageGroup: 'child',
    tasks: [
      'Unpack backpack',
      'Put away shoes & coat',
      'Snack dishes to sink',
      'Start homework'
    ]
  },
  {
    name: 'Evening Kitchen',
    timeOfDay: 'evening',
    ageGroup: 'all',
    tasks: [
      'Clear dinner table',
      'Load/run dishwasher',
      'Wipe counters',
      'Shine sink',
      'Set up coffee/breakfast'
    ]
  },
  {
    name: 'Bedtime Reset',
    timeOfDay: 'bedtime',
    ageGroup: 'all',
    tasks: [
      'Pick up living areas (10 min)',
      'Lay out tomorrow\'s clothes',
      'Pack bags for tomorrow',
      'Quick bathroom swish',
      'Devices on chargers'
    ]
  }
]

// Weekly Home Blessing - quick maintenance tasks
export const WEEKLY_BLESSING: WeeklyBlessing = {
  dayOfWeek: 1, // Monday
  tasks: [
    {
      name: 'Quick vacuum main areas',
      room: 'All common areas',
      duration: 20,
      assignTo: 'anyone'
    },
    {
      name: 'Mop kitchen & bathroom floors',
      room: 'Kitchen & Bathrooms',
      duration: 20,
      assignTo: 'parent'
    },
    {
      name: 'Empty all trash cans',
      room: 'Whole house',
      duration: 10,
      assignTo: 'child'
    },
    {
      name: 'Wipe down all bathrooms',
      room: 'Bathrooms',
      duration: 15,
      assignTo: 'anyone'
    },
    {
      name: 'Change kitchen towels',
      room: 'Kitchen',
      duration: 5,
      assignTo: 'child'
    },
    {
      name: 'Water plants',
      room: 'Whole house',
      duration: 10,
      assignTo: 'child'
    },
    {
      name: 'Quick dust main surfaces',
      room: 'Living areas',
      duration: 15,
      assignTo: 'anyone'
    }
  ]
}

// Special daily focus items
export const DAILY_FOCUS = {
  monday: 'Weekly Home Blessing',
  tuesday: 'Laundry Day - Wash, Dry, Fold',
  wednesday: 'Desk Day - Bills, Papers, Planning',
  thursday: 'Grocery Planning & Errands',
  friday: 'Car & Bags - Clean out vehicles and bags',
  saturday: 'Family Zone Hour',
  sunday: 'Rest & Prep for Week'
}

// Age-appropriate chore suggestions
export const AGE_APPROPRIATE_CHORES = {
  '4-6': [
    'Put toys away',
    'Make bed (with help)',
    'Feed pets',
    'Set napkins on table',
    'Put shoes in place'
  ],
  '7-9': [
    'Set & clear table',
    'Water plants',
    'Empty small trash cans',
    'Sort laundry',
    'Dust low surfaces',
    'Make simple snacks'
  ],
  '10-12': [
    'Load/unload dishwasher',
    'Vacuum floors',
    'Take out trash',
    'Clean bathrooms',
    'Fold & put away laundry',
    'Pack lunches'
  ],
  '13+': [
    'All previous chores',
    'Mop floors',
    'Deep clean kitchen',
    'Do own laundry',
    'Prepare simple meals',
    'Babysit younger siblings'
  ]
}

// Monthly habit focus (adapted for modern life)
export const MONTHLY_HABITS = [
  { month: 1, habit: 'Morning Routines', focus: 'Start the day right' },
  { month: 2, habit: 'Digital Declutter', focus: '15 min daily to organize devices' },
  { month: 3, habit: 'Meal Planning', focus: 'Plan weekly meals' },
  { month: 4, habit: 'Movement', focus: 'Daily exercise/outdoor time' },
  { month: 5, habit: 'Water & Nutrition', focus: 'Healthy habits' },
  { month: 6, habit: 'Summer Routines', focus: 'Adjust for summer schedule' },
  { month: 7, habit: 'Quick Clean', focus: 'Daily 15-min pickup' },
  { month: 8, habit: 'Back-to-School Prep', focus: 'Organize for school year' },
  { month: 9, habit: 'Evening Routines', focus: 'Peaceful bedtimes' },
  { month: 10, habit: 'Paper Management', focus: 'Handle mail & papers daily' },
  { month: 11, habit: 'Gratitude', focus: 'Family gratitude practices' },
  { month: 12, habit: 'Celebration & Rest', focus: 'Enjoy the season' }
]