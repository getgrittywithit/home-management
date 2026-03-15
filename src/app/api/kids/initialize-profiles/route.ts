import { NextResponse } from 'next/server'
import { db } from '@/lib/database'

// Real birth data for all Moses children
const KIDS_BIRTH_DATA = {
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

const CURRENT_GRADES = {
  'amos': '10th',
  'zoey': '9th',
  'kaylee': '7th',
  'ellie': '6th',
  'wyatt': '4th',
  'hannah': '3rd'
}

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

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

export async function POST() {
  try {
    const profiles = []

    for (const [childKey, birthData] of Object.entries(KIDS_BIRTH_DATA)) {
      const childName = childKey.charAt(0).toUpperCase() + childKey.slice(1)
      const age = calculateAge(birthData.birthDate)
      const grade = CURRENT_GRADES[childKey as keyof typeof CURRENT_GRADES]

      const profile = {
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

    // Save profiles to database
    let createdCount = 0
    for (const profile of profiles) {
      const configKey = `about_me_${profile.childId}`
      
      try {
        // Check if profile already exists
        const existing = await db.getConfig(configKey)
        
        if (!existing) {
          await db.setConfig(
            configKey,
            JSON.stringify(profile),
            'system-initialization'
          )
          createdCount++
        }
      } catch (error) {
        console.error(`Error creating profile for ${profile.childId}:`, error)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully created ${createdCount} About Me profiles`,
      profiles: profiles.map(p => ({ 
        childId: p.childId, 
        name: p.personal.nickname 
      }))
    })
  } catch (error) {
    console.error('Error initializing kids profiles:', error)
    return NextResponse.json(
      { error: 'Failed to initialize kids profiles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}