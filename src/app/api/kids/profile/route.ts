import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const {
      name,
      birthdate,
      grade,
      favoriteColors,
      favoriteFoods,
      favoriteAnimals,
      favoriteActivities,
      favoriteSubjects,
      preferredChores,
      avatarEmoji,
      dreamJob,
      learningStyle,
      themePreference
    } = data

    // First, find the child by name
    const existingChild = await db.query(`
      SELECT id FROM profiles 
      WHERE LOWER(first_name) = LOWER($1) AND role = 'child'
      LIMIT 1
    `, [name])

    let childId
    if (existingChild.length > 0) {
      childId = existingChild[0].id
      
      // Update existing profile with only known columns
      await db.query(`
        UPDATE profiles SET
          birthdate = $2,
          emoji = $3,
          updated_at = NOW()
        WHERE id = $1
      `, [
        childId,
        birthdate || null,
        avatarEmoji
      ])
      
      // Store additional profile data in a separate JSON field
      await db.query(`
        UPDATE profiles SET
          profile_data = $2
        WHERE id = $1
      `, [
        childId,
        JSON.stringify({
          grade,
          favoriteColors,
          favoriteFoods,
          favoriteAnimals: favoriteAnimals || [],
          favoriteActivities,
          favoriteSubjects,
          preferredChores,
          dreamJob,
          learningStyle,
          themePreference: themePreference || 'fun'
        })
      ])
    } else {
      // Create new profile with only known columns
      const newChild = await db.query(`
        INSERT INTO profiles (first_name, role, email, birthdate, emoji, profile_data)
        VALUES ($1, 'child', $2, $3, $4, $5)
        RETURNING id
      `, [
        name,
        `${name.toLowerCase().replace(/\s+/g, '')}@family.local`,
        birthdate || null,
        avatarEmoji,
        JSON.stringify({
          grade,
          favoriteColors,
          favoriteFoods,
          favoriteAnimals: favoriteAnimals || [],
          favoriteActivities,
          favoriteSubjects,
          preferredChores,
          dreamJob,
          learningStyle,
          themePreference: themePreference || 'fun'
        })
      ])
      
      childId = newChild[0].id
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile saved successfully!',
      childId 
    })

  } catch (error) {
    console.error('Error saving kid profile:', error)
    console.error('Request data:', { name: name, birthdate: birthdate, grade: grade, avatarEmoji: avatarEmoji })
    return NextResponse.json(
      { error: 'Failed to save profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}