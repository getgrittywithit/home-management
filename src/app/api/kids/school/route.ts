import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')
    
    if (!childId) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 })
    }

    // Get school data from family_config
    const schoolConfig = await db.query(`
      SELECT config_value as data
      FROM family_config 
      WHERE key = $1
    `, [`school_data_${childId}`])

    if (schoolConfig.length === 0) {
      // Return default school structure if no data exists
      return NextResponse.json({
        childId,
        grade: '',
        school: '',
        schoolYear: '2024-2025',
        teachers: [],
        classes: [],
        links: [],
        assignments: [],
        personalNotes: ''
      })
    }

    const schoolData = JSON.parse(schoolConfig[0].data)
    return NextResponse.json(schoolData)

  } catch (error) {
    console.error('Error fetching school data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch school data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { childId, field, value, isLocked } = data

    // Only allow updates to non-locked fields or if the update is from admin
    if (isLocked && !data.isAdminUpdate) {
      return NextResponse.json(
        { error: 'Cannot update locked field' },
        { status: 403 }
      )
    }

    // Get existing school data
    const existingData = await db.query(`
      SELECT config_value as data
      FROM family_config 
      WHERE key = $1
    `, [`school_data_${childId}`])

    let schoolData = existingData.length > 0 
      ? JSON.parse(existingData[0].data)
      : {
          childId,
          grade: '',
          school: '',
          schoolYear: '2024-2025',
          teachers: [],
          classes: [],
          links: [],
          assignments: [],
          personalNotes: ''
        }

    // Update the specific field
    if (field === 'personalNotes') {
      schoolData.personalNotes = value
    } else if (field === 'addLink') {
      schoolData.links.push(value)
    } else if (field === 'addAssignment') {
      schoolData.assignments.push(value)
    } else if (field === 'toggleAssignment') {
      const assignment = schoolData.assignments.find((a: any) => a.id === value.id)
      if (assignment) {
        assignment.completed = value.completed
      }
    } else {
      schoolData[field] = value
    }

    // Save updated data
    if (existingData.length > 0) {
      await db.query(`
        UPDATE family_config 
        SET config_value = $1, updated_at = NOW()
        WHERE key = $2
      `, [JSON.stringify(schoolData), `school_data_${childId}`])
    } else {
      await db.query(`
        INSERT INTO family_config (key, value, updated_by)
        VALUES ($1, $2, (SELECT id FROM profiles WHERE role = 'parent' LIMIT 1))
      `, [`school_data_${childId}`, JSON.stringify(schoolData)])
    }

    return NextResponse.json({ success: true, data: schoolData })

  } catch (error) {
    console.error('Error updating school data:', error)
    return NextResponse.json(
      { error: 'Failed to update school data' },
      { status: 500 }
    )
  }
}