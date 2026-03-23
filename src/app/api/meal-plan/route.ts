import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end query params required' }, { status: 400 })
    }

    const rows = await db.query(
      'SELECT id, plan_date, meal_name FROM meal_plan WHERE plan_date >= $1 AND plan_date <= $2 ORDER BY plan_date',
      [start, end]
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching meal plan:', error)
    return NextResponse.json({ error: 'Failed to fetch meal plan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { plan_date, meal_name } = await request.json()

    if (!plan_date) {
      return NextResponse.json({ error: 'plan_date required' }, { status: 400 })
    }

    await db.query(
      `INSERT INTO meal_plan (plan_date, meal_name, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (plan_date)
       DO UPDATE SET meal_name = $2, updated_at = NOW()`,
      [plan_date, meal_name || null]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving meal plan:', error)
    return NextResponse.json({ error: 'Failed to save meal plan' }, { status: 500 })
  }
}
