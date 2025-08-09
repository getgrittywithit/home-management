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
      
      // Update existing profile
      await db.query(`
        UPDATE profiles SET
          birthdate = $2,
          grade = $3,
          emoji = $4,
          favorite_colors = $5,
          favorite_foods = $6,
          favorite_animals = $7,
          favorite_activities = $8,
          favorite_subjects = $9,
          preferred_chores = $10,
          dream_job = $11,
          learning_style = $12,
          theme_preference = $13,
          updated_at = NOW()
        WHERE id = $1
      `, [
        childId,
        birthdate,
        grade,
        avatarEmoji,
        JSON.stringify(favoriteColors),
        JSON.stringify(favoriteFoods),
        JSON.stringify(favoriteAnimals || []),
        JSON.stringify(favoriteActivities),
        JSON.stringify(favoriteSubjects),
        JSON.stringify(preferredChores),
        dreamJob,
        learningStyle,
        themePreference || 'fun'
      ])
    } else {
      // Create new profile
      const newChild = await db.query(`
        INSERT INTO profiles (
          first_name, role, birthdate, grade, emoji,
          favorite_colors, favorite_foods, favorite_animals,
          favorite_activities, favorite_subjects, preferred_chores,
          dream_job, learning_style, theme_preference
        ) VALUES ($1, 'child', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [
        name,
        birthdate,
        grade,
        avatarEmoji,
        JSON.stringify(favoriteColors),
        JSON.stringify(favoriteFoods),
        JSON.stringify(favoriteAnimals || []),
        JSON.stringify(favoriteActivities),
        JSON.stringify(favoriteSubjects),
        JSON.stringify(preferredChores),
        dreamJob,
        learningStyle,
        themePreference || 'fun'
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
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    )
  }
}