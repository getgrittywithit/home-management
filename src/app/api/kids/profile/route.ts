import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Store kid profile data for parent review instead of complex database operations
    const profileData = {
      timestamp: new Date().toISOString(),
      kidProfile: data
    }

    // Save to a simple table for parent review
    await db.query(`
      INSERT INTO family_config (config_key, config_value, updated_by)
      VALUES ($1, $2, (SELECT id FROM profiles WHERE role = 'parent' LIMIT 1))
    `, [
      `kid_profile_${data.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      JSON.stringify(profileData)
    ])

    return NextResponse.json({ 
      success: true, 
      message: 'Profile saved for parent review!',
      saved: true
    })

  } catch (error) {
    console.error('Error saving kid profile:', error)
    return NextResponse.json(
      { error: 'Failed to save profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}