// Script to create About Me profiles for all Moses children using real birth data
import { ALL_KIDS_BIRTH_DATA, CURRENT_GRADES } from '@/lib/aboutMeConfig'
import { db } from '@/lib/database'

interface AboutMeProfile {
  childId: string
  birthCertificate: any
  personal: {
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
    locked: boolean
  }
  interests: {
    sports: string[]
    instruments: string[]
    arts: string[]
    collections: string[]
    languages: string[]
    clubs: string[]
    customInterests: string[]
  }
  family: {
    siblings: Array<{name: string, relationship: string, age: number, locked: boolean}>
    pets: Array<{name: string, type: string, breed?: string, age: number, gotWhen: string, locked: boolean}>
    familyTraditions: string[]
    locked: boolean
  }
  physical: {
    eyeColor: string
    hairColor: string
    height: string
    shoeSize: string
    locked: boolean
  }
  freeText: string
  backgroundTheme: string
  lastUpdated: Date
}

// Calculate current ages from birth dates
function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

// Create sibling data for all kids
function createSiblingsData(currentChildName: string) {
  const allKids = [
    { name: 'Amos', birthDate: new Date('2009-03-02') },
    { name: 'Zoey', birthDate: new Date('2010-12-06') },
    { name: 'Kaylee', birthDate: new Date('2012-04-28') },
    { name: 'Ellie', birthDate: new Date('2014-06-03') },
    { name: 'Wyatt', birthDate: new Date('2015-12-05') },
    { name: 'Hannah', birthDate: new Date('2017-08-26') }
  ]

  return allKids
    .filter(kid => kid.name !== currentChildName)
    .map(kid => ({
      name: kid.name,
      relationship: ['Amos', 'Wyatt'].includes(kid.name) ? 'Brother' : 'Sister',
      age: calculateAge(kid.birthDate),
      locked: true
    }))
}

// Age-appropriate defaults for different kids
const ageAppropriateDefaults = {
  favoriteColors: {
    'Amos': 'Blue',
    'Zoey': 'Purple', 
    'Kaylee': 'Pink',
    'Ellie': 'Rainbow',
    'Wyatt': 'Green',
    'Hannah': 'Yellow'
  },
  favoriteAnimals: {
    'Amos': 'Wolf',
    'Zoey': 'Horse',
    'Kaylee': 'Cat', 
    'Ellie': 'Butterfly',
    'Wyatt': 'Dinosaur',
    'Hannah': 'Bunny'
  },
  themes: {
    'Amos': 'Space Explorer',
    'Zoey': 'Purple Sunset',
    'Kaylee': 'Cherry Blossom',
    'Ellie': 'Forest Friends',
    'Wyatt': 'Adventure Time',
    'Hannah': 'Sunshine Garden'
  }
}

export async function createAboutMeProfiles() {
  const profiles: AboutMeProfile[] = []

  for (const [childKey, birthData] of Object.entries(ALL_KIDS_BIRTH_DATA)) {
    const childName = childKey.charAt(0).toUpperCase() + childKey.slice(1)
    const age = calculateAge(birthData.birthDate)
    const grade = CURRENT_GRADES[childKey]

    const profile: AboutMeProfile = {
      childId: childKey,
      birthCertificate: {
        ...birthData,
        birthDate: birthData.birthDate.toISOString(),
        locked: true
      },
      personal: {
        nickname: childName,
        favoriteColor: ageAppropriateDefaults.favoriteColors[childName as keyof typeof ageAppropriateDefaults.favoriteColors] || 'Blue',
        favoriteAnimal: ageAppropriateDefaults.favoriteAnimals[childName as keyof typeof ageAppropriateDefaults.favoriteAnimals],
        favoriteFood: '',
        favoriteBook: '',
        favoriteMovie: '',
        favoriteSubject: age >= 5 ? (grade?.includes('th') ? 'Math' : 'Art') : undefined,
        bestFriend: '',
        dreamJob: age >= 5 ? '' : undefined,
        superpower: age >= 4 ? 'Flying' : undefined,
        favoritePlace: 'Home',
        locked: false
      },
      interests: {
        sports: age >= 8 ? ['Soccer'] : age >= 5 ? ['Playing at the park'] : [],
        instruments: [],
        arts: age >= 4 ? ['Drawing'] : [],
        collections: [],
        languages: [],
        clubs: [],
        customInterests: age >= 8 ? [] : []
      },
      family: {
        siblings: createSiblingsData(childName),
        pets: [
          { 
            name: 'Family Pets', 
            type: 'Various', 
            breed: 'Mixed', 
            age: 0, 
            gotWhen: 'Always had pets', 
            locked: false 
          }
        ],
        familyTraditions: [
          'Family game nights',
          'Movie nights', 
          'Holiday celebrations',
          'Summer adventures'
        ],
        locked: false
      },
      physical: {
        eyeColor: '',
        hairColor: '',
        height: '',
        shoeSize: '',
        locked: false
      },
      freeText: age >= 7 ? `Hi! I'm ${childName} and I'm ${age} years old. I'm in ${grade} grade!` : '',
      backgroundTheme: ageAppropriateDefaults.themes[childName as keyof typeof ageAppropriateDefaults.themes] || 'Ocean Blue',
      lastUpdated: new Date()
    }

    profiles.push(profile)
  }

  return profiles
}

// Function to save profiles to database
export async function saveProfilesToDatabase() {
  try {
    const profiles = await createAboutMeProfiles()
    
    for (const profile of profiles) {
      const configKey = `about_me_${profile.childId}`
      
      // Check if profile already exists
      const existing = await db.getConfig(configKey)
      
      if (!existing) {
        await db.setConfig(
          configKey,
          JSON.stringify(profile),
          'system-initialization'
        )
        console.log(`Created About Me profile for ${profile.childId}`)
      } else {
        console.log(`About Me profile already exists for ${profile.childId}`)
      }
    }
    
    console.log('All About Me profiles have been created!')
    return profiles
  } catch (error) {
    console.error('Error creating About Me profiles:', error)
    throw error
  }
}