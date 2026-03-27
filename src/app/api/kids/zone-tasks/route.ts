import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ── Zone key mapping from checklist event summaries ──
const ZONE_KEY_MAP: Record<string, string> = {
  'morning zone chores': '', // resolved dynamically from current zone rotation
  'afternoon zone chores': '',
  'school room group clean': 'school_room',
  'morning routine': 'morning_routine',
  'bedtime routine': 'bedtime_routine',
  'my room': '', // resolved dynamically as bedroom_${kid}
  'belle care': 'belle_care',
  'dinner manager': 'dinner_manager',
  'laundry': 'laundry_room',
}

const EQUIPMENT_LABELS: Record<string, string> = {
  regular_vacuum: 'Regular vacuum',
  shop_vac: 'Shop vac',
  carpet_machine: 'Carpet cleaner',
  mop: 'Mop + bucket',
}

// ── Morning check-in point scales ──
function getWakePoints(hour: number, minute: number): { points: number; label: string } {
  const t = hour * 60 + minute
  if (t <= 390) return { points: 5, label: 'Right on time!' }        // <= 6:30
  if (t <= 405) return { points: 4, label: 'Nice, almost perfect' }  // 6:31-6:45
  if (t <= 419) return { points: 3, label: 'Getting there' }         // 6:46-6:59
  if (t <= 434) return { points: 1, label: 'Late start, but you checked in' } // 7:00-7:14
  if (t <= 449) return { points: 0, label: 'Too late for points — try earlier tomorrow' } // 7:15-7:29
  return { points: -2, label: 'No check-in' }
}

function getReadyPoints(hour: number, minute: number): { points: number; label: string } {
  const t = hour * 60 + minute
  if (t <= 460) return { points: 5, label: 'Ready with time to spare!' }  // <= 7:40
  if (t <= 479) return { points: 3, label: 'Ready on time' }              // 7:41-7:59
  if (t <= 489) return { points: 1, label: 'Just made it' }               // 8:00-8:09
  if (t <= 499) return { points: -1, label: 'Running late' }              // 8:10-8:19
  return { points: -3, label: 'Late — this affects everyone' }            // >= 8:20
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'get_zone_tasks'
    const zoneKey = searchParams.get('zone')
    const kid = searchParams.get('kid')?.toLowerCase()
    const dateParam = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    // ── Get zone tasks with rotation logic ──
    if (action === 'get_zone_tasks') {
      if (!zoneKey || !kid) {
        return NextResponse.json({ error: 'zone and kid required' }, { status: 400 })
      }

      // Get zone definition
      let zoneDef: any = null
      try {
        const zoneRows = await db.query(
          `SELECT * FROM zone_definitions WHERE zone_key = $1 AND active = TRUE`,
          [zoneKey]
        )
        zoneDef = zoneRows[0] || null
      } catch { /* zone table may not exist yet */ }

      if (!zoneDef) {
        return NextResponse.json({ zone: null, tasks: [], total: 0, completed_count: 0 })
      }

      // Get kid's routine flags for conditional tasks
      let routineFlags: Record<string, boolean> = {}
      try {
        const flagRows = await db.query(
          `SELECT flag_key, active FROM kid_routine_flags WHERE kid_name = $1`,
          [kid]
        )
        flagRows.forEach((f: any) => { routineFlags[f.flag_key] = f.active })
      } catch { /* table may not exist */ }

      // Get bath schedule for this kid (needed for routine zones)
      let bathSchedule: any = null
      try {
        const bathRows = await db.query(
          `SELECT * FROM kid_bath_schedule WHERE kid_name = $1`,
          [kid]
        )
        bathSchedule = bathRows[0] || null
      } catch { /* table may not exist */ }

      const todayDate = new Date(dateParam + 'T12:00:00')
      const dayOfWeek = todayDate.getDay()
      const isBathDay = bathSchedule ? (bathSchedule.bath_days || []).includes(dayOfWeek) : false

      // For shared zones (Midnight), use a shared key for rotation tracking
      const isSharedZone = zoneDef.assigned_to && zoneDef.assigned_to.length > 1
      const rotationKid = isSharedZone ? `${zoneKey}_shared` : kid

      // ── Pull anchor tasks ──
      let anchorTasks: any[] = []
      try {
        anchorTasks = await db.query(
          `SELECT * FROM zone_task_library
           WHERE zone_key = $1 AND task_type = 'anchor' AND active = TRUE
           ORDER BY sort_order, id`,
          [zoneKey]
        )
      } catch { anchorTasks = [] }

      // Filter by kid_filter and conditional flags
      anchorTasks = filterTasksForKid(anchorTasks, kid, routineFlags, isBathDay, bathSchedule)

      // ── Pull rotating tasks — ordered by longest-since-done ──
      let rotatingTasks: any[] = []
      try {
        // Get all eligible rotating tasks
        const allRotating = await db.query(
          `SELECT t.*,
            (SELECT MAX(r.assigned_date) FROM zone_task_rotation r
             WHERE r.task_id = t.id AND r.kid_name = $2 AND r.completed = TRUE) as last_completed
           FROM zone_task_library t
           WHERE t.zone_key = $1 AND t.task_type = 'rotating' AND t.active = TRUE
           ORDER BY last_completed ASC NULLS FIRST,
                    t.health_priority DESC,
                    t.sort_order, t.id`,
          [zoneKey, rotationKid]
        )
        rotatingTasks = filterTasksForKid(allRotating, kid, routineFlags, isBathDay, bathSchedule)
        rotatingTasks = rotatingTasks.slice(0, zoneDef.rotating_count || 4)
      } catch { rotatingTasks = [] }

      // ── Pull weekly tasks due today ──
      let weeklyTasks: any[] = []
      try {
        const allWeekly = await db.query(
          `SELECT t.*,
            (SELECT MAX(r.assigned_date) FROM zone_task_rotation r
             WHERE r.task_id = t.id AND r.kid_name = $2 AND r.completed = TRUE) as last_completed
           FROM zone_task_library t
           WHERE t.zone_key = $1 AND t.task_type = 'weekly' AND t.active = TRUE
           ORDER BY last_completed ASC NULLS FIRST, t.health_priority DESC, t.id`,
          [zoneKey, rotationKid]
        )
        const filtered = filterTasksForKid(allWeekly, kid, routineFlags, isBathDay, bathSchedule)
        // Only show weekly tasks not completed in last 5 days
        weeklyTasks = filtered.filter((t: any) => {
          if (!t.last_completed) return true
          const daysSince = Math.floor((new Date(dateParam).getTime() - new Date(t.last_completed).getTime()) / 86400000)
          return daysSince >= 5
        }).slice(0, 2) // max 2 weekly tasks per session
      } catch { weeklyTasks = [] }

      // ── Pull monthly tasks due ──
      let monthlyTasks: any[] = []
      try {
        const allMonthly = await db.query(
          `SELECT t.*,
            (SELECT MAX(r.assigned_date) FROM zone_task_rotation r
             WHERE r.task_id = t.id AND r.kid_name = $2 AND r.completed = TRUE) as last_completed
           FROM zone_task_library t
           WHERE t.zone_key = $1 AND t.task_type = 'monthly' AND t.active = TRUE
           ORDER BY last_completed ASC NULLS FIRST, t.health_priority DESC, t.id`,
          [zoneKey, rotationKid]
        )
        const filtered = filterTasksForKid(allMonthly, kid, routineFlags, isBathDay, bathSchedule)
        monthlyTasks = filtered.filter((t: any) => {
          if (!t.last_completed) return true
          const daysSince = Math.floor((new Date(dateParam).getTime() - new Date(t.last_completed).getTime()) / 86400000)
          return daysSince >= 25
        }).slice(0, 1) // max 1 monthly task per session
      } catch { monthlyTasks = [] }

      // Combine all tasks
      const allTasks = [...anchorTasks, ...rotatingTasks, ...weeklyTasks, ...monthlyTasks]

      // ── Assign tasks for today (upsert rotation rows) ──
      for (const task of allTasks) {
        try {
          await db.query(
            `INSERT INTO zone_task_rotation (zone_key, task_id, assigned_date, kid_name)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (zone_key, task_id, assigned_date, kid_name) DO NOTHING`,
            [zoneKey, task.id, dateParam, rotationKid]
          )
        } catch { /* ignore duplicates */ }
      }

      // ── Get completion status for today ──
      let rotationRows: any[] = []
      try {
        rotationRows = await db.query(
          `SELECT r.id as rotation_id, r.task_id, r.completed, r.completed_at
           FROM zone_task_rotation r
           WHERE r.zone_key = $1 AND r.kid_name = $2 AND r.assigned_date = $3`,
          [zoneKey, rotationKid, dateParam]
        )
      } catch { rotationRows = [] }

      const completionMap: Record<number, { rotation_id: number; completed: boolean; completed_at: string | null }> = {}
      rotationRows.forEach((r: any) => {
        completionMap[r.task_id] = { rotation_id: r.rotation_id, completed: r.completed, completed_at: r.completed_at }
      })

      // ── Handle once_daily cross-routine dedup ──
      // For tasks with once_daily=true, check if completed in ANY routine today
      for (const task of allTasks) {
        if (task.once_daily) {
          try {
            const anyCompleted = await db.query(
              `SELECT id FROM zone_task_rotation
               WHERE task_id = $1 AND kid_name = $2 AND assigned_date = $3 AND completed = TRUE
               LIMIT 1`,
              [task.id, rotationKid, dateParam]
            )
            if (anyCompleted.length > 0 && completionMap[task.id]) {
              completionMap[task.id].completed = true
            }
          } catch { /* ignore */ }
        }
      }

      // Build response
      const tasks = allTasks.map((t: any) => {
        const comp = completionMap[t.id]
        return {
          id: t.id,
          task_text: t.task_text,
          task_type: t.task_type,
          health_priority: t.health_priority,
          equipment: t.equipment,
          equipment_label: t.equipment ? EQUIPMENT_LABELS[t.equipment] || t.equipment : null,
          duration_mins: t.duration_mins,
          instructions: t.instructions,
          once_daily: t.once_daily,
          completed: comp?.completed || false,
          rotation_id: comp?.rotation_id || null,
          completed_at: comp?.completed_at || null,
        }
      })

      const completedCount = tasks.filter(t => t.completed).length
      const totalMins = tasks.reduce((sum, t) => sum + (t.duration_mins || 0), 0)

      // Morning routine footer note
      let footerNote: string | null = null
      if (zoneKey === 'morning_routine') {
        footerNote = "Don't leave your dishes for the zone cleaner. Scrape, rinse, and put away your own mess before you walk away from the table."
      }

      // Check if this is a pet zone with feeding log
      const isPetFeeding = zoneKey === 'pet_hades'

      // Helper note for Spike helpers
      let helperNote: string | null = null
      if (zoneKey === 'pet_spike' && kid !== 'amos') {
        helperNote = "Amos is Spike's main caretaker — you're the backup eyes"
      }

      return NextResponse.json({
        zone: {
          zone_key: zoneDef.zone_key,
          display_name: zoneDef.display_name,
          zone_type: zoneDef.zone_type,
          done_means: zoneDef.done_means,
          supplies: zoneDef.supplies || [],
          zone_principle: zoneDef.zone_principle,
          assigned_to: zoneDef.assigned_to,
          is_shared: isSharedZone,
        },
        tasks,
        total: tasks.length,
        completed_count: completedCount,
        estimated_mins: totalMins,
        footer_note: footerNote,
        helper_note: helperNote,
        has_feeding_log: isPetFeeding,
      })
    }

    // ── Get morning check-in status ──
    if (action === 'get_morning_status') {
      if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT * FROM kid_morning_checkins WHERE kid_name = $1 AND checkin_date = $2`,
          [kid, dateParam]
        )
        const wake = rows.find((r: any) => r.checkin_type === 'wake') || null
        const ready = rows.find((r: any) => r.checkin_type === 'ready') || null
        return NextResponse.json({ wake, ready })
      } catch {
        return NextResponse.json({ wake: null, ready: null })
      }
    }

    // ── Get morning check-in weekly summary (parent view) ──
    if (action === 'get_morning_weekly') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const dow = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dow + 6) % 7))
      const weekStart = monday.toLocaleDateString('en-CA')
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const weekEnd = sunday.toLocaleDateString('en-CA')

      try {
        const rows = await db.query(
          `SELECT * FROM kid_morning_checkins
           WHERE kid_name IN ('zoey','kaylee') AND checkin_date >= $1 AND checkin_date <= $2
           ORDER BY checkin_date`,
          [weekStart, weekEnd]
        )
        return NextResponse.json({ weekStart, weekEnd, checkins: rows })
      } catch {
        return NextResponse.json({ weekStart, weekEnd, checkins: [] })
      }
    }

    // ── Get all zones for parent config ──
    if (action === 'get_all_zones') {
      try {
        const zones = await db.query(`SELECT * FROM zone_definitions ORDER BY display_name`)
        return NextResponse.json({ zones })
      } catch {
        return NextResponse.json({ zones: [] })
      }
    }

    // ── Get task library for a zone (parent config) ──
    if (action === 'get_zone_library') {
      if (!zoneKey) return NextResponse.json({ error: 'zone required' }, { status: 400 })
      try {
        const tasks = await db.query(
          `SELECT * FROM zone_task_library WHERE zone_key = $1 ORDER BY task_type, sort_order, id`,
          [zoneKey]
        )
        return NextResponse.json({ tasks })
      } catch {
        return NextResponse.json({ tasks: [] })
      }
    }

    // ── Get rotation overview (parent — last completed per task) ──
    if (action === 'get_rotation_overview') {
      if (!zoneKey) return NextResponse.json({ error: 'zone required' }, { status: 400 })
      try {
        const tasks = await db.query(
          `SELECT t.id, t.task_text, t.task_type, t.health_priority, t.active,
            (SELECT MAX(r.assigned_date) FROM zone_task_rotation r
             WHERE r.task_id = t.id AND r.completed = TRUE) as last_completed
           FROM zone_task_library t
           WHERE t.zone_key = $1
           ORDER BY t.task_type, t.sort_order, t.id`,
          [zoneKey]
        )
        return NextResponse.json({ tasks })
      } catch {
        return NextResponse.json({ tasks: [] })
      }
    }

    // ── Get bonus tasks for parent dashboard ──
    if (action === 'get_bonus_log') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const dow = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dow + 6) % 7))
      const weekStart = monday.toLocaleDateString('en-CA')
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const weekEnd = sunday.toLocaleDateString('en-CA')

      try {
        const rows = await db.query(
          `SELECT * FROM zone_task_rotation
           WHERE bonus_task = TRUE AND assigned_date >= $1 AND assigned_date <= $2
           ORDER BY completed_at DESC`,
          [weekStart, weekEnd]
        )
        return NextResponse.json({ bonusTasks: rows })
      } catch {
        return NextResponse.json({ bonusTasks: [] })
      }
    }

    // ── Check feeding reminder (Hades) ──
    if (action === 'check_feeding_reminder') {
      const pet = searchParams.get('pet') || 'hades'
      try {
        const rows = await db.query(
          `SELECT fed_date, quantity, notes FROM pet_feeding_log WHERE pet_key = $1 ORDER BY fed_date DESC LIMIT 1`,
          [pet]
        )
        if (rows.length === 0) {
          return NextResponse.json({ days_since_fed: null, last_fed: null, reminder_level: 'overdue', message: 'No feeding recorded yet.' })
        }
        const lastFed = rows[0].fed_date
        const daysSince = Math.floor((new Date(dateParam).getTime() - new Date(lastFed).getTime()) / 86400000)
        let reminder_level = 'none'
        let message = ''
        if (daysSince >= 16) {
          reminder_level = 'overdue'
          message = `Hades last ate ${daysSince} days ago. This is overdue — plan the mice run immediately.`
        } else if (daysSince >= 13) {
          reminder_level = 'due'
          message = `Hades last ate ${daysSince} days ago. He needs to eat now — time to get mice.`
        } else if (daysSince >= 10) {
          reminder_level = 'soon'
          message = `Hades is due to eat in the next few days. Time to plan the trip for mice.`
        }
        return NextResponse.json({ days_since_fed: daysSince, last_fed: lastFed, reminder_level, message })
      } catch {
        return NextResponse.json({ days_since_fed: null, last_fed: null, reminder_level: 'none', message: '' })
      }
    }

    // ── Get feeding history ──
    if (action === 'get_feeding_history') {
      const pet = searchParams.get('pet') || 'hades'
      const limit = parseInt(searchParams.get('limit') || '10')
      try {
        const rows = await db.query(
          `SELECT * FROM pet_feeding_log WHERE pet_key = $1 ORDER BY fed_date DESC LIMIT $2`,
          [pet, limit]
        )
        return NextResponse.json({ feedings: rows })
      } catch {
        return NextResponse.json({ feedings: [] })
      }
    }

    // ── Get parent pet overview ──
    if (action === 'get_pet_overview') {
      try {
        const [hadesFeeding, spikeBath, midnightClean] = await Promise.all([
          db.query(`SELECT fed_date FROM pet_feeding_log WHERE pet_key = 'hades' ORDER BY fed_date DESC LIMIT 1`).catch(() => []),
          db.query(`SELECT MAX(r.assigned_date) as last_date FROM zone_task_rotation r JOIN zone_task_library t ON r.task_id = t.id WHERE t.zone_key = 'pet_spike' AND t.task_text LIKE '%bath%' AND r.completed = TRUE`).catch(() => []),
          db.query(`SELECT MAX(r.assigned_date) as last_date FROM zone_task_rotation r JOIN zone_task_library t ON r.task_id = t.id WHERE t.zone_key = 'pet_midnight' AND t.task_text LIKE '%Full cage clean%' AND r.completed = TRUE`).catch(() => []),
        ])

        const today = new Date(dateParam)
        const hadesDays = hadesFeeding.length > 0 && hadesFeeding[0].fed_date
          ? Math.floor((today.getTime() - new Date(hadesFeeding[0].fed_date).getTime()) / 86400000)
          : null
        const spikeDays = spikeBath.length > 0 && spikeBath[0].last_date
          ? Math.floor((today.getTime() - new Date(spikeBath[0].last_date).getTime()) / 86400000)
          : null
        const midnightDays = midnightClean.length > 0 && midnightClean[0].last_date
          ? Math.floor((today.getTime() - new Date(midnightClean[0].last_date).getTime()) / 86400000)
          : null

        return NextResponse.json({
          pets: [
            {
              name: 'Hades', emoji: '🐍', owner: 'Zoey',
              metric: 'Last fed', days: hadesDays,
              status: hadesDays === null ? 'unknown' : hadesDays >= 16 ? 'overdue' : hadesDays >= 13 ? 'due' : hadesDays >= 10 ? 'soon' : 'good'
            },
            {
              name: 'Spike', emoji: '🦎', owner: 'Amos',
              metric: 'Last bathed', days: spikeDays,
              status: spikeDays === null ? 'unknown' : spikeDays >= 5 ? 'due' : spikeDays >= 3 ? 'soon' : 'good'
            },
            {
              name: 'Midnight', emoji: '🐰', owner: 'Ellie & Hannah',
              metric: 'Last full clean', days: midnightDays,
              status: midnightDays === null ? 'unknown' : midnightDays >= 5 ? 'due' : midnightDays >= 3 ? 'soon' : 'good'
            },
          ]
        })
      } catch {
        return NextResponse.json({ pets: [] })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Zone tasks GET error:', error)
    return NextResponse.json({ error: 'Failed to load zone tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      // ── Complete a single task ──
      case 'complete_task': {
        const { rotation_id } = body
        if (!rotation_id) return NextResponse.json({ error: 'rotation_id required' }, { status: 400 })
        await db.query(
          `UPDATE zone_task_rotation SET completed = TRUE, completed_at = NOW() WHERE id = $1`,
          [rotation_id]
        )
        return NextResponse.json({ success: true })
      }

      // ── Uncomplete a single task ──
      case 'uncomplete_task': {
        const { rotation_id } = body
        if (!rotation_id) return NextResponse.json({ error: 'rotation_id required' }, { status: 400 })
        await db.query(
          `UPDATE zone_task_rotation SET completed = FALSE, completed_at = NULL WHERE id = $1`,
          [rotation_id]
        )
        return NextResponse.json({ success: true })
      }

      // ── Complete all tasks for a zone/kid/date ──
      case 'complete_all': {
        const { zone_key, kid, date } = body
        if (!zone_key || !kid) return NextResponse.json({ error: 'zone_key and kid required' }, { status: 400 })
        const today = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await db.query(
          `UPDATE zone_task_rotation SET completed = TRUE, completed_at = NOW()
           WHERE zone_key = $1 AND kid_name = $2 AND assigned_date = $3 AND completed = FALSE`,
          [zone_key, kid.toLowerCase(), today]
        )
        return NextResponse.json({ success: true })
      }

      // ── Log bonus task ──
      case 'log_bonus_task': {
        const { kid, description, zone_key } = body
        if (!kid || !description) return NextResponse.json({ error: 'kid and description required' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const zk = zone_key || 'general'

        // Insert bonus rotation log
        await db.query(
          `INSERT INTO zone_task_rotation (zone_key, task_id, assigned_date, kid_name, completed, completed_at, bonus_task, bonus_description)
           VALUES ($1, NULL, $2, $3, TRUE, NOW(), TRUE, $4)`,
          [zk, today, kid.toLowerCase(), description]
        )

        // Award 2 points
        try {
          await db.query(
            `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', 2, $2)`,
            [kid.toLowerCase(), 'Bonus: ' + description]
          )
          await db.query(
            `UPDATE kid_points_balance SET current_points = current_points + 2, total_earned_all_time = total_earned_all_time + 2, updated_at = NOW()
             WHERE kid_name = $1`,
            [kid.toLowerCase()]
          )
        } catch { /* points tables may not exist */ }

        return NextResponse.json({ success: true, points_awarded: 2 })
      }

      // ── Log morning check-in ──
      case 'log_morning_checkin': {
        const { kid, checkin_type } = body
        if (!kid || !checkin_type) return NextResponse.json({ error: 'kid and checkin_type required' }, { status: 400 })

        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
        const today = now.toLocaleDateString('en-CA')
        const hour = now.getHours()
        const minute = now.getMinutes()
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`

        const { points, label } = checkin_type === 'wake'
          ? getWakePoints(hour, minute)
          : getReadyPoints(hour, minute)

        try {
          await db.query(
            `INSERT INTO kid_morning_checkins (kid_name, checkin_date, checkin_type, checkin_time, points_awarded)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (kid_name, checkin_date, checkin_type) DO NOTHING`,
            [kid.toLowerCase(), today, checkin_type, timeStr, points]
          )
        } catch (e) {
          // Already checked in
          return NextResponse.json({ already_checked_in: true })
        }

        // Award/deduct points
        if (points !== 0) {
          try {
            const txnType = points > 0 ? 'earned' : 'deducted'
            const reason = `Morning ${checkin_type} check-in: ${label}`
            await db.query(
              `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, $2, $3, $4)`,
              [kid.toLowerCase(), txnType, Math.abs(points), reason]
            )
            if (points > 0) {
              await db.query(
                `UPDATE kid_points_balance SET current_points = current_points + $2, total_earned_all_time = total_earned_all_time + $2, updated_at = NOW() WHERE kid_name = $1`,
                [kid.toLowerCase(), points]
              )
            } else {
              await db.query(
                `UPDATE kid_points_balance SET current_points = GREATEST(current_points + $2, 0), updated_at = NOW() WHERE kid_name = $1`,
                [kid.toLowerCase(), points]
              )
            }
          } catch { /* points tables may not exist */ }
        }

        return NextResponse.json({
          success: true,
          points_awarded: points,
          label,
          checkin_time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        })
      }

      // ── Log pet feeding ──
      case 'log_feeding': {
        const { pet_key, fed_by, quantity, notes, fed_date } = body
        if (!pet_key || !fed_by) return NextResponse.json({ error: 'pet_key and fed_by required' }, { status: 400 })
        const feedDate = fed_date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await db.query(
          `INSERT INTO pet_feeding_log (pet_key, fed_date, fed_by, quantity, notes) VALUES ($1, $2, $3, $4, $5)`,
          [pet_key, feedDate, fed_by.toLowerCase(), quantity || 2, notes || '']
        )
        return NextResponse.json({ success: true })
      }

      // ── Parent config: toggle task active/inactive ──
      case 'toggle_task_active': {
        const { task_id } = body
        await db.query(
          `UPDATE zone_task_library SET active = NOT active WHERE id = $1`,
          [task_id]
        )
        return NextResponse.json({ success: true })
      }

      // ── Parent config: add new task ──
      case 'add_task': {
        const { zone_key, task_text, task_type, health_priority, equipment, duration_mins } = body
        await db.query(
          `INSERT INTO zone_task_library (zone_key, task_text, task_type, health_priority, equipment, duration_mins)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [zone_key, task_text, task_type || 'rotating', health_priority || false, equipment || null, duration_mins || 5]
        )
        return NextResponse.json({ success: true })
      }

      // ── Parent config: update task ──
      case 'update_task': {
        const { task_id, task_text, task_type, health_priority, duration_mins } = body
        await db.query(
          `UPDATE zone_task_library SET task_text = COALESCE($2, task_text), task_type = COALESCE($3, task_type),
           health_priority = COALESCE($4, health_priority), duration_mins = COALESCE($5, duration_mins) WHERE id = $1`,
          [task_id, task_text, task_type, health_priority, duration_mins]
        )
        return NextResponse.json({ success: true })
      }

      // ── Parent config: update zone rotating_count ──
      case 'update_zone_config': {
        const { zone_key, rotating_count, anchor_count } = body
        await db.query(
          `UPDATE zone_definitions SET rotating_count = COALESCE($2, rotating_count), anchor_count = COALESCE($3, anchor_count) WHERE zone_key = $1`,
          [zone_key, rotating_count, anchor_count]
        )
        return NextResponse.json({ success: true })
      }

      // ── Toggle routine flag (eczema, glasses, etc.) ──
      case 'toggle_routine_flag': {
        const { kid, flag_key } = body
        await db.query(
          `INSERT INTO kid_routine_flags (kid_name, flag_key, active, updated_at)
           VALUES ($1, $2, TRUE, NOW())
           ON CONFLICT (kid_name, flag_key) DO UPDATE SET active = NOT kid_routine_flags.active, updated_at = NOW()`,
          [kid.toLowerCase(), flag_key]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Zone tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}

// ── Helper: Filter tasks by kid_filter, routine flags, bath schedule ──
function filterTasksForKid(
  tasks: any[],
  kid: string,
  routineFlags: Record<string, boolean>,
  isBathDay: boolean,
  bathSchedule: any
): any[] {
  return tasks.filter((t: any) => {
    // Filter by kid_filter array
    if (t.kid_filter && t.kid_filter.length > 0) {
      if (!t.kid_filter.includes(kid)) return false
    }

    // Filter eczema tasks — only show if eczema_flare is active
    if (t.task_text?.toLowerCase().includes('eczema') && kid === 'hannah') {
      if (!routineFlags['eczema_flare']) return false
    }

    // Filter bath/shower tasks by schedule
    if (t.task_text?.toLowerCase().includes('shower or bath')) {
      if (!bathSchedule) return true // no schedule = always show
      if (bathSchedule.self_managed) return true // flexible kids always see it as reminder
      return isBathDay
    }

    return true
  })
}
