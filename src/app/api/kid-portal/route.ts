import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getKidZone } from '@/lib/zoneRotation'
import { createNotification } from '@/lib/notifications'

// ============================================================================
// GET /api/kid-portal?action=...
// ============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (!action) {
    return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 })
  }

  switch (action) {
    // ------------------------------------------------------------------
    // get_kid_home — bundled home screen data
    // ------------------------------------------------------------------
    case 'get_kid_home': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) {
        return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      }
      const today = new Date().toISOString().split('T')[0]

      try {
        // 1. Today's habits with completion status
        let habits: any[] = []
        try {
          habits = await db.query(
            `SELECT h.id, h.title, h.emoji, h.category, h.coin_reward,
                    hc.status AS completion_status,
                    hc.completed_at,
                    hs.current_streak
             FROM habits h
             LEFT JOIN habit_completions hc
               ON hc.habit_id = h.id AND hc.completion_date = $2
             LEFT JOIN habit_streaks hs
               ON hs.habit_id = h.id
             WHERE h.member_name = $1 AND h.is_active = true
             ORDER BY
               CASE h.category
                 WHEN 'morning' THEN 1 WHEN 'health' THEN 2
                 WHEN 'school' THEN 3 WHEN 'evening' THEN 4
                 ELSE 5
               END, h.title`,
            [kid_name, today]
          )
        } catch (e) { console.error('kid_home habits error:', e) }

        // 2. Zone assignment
        const zone = getKidZone(kid_name) || 'None'

        // 3. Coin balance + primary goal
        let coinBalance = 0
        let primaryGoal: any = null
        try {
          const profileRows = await db.query(
            `SELECT coin_balance, screen_time_balance_mins FROM kid_rewards_profile WHERE kid_name = $1 LIMIT 1`,
            [kid_name]
          )
          if (profileRows[0]) {
            coinBalance = profileRows[0].coin_balance || 0
          }
          const goalRows = await db.query(
            `SELECT * FROM savings_goals
             WHERE kid_name = $1 AND is_achieved = false
             ORDER BY is_primary DESC, created_at ASC LIMIT 1`,
            [kid_name]
          )
          primaryGoal = goalRows[0] || null
        } catch (e) { console.error('kid_home coins error:', e) }

        // 4. Focus sessions today (homeschool only)
        let focusSessions = 0
        let focusMins = 0
        let isHomeschool = false
        let subjects: any[] = []
        try {
          const studentRows = await db.query(
            `SELECT id, kid_name, mascot, mascot_name FROM hs_students WHERE kid_name = $1 LIMIT 1`,
            [kid_name]
          )
          if (studentRows[0]) {
            isHomeschool = true
            const studentId = studentRows[0].id
            const focusRows = await db.query(
              `SELECT COUNT(*)::int AS count, COALESCE(SUM(actual_mins),0)::int AS total_mins
               FROM hs_focus_sessions WHERE student_id = $1 AND plan_date = $2`,
              [studentId, today]
            )
            if (focusRows[0]) {
              focusSessions = focusRows[0].count
              focusMins = focusRows[0].total_mins
            }
            subjects = await db.query(
              `SELECT id, name, emoji FROM hs_subjects WHERE student_id = $1 ORDER BY sort_order, name`,
              [studentId]
            )
          }
        } catch (e) { console.error('kid_home focus error:', e) }

        // 5. Screen time balance (for Wyatt)
        let screenTimeMins = 0
        try {
          const stRows = await db.query(
            `SELECT screen_time_balance_mins FROM kid_rewards_profile WHERE kid_name = $1 LIMIT 1`,
            [kid_name]
          )
          screenTimeMins = stRows[0]?.screen_time_balance_mins || 0
        } catch (e) { /* ignore */ }

        return NextResponse.json({
          kid_name,
          habits,
          zone,
          coin_balance: coinBalance,
          primary_goal: primaryGoal,
          focus_sessions: focusSessions,
          focus_mins: focusMins,
          is_homeschool: isHomeschool,
          subjects,
          screen_time_mins: screenTimeMins,
        })
      } catch (error: any) {
        console.error('get_kid_home error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_kid_habits_today
    // ------------------------------------------------------------------
    case 'get_kid_habits_today': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      const today = new Date().toISOString().split('T')[0]
      try {
        const habits = await db.query(
          `SELECT h.id, h.title, h.emoji, h.category, h.coin_reward,
                  hc.status AS completion_status,
                  hc.completed_at,
                  hs.current_streak
           FROM habits h
           LEFT JOIN habit_completions hc ON hc.habit_id = h.id AND hc.completion_date = $2
           LEFT JOIN habit_streaks hs ON hs.habit_id = h.id
           WHERE h.member_name = $1 AND h.is_active = true
           ORDER BY CASE h.category
             WHEN 'morning' THEN 1 WHEN 'health' THEN 2
             WHEN 'school' THEN 3 WHEN 'evening' THEN 4 ELSE 5
           END, h.title`,
          [kid_name, today]
        )
        return NextResponse.json({ habits })
      } catch (error: any) {
        console.error('get_kid_habits_today error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_kid_zone_today
    // ------------------------------------------------------------------
    case 'get_kid_zone_today': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      try {
        const zone = getKidZone(kid_name) || 'None'
        // Look up zone_key mapping — try multiple key formats to match zone_definitions
        const ZONE_KEY_MAP: Record<string, string> = {
          'Kitchen': 'kitchen_zone',
          'Hotspot': 'hotspot',
          'Guest Bathroom': 'guest_bathroom',
          'Kids Bathroom': 'kids_bathroom',
          'Pantry': 'pantry',
          'Floors': 'floors',
        }
        let zoneKey = ZONE_KEY_MAP[zone] || zone.toLowerCase().replace(/\s+/g, '_')

        // Try to find in zone_definitions, fall back to alternate key formats
        let tasks: any[] = []
        try {
          // First try the mapped key
          let found = await db.query(
            `SELECT zone_key FROM zone_definitions WHERE zone_key = $1 AND active = TRUE LIMIT 1`,
            [zoneKey]
          )
          // If not found, try without _zone suffix or with it
          if (!found.length) {
            const altKey = zoneKey.endsWith('_zone') ? zoneKey.replace('_zone', '') : zoneKey + '_zone'
            found = await db.query(
              `SELECT zone_key FROM zone_definitions WHERE zone_key = $1 AND active = TRUE LIMIT 1`,
              [altKey]
            )
            if (found.length) zoneKey = altKey
          }
          // If still not found, try display_name match
          if (!found.length) {
            found = await db.query(
              `SELECT zone_key FROM zone_definitions WHERE LOWER(display_name) = LOWER($1) AND active = TRUE LIMIT 1`,
              [zone]
            )
            if (found.length) zoneKey = found[0].zone_key
          }

          // Get anchor tasks for this zone
          tasks = await db.query(
            `SELECT id, task_text, task_type, health_priority, equipment, duration_mins, active
             FROM zone_task_library
             WHERE zone_key = $1 AND active = true AND deleted_at IS NULL
             ORDER BY CASE task_type WHEN 'anchor' THEN 1 WHEN 'rotating' THEN 2 WHEN 'weekly' THEN 3 ELSE 4 END, sort_order, id`,
            [zoneKey]
          )
        } catch (e) { console.error('kid_zone tasks error:', e) }

        return NextResponse.json({ zone, zone_key: zoneKey, tasks })
      } catch (error: any) {
        console.error('get_kid_zone_today error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_kid_coins
    // ------------------------------------------------------------------
    case 'get_kid_coins': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      try {
        const profileRows = await db.query(
          `SELECT * FROM kid_rewards_profile WHERE kid_name = $1 LIMIT 1`,
          [kid_name]
        )
        const profile = profileRows[0] || { coin_balance: 0 }

        let primaryGoal: any = null
        try {
          const goalRows = await db.query(
            `SELECT * FROM savings_goals
             WHERE kid_name = $1 AND is_achieved = false
             ORDER BY is_primary DESC, created_at ASC LIMIT 1`,
            [kid_name]
          )
          primaryGoal = goalRows[0] || null
        } catch (e) { /* ignore */ }

        let recentTx: any[] = []
        try {
          recentTx = await db.query(
            `SELECT * FROM coin_transactions
             WHERE kid_name = $1 ORDER BY created_at DESC LIMIT 10`,
            [kid_name]
          )
        } catch (e) { /* ignore */ }

        return NextResponse.json({ profile, primary_goal: primaryGoal, recent_transactions: recentTx })
      } catch (error: any) {
        console.error('get_kid_coins error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_kid_rewards_catalog
    // ------------------------------------------------------------------
    case 'get_kid_rewards_catalog': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      try {
        const rewards = await db.query(
          `SELECT * FROM reward_catalog WHERE is_active = true ORDER BY category, coin_cost`
        )
        return NextResponse.json({ rewards })
      } catch (error: any) {
        console.error('get_kid_rewards_catalog error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_kid_focus_subjects
    // ------------------------------------------------------------------
    case 'get_kid_focus_subjects': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      try {
        const studentRows = await db.query(
          `SELECT id, focus_session_length_mins, break_length_mins FROM hs_students WHERE kid_name = $1 LIMIT 1`,
          [kid_name]
        )
        if (!studentRows[0]) {
          return NextResponse.json({ subjects: [], is_homeschool: false })
        }
        const student = studentRows[0]
        const subjects = await db.query(
          `SELECT id, name, emoji FROM hs_subjects WHERE student_id = $1 ORDER BY sort_order, name`,
          [student.id]
        )
        return NextResponse.json({
          subjects,
          is_homeschool: true,
          focus_length_mins: student.focus_session_length_mins,
          break_length_mins: student.break_length_mins,
        })
      } catch (error: any) {
        console.error('get_kid_focus_subjects error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_portal_settings — parent-facing portal settings for a kid
    // ------------------------------------------------------------------
    case 'get_portal_settings': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT kid_portal_enabled, kid_pin, last_kid_login, login_attempts, locked_until, pin_reset_at
           FROM profiles
           WHERE LOWER(first_name) = LOWER($1) AND role = 'child'
           LIMIT 1`,
          [kid_name]
        )
        if (!rows.length) {
          return NextResponse.json({ error: 'Kid not found' }, { status: 404 })
        }
        const p = rows[0]
        const now = new Date()
        const lockedUntil = p.locked_until ? new Date(p.locked_until) : null
        const isLocked = lockedUntil ? lockedUntil > now : false

        return NextResponse.json({
          enabled: p.kid_portal_enabled ?? false,
          has_pin: !!p.kid_pin,
          last_login: p.last_kid_login || null,
          login_attempts: p.login_attempts || 0,
          is_locked: isLocked,
          locked_until: isLocked ? p.locked_until : null,
          pin_reset_at: p.pin_reset_at || null,
        })
      } catch (error: any) {
        console.error('get_portal_settings error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // reveal_pin — parent-only, returns plaintext PIN
    // ------------------------------------------------------------------
    case 'reveal_pin': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT kid_pin FROM profiles WHERE LOWER(first_name) = LOWER($1) AND role = 'child' LIMIT 1`,
          [kid_name]
        )
        if (!rows.length) {
          return NextResponse.json({ error: 'Kid not found' }, { status: 404 })
        }
        return NextResponse.json({ pin: rows[0].kid_pin || null })
      } catch (error: any) {
        console.error('reveal_pin error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 })
  }
}

// ============================================================================
// POST /api/kid-portal   { action, ...body }
// ============================================================================
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body
  if (!action) {
    return NextResponse.json({ error: 'Missing action in request body' }, { status: 400 })
  }

  switch (action) {
    // ------------------------------------------------------------------
    // kid_login — verify PIN, return session info
    // ------------------------------------------------------------------
    case 'kid_login': {
      const { kid_name, pin } = body
      if (!kid_name || !pin) {
        return NextResponse.json({ error: 'kid_name and pin are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `SELECT id, first_name, kid_pin, kid_portal_enabled, login_attempts, locked_until
           FROM profiles
           WHERE LOWER(first_name) = LOWER($1) AND role = 'child'
           LIMIT 1`,
          [kid_name]
        )
        if (!rows.length) {
          return NextResponse.json({ error: 'Kid not found' }, { status: 404 })
        }
        const profile = rows[0]

        // Check portal enabled
        if (!profile.kid_portal_enabled) {
          return NextResponse.json({ error: 'Portal not enabled' }, { status: 403 })
        }

        // Check lockout
        if (profile.locked_until) {
          const lockedUntil = new Date(profile.locked_until)
          const now = new Date()
          if (lockedUntil > now) {
            const remainingMs = lockedUntil.getTime() - now.getTime()
            const remainingMins = Math.ceil(remainingMs / 60000)
            return NextResponse.json({
              error: 'Portal locked',
              locked: true,
              remaining_minutes: remainingMins,
            }, { status: 423 })
          }
        }

        // Check PIN
        if (profile.kid_pin !== pin) {
          const newAttempts = (profile.login_attempts || 0) + 1
          if (newAttempts >= 5) {
            // Lock for 10 minutes
            await db.query(
              `UPDATE profiles SET login_attempts = $2, locked_until = NOW() + INTERVAL '10 minutes' WHERE id = $1`,
              [profile.id, newAttempts]
            )
            return NextResponse.json({
              error: 'Too many wrong PINs. Portal locked for 10 minutes.',
              locked: true,
              remaining_minutes: 10,
              attempts: newAttempts,
            }, { status: 423 })
          } else {
            await db.query(
              `UPDATE profiles SET login_attempts = $2 WHERE id = $1`,
              [profile.id, newAttempts]
            )
            return NextResponse.json({
              error: 'Incorrect PIN',
              attempts: newAttempts,
              max_attempts: 5,
            }, { status: 401 })
          }
        }

        // Correct PIN — reset attempts, update last login
        await db.query(
          `UPDATE profiles SET login_attempts = 0, locked_until = NULL, last_kid_login = NOW() WHERE id = $1`,
          [profile.id]
        )

        return NextResponse.json({
          success: true,
          kid_name: profile.first_name,
          kid_id: profile.id,
        })
      } catch (error: any) {
        console.error('kid_login error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // kid_mark_habit_done — same logic as habits API mark_habit_complete
    // ------------------------------------------------------------------
    case 'kid_mark_habit_done': {
      const { habit_id, kid_name } = body
      const date = new Date().toISOString().split('T')[0]
      if (!habit_id || !kid_name) {
        return NextResponse.json({ error: 'habit_id and kid_name are required' }, { status: 400 })
      }
      try {
        // 1. UPSERT completion
        const compRows = await db.query(
          `INSERT INTO habit_completions (habit_id, member_name, completion_date, status, completed_at)
           VALUES ($1, $2, $3, 'completed', NOW())
           ON CONFLICT (habit_id, completion_date)
           DO UPDATE SET status = 'completed', completed_at = NOW()
           RETURNING *`,
          [habit_id, kid_name, date]
        )
        const completion = compRows[0]

        // 2. Update streak
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        const yesterdayRows = await db.query(
          `SELECT status FROM habit_completions
           WHERE habit_id = $1 AND completion_date = $2 AND status = 'completed'`,
          [habit_id, yesterday]
        )
        const hadYesterday = yesterdayRows.length > 0

        if (hadYesterday) {
          await db.query(
            `UPDATE habit_streaks
             SET current_streak = current_streak + 1,
                 longest_streak = GREATEST(longest_streak, current_streak + 1),
                 last_completed_date = $2, total_completions = total_completions + 1
             WHERE habit_id = $1`,
            [habit_id, date]
          )
        } else {
          await db.query(
            `UPDATE habit_streaks
             SET current_streak = 1,
                 longest_streak = GREATEST(longest_streak, 1),
                 last_completed_date = $2, total_completions = total_completions + 1
             WHERE habit_id = $1`,
            [habit_id, date]
          )
        }

        // 3. Coin reward
        let coins_awarded = 0
        const habitRows = await db.query(`SELECT * FROM habits WHERE id = $1`, [habit_id])
        const habit = habitRows[0]
        if (habit && habit.coin_reward > 0) {
          coins_awarded = habit.coin_reward
          try {
            await db.query(
              `INSERT INTO coin_transactions (kid_name, amount, reason, source, created_at)
               VALUES ($1, $2, $3, 'habit', NOW())`,
              [kid_name, coins_awarded, `Habit: ${habit.title}`]
            )
            await db.query(
              `UPDATE kid_rewards_profile
               SET coin_balance = coin_balance + $2, lifetime_earned = lifetime_earned + $2
               WHERE kid_name = $1`,
              [kid_name, coins_awarded]
            )
          } catch (err) {
            console.error('kid_mark_habit coin error:', err)
            coins_awarded = 0
          }
        }

        return NextResponse.json({ completion, coins_awarded })
      } catch (error: any) {
        console.error('kid_mark_habit_done error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // kid_submit_zone_photo
    // ------------------------------------------------------------------
    case 'kid_submit_zone_photo': {
      const { kid_name, task_name, photo_url, task_id } = body
      if (!kid_name || !task_name) {
        return NextResponse.json({ error: 'kid_name and task_name are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `INSERT INTO task_submissions
             (kid_name, task_name, photo_url, task_id, task_type, status, submitted_at)
           VALUES ($1, $2, $3, $4, 'zone', 'pending', NOW())
           RETURNING *`,
          [kid_name, task_name, photo_url || null, task_id || null]
        )
        return NextResponse.json({ submission: rows[0] }, { status: 201 })
      } catch (error: any) {
        console.error('kid_submit_zone_photo error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // kid_request_reward — insert redemption, deduct coins
    // ------------------------------------------------------------------
    case 'kid_request_reward': {
      const { kid_name, reward_id } = body
      if (!kid_name || !reward_id) {
        return NextResponse.json({ error: 'kid_name and reward_id are required' }, { status: 400 })
      }
      try {
        // Get reward details
        const rewardRows = await db.query(
          `SELECT * FROM reward_catalog WHERE id = $1 AND is_active = true`,
          [reward_id]
        )
        if (!rewardRows.length) {
          return NextResponse.json({ error: 'Reward not found or inactive' }, { status: 404 })
        }
        const reward = rewardRows[0]

        // Check balance
        const profileRows = await db.query(
          `SELECT coin_balance FROM kid_rewards_profile WHERE kid_name = $1 LIMIT 1`,
          [kid_name]
        )
        const balance = profileRows[0]?.coin_balance || 0
        if (balance < reward.coin_cost) {
          return NextResponse.json({ error: 'Not enough coins', balance, cost: reward.coin_cost }, { status: 400 })
        }

        // Deduct coins
        const balanceAfter = balance - reward.coin_cost
        await db.query(
          `UPDATE kid_rewards_profile SET coin_balance = $2 WHERE kid_name = $1`,
          [kid_name, balanceAfter]
        )

        // Record transaction
        await db.query(
          `INSERT INTO coin_transactions (kid_name, amount, reason, source, created_at)
           VALUES ($1, $2, $3, 'reward_redeem', NOW())`,
          [kid_name, -reward.coin_cost, `Redeemed: ${reward.reward_name}`]
        )

        // Insert redemption
        const redemptionRows = await db.query(
          `INSERT INTO reward_redemptions (kid_name, reward_id, coins_spent, status)
           VALUES ($1, $2, $3, 'pending')
           RETURNING *`,
          [kid_name, reward_id, reward.coin_cost]
        )

        return NextResponse.json({
          redemption: redemptionRows[0],
          new_balance: balanceAfter,
        }, { status: 201 })
      } catch (error: any) {
        console.error('kid_request_reward error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // kid_update_pin
    // ------------------------------------------------------------------
    case 'kid_update_pin': {
      const { kid_name, current_pin, new_pin } = body
      if (!kid_name || !current_pin || !new_pin) {
        return NextResponse.json({ error: 'kid_name, current_pin, and new_pin are required' }, { status: 400 })
      }
      if (new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) {
        return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `SELECT id, kid_pin FROM profiles WHERE LOWER(first_name) = LOWER($1) AND role = 'child' LIMIT 1`,
          [kid_name]
        )
        if (!rows.length) {
          return NextResponse.json({ error: 'Kid not found' }, { status: 404 })
        }
        if (rows[0].kid_pin !== current_pin) {
          return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 401 })
        }
        await db.query(
          `UPDATE profiles SET kid_pin = $2 WHERE id = $1`,
          [rows[0].id, new_pin]
        )
        return NextResponse.json({ success: true })
      } catch (error: any) {
        console.error('kid_update_pin error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // kid_name_mascot
    // ------------------------------------------------------------------
    case 'kid_name_mascot': {
      const { kid_name, mascot_name } = body
      if (!kid_name || !mascot_name) {
        return NextResponse.json({ error: 'kid_name and mascot_name are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE hs_students SET mascot_name = $2 WHERE kid_name = $1 RETURNING *`,
          [kid_name, mascot_name]
        )
        return NextResponse.json({ student: rows[0] || null })
      } catch (error: any) {
        console.error('kid_name_mascot error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // set_pin — parent sets a kid's PIN
    // ------------------------------------------------------------------
    case 'set_pin': {
      const { kid_name, pin: newPin } = body
      if (!kid_name || !newPin) {
        return NextResponse.json({ error: 'kid_name and pin are required' }, { status: 400 })
      }
      if (!/^\d{4}$/.test(newPin)) {
        return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE profiles SET kid_pin = $2, pin_reset_at = NOW()
           WHERE LOWER(first_name) = LOWER($1) AND role = 'child'
           RETURNING id`,
          [kid_name, newPin]
        )
        if (!rows.length) {
          return NextResponse.json({ error: 'Kid not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true })
      } catch (error: any) {
        console.error('set_pin error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // reset_pin — parent resets PIN + clears lockout
    // ------------------------------------------------------------------
    case 'reset_pin': {
      const { kid_name, new_pin } = body
      if (!kid_name || !new_pin) {
        return NextResponse.json({ error: 'kid_name and new_pin are required' }, { status: 400 })
      }
      if (!/^\d{4}$/.test(new_pin)) {
        return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE profiles SET kid_pin = $2, pin_reset_at = NOW(), login_attempts = 0, locked_until = NULL
           WHERE LOWER(first_name) = LOWER($1) AND role = 'child'
           RETURNING id`,
          [kid_name, new_pin]
        )
        if (!rows.length) {
          return NextResponse.json({ error: 'Kid not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true })
      } catch (error: any) {
        console.error('reset_pin error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // unlock_portal — clear lockout for a kid
    // ------------------------------------------------------------------
    case 'unlock_portal': {
      const { kid_name } = body
      if (!kid_name) {
        return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE profiles SET login_attempts = 0, locked_until = NULL
           WHERE LOWER(first_name) = LOWER($1) AND role = 'child'
           RETURNING id`,
          [kid_name]
        )
        if (!rows.length) {
          return NextResponse.json({ error: 'Kid not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true })
      } catch (error: any) {
        console.error('unlock_portal error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // toggle_portal — enable/disable kid portal
    // ------------------------------------------------------------------
    case 'toggle_portal': {
      const { kid_name, enabled } = body
      if (!kid_name || typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'kid_name and enabled (boolean) are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE profiles SET kid_portal_enabled = $2
           WHERE LOWER(first_name) = LOWER($1) AND role = 'child'
           RETURNING id`,
          [kid_name, enabled]
        )
        if (!rows.length) {
          return NextResponse.json({ error: 'Kid not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true, enabled })
      } catch (error: any) {
        console.error('toggle_portal error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // LIB-2: Kid submits library item for parent review
    case 'submit_library_item': {
      const { kid_name, item_type, title, author_or_publisher, isbn, upc, description, location_in_home, year_acquired, custom_tags, cover_image_url } = body
      if (!kid_name || !title) return NextResponse.json({ error: 'kid_name and title required' }, { status: 400 })
      try {
        const rows = await db.query(
          `INSERT INTO library_submissions (kid_name, item_type, title, author_or_publisher, isbn, upc, description, location_in_home, year_acquired, custom_tags, cover_image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          [kid_name.toLowerCase(), item_type || 'book', title, author_or_publisher || null, isbn || null, upc || null, description || null, location_in_home || null, year_acquired || null, custom_tags || [], cover_image_url || null]
        )
        const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1).toLowerCase()
        await createNotification({
          title: `${kidDisplay} added a library item`,
          message: `${title} (${item_type || 'book'}) — needs your review`,
          source_type: 'library_submission', source_ref: `kid:${kid_name.toLowerCase()}`,
          link_tab: 'homeschool', icon: '📚',
        }).catch(() => {})
        return NextResponse.json({ success: true, submission: rows[0] })
      } catch (error) {
        console.error('submit_library_item error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
      }
    }

    case 'get_my_library_submissions': {
      const { kid_name } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT * FROM library_submissions WHERE kid_name = $1 ORDER BY submitted_at DESC LIMIT 50`,
          [kid_name.toLowerCase()]
        )
        return NextResponse.json({ submissions: rows })
      } catch { return NextResponse.json({ submissions: [] }) }
    }

    default:
      return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
  }
}
