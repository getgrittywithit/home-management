import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const kidName = searchParams.get('kid_name')

  switch (action) {
    case 'get_observations': {
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const days = parseInt(searchParams.get('days') || '30')
      const rows = await db.query(
        `SELECT * FROM behavioral_observations WHERE kid_name = $1 AND observation_date >= CURRENT_DATE - INTERVAL '1 day' * $2 ORDER BY observation_date DESC, observation_time DESC`,
        [kidName.toLowerCase(), days]
      ).catch(() => [])
      return NextResponse.json({ observations: rows })
    }

    case 'get_summary': {
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE intensity = 'mild')::int as mild,
          COUNT(*) FILTER (WHERE intensity = 'moderate')::int as moderate,
          COUNT(*) FILTER (WHERE intensity = 'severe')::int as severe,
          AVG(mood_before)::numeric(3,1) as avg_mood_before,
          AVG(mood_after)::numeric(3,1) as avg_mood_after
         FROM behavioral_observations WHERE kid_name = $1 AND observation_date >= CURRENT_DATE - INTERVAL '30 days'`,
        [kidName.toLowerCase()]
      ).catch(() => [])
      return NextResponse.json({ summary: rows[0] || {} })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'log_observation': {
      const { kid_name, observation_date, observation_time, context, antecedent, behavior, consequence, duration_minutes, intensity, resolution, mood_before, mood_after, notes } = body
      if (!kid_name || !behavior) return NextResponse.json({ error: 'kid_name and behavior required' }, { status: 400 })
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const result = await db.query(
        `INSERT INTO behavioral_observations
         (kid_name, observation_date, observation_time, context, antecedent, behavior, consequence, duration_minutes, intensity, resolution, mood_before, mood_after, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
        [kid_name.toLowerCase(), observation_date || today, observation_time || null, context || null,
         antecedent || null, behavior, consequence || null, duration_minutes || null,
         intensity || 'mild', resolution || null, mood_before || null, mood_after || null, notes || null]
      )
      return NextResponse.json({ success: true, id: result[0]?.id })
    }

    case 'delete_observation': {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM behavioral_observations WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
