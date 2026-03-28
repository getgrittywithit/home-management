import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

function getSeason(): string {
  const month = new Date().getMonth() + 1 // 1-12
  return (month >= 3 && month <= 8) ? 'spring-summer' : 'fall-winter'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'pending') {
      const rows = await db.query(
        `SELECT mr.id, mr.kid_name, mr.meal_id, mr.assigned_date, mr.status,
                ml.name as meal_name, ml.theme
         FROM meal_requests mr
         JOIN meal_library ml ON mr.meal_id = ml.id
         WHERE mr.status = 'pending'
         ORDER BY mr.assigned_date`
      )
      return NextResponse.json({ requests: rows })
    }

    if (action === 'my_request') {
      const kid = searchParams.get('kid')
      const date = searchParams.get('date')
      if (!kid || !date) {
        return NextResponse.json({ error: 'kid and date required' }, { status: 400 })
      }
      const rows = await db.query(
        `SELECT mr.id, mr.status, ml.name as meal_name
         FROM meal_requests mr
         JOIN meal_library ml ON mr.meal_id = ml.id
         WHERE mr.kid_name = $1 AND mr.assigned_date = $2
         ORDER BY mr.created_at DESC LIMIT 1`,
        [kid, date]
      )
      return NextResponse.json({ request: rows.length > 0 ? rows[0] : null })
    }

    if (action === 'available_meals') {
      const theme = searchParams.get('theme')
      const season = searchParams.get('season') || getSeason()
      if (!theme) {
        return NextResponse.json({ error: 'theme required' }, { status: 400 })
      }
      const rows = await db.query(
        `SELECT id, name, description FROM meal_library
         WHERE theme = $1 AND (season = $2 OR season = 'year-round') AND active = true
         ORDER BY CASE WHEN season = 'year-round' THEN 0 ELSE 1 END, name
         LIMIT 8`,
        [theme, season]
      )
      return NextResponse.json({ meals: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Meal requests GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch meal requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'request_meal') {
      const { kid_name, meal_id, date } = body
      if (!kid_name || !meal_id || !date) {
        return NextResponse.json({ error: 'kid_name, meal_id, and date required' }, { status: 400 })
      }

      // Check for existing pending request
      const existing = await db.query(
        `SELECT id FROM meal_requests WHERE kid_name = $1 AND assigned_date = $2 AND status = 'pending'`,
        [kid_name, date]
      )
      if (existing.length > 0) {
        return NextResponse.json({ error: 'Already have a pending request for this date' }, { status: 409 })
      }

      const result = await db.query(
        `INSERT INTO meal_requests (kid_name, meal_id, assigned_date, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW())
         RETURNING id`,
        [kid_name, meal_id, date]
      )
      return NextResponse.json({ success: true, request_id: result[0]?.id })
    }

    if (action === 'approve') {
      const { requestId } = body
      if (!requestId) {
        return NextResponse.json({ error: 'requestId required' }, { status: 400 })
      }

      // Get the request details
      const rows = await db.query(
        `SELECT mr.id, mr.meal_id, mr.assigned_date, ml.name as meal_name
         FROM meal_requests mr
         JOIN meal_library ml ON mr.meal_id = ml.id
         WHERE mr.id = $1`,
        [requestId]
      )
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }

      const req = rows[0]

      await db.query(
        `UPDATE meal_requests SET status = 'approved', approved_meal_id = $1, updated_at = NOW() WHERE id = $2`,
        [req.meal_id, requestId]
      )

      // Insert into meal_plans
      await db.query(
        `INSERT INTO meal_plans (date, meal_type, dish_name, updated_at)
         VALUES ($1, 'dinner', $2, NOW())
         ON CONFLICT (date, meal_type) DO UPDATE SET dish_name = $2, updated_at = NOW()`,
        [req.assigned_date, req.meal_name]
      )

      return NextResponse.json({ success: true })
    }

    if (action === 'swap') {
      const { requestId, newMealId } = body
      if (!requestId || !newMealId) {
        return NextResponse.json({ error: 'requestId and newMealId required' }, { status: 400 })
      }

      // Get request details
      const rows = await db.query(
        `SELECT mr.id, mr.assigned_date FROM meal_requests mr WHERE mr.id = $1`,
        [requestId]
      )
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }

      // Get new meal name
      const newMeal = await db.query(
        `SELECT name FROM meal_library WHERE id = $1`,
        [newMealId]
      )
      if (newMeal.length === 0) {
        return NextResponse.json({ error: 'New meal not found' }, { status: 404 })
      }

      const req = rows[0]

      await db.query(
        `UPDATE meal_requests SET status = 'swapped', approved_meal_id = $1, updated_at = NOW() WHERE id = $2`,
        [newMealId, requestId]
      )

      // Insert into meal_plans with swapped meal
      await db.query(
        `INSERT INTO meal_plans (date, meal_type, dish_name, updated_at)
         VALUES ($1, 'dinner', $2, NOW())
         ON CONFLICT (date, meal_type) DO UPDATE SET dish_name = $2, updated_at = NOW()`,
        [req.assigned_date, newMeal[0].name]
      )

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Meal requests POST error:', error)
    return NextResponse.json({ error: 'Failed to process meal request' }, { status: 500 })
  }
}
