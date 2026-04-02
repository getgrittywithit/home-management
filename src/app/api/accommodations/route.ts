import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const kidName = searchParams.get('kid_name')

  if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  try {
    const rows = await db.query(
      `SELECT accommodation_type, parameters, source FROM kid_accommodations WHERE kid_name = $1 AND active = TRUE`,
      [kidName.toLowerCase()]
    )
    const accommodations: Record<string, any> = {}
    rows.forEach((r: any) => {
      accommodations[r.accommodation_type] = {
        enabled: true,
        parameters: r.parameters || {},
        source: r.source,
      }
    })
    return NextResponse.json({ accommodations, count: rows.length })
  } catch {
    return NextResponse.json({ accommodations: {}, count: 0 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'set_accommodation': {
      const { kid_name, accommodation_type, parameters, source } = body
      if (!kid_name || !accommodation_type) return NextResponse.json({ error: 'kid_name and accommodation_type required' }, { status: 400 })
      await db.query(
        `INSERT INTO kid_accommodations (kid_name, accommodation_type, parameters, source, active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (kid_name, accommodation_type)
         DO UPDATE SET parameters = $3, source = $4, active = TRUE`,
        [kid_name.toLowerCase(), accommodation_type, parameters ? JSON.stringify(parameters) : '{}', source || 'parent_override']
      )
      return NextResponse.json({ success: true })
    }

    case 'remove_accommodation': {
      const { kid_name, accommodation_type } = body
      if (!kid_name || !accommodation_type) return NextResponse.json({ error: 'kid_name and accommodation_type required' }, { status: 400 })
      await db.query(
        `UPDATE kid_accommodations SET active = FALSE WHERE kid_name = $1 AND accommodation_type = $2`,
        [kid_name.toLowerCase(), accommodation_type]
      )
      return NextResponse.json({ success: true })
    }

    case 'seed_defaults': {
      // Seed based on known family accommodations
      const seeds = [
        { kid: 'amos', types: ['extended_time', 'simplified_language', 'age_appropriate_content', 'dyslexia_font', 'color_blind_safe', 'read_aloud', 'reduced_problems'], source: 'iep' },
        { kid: 'wyatt', types: ['extended_time', 'color_blind_safe', 'movement_breaks', 'visual_instructions'], source: 'iep' },
        { kid: 'hannah', types: ['extended_time', 'read_aloud', 'visual_instructions'], source: '504' },
        { kid: 'kaylee', types: ['extended_time', 'simplified_language', 'visual_instructions', 'read_aloud'], source: 'iep' },
      ]
      for (const s of seeds) {
        for (const t of s.types) {
          await db.query(
            `INSERT INTO kid_accommodations (kid_name, accommodation_type, source, active)
             VALUES ($1, $2, $3, TRUE) ON CONFLICT (kid_name, accommodation_type) DO NOTHING`,
            [s.kid, t, s.source]
          ).catch(() => {})
        }
      }
      return NextResponse.json({ success: true, seeded: seeds.length })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
