import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const child = searchParams.get('child')?.toLowerCase()

    switch (action) {
      case 'get_balance': {
        if (!child) return NextResponse.json({ error: 'child required' }, { status: 400 })
        const rows = await db.query(
          `SELECT current_points, total_earned_all_time, last_payout_date FROM kid_points_balance WHERE kid_name = $1`,
          [child]
        )
        const settings = await db.query(`SELECT mode, conversion_rate FROM points_settings WHERE id = 1`)
        return NextResponse.json({
          balance: rows[0] || { current_points: 0, total_earned_all_time: 0, last_payout_date: null },
          settings: settings[0] || { mode: 'points', conversion_rate: 0.10 },
        })
      }

      case 'get_history': {
        if (!child) return NextResponse.json({ error: 'child required' }, { status: 400 })
        const rows = await db.query(
          `SELECT id, transaction_type, points, reason, logged_date, created_at
           FROM kid_points_log WHERE kid_name = $1
           ORDER BY created_at DESC LIMIT 30`,
          [child]
        )
        return NextResponse.json({ history: rows })
      }

      case 'get_goals': {
        if (!child) return NextResponse.json({ error: 'child required' }, { status: 400 })
        const kidGoals = await db.query(
          `SELECT id, goal_name, target_points, current_points, completed
           FROM kid_savings_goals WHERE kid_name = $1 AND completed = FALSE
           ORDER BY created_at DESC`,
          [child]
        )
        const familyGoals = await db.query(
          `SELECT id, goal_name, target_points, current_points, completed
           FROM family_goals WHERE completed = FALSE
           ORDER BY created_at DESC`
        )
        return NextResponse.json({ kidGoals, familyGoals })
      }

      case 'get_sick_days': {
        if (!child) return NextResponse.json({ error: 'child required' }, { status: 400 })
        const rows = await db.query(
          `SELECT id, sick_date, reason, severity, notes, saw_doctor
           FROM kid_sick_days WHERE kid_name = $1
           AND sick_date >= CURRENT_DATE - INTERVAL '90 days'
           ORDER BY sick_date DESC`,
          [child]
        )
        return NextResponse.json({ sickDays: rows })
      }

      case 'get_all_balances': {
        const rows = await db.query(
          `SELECT kid_name, current_points, total_earned_all_time, last_payout_date
           FROM kid_points_balance ORDER BY kid_name`
        )
        const settings = await db.query(`SELECT mode, conversion_rate FROM points_settings WHERE id = 1`)
        // Get sick day counts for last 30 days
        const sickCounts = await db.query(
          `SELECT kid_name, COUNT(*)::int as count
           FROM kid_sick_days
           WHERE sick_date >= CURRENT_DATE - INTERVAL '30 days'
           GROUP BY kid_name`
        )
        const sickMap: Record<string, number> = {}
        sickCounts.forEach((r: any) => { sickMap[r.kid_name] = r.count })
        return NextResponse.json({
          balances: rows,
          settings: settings[0] || { mode: 'points', conversion_rate: 0.10 },
          sickDayCounts: sickMap,
        })
      }

      case 'get_family_goals': {
        const rows = await db.query(
          `SELECT id, goal_name, target_points, current_points, completed, created_by
           FROM family_goals ORDER BY completed ASC, created_at DESC`
        )
        return NextResponse.json({ familyGoals: rows })
      }

      case 'get_settings': {
        const rows = await db.query(`SELECT mode, conversion_rate FROM points_settings WHERE id = 1`)
        return NextResponse.json({ settings: rows[0] || { mode: 'points', conversion_rate: 0.10 } })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Points GET error:', error)
    return NextResponse.json({ error: 'Failed to load points data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'earn_points': {
        const { child, points, reason } = body
        if (!child || !points || !reason) return NextResponse.json({ error: 'child, points, reason required' }, { status: 400 })
        const kidName = child.toLowerCase()
        await db.query(
          `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', $2, $3)`,
          [kidName, points, reason]
        )
        await db.query(
          `UPDATE kid_points_balance SET current_points = current_points + $2, total_earned_all_time = total_earned_all_time + $2, updated_at = NOW()
           WHERE kid_name = $1`,
          [kidName, points]
        )
        return NextResponse.json({ success: true })
      }

      case 'log_deduction': {
        const { child, points, reason } = body
        if (!child || !points || !reason) return NextResponse.json({ error: 'child, points, reason required' }, { status: 400 })
        const kidName = child.toLowerCase()
        // Floor at 0
        const balRow = await db.query(`SELECT current_points FROM kid_points_balance WHERE kid_name = $1`, [kidName])
        const currentBal = balRow[0]?.current_points || 0
        const actualDeduct = Math.min(points, currentBal)
        if (actualDeduct > 0) {
          await db.query(
            `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'deducted', $2, $3)`,
            [kidName, actualDeduct, reason]
          )
          await db.query(
            `UPDATE kid_points_balance SET current_points = GREATEST(current_points - $2, 0), updated_at = NOW() WHERE kid_name = $1`,
            [kidName, actualDeduct]
          )
        }
        return NextResponse.json({ success: true, deducted: actualDeduct })
      }

      case 'log_payout': {
        const { child, points, note } = body
        if (!child || !points) return NextResponse.json({ error: 'child, points required' }, { status: 400 })
        const kidName = child.toLowerCase()
        const balRow = await db.query(`SELECT current_points FROM kid_points_balance WHERE kid_name = $1`, [kidName])
        const currentBal = balRow[0]?.current_points || 0
        const actualPayout = Math.min(points, currentBal)
        if (actualPayout > 0) {
          await db.query(
            `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'payout', $2, $3)`,
            [kidName, actualPayout, note || 'Payout']
          )
          await db.query(
            `UPDATE kid_points_balance SET current_points = GREATEST(current_points - $2, 0), last_payout_date = CURRENT_DATE, updated_at = NOW()
             WHERE kid_name = $1`,
            [kidName, actualPayout]
          )
        }
        return NextResponse.json({ success: true, paid: actualPayout })
      }

      case 'add_goal': {
        const { child, goal_name, target_points } = body
        if (!child || !goal_name || !target_points) return NextResponse.json({ error: 'child, goal_name, target_points required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_savings_goals (kid_name, goal_name, target_points) VALUES ($1, $2, $3)`,
          [child.toLowerCase(), goal_name, target_points]
        )
        return NextResponse.json({ success: true })
      }

      case 'update_goal_progress': {
        const { goalId, current_points } = body
        await db.query(`UPDATE kid_savings_goals SET current_points = $2 WHERE id = $1`, [goalId, current_points])
        return NextResponse.json({ success: true })
      }

      case 'complete_goal': {
        const { goalId } = body
        await db.query(`UPDATE kid_savings_goals SET completed = TRUE WHERE id = $1`, [goalId])
        return NextResponse.json({ success: true })
      }

      case 'log_sick_day': {
        const { child, sick_date, reason, severity, notes, saw_doctor } = body
        if (!child || !sick_date || !reason || !severity) {
          return NextResponse.json({ error: 'child, sick_date, reason, severity required' }, { status: 400 })
        }
        await db.query(
          `INSERT INTO kid_sick_days (kid_name, sick_date, reason, severity, notes, saw_doctor)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (kid_name, sick_date) DO UPDATE SET reason = $3, severity = $4, notes = $5, saw_doctor = $6`,
          [child.toLowerCase(), sick_date, reason, severity, notes || null, saw_doctor || false]
        )
        return NextResponse.json({ success: true })
      }

      case 'add_family_goal': {
        const { goal_name, target_points } = body
        if (!goal_name || !target_points) return NextResponse.json({ error: 'goal_name, target_points required' }, { status: 400 })
        await db.query(
          `INSERT INTO family_goals (goal_name, target_points) VALUES ($1, $2)`,
          [goal_name, target_points]
        )
        return NextResponse.json({ success: true })
      }

      case 'update_family_goal': {
        const { goalId, current_points } = body
        await db.query(`UPDATE family_goals SET current_points = $2 WHERE id = $1`, [goalId, current_points])
        return NextResponse.json({ success: true })
      }

      case 'complete_family_goal': {
        const { goalId } = body
        await db.query(`UPDATE family_goals SET completed = TRUE WHERE id = $1`, [goalId])
        return NextResponse.json({ success: true })
      }

      case 'update_settings': {
        const { mode, conversion_rate } = body
        await db.query(
          `UPDATE points_settings SET mode = COALESCE($1, mode), conversion_rate = COALESCE($2, conversion_rate), updated_at = NOW() WHERE id = 1`,
          [mode || null, conversion_rate || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'midnight_check': {
        // Called by cron/scheduled task to process daily deductions and family goal contributions
        const dateParam = body.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const kids = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']

        for (const kid of kids) {
          // Check for sick day
          const sickRows = await db.query(
            `SELECT id FROM kid_sick_days WHERE kid_name = $1 AND sick_date = $2`,
            [kid, dateParam]
          )
          if (sickRows.length > 0) continue // Skip deductions for sick kids

          // Get required task stats for the day
          const completions = await db.query(
            `SELECT event_id, completed FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2`,
            [kid, dateParam]
          )
          // Count required tasks (exclude hygiene/earn_money by event_id prefix)
          const requiredItems = completions.filter((r: any) =>
            !r.event_id.startsWith('hygiene-') && !r.event_id.startsWith('earn-')
          )
          const total = requiredItems.length
          const done = requiredItems.filter((r: any) => r.completed).length

          if (total === 0) continue // No tasks assigned

          const pct = done / total

          if (pct >= 1.0) {
            // 100% — add 5 pts to family goal pool
            await addToFamilyGoal(5)
          } else if (pct >= 0.75) {
            // 75%+ — add 2 pts to family goal pool
            await addToFamilyGoal(2)
          } else if (pct >= 0.5) {
            // 50-74% — deduct 5
            await deductPoints(kid, 5, `Incomplete checklist ${dateParam}`)
          } else if (done > 0) {
            // Under 50% — deduct 10
            await deductPoints(kid, 10, `Incomplete checklist ${dateParam}`)
          } else {
            // Nothing completed — deduct 20
            await deductPoints(kid, 20, `No checklist completed ${dateParam}`)
          }
        }

        return NextResponse.json({ success: true, processed: dateParam })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Points POST error:', error)
    return NextResponse.json({ error: 'Failed to process points action' }, { status: 500 })
  }
}

async function deductPoints(kidName: string, points: number, reason: string) {
  const balRow = await db.query(`SELECT current_points FROM kid_points_balance WHERE kid_name = $1`, [kidName])
  const currentBal = balRow[0]?.current_points || 0
  const actualDeduct = Math.min(points, currentBal)
  if (actualDeduct > 0) {
    await db.query(
      `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'deducted', $2, $3)`,
      [kidName, actualDeduct, reason]
    )
    await db.query(
      `UPDATE kid_points_balance SET current_points = GREATEST(current_points - $2, 0), updated_at = NOW() WHERE kid_name = $1`,
      [kidName, actualDeduct]
    )
  }
}

async function addToFamilyGoal(points: number) {
  // Add to the first active (non-completed) family goal
  await db.query(
    `UPDATE family_goals SET current_points = current_points + $1
     WHERE id = (SELECT id FROM family_goals WHERE completed = FALSE ORDER BY created_at ASC LIMIT 1)`,
    [points]
  )
}
