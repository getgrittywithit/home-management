import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'rotation_status') {
      const weekStart = searchParams.get('weekStart')
      if (!weekStart) {
        return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
      }

      // Calculate week end (7 days from start)
      const startDate = new Date(weekStart + 'T00:00:00')
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      const weekEnd = endDate.toISOString().split('T')[0]

      try {
        const requests = await db.query(
          `SELECT id, child_id, request_date, meal_description, special_notes, status, meal_type,
                  created_at
           FROM meal_requests
           WHERE request_date >= $1 AND request_date <= $2
           ORDER BY request_date`,
          [weekStart, weekEnd]
        )

        // Also fetch child names
        const enriched = await Promise.all(
          requests.map(async (r: any) => {
            let kid_name = 'Unknown'
            try {
              const child = await db.query(
                `SELECT first_name FROM family_members WHERE id = $1`,
                [r.child_id]
              )
              if (child.length > 0) kid_name = child[0].first_name
            } catch {}
            return {
              date: (r.request_date || '').toString().split('T')[0],
              kid_name,
              meal_name: r.meal_description || '',
              status: r.status || 'pending',
              meal_id: r.id,
              meal_type: r.meal_type || 'dinner',
            }
          })
        )

        return NextResponse.json({ requests: enriched })
      } catch (err: any) {
        // Table might not exist yet — return empty
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ requests: [] })
        }
        throw err
      }
    }

    if (action === 'get_meals_by_theme') {
      const theme = searchParams.get('theme')
      const season = searchParams.get('season')

      if (!theme) {
        return NextResponse.json({ error: 'theme required' }, { status: 400 })
      }

      try {
        const meals = await db.query(
          `SELECT id, name, theme, season, description
           FROM meal_library
           WHERE theme = $1 AND (season = $2 OR season = 'year-round')
           ORDER BY name`,
          [theme, season || 'year-round']
        )

        return NextResponse.json({ meals })
      } catch (err: any) {
        // Table might not exist yet — return empty
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ meals: [] })
        }
        throw err
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use rotation_status or get_meals_by_theme' }, { status: 400 })
  } catch (error) {
    console.error('Error in parent meal-plan API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'delete_meal') {
      const { meal_id } = body
      if (!meal_id) return NextResponse.json({ error: 'meal_id required' }, { status: 400 })
      // Soft delete
      await db.query(`UPDATE meal_library SET active = FALSE WHERE id = $1`, [meal_id])
      return NextResponse.json({ success: true })
    }

    if (action === 'restore_meal') {
      const { meal_id } = body
      if (!meal_id) return NextResponse.json({ error: 'meal_id required' }, { status: 400 })
      await db.query(`UPDATE meal_library SET active = TRUE WHERE id = $1`, [meal_id])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error in POST meal-plan API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
