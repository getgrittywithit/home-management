// About Me data structure for kids' personal information

export interface BirthCertificateInfo {
  fullName: string
  birthDate: Date
  birthTime?: string // "14:30" format
  birthPlace: string // City, State/Province, Country
  birthWeight?: string // "7 lbs 3 oz" format
  birthLength?: string // "20 inches" format
  hospitalName?: string
  county?: string
  state?: string
  country?: string
  locked: boolean // Admin-controlled
}

export interface PersonalInfo {
  nickname?: string
  favoriteColor: string
  favoriteAnimal?: string
  favoriteFood?: string
  favoriteBook?: string
  favoriteMovie?: string
  favoriteSubject?: string
  bestFriend?: string
  dreamJob?: string
  superpower?: string
  favoritePlace?: string
  locked: boolean // Most personal info is kid-editable
}

export interface InterestsAndHobbies {
  sports: string[]
  instruments: string[]
  arts: string[]
  collections: string[]
  languages: string[]
  clubs: string[]
  customInterests: string[] // Kid can add anything
}

export interface FamilyInfo {
  siblings: FamilyMember[]
  pets: Pet[]
  familyTraditions: string[]
  locked: boolean // Some family info is admin-controlled
}

export interface FamilyMember {
  name: string
  relationship: string // "Brother", "Sister", "Mom", "Dad", etc.
  age?: number
  locked: boolean
}

export interface Pet {
  name: string
  type: string // "Dog", "Cat", "Hamster", etc.
  breed?: string
  age?: number
  gotWhen?: string // "When I was 5"
  locked: boolean
}

export interface PhysicalInfo {
  eyeColor?: string
  hairColor?: string
  height?: string
  shoeSize?: string
  locked: boolean // Usually kid-editable but could be locked for younger kids
}

export interface AboutMeProfile {
  childId: string
  birthCertificate: BirthCertificateInfo
  personal: PersonalInfo
  interests: InterestsAndHobbies
  family: FamilyInfo
  physical: PhysicalInfo
  freeText: string // Open text area for anything they want to share
  profilePhoto?: string // URL to profile photo
  backgroundTheme: string // Color theme for their profile
  lastUpdated: Date
}

// Predefined options to help kids choose
export const COLOR_OPTIONS = [
  'Red', 'Blue', 'Green', 'Purple', 'Pink', 'Orange', 'Yellow', 'Black', 
  'White', 'Silver', 'Gold', 'Rainbow', 'Turquoise', 'Lime', 'Magenta'
]

export const ANIMAL_OPTIONS = [
  'Dog', 'Cat', 'Horse', 'Dolphin', 'Lion', 'Tiger', 'Elephant', 'Giraffe',
  'Penguin', 'Bear', 'Wolf', 'Fox', 'Rabbit', 'Hamster', 'Bird', 'Fish',
  'Dragon', 'Unicorn', 'Phoenix'
]

export const THEME_OPTIONS = [
  { name: 'Ocean Blue', colors: ['#0EA5E9', '#0284C7'], emoji: '🌊' },
  { name: 'Forest Green', colors: ['#22C55E', '#16A34A'], emoji: '🌲' },
  { name: 'Sunset Orange', colors: ['#F97316', '#EA580C'], emoji: '🌅' },
  { name: 'Purple Dream', colors: ['#A855F7', '#9333EA'], emoji: '🔮' },
  { name: 'Pink Paradise', colors: ['#EC4899', '#DB2777'], emoji: '🌸' },
  { name: 'Golden Sun', colors: ['#EAB308', '#CA8A04'], emoji: '☀️' },
  { name: 'Space Explorer', colors: ['#1E293B', '#475569'], emoji: '🚀' },
  { name: 'Rainbow Magic', colors: ['#F59E0B', '#EC4899', '#8B5CF6'], emoji: '🌈' }
]

export const SPORT_OPTIONS = [
  'Soccer', 'Basketball', 'Baseball', 'Tennis', 'Swimming', 'Football',
  'Volleyball', 'Track', 'Gymnastics', 'Dance', 'Martial Arts', 'Hockey',
  'Golf', 'Skateboarding', 'Cycling', 'Rock Climbing'
]

export const INSTRUMENT_OPTIONS = [
  'Piano', 'Guitar', 'Drums', 'Violin', 'Flute', 'Trumpet', 'Saxophone',
  'Clarinet', 'Cello', 'Bass', 'Keyboard', 'Ukulele', 'Harmonica', 'Singing'
]

export const ART_OPTIONS = [
  'Drawing', 'Painting', 'Sculpting', 'Photography', 'Digital Art', 'Crafts',
  'Jewelry Making', 'Pottery', 'Origami', 'Knitting', 'Sewing', 'Woodworking'
]

// Default empty profile template (used when no saved data exists)
export const EMPTY_ABOUT_ME_DATA: AboutMeProfile = {
  childId: '',
  birthCertificate: {
    fullName: '',
    birthDate: new Date(),
    birthTime: '',
    birthPlace: '',
    county: '',
    state: '',
    country: '',
    locked: true
  },
  personal: {
    nickname: '',
    favoriteColor: '',
    favoriteAnimal: '',
    favoriteFood: '',
    favoriteBook: '',
    favoriteMovie: '',
    favoriteSubject: '',
    bestFriend: '',
    dreamJob: '',
    superpower: '',
    favoritePlace: '',
    locked: false
  },
  interests: {
    sports: [],
    instruments: [],
    arts: [],
    collections: [],
    languages: [],
    clubs: [],
    customInterests: []
  },
  family: {
    siblings: [],
    pets: [],
    familyTraditions: [],
    locked: false
  },
  physical: {
    eyeColor: '',
    hairColor: '',
    height: '',
    shoeSize: '',
    locked: false
  },
  freeText: '',
  backgroundTheme: 'Ocean Blue',
  lastUpdated: new Date()
}

// Real per-kid profile data for all Moses children
export const ALL_KIDS_ABOUT_ME_DATA: Record<string, AboutMeProfile> = {
  'amos': {
    childId: '',
    birthCertificate: {
      fullName: 'Amos Lee Moses',
      birthDate: new Date(2009, 2, 2),
      birthTime: '05:55',
      birthPlace: 'Princeton, Minnesota, USA',
      county: 'Sherburne County',
      state: 'Minnesota',
      country: 'United States',
      locked: true
    },
    personal: {
      nickname: 'Amos',
      favoriteColor: '',
      favoriteAnimal: '',
      favoriteFood: '',
      favoriteBook: '',
      favoriteMovie: '',
      favoriteSubject: 'Ag Mechanics & Metal Tech',
      bestFriend: '',
      dreamJob: '',
      superpower: '',
      favoritePlace: '',
      locked: false
    },
    interests: {
      sports: ['Gaming'],
      instruments: [],
      arts: [],
      collections: [],
      languages: [],
      clubs: [],
      customInterests: ['Astronomy', 'Computer Programming', 'Metal Working']
    },
    family: {
      siblings: [
        { name: 'Zoey', relationship: 'Sister', age: 15, locked: true },
        { name: 'Kaylee', relationship: 'Sister', age: 13, locked: true },
        { name: 'Ellie', relationship: 'Sister', age: 11, locked: true },
        { name: 'Wyatt', relationship: 'Brother', age: 10, locked: true },
        { name: 'Hannah', relationship: 'Sister', age: 8, locked: true }
      ],
      pets: [
        { name: 'Spike', type: 'Pet', locked: false },
        { name: 'Belle', type: 'Family Pet', locked: false }
      ],
      familyTraditions: [],
      locked: false
    },
    physical: { eyeColor: '', hairColor: '', height: '', shoeSize: '', locked: false },
    freeText: '',
    backgroundTheme: 'Space Explorer',
    lastUpdated: new Date()
  },
  'zoey': {
    childId: '',
    birthCertificate: {
      fullName: 'Zoey Lynn Moses',
      birthDate: new Date(2010, 11, 6),
      birthTime: '09:51',
      birthPlace: 'Princeton, Minnesota, USA',
      county: 'Sherburne County',
      state: 'Minnesota',
      country: 'United States',
      locked: true
    },
    personal: {
      nickname: 'Zoey',
      favoriteColor: '',
      favoriteAnimal: '',
      favoriteFood: '',
      favoriteBook: '',
      favoriteMovie: '',
      favoriteSubject: '',
      bestFriend: '',
      dreamJob: '',
      superpower: '',
      favoritePlace: '',
      locked: false
    },
    interests: {
      sports: ['JROTC'],
      instruments: [],
      arts: [],
      collections: [],
      languages: [],
      clubs: ['JROTC'],
      customInterests: []
    },
    family: {
      siblings: [
        { name: 'Amos', relationship: 'Brother', age: 16, locked: true },
        { name: 'Kaylee', relationship: 'Sister', age: 13, locked: true },
        { name: 'Ellie', relationship: 'Sister', age: 11, locked: true },
        { name: 'Wyatt', relationship: 'Brother', age: 10, locked: true },
        { name: 'Hannah', relationship: 'Sister', age: 8, locked: true }
      ],
      pets: [
        { name: 'Hades', type: 'Pet', locked: false },
        { name: 'Belle', type: 'Family Pet', locked: false }
      ],
      familyTraditions: [],
      locked: false
    },
    physical: { eyeColor: '', hairColor: '', height: '', shoeSize: '', locked: false },
    freeText: '',
    backgroundTheme: 'Purple Dream',
    lastUpdated: new Date()
  },
  'kaylee': {
    childId: '',
    birthCertificate: {
      fullName: 'Kaylee Liberty Moses',
      birthDate: new Date(2012, 3, 28),
      birthTime: '12:45',
      birthPlace: 'Princeton, Minnesota, USA',
      county: 'Sherburne County',
      state: 'Minnesota',
      country: 'United States',
      locked: true
    },
    personal: {
      nickname: 'Kaylee',
      favoriteColor: '',
      favoriteAnimal: '',
      favoriteFood: '',
      favoriteBook: '',
      favoriteMovie: '',
      favoriteSubject: '',
      bestFriend: '',
      dreamJob: '',
      superpower: '',
      favoritePlace: '',
      locked: false
    },
    interests: {
      sports: [],
      instruments: [],
      arts: ['Theater', 'Acting'],
      collections: [],
      languages: [],
      clubs: [],
      customInterests: []
    },
    family: {
      siblings: [
        { name: 'Amos', relationship: 'Brother', age: 16, locked: true },
        { name: 'Zoey', relationship: 'Sister', age: 15, locked: true },
        { name: 'Ellie', relationship: 'Sister', age: 11, locked: true },
        { name: 'Wyatt', relationship: 'Brother', age: 10, locked: true },
        { name: 'Hannah', relationship: 'Sister', age: 8, locked: true }
      ],
      pets: [
        { name: 'Maple', type: 'Pet', locked: false },
        { name: 'Belle', type: 'Family Pet', locked: false }
      ],
      familyTraditions: [],
      locked: false
    },
    physical: { eyeColor: '', hairColor: '', height: '', shoeSize: '', locked: false },
    freeText: '',
    backgroundTheme: 'Pink Paradise',
    lastUpdated: new Date()
  },
  'ellie': {
    childId: '',
    birthCertificate: {
      fullName: 'Ellie Mae Moses',
      birthDate: new Date(2014, 5, 3),
      birthTime: '04:18',
      birthPlace: 'Princeton, Minnesota, USA',
      county: 'Sherburne County',
      state: 'Minnesota',
      country: 'United States',
      locked: true
    },
    personal: {
      nickname: 'Ellie',
      favoriteColor: '',
      favoriteAnimal: '',
      favoriteFood: '',
      favoriteBook: '',
      favoriteMovie: '',
      favoriteSubject: '',
      bestFriend: '',
      dreamJob: '',
      superpower: '',
      favoritePlace: '',
      locked: false
    },
    interests: {
      sports: [],
      instruments: [],
      arts: [],
      collections: [],
      languages: [],
      clubs: [],
      customInterests: []
    },
    family: {
      siblings: [
        { name: 'Amos', relationship: 'Brother', age: 16, locked: true },
        { name: 'Zoey', relationship: 'Sister', age: 15, locked: true },
        { name: 'Kaylee', relationship: 'Sister', age: 13, locked: true },
        { name: 'Wyatt', relationship: 'Brother', age: 10, locked: true },
        { name: 'Hannah', relationship: 'Sister', age: 8, locked: true }
      ],
      pets: [
        { name: 'Midnight', type: 'Pet', locked: false },
        { name: 'Belle', type: 'Family Pet', locked: false }
      ],
      familyTraditions: [],
      locked: false
    },
    physical: { eyeColor: '', hairColor: '', height: '', shoeSize: '', locked: false },
    freeText: '',
    backgroundTheme: 'Golden Sun',
    lastUpdated: new Date()
  },
  'wyatt': {
    childId: '',
    birthCertificate: {
      fullName: 'Wyatt James Moses',
      birthDate: new Date(2015, 11, 5),
      birthTime: '02:14',
      birthPlace: 'Isanti, Minnesota, USA',
      county: 'Isanti County',
      state: 'Minnesota',
      country: 'United States',
      locked: true
    },
    personal: {
      nickname: 'Wyatt',
      favoriteColor: '',
      favoriteAnimal: '',
      favoriteFood: '',
      favoriteBook: '',
      favoriteMovie: '',
      favoriteSubject: '',
      bestFriend: '',
      dreamJob: '',
      superpower: '',
      favoritePlace: '',
      locked: false
    },
    interests: {
      sports: [],
      instruments: [],
      arts: [],
      collections: [],
      languages: [],
      clubs: [],
      customInterests: []
    },
    family: {
      siblings: [
        { name: 'Amos', relationship: 'Brother', age: 16, locked: true },
        { name: 'Zoey', relationship: 'Sister', age: 15, locked: true },
        { name: 'Kaylee', relationship: 'Sister', age: 13, locked: true },
        { name: 'Ellie', relationship: 'Sister', age: 11, locked: true },
        { name: 'Hannah', relationship: 'Sister', age: 8, locked: true }
      ],
      pets: [
        { name: 'Belle', type: 'Family Pet', locked: false }
      ],
      familyTraditions: [],
      locked: false
    },
    physical: { eyeColor: '', hairColor: '', height: '', shoeSize: '', locked: false },
    freeText: '',
    backgroundTheme: 'Ocean Blue',
    lastUpdated: new Date()
  },
  'hannah': {
    childId: '',
    birthCertificate: {
      fullName: 'Hannah Joy Moses',
      birthDate: new Date(2017, 7, 26),
      birthTime: '07:49',
      birthPlace: 'Isanti, Minnesota, USA',
      county: 'Isanti County',
      state: 'Minnesota',
      country: 'United States',
      locked: true
    },
    personal: {
      nickname: 'Hannah',
      favoriteColor: '',
      favoriteAnimal: '',
      favoriteFood: '',
      favoriteBook: '',
      favoriteMovie: '',
      favoriteSubject: '',
      bestFriend: '',
      dreamJob: '',
      superpower: '',
      favoritePlace: '',
      locked: false
    },
    interests: {
      sports: [],
      instruments: [],
      arts: [],
      collections: [],
      languages: [],
      clubs: [],
      customInterests: ['Plants', 'Gardening']
    },
    family: {
      siblings: [
        { name: 'Amos', relationship: 'Brother', age: 16, locked: true },
        { name: 'Zoey', relationship: 'Sister', age: 15, locked: true },
        { name: 'Kaylee', relationship: 'Sister', age: 13, locked: true },
        { name: 'Ellie', relationship: 'Sister', age: 11, locked: true },
        { name: 'Wyatt', relationship: 'Brother', age: 10, locked: true }
      ],
      pets: [
        { name: 'Belle', type: 'Family Pet', locked: false }
      ],
      familyTraditions: [],
      locked: false
    },
    physical: { eyeColor: '', hairColor: '', height: '', shoeSize: '', locked: false },
    freeText: '',
    backgroundTheme: 'Forest Green',
    lastUpdated: new Date()
  }
}

// Legacy alias — prefer ALL_KIDS_ABOUT_ME_DATA for per-kid lookups
export const SAMPLE_ABOUT_ME_DATA: AboutMeProfile = ALL_KIDS_ABOUT_ME_DATA['amos']

// Additional sample data for all Moses children
export const ALL_KIDS_BIRTH_DATA: Record<string, BirthCertificateInfo> = {
  'amos': {
    fullName: 'Amos Lee Moses',
    birthDate: new Date(2009, 2, 2), // Year, Month (0-indexed), Day
    birthTime: '05:55',
    birthPlace: 'Princeton, Minnesota, USA',
    county: 'Sherburne County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  'zoey': {
    fullName: 'Zoey Lynn Moses',
    birthDate: new Date(2010, 11, 6), // Year, Month (0-indexed), Day
    birthTime: '09:51',
    birthPlace: 'Princeton, Minnesota, USA',
    county: 'Sherburne County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  'kaylee': {
    fullName: 'Kaylee Liberty Moses',
    birthDate: new Date(2012, 3, 28), // Year, Month (0-indexed), Day
    birthTime: '12:45',
    birthPlace: 'Princeton, Sherburne, Minnesota, USA',
    county: 'Sherburne County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  'ellie': {
    fullName: 'Ellie Mae Moses',
    birthDate: new Date(2014, 5, 3), // Year, Month (0-indexed), Day
    birthTime: '04:18',
    birthPlace: 'Princeton, Minnesota, USA',
    county: 'Sherburne County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  'wyatt': {
    fullName: 'Wyatt James Moses',
    birthDate: new Date(2015, 11, 5), // Year, Month (0-indexed), Day
    birthTime: '02:14',
    birthPlace: 'Isanti, Minnesota, USA',
    county: 'Isanti County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  'hannah': {
    fullName: 'Hannah Joy Moses',
    birthDate: new Date(2017, 7, 26), // Year, Month (0-indexed), Day
    birthTime: '07:49',
    birthPlace: 'Isanti, Minnesota, USA',
    county: 'Isanti County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  }
}

// Current grades for 2025-2026 school year
export const CURRENT_GRADES: Record<string, string> = {
  'amos': '12th',      // Born 2009, age 16-17, homeschooled
  'zoey': '12th',      // Born 2010, age 15-16, public school
  'kaylee': '10th',    // Born 2012, age 13-14, public school
  'ellie': '8th',      // Born 2014, age 11-12, homeschooled
  'wyatt': '4th',      // Born 2015, age 10-11, homeschooled
  'hannah': '6th'      // Born 2017, age 8-9, homeschooled
}

// Age-appropriate field visibility
export const getVisibleFields = (age: number) => {
  return {
    birthCertificate: age >= 8, // Older kids can see their birth details
    physical: age >= 6,
    dreamJob: age >= 5,
    superpower: age >= 4,
    freeText: age >= 7,
    customInterests: age >= 8
  }
}