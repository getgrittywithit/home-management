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
  childId: 'sample-kid',
  birthCertificate: {
    fullName: 'Emma Rose Johnson',
    birthDate: new Date('2015-06-15'),
    birthTime: '14:32',
    birthPlace: 'Denver, Colorado, USA',
    birthWeight: '6 lbs 8 oz',
    birthLength: '19 inches',
    hospitalName: 'Denver General Hospital',
    county: 'Denver County',
    state: 'Colorado',
    country: 'United States',
    locked: true
  },
  personal: {
    nickname: 'Em',
    favoriteColor: 'Purple',
    favoriteAnimal: 'Dolphin',
    favoriteFood: 'Pizza',
    favoriteBook: 'Harry Potter',
    favoriteMovie: 'Moana',
    favoriteSubject: 'Art',
    bestFriend: 'Sophia',
    dreamJob: 'Marine Biologist',
    superpower: 'Talk to animals',
    favoritePlace: 'The beach',
    locked: false
  },
  interests: {
    sports: ['Swimming', 'Soccer'],
    instruments: ['Piano'],
    arts: ['Drawing', 'Photography'],
    collections: ['Seashells', 'Stickers'],
    languages: ['Spanish'],
    clubs: ['Art Club', 'Science Club'],
    customInterests: ['Astronomy', 'Baking cookies']
  },
  family: {
    siblings: [
      { name: 'Jake', relationship: 'Brother', age: 12, locked: true },
      { name: 'Lily', relationship: 'Sister', age: 6, locked: true }
    ],
    pets: [
      { name: 'Max', type: 'Dog', breed: 'Golden Retriever', age: 4, gotWhen: 'When I was 6', locked: false }
    ],
    familyTraditions: ['Pizza Friday', 'Summer camping trip', 'Holiday cookie baking'],
    locked: false
  },
  physical: {
    eyeColor: 'Blue',
    hairColor: 'Blonde',
    height: '4 feet 2 inches',
    shoeSize: '3',
    locked: false
  },
  freeText: 'I love spending time at the beach and learning about ocean animals. My goal is to swim with dolphins someday! I also really enjoy art class and making new friends.',
  backgroundTheme: 'Ocean Blue',
  lastUpdated: new Date()
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