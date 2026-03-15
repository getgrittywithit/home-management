import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')
    
    if (!childId) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 })
    }

    // Get about me data from family_config
    const aboutMeConfig = await db.query(`
      SELECT value as data
      FROM family_config 
      WHERE key = $1
    `, [`about_me_${childId}`])

    if (aboutMeConfig.length === 0) {
      // Return default about me structure if no data exists
      return NextResponse.json({
        childId,
        birthCertificate: {
          fullName: '',
          birthDate: new Date(),
          birthTime: '',
          birthPlace: '',
          birthWeight: '',
          birthLength: '',
          hospitalName: '',
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
        profilePhoto: '',
        backgroundTheme: 'Ocean Blue',
        lastUpdated: new Date()
      })
    }

    const aboutMeData = JSON.parse(aboutMeConfig[0].data)
    return NextResponse.json(aboutMeData)

  } catch (error) {
    console.error('Error fetching about me data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch about me data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { childId, field, value, section, isLocked } = data

    // Only allow updates to non-locked fields or if the update is from admin
    if (isLocked && !data.isAdminUpdate) {
      return NextResponse.json(
        { error: 'Cannot update locked field' },
        { status: 403 }
      )
    }

    // Get existing about me data
    const existingData = await db.query(`
      SELECT value as data
      FROM family_config 
      WHERE key = $1
    `, [`about_me_${childId}`])

    let aboutMeData = existingData.length > 0 
      ? JSON.parse(existingData[0].data)
      : {
          childId,
          birthCertificate: {
            fullName: '',
            birthDate: new Date(),
            birthTime: '',
            birthPlace: '',
            birthWeight: '',
            birthLength: '',
            hospitalName: '',
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
          profilePhoto: '',
          backgroundTheme: 'Ocean Blue',
          lastUpdated: new Date()
        }

    // Update the specific field
    if (section && field) {
      // Nested field update (e.g., personal.nickname)
      aboutMeData[section][field] = value
    } else if (field === 'backgroundTheme' || field === 'freeText') {
      // Top-level field update
      aboutMeData[field] = value
    } else if (field === 'addInterest') {
      // Add to interests array
      const { category, interest } = value
      if (!aboutMeData.interests[category].includes(interest)) {
        aboutMeData.interests[category].push(interest)
      }
    } else if (field === 'removeInterest') {
      // Remove from interests array
      const { category, index } = value
      aboutMeData.interests[category].splice(index, 1)
    }

    // Update timestamp
    aboutMeData.lastUpdated = new Date()

    // Save updated data
    if (existingData.length > 0) {
      await db.query(`
        UPDATE family_config 
        SET value = $1, updated_at = NOW()
        WHERE key = $2
      `, [JSON.stringify(aboutMeData), `about_me_${childId}`])
    } else {
      await db.query(`
        INSERT INTO family_config (key, value, updated_by)
        VALUES ($1, $2, (SELECT id FROM profiles WHERE role = 'parent' LIMIT 1))
      `, [`about_me_${childId}`, JSON.stringify(aboutMeData)])
    }

    return NextResponse.json({ success: true, data: aboutMeData })

  } catch (error) {
    console.error('Error updating about me data:', error)
    return NextResponse.json(
      { error: 'Failed to update about me data' },
      { status: 500 }
    )
  }
}