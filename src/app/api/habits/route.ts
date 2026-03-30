import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ============================================================================
// GET /api/habits?action=...
// ============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    // ------------------------------------------------------------------
    // get_habits — habits for one member with today's completion status
    // ------------------------------------------------------------------
    case 'get_habits': {
      const member_name = searchParams.get('member_name')
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
      if (!member_name) {
        return NextResponse.json({ error: 'member_name is required' }, { status: 400 })
      }
      try {
        const habits = await db.query(
          `SELECT h.*,
                  hc.status AS completion_status,
                  hc.completed_at,
                  hc.note AS completion_note,
                  hs.current_streak,
                  hs.longest_streak
           FROM habits h
           LEFT JOIN habit_completions hc
             ON hc.habit_id = h.id AND hc.completion_date = $2
           LEFT JOIN habit_streaks hs
             ON hs.habit_id = h.id
           WHERE h.member_name = $1 AND h.is_active = true
           ORDER BY
             CASE h.category
               WHEN 'morning' THEN 1
               WHEN 'health' THEN 2
               WHEN 'school' THEN 3
               WHEN 'evening' THEN 4
               WHEN 'personal' THEN 5
               ELSE 6
             END,
             h.title`,
          [member_name, date]
        )
        return NextResponse.json({ habits })
      } catch (error: any) {
        console.error('get_habits error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_all_habits_today — all members' habits grouped by member
    // ------------------------------------------------------------------
    case 'get_all_habits_today': {
      const today = searchParams.get('date') || new Date().toISOString().split('T')[0]
      try {
        const rows = await db.query(
          `SELECT h.*,
                  hc.status AS completion_status,
                  hc.completed_at,
                  hs.current_streak,
                  hs.longest_streak
           FROM habits h
           LEFT JOIN habit_completions hc
             ON hc.habit_id = h.id AND hc.completion_date = $1
           LEFT JOIN habit_streaks hs
             ON hs.habit_id = h.id
           WHERE h.is_active = true
           ORDER BY h.member_name,
             CASE h.category
               WHEN 'morning' THEN 1
               WHEN 'health' THEN 2
               WHEN 'school' THEN 3
               WHEN 'evening' THEN 4
               WHEN 'personal' THEN 5
               ELSE 6
             END,
             h.title`,
          [today]
        )

        // Group by member
        const grouped: Record<string, any[]> = {}
        for (const row of rows) {
          if (!grouped[row.member_name]) grouped[row.member_name] = []
          grouped[row.member_name].push(row)
        }

        return NextResponse.json({ habits_by_member: grouped, date: today })
      } catch (error: any) {
        console.error('get_all_habits_today error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_habit_detail — single habit with streak data
    // ------------------------------------------------------------------
    case 'get_habit_detail': {
      const habit_id = searchParams.get('habit_id')
      if (!habit_id) {
        return NextResponse.json({ error: 'habit_id is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `SELECT h.*,
                  hs.current_streak,
                  hs.longest_streak,
                  hs.last_completed_date,
                  hs.total_completions
           FROM habits h
           LEFT JOIN habit_streaks hs ON hs.habit_id = h.id
           WHERE h.id = $1`,
          [habit_id]
        )
        if (!rows.length) {
          return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
        }
        return NextResponse.json({ habit: rows[0] })
      } catch (error: any) {
        console.error('get_habit_detail error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_habit_history — completions in date range (for heatmap)
    // ------------------------------------------------------------------
    case 'get_habit_history': {
      const habit_id = searchParams.get('habit_id')
      const start = searchParams.get('start')
      const end = searchParams.get('end')
      if (!habit_id) {
        return NextResponse.json({ error: 'habit_id is required' }, { status: 400 })
      }
      try {
        const completions = await db.query(
          `SELECT completion_date, status, completed_at, note
           FROM habit_completions
           WHERE habit_id = $1
             AND ($2::date IS NULL OR completion_date >= $2::date)
             AND ($3::date IS NULL OR completion_date <= $3::date)
           ORDER BY completion_date`,
          [habit_id, start || null, end || null]
        )
        return NextResponse.json({ completions })
      } catch (error: any) {
        console.error('get_habit_history error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_habit_streaks — all streaks for a person
    // ------------------------------------------------------------------
    case 'get_habit_streaks': {
      const member_name = searchParams.get('member_name')
      if (!member_name) {
        return NextResponse.json({ error: 'member_name is required' }, { status: 400 })
      }
      try {
        const streaks = await db.query(
          `SELECT hs.*, h.title, h.emoji, h.category
           FROM habit_streaks hs
           JOIN habits h ON h.id = hs.habit_id
           WHERE h.member_name = $1 AND h.is_active = true
           ORDER BY hs.current_streak DESC`,
          [member_name]
        )
        return NextResponse.json({ streaks })
      } catch (error: any) {
        console.error('get_habit_streaks error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}

// ============================================================================
// POST /api/habits   body: { action, ...payload }
// ============================================================================
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body

  switch (action) {
    // ------------------------------------------------------------------
    // create_habit
    // ------------------------------------------------------------------
    case 'create_habit': {
      const { member_name, title, emoji, category, frequency, reminder_time, coin_reward, description } = body
      if (!member_name || !title) {
        return NextResponse.json({ error: 'member_name and title are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `INSERT INTO habits (member_name, title, emoji, category, frequency, reminder_time, coin_reward, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            member_name,
            title,
            emoji || '⭐',
            category || 'personal',
            frequency || 'daily',
            reminder_time || null,
            coin_reward || 0,
            description || null,
          ]
        )
        const habit = rows[0]

        // Create streak record
        await db.query(
          `INSERT INTO habit_streaks (habit_id, current_streak, longest_streak, total_completions)
           VALUES ($1, 0, 0, 0)`,
          [habit.id]
        )

        return NextResponse.json({ habit })
      } catch (error: any) {
        console.error('create_habit error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_habit
    // ------------------------------------------------------------------
    case 'update_habit': {
      const { habit_id, title, emoji, category, frequency, reminder_time, coin_reward, description } = body
      if (!habit_id) {
        return NextResponse.json({ error: 'habit_id is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE habits
           SET title = COALESCE($2, title),
               emoji = COALESCE($3, emoji),
               category = COALESCE($4, category),
               frequency = COALESCE($5, frequency),
               reminder_time = COALESCE($6, reminder_time),
               coin_reward = COALESCE($7, coin_reward),
               description = COALESCE($8, description),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [habit_id, title, emoji, category, frequency, reminder_time, coin_reward, description]
        )
        return NextResponse.json({ habit: rows[0] })
      } catch (error: any) {
        console.error('update_habit error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // delete_habit — soft delete
    // ------------------------------------------------------------------
    case 'delete_habit': {
      const { habit_id } = body
      if (!habit_id) {
        return NextResponse.json({ error: 'habit_id is required' }, { status: 400 })
      }
      try {
        await db.query(
          `UPDATE habits SET is_active = false, updated_at = NOW() WHERE id = $1`,
          [habit_id]
        )
        return NextResponse.json({ success: true })
      } catch (error: any) {
        console.error('delete_habit error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // mark_habit_complete
    // ------------------------------------------------------------------
    case 'mark_habit_complete': {
      const { habit_id, member_name, completion_date, note } = body
      const date = completion_date || new Date().toISOString().split('T')[0]
      if (!habit_id) {
        return NextResponse.json({ error: 'habit_id is required' }, { status: 400 })
      }
      try {
        // 1. UPSERT completion
        const compRows = await db.query(
          `INSERT INTO habit_completions (habit_id, member_name, completion_date, status, completed_at, note)
           VALUES ($1, $2, $3, 'completed', NOW(), $4)
           ON CONFLICT (habit_id, completion_date)
           DO UPDATE SET status = 'completed', completed_at = NOW(), note = COALESCE($4, habit_completions.note)
           RETURNING *`,
          [habit_id, member_name, date, note || null]
        )
        const completion = compRows[0]

        // 2. Update streak: check yesterday
        const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0]
        const yesterdayRows = await db.query(
          `SELECT status FROM habit_completions
           WHERE habit_id = $1 AND completion_date = $2 AND status = 'completed'`,
          [habit_id, yesterday]
        )
        const hadYesterday = yesterdayRows.length > 0

        let streakRows
        if (hadYesterday) {
          streakRows = await db.query(
            `UPDATE habit_streaks
             SET current_streak = current_streak + 1,
                 longest_streak = GREATEST(longest_streak, current_streak + 1),
                 last_completed_date = $2,
                 total_completions = total_completions + 1
             WHERE habit_id = $1
             RETURNING *`,
            [habit_id, date]
          )
        } else {
          streakRows = await db.query(
            `UPDATE habit_streaks
             SET current_streak = 1,
                 longest_streak = GREATEST(longest_streak, 1),
                 last_completed_date = $2,
                 total_completions = total_completions + 1
             WHERE habit_id = $1
             RETURNING *`,
            [habit_id, date]
          )
        }
        const streak = streakRows[0]

        // 3. Coin reward
        let coins_awarded = 0
        const habitRows = await db.query(`SELECT * FROM habits WHERE id = $1`, [habit_id])
        const habit = habitRows[0]
        if (habit && habit.coin_reward > 0 && member_name) {
          coins_awarded = habit.coin_reward
          try {
            await db.query(
              `INSERT INTO coin_transactions (kid_name, amount, reason, source, created_at)
               VALUES ($1, $2, $3, 'habit', NOW())`,
              [member_name, coins_awarded, `Habit: ${habit.title}`]
            )
            await db.query(
              `UPDATE kid_rewards_profile
               SET coin_balance = coin_balance + $2,
                   lifetime_earned = lifetime_earned + $2
               WHERE kid_name = $1`,
              [member_name, coins_awarded]
            )
          } catch (err) {
            console.error('coin_reward error (non-fatal):', err)
            coins_awarded = 0
          }
        }

        // 4. If medication habit, log to health_logs
        if (habit && habit.category === 'health' && habit.emoji === '\uD83D\uDC8A') {
          try {
            await db.query(
              `INSERT INTO health_logs (member_name, log_type, title, notes, logged_at, created_at)
               VALUES ($1, 'medication', $2, $3, NOW(), NOW())`,
              [member_name || habit.member_name, habit.title, note || 'Completed via habit tracker']
            )
          } catch (err) {
            console.error('health_log insert error (non-fatal):', err)
          }
        }

        return NextResponse.json({ completion, streak, coins_awarded })
      } catch (error: any) {
        console.error('mark_habit_complete error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // mark_habit_skipped
    // ------------------------------------------------------------------
    case 'mark_habit_skipped': {
      const { habit_id, member_name, completion_date, note } = body
      const date = completion_date || new Date().toISOString().split('T')[0]
      if (!habit_id) {
        return NextResponse.json({ error: 'habit_id is required' }, { status: 400 })
      }
      try {
        const compRows = await db.query(
          `INSERT INTO habit_completions (habit_id, member_name, completion_date, status, completed_at, note)
           VALUES ($1, $2, $3, 'skipped', NOW(), $4)
           ON CONFLICT (habit_id, completion_date)
           DO UPDATE SET status = 'skipped', completed_at = NOW(), note = COALESCE($4, habit_completions.note)
           RETURNING *`,
          [habit_id, member_name, date, note || null]
        )

        // Reset streak on skip
        await db.query(
          `UPDATE habit_streaks SET current_streak = 0 WHERE habit_id = $1`,
          [habit_id]
        )

        // If medication habit, log skip to health_logs
        const habitRows = await db.query(`SELECT * FROM habits WHERE id = $1`, [habit_id])
        const habit = habitRows[0]
        if (habit && habit.category === 'health' && habit.emoji === '\uD83D\uDC8A') {
          try {
            await db.query(
              `INSERT INTO health_logs (member_name, log_type, title, notes, logged_at, created_at)
               VALUES ($1, 'medication', $2, $3, NOW(), NOW())`,
              [member_name || habit.member_name, `${habit.title} (SKIPPED)`, note || 'Skipped via habit tracker']
            )
          } catch (err) {
            console.error('health_log skip insert error (non-fatal):', err)
          }
        }

        return NextResponse.json({ completion: compRows[0], streak_reset: true })
      } catch (error: any) {
        console.error('mark_habit_skipped error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // undo_habit_completion
    // ------------------------------------------------------------------
    case 'undo_habit_completion': {
      const { habit_id, completion_date } = body
      const date = completion_date || new Date().toISOString().split('T')[0]
      if (!habit_id) {
        return NextResponse.json({ error: 'habit_id is required' }, { status: 400 })
      }
      try {
        await db.query(
          `DELETE FROM habit_completions WHERE habit_id = $1 AND completion_date = $2`,
          [habit_id, date]
        )

        // Recalculate streak by walking back from yesterday
        const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0]
        const recentRows = await db.query(
          `SELECT completion_date FROM habit_completions
           WHERE habit_id = $1 AND status = 'completed' AND completion_date <= $2
           ORDER BY completion_date DESC
           LIMIT 365`,
          [habit_id, yesterday]
        )

        let newStreak = 0
        if (recentRows.length > 0) {
          let checkDate = new Date(yesterday)
          for (const row of recentRows) {
            const rowDate = new Date(row.completion_date).toISOString().split('T')[0]
            const expected = checkDate.toISOString().split('T')[0]
            if (rowDate === expected) {
              newStreak++
              checkDate = new Date(checkDate.getTime() - 86400000)
            } else {
              break
            }
          }
        }

        await db.query(
          `UPDATE habit_streaks
           SET current_streak = $2,
               total_completions = GREATEST(0, total_completions - 1),
               last_completed_date = CASE WHEN $2 > 0 THEN (
                 SELECT MAX(completion_date) FROM habit_completions
                 WHERE habit_id = $1 AND status = 'completed'
               ) ELSE last_completed_date END
           WHERE habit_id = $1`,
          [habit_id, newStreak]
        )

        return NextResponse.json({ success: true, new_streak: newStreak })
      } catch (error: any) {
        console.error('undo_habit_completion error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
