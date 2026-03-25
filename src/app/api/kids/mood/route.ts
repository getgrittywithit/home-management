import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const kid = searchParams.get('kid')?.toLowerCase()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    switch (action) {
      case 'get_today_mood': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const rows = await db.query(
          `SELECT mood_score, one_win, one_hard_thing, what_helped
           FROM kid_mood_log WHERE kid_name = $1 AND log_date = $2`,
          [kid, today]
        )
        return NextResponse.json({ mood: rows[0] || null })
      }

      case 'get_mood_history': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const days = parseInt(searchParams.get('days') || '30')
        const rows = await db.query(
          `SELECT log_date, mood_score, one_win, one_hard_thing, what_helped
           FROM kid_mood_log WHERE kid_name = $1
           AND log_date >= CURRENT_DATE - $2 * INTERVAL '1 day'
           ORDER BY log_date DESC`,
          [kid, days]
        )
        return NextResponse.json({ history: rows })
      }

      case 'get_all_today_moods': {
        const rows = await db.query(
          `SELECT kid_name, mood_score FROM kid_mood_log WHERE log_date = $1`,
          [today]
        )
        const moods: Record<string, number> = {}
        rows.forEach((r: any) => { moods[r.kid_name] = r.mood_score })
        return NextResponse.json({ moods })
      }

      case 'get_break_flags': {
        const rows = await db.query(
          `SELECT id, kid_name, flagged_at, note, acknowledged
           FROM kid_break_flags WHERE acknowledged = FALSE
           ORDER BY flagged_at DESC`
        )
        return NextResponse.json({ flags: rows })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Mood GET error:', error)
    return NextResponse.json({ error: 'Failed to load mood data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'log_mood': {
        const { kid_name, mood_score, one_win, one_hard_thing, what_helped } = body
        if (!kid_name || !mood_score) return NextResponse.json({ error: 'kid_name and mood_score required' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await db.query(
          `INSERT INTO kid_mood_log (kid_name, log_date, mood_score, one_win, one_hard_thing, what_helped)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (kid_name, log_date)
           DO UPDATE SET mood_score = $3, one_win = $4, one_hard_thing = $5, what_helped = $6, created_at = NOW()`,
          [kid_name.toLowerCase(), today, mood_score, one_win || null, one_hard_thing || null, what_helped || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'flag_break': {
        const { kid_name, note } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_break_flags (kid_name, note) VALUES ($1, $2)`,
          [kid_name.toLowerCase(), note || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'acknowledge_break': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE kid_break_flags SET acknowledged = TRUE, acknowledged_at = NOW() WHERE id = $1`,
          [id]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Mood POST error:', error)
    return NextResponse.json({ error: 'Failed to process mood action' }, { status: 500 })
  }
}
