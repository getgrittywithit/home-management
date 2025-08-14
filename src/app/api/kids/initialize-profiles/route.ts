import { NextResponse } from 'next/server'
import { saveProfilesToDatabase } from '@/scripts/createKidsAboutMeProfiles'

export async function POST() {
  try {
    const profiles = await saveProfilesToDatabase()
    return NextResponse.json({ 
      success: true, 
      message: `Successfully created ${profiles.length} About Me profiles`,
      profiles: profiles.map(p => ({ childId: p.childId, name: p.personal.nickname }))
    })
  } catch (error) {
    console.error('Error initializing kids profiles:', error)
    return NextResponse.json(
      { error: 'Failed to initialize kids profiles' },
      { status: 500 }
    )
  }
}