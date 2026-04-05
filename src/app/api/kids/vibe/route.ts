import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || ''
  const kidName = searchParams.get('kid_name')

  try {
    if (action === 'get_vibe') {
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(`SELECT * FROM kid_vibe_profile WHERE kid_name = $1`, [kidName.toLowerCase()])
      return NextResponse.json({ profile: rows[0] || null })
    }

    if (action === 'get_portfolio') {
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kidName.toLowerCase()
      // Pull from multiple sources
      const achievements = await db.query(
        `SELECT title, tier, earned_at FROM kid_achievements WHERE kid_name = $1 ORDER BY earned_at DESC LIMIT 10`, [kid]
      ).catch(() => [])
      const vibe = await db.query(`SELECT interests, portfolio_items FROM kid_vibe_profile WHERE kid_name = $1`, [kid]).catch(() => [])
      return NextResponse.json({
        achievements,
        interests: vibe[0]?.interests || [],
        portfolio_items: vibe[0]?.portfolio_items || [],
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Vibe GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'update_vibe': {
        const { kid_name, quote, aesthetic, theme_color, interests, goals, portfolio_items } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_vibe_profile (kid_name, quote, aesthetic, theme_color, interests, goals, portfolio_items, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
           ON CONFLICT (kid_name) DO UPDATE SET
             quote=COALESCE($2,kid_vibe_profile.quote), aesthetic=COALESCE($3,kid_vibe_profile.aesthetic),
             theme_color=COALESCE($4,kid_vibe_profile.theme_color),
             interests=COALESCE($5,kid_vibe_profile.interests), goals=COALESCE($6,kid_vibe_profile.goals),
             portfolio_items=COALESCE($7,kid_vibe_profile.portfolio_items), updated_at=NOW()`,
          [kid_name.toLowerCase(), quote || null, aesthetic || null, theme_color || null,
           interests ? JSON.stringify(interests) : null, goals ? JSON.stringify(goals) : null,
           portfolio_items ? JSON.stringify(portfolio_items) : null]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Vibe POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
