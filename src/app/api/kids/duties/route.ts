import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ── Fixed schedules — pure constants, zero DB ──

// Dinner Manager by day of week (0=Sun..6=Sat)
const DINNER_MANAGER: Record<number, string[]> = {
  0: ['levi'],
  1: ['kaylee'],
  2: ['zoey'],
  3: ['wyatt'],
  4: ['amos'],
  5: ['ellie', 'hannah'],
  6: ['lola'],
}

// Laundry by day of week
const LAUNDRY_ASSIGNED: Record<number, string[]> = {
  0: ['wyatt'],
  1: ['levi'],
  2: ['lola'],
  3: ['ellie', 'hannah', 'kaylee'],
  4: ['amos'],
  5: ['ellie', 'hannah', 'kaylee'],
  6: ['zoey'],
}

const DINNER_TASKS = [
  { key: 'help_prep', label: 'Help prep & make dinner', emoji: '🍳' },
  { key: 'table_cleared', label: 'Table cleared & wiped', emoji: '🪣' },
  { key: 'leftovers_away', label: 'Leftovers put away', emoji: '🥡' },
  { key: 'sink_cleaned', label: 'Sink emptied & cleaned', emoji: '🚿' },
  { key: 'counters_wiped', label: 'Counters wiped & organized', emoji: '✨' },
  { key: 'dishes_loaded', label: 'Dishes & serviceware loaded', emoji: '🍽️' },
  { key: 'pots_pans', label: 'Pots, pans & appliances washed + put away', emoji: '🫕' },
  { key: 'dishwasher_flipped', label: 'Dishwasher flipped (run or emptied)', emoji: '🔄' },
]

const LAUNDRY_TASKS = [
  { key: 'collect_guest_bath', label: 'Collect from guest bathroom', emoji: '🧺' },
  { key: 'collect_kids_bath', label: 'Collect from kids bathroom', emoji: '🧺' },
  { key: 'collect_master_bath', label: 'Collect from master bathroom', emoji: '🧺' },
  { key: 'collect_kitchen', label: 'Collect from kitchen', emoji: '🧺' },
  { key: 'collect_school_living', label: 'Collect from school / living room', emoji: '🧺' },
  { key: 'collect_amos_room', label: "Collect from front of Amos's room", emoji: '🧺' },
  { key: 'collect_girls_room', label: "Collect from girls' room", emoji: '🧺' },
  { key: 'machines_running', label: 'Keep machines running (switch/fold loads)', emoji: '🔄' },
]

const DINNER_TASK_PTS = 4
const DINNER_BONUS_PTS = 10
const LAUNDRY_COLLECT_PTS = 6
const LAUNDRY_MACHINE_PTS = 5

const KID_NAMES = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
const KID_DISPLAY: Record<string, string> = { amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee', levi: 'Levi', lola: 'Lola' }

function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function getTodayDow(): number {
  const today = getToday()
  return new Date(today + 'T12:00:00').getDay()
}

async function creditPoints(kid: string, pts: number, reason: string) {
  try {
    await db.query(`INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', $2, $3)`, [kid, pts, reason])
    await db.query(`UPDATE kid_points_balance SET current_points = current_points + $2, total_earned_all_time = total_earned_all_time + $2, updated_at = NOW() WHERE kid_name = $1`, [kid, pts])
  } catch { /* silent */ }
}

async function debitPoints(kid: string, pts: number, reason: string) {
  try {
    await db.query(`INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'deducted', $2, $3)`, [kid, pts, reason])
    await db.query(`UPDATE kid_points_balance SET current_points = GREATEST(current_points - $2, 0), updated_at = NOW() WHERE kid_name = $1`, [kid, pts])
  } catch { /* silent */ }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kid = searchParams.get('kid')?.toLowerCase()
    if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })

    const today = getToday()
    const dow = getTodayDow()

    const dinnerManagers = DINNER_MANAGER[dow] || []
    const laundryAssigned = LAUNDRY_ASSIGNED[dow] || []
    const isDinnerDay = dinnerManagers.includes(kid)
    const isLaundryDay = laundryAssigned.includes(kid)

    // Only fetch completions if kid has a duty today
    let dinnerCompletions: Record<string, boolean> = {}
    let laundryCompletions: Record<string, boolean> = {}

    if (isDinnerDay || isLaundryDay) {
      try {
        const rows = await db.query(
          `SELECT duty, task, completed FROM kid_duty_log WHERE duty_date = $1 AND (
            (duty = 'dinner_manager' AND kid_name = ANY($2)) OR
            (duty = 'laundry' AND kid_name = ANY($3))
          )`,
          [today, dinnerManagers.filter(k => KID_NAMES.includes(k)), laundryAssigned.filter(k => KID_NAMES.includes(k))]
        )
        rows.forEach((r: any) => {
          if (r.duty === 'dinner_manager' && r.completed) dinnerCompletions[r.task] = true
          if (r.duty === 'laundry' && r.completed) laundryCompletions[r.task] = true
        })
      } catch { /* silent */ }
    }

    // Build dinner manager response
    const dinnerManagerNames = dinnerManagers.map(k => KID_DISPLAY[k] || k)
    const dinnerResponse = {
      isMyDay: isDinnerDay,
      todaysManagers: dinnerManagerNames,
      tasks: isDinnerDay ? DINNER_TASKS.map(t => ({ ...t, completed: !!dinnerCompletions[t.key] })) : [],
    }

    // Build laundry response
    const laundryNames = laundryAssigned.map(k => KID_DISPLAY[k] || k)
    const laundryResponse = {
      isMyDay: isLaundryDay,
      todaysAssigned: laundryNames,
      tasks: isLaundryDay ? LAUNDRY_TASKS.map(t => ({ ...t, completed: !!laundryCompletions[t.key] })) : [],
    }

    return NextResponse.json({ date: today, dinnerManager: dinnerResponse, laundry: laundryResponse })
  } catch (error) {
    console.error('Duties GET error:', error)
    return NextResponse.json({ error: 'Failed to load duties' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, kid_name, duty, task } = body
    if (!kid_name || !duty || !task) return NextResponse.json({ error: 'kid_name, duty, task required' }, { status: 400 })

    const kid = kid_name.toLowerCase()
    const today = getToday()

    if (action === 'complete_duty_task') {
      await db.query(
        `INSERT INTO kid_duty_log (kid_name, duty, task, duty_date, completed, completed_at)
         VALUES ($1, $2, $3, $4, TRUE, NOW())
         ON CONFLICT (kid_name, duty, task, duty_date) DO UPDATE SET completed = TRUE, completed_at = NOW()`,
        [kid, duty, task, today]
      )

      // Credit points
      if (duty === 'dinner_manager') {
        await creditPoints(kid, DINNER_TASK_PTS, `Dinner: ${task.replace(/_/g, ' ')}`)
        // Check if all dinner tasks are now done
        try {
          const allDone = await db.query(
            `SELECT COUNT(DISTINCT task)::int as cnt FROM kid_duty_log
             WHERE duty = 'dinner_manager' AND duty_date = $1 AND completed = TRUE AND kid_name = $2`,
            [today, kid]
          )
          if ((allDone[0]?.cnt || 0) >= DINNER_TASKS.length) {
            await creditPoints(kid, DINNER_BONUS_PTS, 'Dinner Manager — all tasks complete! 🎉')
          }
        } catch { /* silent */ }
      } else if (duty === 'laundry') {
        const pts = task === 'machines_running' ? LAUNDRY_MACHINE_PTS : LAUNDRY_COLLECT_PTS
        await creditPoints(kid, pts, `Laundry: ${task.replace(/_/g, ' ')}`)
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'uncomplete_duty_task') {
      await db.query(
        `UPDATE kid_duty_log SET completed = FALSE, completed_at = NULL WHERE kid_name = $1 AND duty = $2 AND task = $3 AND duty_date = $4`,
        [kid, duty, task, today]
      )

      // Debit points
      if (duty === 'dinner_manager') {
        await debitPoints(kid, DINNER_TASK_PTS, `Unchecked dinner: ${task.replace(/_/g, ' ')}`)
      } else if (duty === 'laundry') {
        const pts = task === 'machines_running' ? LAUNDRY_MACHINE_PTS : LAUNDRY_COLLECT_PTS
        await debitPoints(kid, pts, `Unchecked laundry: ${task.replace(/_/g, ' ')}`)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Duties POST error:', error)
    return NextResponse.json({ error: 'Failed to process duty action' }, { status: 500 })
  }
}
