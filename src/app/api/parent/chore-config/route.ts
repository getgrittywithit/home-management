import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const STAR_VALUES: Record<string, number> = {
  zone_chore: 8,
  daily_chore: 5,
  belle_care: 6,
  streak_3: 10,
  streak_7: 25,
}

export async function GET() {
  try {
    // Get mode + conversion rate
    let settings = { mode: 'points', conversion_rate: 0.10 }
    try {
      const rows = await db.query(`SELECT mode, conversion_rate FROM points_settings WHERE id = 1`)
      if (rows[0]) settings = rows[0]
    } catch { /* use defaults */ }

    // Get per-kid config
    let kids: any[] = []
    try {
      kids = await db.query(`SELECT * FROM chore_pay_config ORDER BY kid_name`)
    } catch { /* empty */ }

    return NextResponse.json({
      mode: settings.mode,
      conversionRate: Number(settings.conversion_rate),
      kids,
      starValues: STAR_VALUES,
    })
  } catch (error) {
    console.error('chore-config GET error:', error)
    return NextResponse.json({ mode: 'points', conversionRate: 0.10, kids: [], starValues: STAR_VALUES })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'update_mode': {
        const { mode } = body
        if (!mode || !['points', 'dollars'].includes(mode)) {
          return NextResponse.json({ error: 'mode must be "points" or "dollars"' }, { status: 400 })
        }
        await db.query(
          `UPDATE points_settings SET mode = $1, updated_at = NOW() WHERE id = 1`,
          [mode]
        )
        return NextResponse.json({ success: true, mode })
      }

      case 'update_conversion_rate': {
        const { conversion_rate } = body
        if (conversion_rate === undefined) return NextResponse.json({ error: 'conversion_rate required' }, { status: 400 })
        await db.query(
          `UPDATE points_settings SET conversion_rate = $1, updated_at = NOW() WHERE id = 1`,
          [conversion_rate]
        )
        return NextResponse.json({ success: true })
      }

      case 'update_config': {
        const { kid_name, monthly_target, daily_paid_chores, required_daily } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        await db.query(
          `INSERT INTO chore_pay_config (kid_name, monthly_target, daily_paid_chores, required_daily, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (kid_name) DO UPDATE SET
             monthly_target = COALESCE($2, chore_pay_config.monthly_target),
             daily_paid_chores = COALESCE($3, chore_pay_config.daily_paid_chores),
             required_daily = COALESCE($4, chore_pay_config.required_daily),
             updated_at = NOW()`,
          [kid_name.toLowerCase(), monthly_target ?? null, daily_paid_chores ?? null, required_daily ?? null]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('chore-config POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
