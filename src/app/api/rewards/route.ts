import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

// ============================================================================
// GET /api/rewards?action=...
// ============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    // ------------------------------------------------------------------
    // get_config — system-wide rewards settings
    // ------------------------------------------------------------------
    case 'get_config': {
      try {
        const rows = await db.query(`SELECT * FROM rewards_config LIMIT 1`)
        return NextResponse.json({ config: rows[0] || null })
      } catch (error: any) {
        console.error('get_config error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_kid_profile — full profile with active savings goals
    // ------------------------------------------------------------------
    case 'get_kid_profile': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) {
        return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      }
      try {
        const profileRows = await db.query(
          `SELECT * FROM kid_rewards_profile WHERE kid_name = $1 LIMIT 1`,
          [kid_name]
        )
        const profile = profileRows[0] || null

        let goals: any[] = []
        try {
          goals = await db.query(
            `SELECT * FROM savings_goals
             WHERE kid_name = $1 AND is_achieved = false
             ORDER BY created_at DESC`,
            [kid_name]
          )
        } catch (err) {
          console.error('get_kid_profile goals error:', err)
        }

        return NextResponse.json({ profile, active_goals: goals })
      } catch (error: any) {
        console.error('get_kid_profile error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_all_balances — all 6 kids with balances + primary goal progress
    // ------------------------------------------------------------------
    case 'get_all_balances': {
      try {
        const kids = await db.query(
          `SELECT krp.*,
                  sg.id AS goal_id,
                  sg.goal_name,
                  sg.coins_target,
                  sg.coins_saved AS goal_coins_saved
           FROM kid_rewards_profile krp
           LEFT JOIN LATERAL (
             SELECT id, goal_name, coins_target, coins_saved
             FROM savings_goals
             WHERE kid_name = krp.kid_name
               AND is_achieved = false
               AND kid_name != 'family'
             ORDER BY is_primary DESC, created_at ASC
             LIMIT 1
           ) sg ON true
           ORDER BY krp.kid_name`
        )
        return NextResponse.json({ kids })
      } catch (error: any) {
        console.error('get_all_balances error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_coin_history — recent transactions for a kid
    // ------------------------------------------------------------------
    case 'get_coin_history': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) {
        return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      }
      const limit = parseInt(searchParams.get('limit') || '30', 10)
      try {
        const rows = await db.query(
          `SELECT * FROM coin_transactions
           WHERE kid_name = $1
           ORDER BY created_at DESC
           LIMIT $2`,
          [kid_name, limit]
        )
        return NextResponse.json({ transactions: rows })
      } catch (error: any) {
        console.error('get_coin_history error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_savings_goals — active goals for a kid
    // ------------------------------------------------------------------
    case 'get_savings_goals': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) {
        return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `SELECT * FROM savings_goals
           WHERE kid_name = $1 AND is_achieved = false
           ORDER BY is_primary DESC, created_at ASC`,
          [kid_name]
        )
        return NextResponse.json({ goals: rows })
      } catch (error: any) {
        console.error('get_savings_goals error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_reward_catalog — all active catalog items
    // ------------------------------------------------------------------
    case 'get_reward_catalog': {
      try {
        const rows = await db.query(
          `SELECT * FROM reward_catalog
           WHERE is_active = true
           ORDER BY category, coin_cost`
        )
        return NextResponse.json({ rewards: rows })
      } catch (error: any) {
        console.error('get_reward_catalog error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_pending_submissions — task photo submissions awaiting review
    // ------------------------------------------------------------------
    case 'get_pending_submissions': {
      try {
        const rows = await db.query(
          `SELECT * FROM task_submissions
           WHERE status = 'pending'
           ORDER BY submitted_at ASC`
        )
        return NextResponse.json({ submissions: rows })
      } catch (error: any) {
        console.error('get_pending_submissions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_pending_redemptions — reward redemptions awaiting approval
    // ------------------------------------------------------------------
    case 'get_pending_redemptions': {
      try {
        const rows = await db.query(
          `SELECT rr.*, rc.reward_name, rc.category, rc.coin_cost
           FROM reward_redemptions rr
           JOIN reward_catalog rc ON rr.reward_id = rc.id
           WHERE rr.status = 'pending'
           ORDER BY rr.requested_at ASC`
        )
        return NextResponse.json({ redemptions: rows })
      } catch (error: any) {
        console.error('get_pending_redemptions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_bonus_tasks — open (or filtered) bonus tasks
    // ------------------------------------------------------------------
    case 'get_bonus_tasks': {
      const status = searchParams.get('status') || 'open'
      const kidName = searchParams.get('kid_name')
      try {
        let sql = `SELECT * FROM bonus_tasks WHERE status = $1`
        const params: any[] = [status]
        // If kid_name provided, filter to tasks assigned to them (or assigned to all)
        if (kidName) {
          sql += ` AND (assigned_to IS NULL OR $2 = ANY(assigned_to))`
          params.push(kidName.toLowerCase())
        }
        sql += ` ORDER BY created_at DESC`
        const rows = await db.query(sql, params)
        return NextResponse.json({ bonus_tasks: rows })
      } catch (error: any) {
        console.error('get_bonus_tasks error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_screen_time_balance — current balance + recent ledger
    // ------------------------------------------------------------------
    case 'get_screen_time_balance': {
      const kid_name = searchParams.get('kid_name')
      if (!kid_name) {
        return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
      }
      try {
        const profileRows = await db.query(
          `SELECT screen_time_balance_mins FROM kid_rewards_profile
           WHERE kid_name = $1 LIMIT 1`,
          [kid_name]
        )
        const balance = profileRows[0]?.screen_time_balance_mins ?? 0

        let ledger: any[] = []
        try {
          ledger = await db.query(
            `SELECT * FROM screen_time_ledger
             WHERE kid_name = $1
             ORDER BY created_at DESC
             LIMIT 20`,
            [kid_name]
          )
        } catch (err) {
          console.error('screen_time_ledger fetch error:', err)
        }

        return NextResponse.json({ balance_mins: balance, ledger })
      } catch (error: any) {
        console.error('get_screen_time_balance error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_family_pool_goals — family-level savings goals
    // ------------------------------------------------------------------
    case 'get_family_pool_goals': {
      try {
        const rows = await db.query(
          `SELECT * FROM savings_goals
           WHERE kid_name = 'family' AND is_achieved = false
           ORDER BY created_at DESC`
        )
        return NextResponse.json({ family_goals: rows })
      } catch (error: any) {
        console.error('get_family_pool_goals error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_weekly_summary — per-kid earning/spending for current week
    // ------------------------------------------------------------------
    case 'get_weekly_summary': {
      try {
        const rows = await db.query(
          `SELECT kid_name,
                  COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::int AS earned,
                  COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)::int AS spent
           FROM coin_transactions
           WHERE created_at >= date_trunc('week', CURRENT_DATE)
           GROUP BY kid_name
           ORDER BY kid_name`
        )
        return NextResponse.json({ summary: rows })
      } catch (error: any) {
        console.error('get_weekly_summary error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Aliases for frontend compatibility
    case 'balances': {
      try {
        const rows = await db.query(
          `SELECT kid_name, stars_balance as coin_balance FROM digi_pets ORDER BY kid_name`
        )
        return NextResponse.json({ balances: rows })
      } catch { return NextResponse.json({ balances: [] }) }
    }
    case 'redemptions':
    case 'get_redemptions': {
      try {
        const rows = await db.query(
          `SELECT * FROM reward_redemptions ORDER BY created_at DESC LIMIT 50`
        )
        return NextResponse.json({ redemptions: rows })
      } catch { return NextResponse.json({ redemptions: [] }) }
    }
    case 'photo_submissions': {
      return NextResponse.json({ submissions: [] }) // No photo submission system yet
    }

    default:
      return NextResponse.json(
        { error: `Unknown GET action: ${action}` },
        { status: 400 }
      )
  }
}

// ============================================================================
// POST /api/rewards  body: { action, ...payload }
// ============================================================================
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, ...payload } = body

  switch (action) {
    // ------------------------------------------------------------------
    // update_config
    // ------------------------------------------------------------------
    case 'update_config': {
      try {
        const {
          base_chore_coins, bonus_task_multiplier, photo_required_default,
          screen_time_mins_per_coin, max_daily_screen_time_mins,
          savings_goal_bonus_pct, weekly_allowance_coins
        } = payload
        const rows = await db.query(
          `UPDATE rewards_config SET
             base_chore_coins = COALESCE($1, base_chore_coins),
             bonus_task_multiplier = COALESCE($2, bonus_task_multiplier),
             photo_required_default = COALESCE($3, photo_required_default),
             screen_time_mins_per_coin = COALESCE($4, screen_time_mins_per_coin),
             max_daily_screen_time_mins = COALESCE($5, max_daily_screen_time_mins),
             savings_goal_bonus_pct = COALESCE($6, savings_goal_bonus_pct),
             weekly_allowance_coins = COALESCE($7, weekly_allowance_coins),
             updated_at = NOW()
           RETURNING *`,
          [base_chore_coins, bonus_task_multiplier, photo_required_default,
           screen_time_mins_per_coin, max_daily_screen_time_mins,
           savings_goal_bonus_pct, weekly_allowance_coins]
        )
        return NextResponse.json({ config: rows[0] })
      } catch (error: any) {
        console.error('update_config error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // earn_coins
    // ------------------------------------------------------------------
    case 'earn_coins': {
      const { kid_name, transaction_type, amount, source_id, source_type, note } = payload
      if (!kid_name || !amount) {
        return NextResponse.json({ error: 'kid_name and amount are required' }, { status: 400 })
      }
      try {
        // Get current balance
        const profileRows = await db.query(
          `SELECT coin_balance FROM kid_rewards_profile WHERE kid_name = $1`,
          [kid_name]
        )
        if (!profileRows[0]) {
          return NextResponse.json({ error: `No profile found for ${kid_name}` }, { status: 404 })
        }
        const currentBalance = profileRows[0].coin_balance
        const balanceAfter = currentBalance + amount

        // Insert transaction
        const txRows = await db.query(
          `INSERT INTO coin_transactions
             (kid_name, transaction_type, amount, balance_after, source_id, source_type, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [kid_name, transaction_type || 'chore_complete', amount, balanceAfter, source_id, source_type, note]
        )

        // Update profile
        await db.query(
          `UPDATE kid_rewards_profile
           SET coin_balance = coin_balance + $2,
               lifetime_coins_earned = lifetime_coins_earned + $2,
               updated_at = NOW()
           WHERE kid_name = $1`,
          [kid_name, amount]
        )

        return NextResponse.json({ transaction: txRows[0], balance_after: balanceAfter })
      } catch (error: any) {
        console.error('earn_coins error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // spend_coins
    // ------------------------------------------------------------------
    case 'spend_coins': {
      const { kid_name, transaction_type, amount, note } = payload
      if (!kid_name || !amount) {
        return NextResponse.json({ error: 'kid_name and amount are required' }, { status: 400 })
      }
      try {
        const profileRows = await db.query(
          `SELECT coin_balance FROM kid_rewards_profile WHERE kid_name = $1`,
          [kid_name]
        )
        if (!profileRows[0]) {
          return NextResponse.json({ error: `No profile found for ${kid_name}` }, { status: 404 })
        }
        const currentBalance = profileRows[0].coin_balance
        if (currentBalance < amount) {
          return NextResponse.json(
            { error: `Insufficient balance. Has ${currentBalance}, needs ${amount}` },
            { status: 400 }
          )
        }
        const balanceAfter = currentBalance - amount

        const txRows = await db.query(
          `INSERT INTO coin_transactions
             (kid_name, transaction_type, amount, balance_after, note)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [kid_name, transaction_type || 'reward_purchase', -amount, balanceAfter, note]
        )

        await db.query(
          `UPDATE kid_rewards_profile
           SET coin_balance = coin_balance - $2,
               lifetime_coins_spent = lifetime_coins_spent + $2,
               updated_at = NOW()
           WHERE kid_name = $1`,
          [kid_name, amount]
        )

        return NextResponse.json({ transaction: txRows[0], balance_after: balanceAfter })
      } catch (error: any) {
        console.error('spend_coins error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // parent_adjust_coins — positive or negative adjustment
    // ------------------------------------------------------------------
    case 'parent_adjust_coins': {
      const { kid_name, amount, note } = payload
      if (!kid_name || amount === undefined) {
        return NextResponse.json({ error: 'kid_name and amount are required' }, { status: 400 })
      }
      try {
        const profileRows = await db.query(
          `SELECT coin_balance FROM kid_rewards_profile WHERE kid_name = $1`,
          [kid_name]
        )
        if (!profileRows[0]) {
          return NextResponse.json({ error: `No profile found for ${kid_name}` }, { status: 404 })
        }
        const currentBalance = profileRows[0].coin_balance

        if (amount < 0 && currentBalance < Math.abs(amount)) {
          return NextResponse.json(
            { error: `Insufficient balance. Has ${currentBalance}, deducting ${Math.abs(amount)}` },
            { status: 400 }
          )
        }

        const balanceAfter = currentBalance + amount
        const txType = amount >= 0 ? 'parent_award' : 'parent_deduction'

        const txRows = await db.query(
          `INSERT INTO coin_transactions
             (kid_name, transaction_type, amount, balance_after, note)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [kid_name, txType, amount, balanceAfter, note]
        )

        if (amount >= 0) {
          await db.query(
            `UPDATE kid_rewards_profile
             SET coin_balance = coin_balance + $2,
                 lifetime_coins_earned = lifetime_coins_earned + $2,
                 updated_at = NOW()
             WHERE kid_name = $1`,
            [kid_name, amount]
          )
        } else {
          await db.query(
            `UPDATE kid_rewards_profile
             SET coin_balance = coin_balance + $2,
                 lifetime_coins_spent = lifetime_coins_spent + $3,
                 updated_at = NOW()
             WHERE kid_name = $1`,
            [kid_name, amount, Math.abs(amount)]
          )
        }

        return NextResponse.json({ transaction: txRows[0], balance_after: balanceAfter })
      } catch (error: any) {
        console.error('parent_adjust_coins error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // create_savings_goal
    // ------------------------------------------------------------------
    case 'create_savings_goal': {
      const { kid_name, goal_name, coins_target, emoji, is_primary } = payload
      if (!kid_name || !goal_name || !coins_target) {
        return NextResponse.json({ error: 'kid_name, goal_name, and coins_target are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `INSERT INTO savings_goals (kid_name, goal_name, coins_target, emoji, is_primary)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [kid_name, goal_name, coins_target, emoji || null, is_primary || false]
        )
        return NextResponse.json({ goal: rows[0] })
      } catch (error: any) {
        console.error('create_savings_goal error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // contribute_to_goal
    // ------------------------------------------------------------------
    case 'contribute_to_goal': {
      const { kid_name, goal_id, coins_amount } = payload
      if (!kid_name || !goal_id || !coins_amount) {
        return NextResponse.json({ error: 'kid_name, goal_id, and coins_amount are required' }, { status: 400 })
      }
      try {
        // Check balance
        const profileRows = await db.query(
          `SELECT coin_balance FROM kid_rewards_profile WHERE kid_name = $1`,
          [kid_name]
        )
        if (!profileRows[0]) {
          return NextResponse.json({ error: `No profile found for ${kid_name}` }, { status: 404 })
        }
        if (profileRows[0].coin_balance < coins_amount) {
          return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
        }

        // Deduct from balance
        await db.query(
          `UPDATE kid_rewards_profile
           SET coin_balance = coin_balance - $2, updated_at = NOW()
           WHERE kid_name = $1`,
          [kid_name, coins_amount]
        )

        // Add to goal
        const goalRows = await db.query(
          `UPDATE savings_goals
           SET coins_saved = coins_saved + $2, updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [goal_id, coins_amount]
        )
        const goal = goalRows[0]

        // Check if achieved
        if (goal && goal.coins_saved >= goal.coins_target) {
          await db.query(
            `UPDATE savings_goals
             SET is_achieved = true, achieved_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [goal_id]
          )
          goal.is_achieved = true
          goal.achieved_at = new Date().toISOString()
        }

        // Log transaction
        const balanceAfter = profileRows[0].coin_balance - coins_amount
        await db.query(
          `INSERT INTO coin_transactions
             (kid_name, transaction_type, amount, balance_after, source_id, source_type, note)
           VALUES ($1, 'savings_contribution', $2, $3, $4, 'savings_goal', $5)`,
          [kid_name, -coins_amount, balanceAfter, goal_id, `Saved toward: ${goal?.goal_name}`]
        )

        return NextResponse.json({ goal, new_balance: balanceAfter })
      } catch (error: any) {
        console.error('contribute_to_goal error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // mark_goal_achieved
    // ------------------------------------------------------------------
    case 'mark_goal_achieved': {
      const { goal_id } = payload
      if (!goal_id) {
        return NextResponse.json({ error: 'goal_id is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE savings_goals
           SET is_achieved = true, achieved_at = NOW(), updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [goal_id]
        )
        return NextResponse.json({ goal: rows[0] })
      } catch (error: any) {
        console.error('mark_goal_achieved error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // create_reward
    // ------------------------------------------------------------------
    case 'create_reward': {
      const { reward_name, category, coin_cost, description, screen_time_mins, is_limited, max_per_week } = payload
      if (!reward_name || !coin_cost) {
        return NextResponse.json({ error: 'reward_name and coin_cost are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `INSERT INTO reward_catalog
             (reward_name, category, coin_cost, description, screen_time_mins, is_limited, max_per_week)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [reward_name, category || 'general', coin_cost, description, screen_time_mins, is_limited || false, max_per_week]
        )
        return NextResponse.json({ reward: rows[0] })
      } catch (error: any) {
        console.error('create_reward error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_reward
    // ------------------------------------------------------------------
    case 'update_reward': {
      const { reward_id, reward_name, category, coin_cost, description, screen_time_mins, is_limited, max_per_week } = payload
      if (!reward_id) {
        return NextResponse.json({ error: 'reward_id is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE reward_catalog SET
             reward_name = COALESCE($2, reward_name),
             category = COALESCE($3, category),
             coin_cost = COALESCE($4, coin_cost),
             description = COALESCE($5, description),
             screen_time_mins = COALESCE($6, screen_time_mins),
             is_limited = COALESCE($7, is_limited),
             max_per_week = COALESCE($8, max_per_week),
             updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [reward_id, reward_name, category, coin_cost, description, screen_time_mins, is_limited, max_per_week]
        )
        return NextResponse.json({ reward: rows[0] })
      } catch (error: any) {
        console.error('update_reward error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // delete_reward — soft delete
    // ------------------------------------------------------------------
    case 'delete_reward': {
      const { reward_id } = payload
      if (!reward_id) {
        return NextResponse.json({ error: 'reward_id is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE reward_catalog SET is_active = false, updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [reward_id]
        )
        return NextResponse.json({ reward: rows[0] })
      } catch (error: any) {
        console.error('delete_reward error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // request_redemption — kid requests a reward
    // ------------------------------------------------------------------
    case 'request_redemption': {
      const { kid_name, reward_id } = payload
      if (!kid_name || !reward_id) {
        return NextResponse.json({ error: 'kid_name and reward_id are required' }, { status: 400 })
      }
      try {
        // Get reward cost
        const rewardRows = await db.query(
          `SELECT * FROM reward_catalog WHERE id = $1 AND is_active = true`,
          [reward_id]
        )
        if (!rewardRows[0]) {
          return NextResponse.json({ error: 'Reward not found or inactive' }, { status: 404 })
        }
        const reward = rewardRows[0]

        // Check balance
        const profileRows = await db.query(
          `SELECT coin_balance FROM kid_rewards_profile WHERE kid_name = $1`,
          [kid_name]
        )
        if (!profileRows[0]) {
          return NextResponse.json({ error: `No profile found for ${kid_name}` }, { status: 404 })
        }
        if (profileRows[0].coin_balance < reward.coin_cost) {
          return NextResponse.json(
            { error: `Insufficient balance. Has ${profileRows[0].coin_balance}, needs ${reward.coin_cost}` },
            { status: 400 }
          )
        }

        // Deduct coins (held in escrow)
        const balanceAfter = profileRows[0].coin_balance - reward.coin_cost
        await db.query(
          `UPDATE kid_rewards_profile
           SET coin_balance = coin_balance - $2, updated_at = NOW()
           WHERE kid_name = $1`,
          [kid_name, reward.coin_cost]
        )

        // Log transaction
        await db.query(
          `INSERT INTO coin_transactions
             (kid_name, transaction_type, amount, balance_after, source_id, source_type, note)
           VALUES ($1, 'reward_purchase', $2, $3, $4, 'reward_catalog', $5)`,
          [kid_name, -reward.coin_cost, balanceAfter, reward_id, `Redeemed: ${reward.reward_name}`]
        )

        // Insert redemption
        const redemptionRows = await db.query(
          `INSERT INTO reward_redemptions (kid_name, reward_id, coins_spent, status)
           VALUES ($1, $2, $3, 'pending')
           RETURNING *`,
          [kid_name, reward_id, reward.coin_cost]
        )

        const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1)
        await createNotification({
          title: `${kidDisplay} wants to redeem a reward`,
          message: `${reward.reward_name} (${reward.coin_cost} coins)`,
          source_type: 'reward_request', source_ref: `kid:${kid_name}`,
          link_tab: 'stars-rewards', icon: '🎁',
        }).catch(() => {})

        return NextResponse.json({ redemption: redemptionRows[0], balance_after: balanceAfter })
      } catch (error: any) {
        console.error('request_redemption error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // approve_redemption
    // ------------------------------------------------------------------
    case 'approve_redemption': {
      const { redemption_id } = payload
      if (!redemption_id) {
        return NextResponse.json({ error: 'redemption_id is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE reward_redemptions
           SET status = 'approved', reviewed_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [redemption_id]
        )
        const redemption = rows[0]
        if (!redemption) {
          return NextResponse.json({ error: 'Redemption not found' }, { status: 404 })
        }

        // If reward grants screen time, add it
        try {
          const rewardRows = await db.query(
            `SELECT screen_time_mins FROM reward_catalog WHERE id = $1`,
            [redemption.reward_id]
          )
          if (rewardRows[0]?.screen_time_mins) {
            await db.query(
              `UPDATE kid_rewards_profile
               SET screen_time_balance_mins = screen_time_balance_mins + $2, updated_at = NOW()
               WHERE kid_name = $1`,
              [redemption.kid_name, rewardRows[0].screen_time_mins]
            )
            await db.query(
              `INSERT INTO screen_time_ledger (kid_name, change_mins, reason, source_type, source_id)
               VALUES ($1, $2, 'Reward redemption approved', 'reward_redemption', $3)`,
              [redemption.kid_name, rewardRows[0].screen_time_mins, redemption_id]
            )
          }
        } catch (err) {
          console.error('approve_redemption screen_time error:', err)
        }

        // Update lifetime spent
        await db.query(
          `UPDATE kid_rewards_profile
           SET lifetime_coins_spent = lifetime_coins_spent + $2, updated_at = NOW()
           WHERE kid_name = $1`,
          [redemption.kid_name, redemption.coins_spent]
        )

        // Notify kid
        try {
          const rewardName = await db.query(`SELECT reward_name FROM reward_catalog WHERE id = $1`, [redemption.reward_id])
          await createNotification({
            title: 'Reward approved!',
            message: `${rewardName[0]?.reward_name || 'Your reward'} is yours!`,
            source_type: 'reward_approved', source_ref: `kid:${redemption.kid_name}`,
            link_tab: 'rewards-store', icon: '🎉',
          })
        } catch {}

        return NextResponse.json({ redemption })
      } catch (error: any) {
        console.error('approve_redemption error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // deny_redemption — refund coins
    // ------------------------------------------------------------------
    case 'deny_redemption': {
      const { redemption_id, deny_reason } = payload
      if (!redemption_id) {
        return NextResponse.json({ error: 'redemption_id is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE reward_redemptions
           SET status = 'denied', reviewed_at = NOW(), deny_reason = $2
           WHERE id = $1
           RETURNING *`,
          [redemption_id, deny_reason || null]
        )
        const redemption = rows[0]
        if (!redemption) {
          return NextResponse.json({ error: 'Redemption not found' }, { status: 404 })
        }

        // Refund coins
        await db.query(
          `UPDATE kid_rewards_profile
           SET coin_balance = coin_balance + $2, updated_at = NOW()
           WHERE kid_name = $1`,
          [redemption.kid_name, redemption.coins_spent]
        )

        // Log refund transaction
        const profileRows = await db.query(
          `SELECT coin_balance FROM kid_rewards_profile WHERE kid_name = $1`,
          [redemption.kid_name]
        )
        await db.query(
          `INSERT INTO coin_transactions
             (kid_name, transaction_type, amount, balance_after, source_id, source_type, note)
           VALUES ($1, 'refund', $2, $3, $4, 'reward_redemption', 'Redemption denied — coins refunded')`,
          [redemption.kid_name, redemption.coins_spent, profileRows[0]?.coin_balance, redemption_id]
        )

        return NextResponse.json({ redemption, refunded: redemption.coins_spent })
      } catch (error: any) {
        console.error('deny_redemption error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // submit_task_photo
    // ------------------------------------------------------------------
    case 'submit_task_photo': {
      const { kid_name, task_name, photo_url, task_id, task_type } = payload
      if (!kid_name || !task_name) {
        return NextResponse.json({ error: 'kid_name and task_name are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `INSERT INTO task_submissions
             (kid_name, task_name, photo_url, task_id, task_type, status, submitted_at)
           VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
           RETURNING *`,
          [kid_name, task_name, photo_url, task_id, task_type]
        )
        return NextResponse.json({ submission: rows[0] })
      } catch (error: any) {
        console.error('submit_task_photo error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // approve_submission — approve task photo, earn coins for kid
    // ------------------------------------------------------------------
    case 'approve_submission': {
      const { submission_id, coins_awarded } = payload
      if (!submission_id) {
        return NextResponse.json({ error: 'submission_id is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE task_submissions
           SET status = 'approved', reviewed_at = NOW(), coins_awarded = $2
           WHERE id = $1
           RETURNING *`,
          [submission_id, coins_awarded || 0]
        )
        const submission = rows[0]
        if (!submission) {
          return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
        }

        // Award coins if any
        if (coins_awarded && coins_awarded > 0) {
          const profileRows = await db.query(
            `SELECT coin_balance FROM kid_rewards_profile WHERE kid_name = $1`,
            [submission.kid_name]
          )
          const balanceAfter = (profileRows[0]?.coin_balance || 0) + coins_awarded

          await db.query(
            `INSERT INTO coin_transactions
               (kid_name, transaction_type, amount, balance_after, source_id, source_type, note)
             VALUES ($1, 'chore_complete', $2, $3, $4, 'task_submission', $5)`,
            [submission.kid_name, coins_awarded, balanceAfter, submission_id, `Approved: ${submission.task_name}`]
          )

          await db.query(
            `UPDATE kid_rewards_profile
             SET coin_balance = coin_balance + $2,
                 lifetime_coins_earned = lifetime_coins_earned + $2,
                 updated_at = NOW()
             WHERE kid_name = $1`,
            [submission.kid_name, coins_awarded]
          )
        }

        return NextResponse.json({ submission })
      } catch (error: any) {
        console.error('approve_submission error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // request_redo — send task back for redo
    // ------------------------------------------------------------------
    case 'request_redo': {
      const { submission_id, redo_note } = payload
      if (!submission_id) {
        return NextResponse.json({ error: 'submission_id is required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE task_submissions
           SET status = 'needs_redo', redo_note = $2, reviewed_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [submission_id, redo_note || null]
        )
        return NextResponse.json({ submission: rows[0] })
      } catch (error: any) {
        console.error('request_redo error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // create_bonus_task
    // ------------------------------------------------------------------
    case 'create_bonus_task': {
      const { task_name, description, coin_reward, emoji, expires_at, photo_required, assigned_to } = payload
      if (!task_name || !coin_reward) {
        return NextResponse.json({ error: 'task_name and coin_reward are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `INSERT INTO bonus_tasks
             (task_name, description, coin_reward, emoji, expires_at, photo_required, status, assigned_to)
           VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
           RETURNING *`,
          [task_name, description, coin_reward, emoji, expires_at || null, photo_required ?? true, assigned_to || null]
        )
        return NextResponse.json({ bonus_task: rows[0] })
      } catch (error: any) {
        console.error('create_bonus_task error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // claim_bonus_task
    // ------------------------------------------------------------------
    case 'claim_bonus_task': {
      const { task_id, kid_name } = payload
      if (!task_id || !kid_name) {
        return NextResponse.json({ error: 'task_id and kid_name are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE bonus_tasks
           SET claimed_by = $2, status = 'claimed', claimed_at = NOW()
           WHERE id = $1 AND status = 'open'
           RETURNING *`,
          [task_id, kid_name]
        )
        if (!rows[0]) {
          return NextResponse.json({ error: 'Task not available or already claimed' }, { status: 400 })
        }
        return NextResponse.json({ bonus_task: rows[0] })
      } catch (error: any) {
        console.error('claim_bonus_task error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // complete_bonus_task
    // ------------------------------------------------------------------
    case 'complete_bonus_task': {
      const { task_id, photo_url } = payload
      if (!task_id) {
        return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
      }
      try {
        // Check if photo required
        const taskRows = await db.query(
          `SELECT * FROM bonus_tasks WHERE id = $1`,
          [task_id]
        )
        if (!taskRows[0]) {
          return NextResponse.json({ error: 'Bonus task not found' }, { status: 404 })
        }
        const task = taskRows[0]
        const newStatus = task.photo_required ? 'submitted' : 'complete'

        const rows = await db.query(
          `UPDATE bonus_tasks
           SET status = $2, completed_at = NOW(), photo_url = COALESCE($3, photo_url)
           WHERE id = $1
           RETURNING *`,
          [task_id, newStatus, photo_url || null]
        )

        // If no photo required, auto-award coins
        if (newStatus === 'complete' && task.claimed_by) {
          const profileRows = await db.query(
            `SELECT coin_balance FROM kid_rewards_profile WHERE kid_name = $1`,
            [task.claimed_by]
          )
          const balanceAfter = (profileRows[0]?.coin_balance || 0) + task.coin_reward

          await db.query(
            `INSERT INTO coin_transactions
               (kid_name, transaction_type, amount, balance_after, source_id, source_type, note)
             VALUES ($1, 'bonus_task', $2, $3, $4, 'bonus_task', $5)`,
            [task.claimed_by, task.coin_reward, balanceAfter, task_id, `Bonus: ${task.task_name}`]
          )

          await db.query(
            `UPDATE kid_rewards_profile
             SET coin_balance = coin_balance + $2,
                 lifetime_coins_earned = lifetime_coins_earned + $2,
                 updated_at = NOW()
             WHERE kid_name = $1`,
            [task.claimed_by, task.coin_reward]
          )
        }

        return NextResponse.json({ bonus_task: rows[0] })
      } catch (error: any) {
        console.error('complete_bonus_task error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // add_screen_time
    // ------------------------------------------------------------------
    case 'add_screen_time': {
      const { kid_name, minutes, reason } = payload
      if (!kid_name || !minutes) {
        return NextResponse.json({ error: 'kid_name and minutes are required' }, { status: 400 })
      }
      try {
        await db.query(
          `UPDATE kid_rewards_profile
           SET screen_time_balance_mins = screen_time_balance_mins + $2, updated_at = NOW()
           WHERE kid_name = $1`,
          [kid_name, minutes]
        )

        await db.query(
          `INSERT INTO screen_time_ledger (kid_name, change_mins, reason, source_type)
           VALUES ($1, $2, $3, 'manual')`,
          [kid_name, minutes, reason || 'Added by parent']
        )

        const profileRows = await db.query(
          `SELECT screen_time_balance_mins FROM kid_rewards_profile WHERE kid_name = $1`,
          [kid_name]
        )

        return NextResponse.json({ balance_mins: profileRows[0]?.screen_time_balance_mins })
      } catch (error: any) {
        console.error('add_screen_time error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // use_screen_time
    // ------------------------------------------------------------------
    case 'use_screen_time': {
      const { kid_name, minutes, reason } = payload
      if (!kid_name || !minutes) {
        return NextResponse.json({ error: 'kid_name and minutes are required' }, { status: 400 })
      }
      try {
        const profileRows = await db.query(
          `SELECT screen_time_balance_mins FROM kid_rewards_profile WHERE kid_name = $1`,
          [kid_name]
        )
        if (!profileRows[0] || profileRows[0].screen_time_balance_mins < minutes) {
          return NextResponse.json({ error: 'Insufficient screen time balance' }, { status: 400 })
        }

        await db.query(
          `UPDATE kid_rewards_profile
           SET screen_time_balance_mins = screen_time_balance_mins - $2, updated_at = NOW()
           WHERE kid_name = $1`,
          [kid_name, minutes]
        )

        await db.query(
          `INSERT INTO screen_time_ledger (kid_name, change_mins, reason, source_type)
           VALUES ($1, $2, $3, 'usage')`,
          [kid_name, -minutes, reason || 'Screen time used']
        )

        return NextResponse.json({ balance_mins: profileRows[0].screen_time_balance_mins - minutes })
      } catch (error: any) {
        console.error('use_screen_time error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // create_family_goal
    // ------------------------------------------------------------------
    case 'create_family_goal': {
      const { goal_name, coins_target, emoji } = payload
      if (!goal_name || !coins_target) {
        return NextResponse.json({ error: 'goal_name and coins_target are required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `INSERT INTO savings_goals (kid_name, goal_name, coins_target, emoji)
           VALUES ('family', $1, $2, $3)
           RETURNING *`,
          [goal_name, coins_target, emoji || null]
        )
        return NextResponse.json({ goal: rows[0] })
      } catch (error: any) {
        console.error('create_family_goal error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // contribute_to_family_goal
    // ------------------------------------------------------------------
    case 'contribute_to_family_goal': {
      const { kid_name, goal_id, coins_amount } = payload
      if (!kid_name || !goal_id || !coins_amount) {
        return NextResponse.json({ error: 'kid_name, goal_id, and coins_amount are required' }, { status: 400 })
      }
      try {
        // Check kid balance
        const profileRows = await db.query(
          `SELECT coin_balance FROM kid_rewards_profile WHERE kid_name = $1`,
          [kid_name]
        )
        if (!profileRows[0]) {
          return NextResponse.json({ error: `No profile found for ${kid_name}` }, { status: 404 })
        }
        if (profileRows[0].coin_balance < coins_amount) {
          return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
        }

        // Deduct from kid balance
        await db.query(
          `UPDATE kid_rewards_profile
           SET coin_balance = coin_balance - $2, updated_at = NOW()
           WHERE kid_name = $1`,
          [kid_name, coins_amount]
        )

        // Add to family goal
        const goalRows = await db.query(
          `UPDATE savings_goals
           SET coins_saved = coins_saved + $2, updated_at = NOW()
           WHERE id = $1 AND kid_name = 'family'
           RETURNING *`,
          [goal_id, coins_amount]
        )
        const goal = goalRows[0]
        if (!goal) {
          // Refund if goal not found
          await db.query(
            `UPDATE kid_rewards_profile
             SET coin_balance = coin_balance + $2, updated_at = NOW()
             WHERE kid_name = $1`,
            [kid_name, coins_amount]
          )
          return NextResponse.json({ error: 'Family goal not found' }, { status: 404 })
        }

        // Check if achieved
        if (goal.coins_saved >= goal.coins_target) {
          await db.query(
            `UPDATE savings_goals
             SET is_achieved = true, achieved_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [goal_id]
          )
          goal.is_achieved = true
        }

        // Log transaction
        const balanceAfter = profileRows[0].coin_balance - coins_amount
        await db.query(
          `INSERT INTO coin_transactions
             (kid_name, transaction_type, amount, balance_after, source_id, source_type, note)
           VALUES ($1, 'family_goal_contribution', $2, $3, $4, 'savings_goal', $5)`,
          [kid_name, -coins_amount, balanceAfter, goal_id, `Family goal: ${goal.goal_name}`]
        )

        return NextResponse.json({ goal, new_balance: balanceAfter })
      } catch (error: any) {
        console.error('contribute_to_family_goal error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    default:
      return NextResponse.json(
        { error: `Unknown POST action: ${action}` },
        { status: 400 }
      )
  }
}
