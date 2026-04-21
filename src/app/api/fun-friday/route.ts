import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'
import { HOMESCHOOL_KIDS, KID_DISPLAY } from '@/lib/constants'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
const ALLOWED_KIDS = new Set<string>([...HOMESCHOOL_KIDS])

function getMonday(date?: string): string {
  const d = date ? new Date(date + 'T12:00:00') : new Date()
  const dow = d.getDay()
  d.setDate(d.getDate() - ((dow + 6) % 7))
  return d.toLocaleDateString('en-CA')
}

function getFriday(monday: string): string {
  const d = new Date(monday + 'T12:00:00')
  d.setDate(d.getDate() + 4)
  return d.toLocaleDateString('en-CA')
}

function getWeekDates(monday: string): string[] {
  return [0, 1, 2, 3].map(i => {
    const d = new Date(monday + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('en-CA')
  })
}

async function dayCompletionPercent(kidName: string, date: string, subjects: string[]): Promise<number | null> {
  const tasks = await db.query(
    `SELECT status, subject_name FROM homeschool_daily_tasks
     WHERE kid_name = $1 AND task_date = $2 AND is_required = TRUE AND subject_name = ANY($3)`,
    [kidName, date, subjects]
  ).catch(() => [])
  if (tasks.length === 0) return null
  const completed = tasks.filter((t: any) => t.status === 'completed').length
  return completed / tasks.length
}

async function evaluateKid(kidName: string, weekOf: string): Promise<any> {
  const criteria = await db.query(`SELECT * FROM fun_friday_criteria WHERE kid_name = $1 AND active = TRUE`, [kidName]).catch(() => [])
  if (!criteria[0]) return null

  const c = criteria[0]
  const subjects = c.core_only ? c.core_subjects : c.all_subjects
  const dates = getWeekDates(weekOf)
  const breakdown: Record<string, number | null | string> = {}
  let daysEvaluated = 0
  let daysHit = 0

  for (const date of dates) {
    const mode = await db.query(
      `SELECT mode_type FROM day_modes WHERE kid_name = $1 AND date = $2 AND status = 'active'`, [kidName, date]
    ).catch(() => [])
    const modeType = mode[0]?.mode_type
    if (['sick_day', 'off_day', 'vacation', 'field_trip'].includes(modeType)) {
      breakdown[date] = 'excused'
      continue
    }
    const pct = await dayCompletionPercent(kidName, date, subjects)
    if (pct === null) { breakdown[date] = 'no_data'; continue }
    breakdown[date] = Math.round(pct * 100)
    daysEvaluated++
    if (pct * 100 >= c.threshold_pct) daysHit++
  }

  const qualified = daysHit >= c.days_required

  await db.query(
    `INSERT INTO fun_friday_evaluations (kid_name, week_of, days_evaluated, days_hit_threshold, threshold_pct_required, days_required, qualified, day_breakdown)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (kid_name, week_of) DO UPDATE SET days_evaluated=$3, days_hit_threshold=$4, qualified=$7, day_breakdown=$8, evaluated_at=NOW()`,
    [kidName, weekOf, daysEvaluated, daysHit, c.threshold_pct, c.days_required, qualified, JSON.stringify(breakdown)]
  )

  return { kid_name: kidName, qualified, days_evaluated: daysEvaluated, days_hit: daysHit, threshold: c.threshold_pct, days_required: c.days_required, breakdown }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_kid_status'

  try {
    if (action === 'get_kid_status') {
      const kid = searchParams.get('kid_name')?.toLowerCase()
      if (!kid || !ALLOWED_KIDS.has(kid)) return NextResponse.json({ error: 'Homeschool kids only' }, { status: 403 })

      const monday = getMonday()
      const friday = getFriday(monday)
      const criteria = await db.query(`SELECT * FROM fun_friday_criteria WHERE kid_name = $1`, [kid]).catch(() => [])
      if (!criteria[0]) return NextResponse.json({ status: 'no_criteria' })

      const evaluation = await db.query(
        `SELECT * FROM fun_friday_evaluations WHERE kid_name = $1 AND week_of = $2`, [kid, monday]
      ).catch(() => [])

      const pick = await db.query(
        `SELECT * FROM fun_friday_picks WHERE kid_name = $1 AND friday_date = $2`, [kid, friday]
      ).catch(() => [])

      const mode = await db.query(
        `SELECT mode_type FROM day_modes WHERE kid_name = $1 AND date = $2 AND status = 'active'`, [kid, friday]
      ).catch(() => [])

      const isFunFriday = mode[0]?.mode_type === 'fun_friday'

      if (isFunFriday && pick[0]) return NextResponse.json({ status: 'earned_picked', pick: pick[0], evaluation: evaluation[0] })
      if (isFunFriday && !pick[0]) return NextResponse.json({ status: 'earned_unpicked', evaluation: evaluation[0] })
      if (evaluation[0]?.qualified === false) return NextResponse.json({ status: 'not_earned', evaluation: evaluation[0] })

      const c = criteria[0]
      const subjects = c.core_only ? c.core_subjects : c.all_subjects
      const dates = getWeekDates(monday)
      let daysHit = 0
      let daysChecked = 0
      for (const date of dates) {
        const pct = await dayCompletionPercent(kid, date, subjects)
        if (pct !== null) { daysChecked++; if (pct * 100 >= c.threshold_pct) daysHit++ }
      }

      return NextResponse.json({ status: 'in_progress', days_hit: daysHit, days_checked: daysChecked, days_required: c.days_required, threshold: c.threshold_pct })
    }

    if (action === 'get_menu') {
      const kid = searchParams.get('kid_name')?.toLowerCase()
      if (!kid || !ALLOWED_KIDS.has(kid)) return NextResponse.json({ error: 'Homeschool kids only' }, { status: 403 })
      const menu = await db.query(`SELECT * FROM fun_friday_menu WHERE kid_name = $1 AND active = TRUE ORDER BY last_picked_at ASC NULLS FIRST`, [kid]).catch(() => [])
      const shared = await db.query(`SELECT * FROM shared_reward_pool WHERE active = TRUE ORDER BY last_picked_at ASC NULLS FIRST`).catch(() => [])
      return NextResponse.json({ menu, shared })
    }

    if (action === 'get_movies_available') {
      const rows = await db.query(
        `SELECT * FROM movie_library WHERE active = TRUE AND (last_watched_at IS NULL OR last_watched_at < CURRENT_DATE - cooldown_days * INTERVAL '1 day') ORDER BY title`
      ).catch(() => [])
      return NextResponse.json({ movies: rows })
    }

    if (action === 'get_themes_available') {
      const rows = await db.query(
        `SELECT * FROM themed_afternoon_library WHERE active = TRUE AND (last_used_at IS NULL OR last_used_at < CURRENT_DATE - cooldown_days * INTERVAL '1 day') ORDER BY theme_name`
      ).catch(() => [])
      return NextResponse.json({ themes: rows })
    }

    if (action === 'get_friday_move') {
      const date = searchParams.get('friday_date')
      const rows = await db.query(`SELECT * FROM friday_move_log WHERE friday_date = $1`, [date]).catch(() => [])
      return NextResponse.json({ move: rows[0] || null })
    }

    if (action === 'get_evaluations') {
      const kid = searchParams.get('kid_name')?.toLowerCase()
      const rows = await db.query(
        `SELECT * FROM fun_friday_evaluations ${kid ? 'WHERE kid_name = $1' : ''} ORDER BY week_of DESC LIMIT 20`,
        kid ? [kid] : []
      ).catch(() => [])
      return NextResponse.json({ evaluations: rows })
    }

    if (action === 'get_criteria') {
      const rows = await db.query(`SELECT * FROM fun_friday_criteria ORDER BY kid_name`).catch(() => [])
      return NextResponse.json({ criteria: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[fun-friday] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'evaluate_week': {
        const kid = body.kid_name?.toLowerCase()
        if (!kid || !ALLOWED_KIDS.has(kid)) return NextResponse.json({ error: 'Homeschool kids only' }, { status: 403 })
        const weekOf = body.week_of || getMonday()
        const result = await evaluateKid(kid, weekOf)
        if (!result) return NextResponse.json({ error: 'No criteria found' }, { status: 404 })

        if (result.qualified) {
          const friday = getFriday(weekOf)
          await db.query(
            `INSERT INTO day_modes (kid_name, date, mode_type, status, set_by, parent_confirmed_at)
             VALUES ($1, $2, 'fun_friday', 'active', 'system_auto', NOW())
             ON CONFLICT (kid_name, date) DO UPDATE SET mode_type='fun_friday', status='active', set_by='system_auto', updated_at=NOW()`,
            [kid, friday]
          ).catch(() => {})
          await createNotification({
            title: 'You earned Fun Friday!', message: 'Pick your plan for Friday →',
            source_type: 'fun_friday_earned', source_ref: `ff-earned-${kid}-${weekOf}`,
            icon: '🌟', target_role: 'kid', kid_name: kid, link_tab: 'my-day',
          }).catch(() => {})
        } else {
          await createNotification({
            title: 'Friday this week is a normal day', message: 'Next week starts fresh — your streak is safe!',
            source_type: 'fun_friday_missed', source_ref: `ff-missed-${kid}-${weekOf}`,
            icon: '📋', target_role: 'kid', kid_name: kid,
          }).catch(() => {})
        }
        return NextResponse.json(result)
      }

      case 'evaluate_all': {
        const weekOf = body.week_of || getMonday()
        const results = []
        const earned: string[] = []
        const missed: string[] = []
        for (const kid of [...HOMESCHOOL_KIDS]) {
          const result = await evaluateKid(kid, weekOf)
          if (result) {
            results.push(result)
            if (result.qualified) {
              earned.push(KID_DISPLAY[kid] || cap(kid))
              const friday = getFriday(weekOf)
              await db.query(
                `INSERT INTO day_modes (kid_name, date, mode_type, status, set_by, parent_confirmed_at)
                 VALUES ($1, $2, 'fun_friday', 'active', 'system_auto', NOW())
                 ON CONFLICT (kid_name, date) DO UPDATE SET mode_type='fun_friday', status='active', set_by='system_auto', updated_at=NOW()`,
                [kid, friday]
              ).catch(() => {})
              await createNotification({
                title: 'You earned Fun Friday!', message: 'Pick your plan for Friday →',
                source_type: 'fun_friday_earned', source_ref: `ff-earned-${kid}-${weekOf}`,
                icon: '🌟', target_role: 'kid', kid_name: kid, link_tab: 'my-day',
              }).catch(() => {})
            } else {
              missed.push(KID_DISPLAY[kid] || cap(kid))
              await createNotification({
                title: 'Friday this week is a normal day', message: 'Next week starts fresh!',
                source_type: 'fun_friday_missed', source_ref: `ff-missed-${kid}-${weekOf}`,
                icon: '📋', target_role: 'kid', kid_name: kid,
              }).catch(() => {})
            }
          }
        }
        await createNotification({
          title: 'Fun Friday results',
          message: `${earned.length > 0 ? earned.join(' + ') + ' earned it!' : 'No one qualified this week.'} ${missed.length > 0 ? missed.join(' + ') + ' — next week resets.' : ''}`,
          source_type: 'fun_friday_parent_summary', source_ref: `ff-summary-${weekOf}`,
          icon: '🌟', link_tab: 'homeschool',
        }).catch(() => {})
        return NextResponse.json({ results, earned, missed })
      }

      case 'pick_reward': {
        const { kid_name, source_type, source_id, option_text } = body
        const kid = kid_name?.toLowerCase()
        if (!kid || !ALLOWED_KIDS.has(kid)) return NextResponse.json({ error: 'Homeschool kids only' }, { status: 403 })
        const friday = getFriday(getMonday())
        await db.query(
          `INSERT INTO fun_friday_picks (kid_name, friday_date, source_type, source_id, option_text_snapshot)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (kid_name, friday_date) DO UPDATE SET source_type=$3, source_id=$4, option_text_snapshot=$5, picked_at=NOW()`,
          [kid, friday, source_type, source_id, option_text]
        )
        if (source_type === 'individual_menu') await db.query(`UPDATE fun_friday_menu SET last_picked_at = $2 WHERE id = $1`, [source_id, friday]).catch(() => {})
        if (source_type === 'shared_pool') await db.query(`UPDATE shared_reward_pool SET last_picked_at = $2 WHERE id = $1`, [source_id, friday]).catch(() => {})
        if (source_type === 'movie') await db.query(`UPDATE movie_library SET last_watched_at = $2 WHERE id = $1`, [source_id, friday]).catch(() => {})
        if (source_type === 'themed_afternoon') await db.query(`UPDATE themed_afternoon_library SET last_used_at = $2 WHERE id = $1`, [source_id, friday]).catch(() => {})
        return NextResponse.json({ success: true })
      }

      case 'log_friday_move': {
        const { friday_date, activity, who_participated, notes } = body
        await db.query(
          `INSERT INTO friday_move_log (friday_date, activity, duration_min, who_participated, notes)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (friday_date) DO UPDATE SET activity=$2, who_participated=$4, notes=$5`,
          [friday_date, activity, body.duration_min || null, who_participated || null, notes || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'admin_update_criteria': {
        const { kid_name, threshold_pct, days_required, core_only, notes } = body
        await db.query(
          `UPDATE fun_friday_criteria SET threshold_pct=COALESCE($2,threshold_pct), days_required=COALESCE($3,days_required),
           core_only=COALESCE($4,core_only), notes=$5, updated_at=NOW() WHERE kid_name=$1`,
          [kid_name?.toLowerCase(), threshold_pct, days_required, core_only, notes || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'admin_add_menu_option': {
        const { kid_name, option_text, option_category, icon, estimated_duration_min, supplies_needed } = body
        const rows = await db.query(
          `INSERT INTO fun_friday_menu (kid_name, option_text, option_category, icon, estimated_duration_min, supplies_needed) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [kid_name?.toLowerCase(), option_text, option_category, icon || null, estimated_duration_min || null, supplies_needed || null]
        )
        return NextResponse.json({ option: rows[0] }, { status: 201 })
      }

      case 'admin_deactivate_menu_option': {
        await db.query(`UPDATE fun_friday_menu SET active = FALSE WHERE id = $1`, [body.menu_id])
        return NextResponse.json({ success: true })
      }

      case 'admin_add_movie': {
        const { title, streaming_source, rating, duration_min, description } = body
        const rows = await db.query(
          `INSERT INTO movie_library (title, streaming_source, rating, duration_min, description) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [title, streaming_source, rating || null, duration_min || null, description || null]
        )
        return NextResponse.json({ movie: rows[0] }, { status: 201 })
      }

      case 'admin_add_theme': {
        const { theme_name, description, supplies_needed } = body
        const rows = await db.query(
          `INSERT INTO themed_afternoon_library (theme_name, description, supplies_needed) VALUES ($1,$2,$3) RETURNING *`,
          [theme_name, description, supplies_needed || null]
        )
        return NextResponse.json({ theme: rows[0] }, { status: 201 })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[fun-friday] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
