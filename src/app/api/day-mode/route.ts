import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getDayMode, resolveDayEffect, autoAssignCoverage, writeAttendance, MODE_EFFECTS } from '@/lib/dayMode'
import { createNotification } from '@/lib/notifications'
import { ALL_KIDS, KID_DISPLAY, KID_SCHOOL_TYPE } from '@/lib/constants'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
const PUBLIC_KIDS = new Set(['zoey', 'kaylee'])

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_today'

  try {
    if (action === 'get_today') {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const rows = await db.query(
        `SELECT * FROM day_modes WHERE date = $1 ORDER BY kid_name NULLS LAST`, [today]
      ).catch(() => [])

      const familyWide = rows.find((r: any) => !r.kid_name)
      const kids = [...ALL_KIDS].map(kid => {
        const kidMode = rows.find((r: any) => r.kid_name === kid)
        return {
          kid_name: kid,
          display_name: KID_DISPLAY[kid] || cap(kid),
          mode: kidMode || familyWide || null,
          pending: kidMode?.status === 'pending_confirm',
          school_type: KID_SCHOOL_TYPE[kid] || 'homeschool',
        }
      })

      return NextResponse.json({ kids, family_wide: familyWide || null, date: today })
    }

    if (action === 'get_range') {
      const start = searchParams.get('start')
      const end = searchParams.get('end')
      const kid = searchParams.get('kid_name')
      if (!start || !end) return NextResponse.json({ error: 'start + end required' }, { status: 400 })

      let sql = `SELECT * FROM day_modes WHERE date >= $1 AND date <= $2`
      const params: any[] = [start, end]
      if (kid) { params.push(kid.toLowerCase()); sql += ` AND (kid_name = $3 OR kid_name IS NULL)` }
      sql += ` ORDER BY date, kid_name NULLS LAST`

      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ modes: rows })
    }

    if (action === 'suggest_from_bisd') {
      const start = searchParams.get('start') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const end = searchParams.get('end') || new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-CA')

      const events = await db.query(
        `SELECT * FROM calendar_events_cache
         WHERE start_time::date >= $1::date AND start_time::date <= $2::date
         AND (calendar_name ILIKE '%boerne%' OR calendar_name ILIKE '%champion%' OR calendar_name ILIKE '%BMSN%')
         AND (title ILIKE '%holiday%' OR title ILIKE '%teacher%' OR title ILIKE '%in-service%' OR title ILIKE '%break%' OR title ILIKE '%closed%' OR title ILIKE '%no school%')
         ORDER BY start_time`,
        [start, end]
      ).catch(() => [])

      const suggestions = events.map((e: any) => {
        const cal = (e.calendar_name || '').toLowerCase()
        const affectsKids = cal.includes('champion') ? ['zoey'] : cal.includes('bmsn') || cal.includes('middle') ? ['kaylee'] : ['zoey', 'kaylee']
        return {
          date: e.start_time?.split('T')[0] || e.start_time,
          title: e.title,
          calendar: e.calendar_name,
          affects_kids: affectsKids,
          suggested_mode: 'off_day',
        }
      })

      return NextResponse.json({ suggestions })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[day-mode] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'set_mode': {
        const { kid_name, date, mode_type, reason, notify_school, config, set_by } = body
        if (!date || !mode_type) return NextResponse.json({ error: 'date + mode_type required' }, { status: 400 })
        if (!MODE_EFFECTS[mode_type]) return NextResponse.json({ error: `Invalid mode: ${mode_type}` }, { status: 400 })

        const kid = kid_name?.toLowerCase() || null
        const rows = await db.query(
          `INSERT INTO day_modes (kid_name, date, mode_type, status, set_by, reason, notify_school, config, parent_confirmed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (kid_name, date) DO UPDATE SET
             mode_type = $3, status = $4, set_by = $5, reason = $6, notify_school = $7, config = $8,
             parent_confirmed_at = $9, updated_at = NOW()
           RETURNING *`,
          [kid, date, mode_type, set_by === 'kid_request' ? 'pending_confirm' : 'active',
           set_by || 'parent', reason || null, notify_school || false,
           config ? JSON.stringify(config) : '{}', set_by !== 'kid_request' ? new Date().toISOString() : null]
        )

        const mode = rows[0]
        let coverageAssignments: any[] = []
        let emailDrafted = false

        if (mode.status === 'active' && kid) {
          await writeAttendance(kid, date, mode_type, reason)

          const effect = resolveDayEffect(mode)
          if (effect.pets === 'shift_if_away' || effect.manager === 'shift_if_away') {
            coverageAssignments = await autoAssignCoverage(mode.id, kid, date)
          }

          if (PUBLIC_KIDS.has(kid) && notify_school && ['sick_day', 'off_day', 'vacation', 'field_trip'].includes(mode_type)) {
            emailDrafted = true
          }
        }

        if (set_by === 'kid_request' && kid) {
          await createNotification({
            title: `${cap(kid)} ${mode_type === 'sick_day' ? 'is not feeling well' : `requested ${mode_type.replace(/_/g, ' ')}`}`,
            message: reason || 'Needs your attention',
            source_type: 'day_mode_request', source_ref: `daymode-${kid}-${date}`,
            icon: mode_type === 'sick_day' ? '🤒' : '📋', link_tab: 'overview',
          }).catch(() => {})
        }

        return NextResponse.json({ mode, coverage_assignments: coverageAssignments, email_drafted: emailDrafted })
      }

      case 'set_bulk': {
        const { kid_names, start, end, mode_type, reason } = body
        if (!kid_names?.length || !start || !end || !mode_type) return NextResponse.json({ error: 'kid_names + start + end + mode_type required' }, { status: 400 })

        const modes: any[] = []
        const allCoverage: any[] = []
        const startD = new Date(start + 'T12:00:00')
        const endD = new Date(end + 'T12:00:00')

        for (const kid of kid_names) {
          for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toLocaleDateString('en-CA')
            const rows = await db.query(
              `INSERT INTO day_modes (kid_name, date, mode_type, status, set_by, reason, parent_confirmed_at)
               VALUES ($1, $2, $3, 'active', 'parent', $4, NOW())
               ON CONFLICT (kid_name, date) DO UPDATE SET mode_type=$3, status='active', reason=$4, updated_at=NOW()
               RETURNING *`,
              [kid.toLowerCase(), dateStr, mode_type, reason || null]
            )
            if (rows[0]) {
              modes.push(rows[0])
              await writeAttendance(kid.toLowerCase(), dateStr, mode_type, reason)
              const effect = resolveDayEffect(rows[0])
              if (effect.pets === 'shift_if_away' || effect.manager === 'shift_if_away') {
                const cov = await autoAssignCoverage(rows[0].id, kid.toLowerCase(), dateStr)
                allCoverage.push(...cov)
              }
            }
          }
        }

        return NextResponse.json({ modes, coverage_assignments: allCoverage, count: modes.length })
      }

      case 'confirm_pending': {
        const { mode_id } = body
        if (!mode_id) return NextResponse.json({ error: 'mode_id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE day_modes SET status = 'active', parent_confirmed_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'pending_confirm' RETURNING *`,
          [mode_id]
        )
        const mode = rows[0]
        if (mode) {
          await writeAttendance(mode.kid_name, mode.date, mode.mode_type, mode.reason)
          const effect = resolveDayEffect(mode)
          if (effect.pets === 'shift_if_away' || effect.manager === 'shift_if_away') {
            await autoAssignCoverage(mode.id, mode.kid_name, mode.date)
          }
          await createNotification({
            title: `Mom confirmed your ${mode.mode_type.replace(/_/g, ' ')}`,
            message: resolveDayEffect(mode).banner || '',
            source_type: 'day_mode_confirmed', icon: '✅',
            target_role: 'kid', kid_name: mode.kid_name,
          }).catch(() => {})
        }
        return NextResponse.json({ mode })
      }

      case 'override_pending': {
        const { mode_id, new_mode_type, reason } = body
        if (!mode_id || !new_mode_type) return NextResponse.json({ error: 'mode_id + new_mode_type required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE day_modes SET mode_type = $2, status = 'active', reason = COALESCE($3, reason),
           parent_confirmed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
          [mode_id, new_mode_type, reason || null]
        )
        const mode = rows[0]
        if (mode) {
          await writeAttendance(mode.kid_name, mode.date, new_mode_type, mode.reason)
        }
        return NextResponse.json({ mode })
      }

      case 'assign_coverage': {
        const { mode_id, duty_type, covered_by, covered_by_type } = body
        if (!mode_id || !duty_type) return NextResponse.json({ error: 'mode_id + duty_type required' }, { status: 400 })
        await db.query(
          `UPDATE day_mode_coverage SET covered_by = $3, covered_by_type = $4, parent_confirmed = TRUE
           WHERE day_mode_id = $1 AND duty_type = $2`,
          [mode_id, duty_type, covered_by || null, covered_by_type || 'kid']
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[day-mode] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
