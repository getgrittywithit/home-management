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

// Sample data for development
export const SAMPLE_ABOUT_ME_DATA: AboutMeProfile = {
  childId: 'amos-moses-504640',
  birthCertificate: {
    fullName: 'Amos Lee Moses',
    birthDate: new Date('2009-03-02'),
    birthTime: '05:55',
    birthPlace: 'Princeton, Minnesota, USA',
    birthWeight: '7 lbs 12 oz',
    birthLength: '21 inches',
    hospitalName: 'Princeton Hospital',
    county: 'Sherburne County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  personal: {
    nickname: 'Amos',
    favoriteColor: 'Blue',
    favoriteAnimal: 'Wolf',
    favoriteFood: 'Tacos',
    favoriteBook: 'Ready Player One',
    favoriteMovie: 'Avengers: Endgame',
    favoriteSubject: 'Ag Mechanics & Metal Tech',
    bestFriend: 'Connor',
    dreamJob: 'Game Developer',
    superpower: 'Time manipulation',
    favoritePlace: 'Home gaming setup',
    locked: false
  },
  interests: {
    sports: ['Gaming', 'Basketball'],
    instruments: [],
    arts: ['Digital Art', 'Video Editing'],
    collections: ['Gaming Collectibles', 'Tech Gadgets'],
    languages: ['ASL'],
    clubs: ['Gaming Club', 'Tech Club'],
    customInterests: ['Astronomy', 'Computer Programming', 'Metal Working']
  },
  family: {
    siblings: [
      { name: 'Hannah', relationship: 'Sister', age: 7, locked: true },
      { name: 'Wyatt', relationship: 'Brother', age: 9, locked: true },
      { name: 'Ellie', relationship: 'Sister', age: 10, locked: true },
      { name: 'Kaylee', relationship: 'Sister', age: 12, locked: true },
      { name: 'Zoey', relationship: 'Sister', age: 14, locked: true }
    ],
    pets: [
      { name: 'Family Pets', type: 'Various', breed: 'Mixed', age: 0, gotWhen: 'Always had pets', locked: false }
    ],
    familyTraditions: ['Family gaming nights', 'Tech project time', 'Outdoor adventures'],
    locked: false
  },
  physical: {
    eyeColor: 'Brown',
    hairColor: 'Brown',
    height: '5 feet 8 inches',
    shoeSize: '10',
    locked: false
  },
  freeText: 'I love gaming, technology, and learning about astronomy. I am really interested in ag mechanics and metal working at school. My goal is to become a game developer or work with technology. I enjoy spending time with my family and working on projects.',
  backgroundTheme: 'Indigo Purple',
  lastUpdated: new Date()
}

// Additional sample data for all Moses children
export const ALL_KIDS_BIRTH_DATA: Record<string, BirthCertificateInfo> = {
  'amos': {
    fullName: 'Amos Lee Moses',
    birthDate: new Date('2009-03-02'),
    birthTime: '05:55',
    birthPlace: 'Princeton, Minnesota, USA',
    county: 'Sherburne County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  'zoey': {
    fullName: 'Zoey Lynn Moses',
    birthDate: new Date('2010-12-06'),
    birthTime: '09:51',
    birthPlace: 'Princeton, Minnesota, USA',
    county: 'Sherburne County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  'kaylee': {
    fullName: 'Kaylee Liberty Moses',
    birthDate: new Date('2012-04-28'),
    birthTime: '12:45',
    birthPlace: 'Princeton, Sherburne, Minnesota, USA',
    county: 'Sherburne County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  'ellie': {
    fullName: 'Ellie Mae Moses',
    birthDate: new Date('2014-06-03'),
    birthTime: '12:00',
    birthPlace: 'Princeton, Minnesota, USA',
    county: 'Sherburne County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  'wyatt': {
    fullName: 'Wyatt James Moses',
    birthDate: new Date('2015-12-05'),
    birthTime: '02:14',
    birthPlace: 'Isanti, Minnesota, USA',
    county: 'Isanti County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  },
  'hannah': {
    fullName: 'Hannah Joy Moses',
    birthDate: new Date('2017-08-26'),
    birthTime: '07:49',
    birthPlace: 'Isanti, Minnesota, USA',
    county: 'Isanti County',
    state: 'Minnesota',
    country: 'United States',
    locked: true
  }
}

// Current grades for 2024-2025 school year
export const CURRENT_GRADES: Record<string, string> = {
  'amos': '10th',      // Born 2009, age 15-16
  'zoey': '9th',       // Born 2010, age 14-15
  'kaylee': '7th',     // Born 2012, age 12-13
  'ellie': '6th',      // Born 2014, age 10-11
  'wyatt': '4th',      // Born 2015, age 9-10
  'hannah': '3rd'      // Born 2017, age 7-8
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