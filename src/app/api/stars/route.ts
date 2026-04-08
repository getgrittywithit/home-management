import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ─── Helpers ─────────────────────────────────────────────────────────

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS reward_store_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'Activities',
      star_cost INTEGER NOT NULL DEFAULT 10,
      requires_approval BOOLEAN NOT NULL DEFAULT true,
      visible BOOLEAN NOT NULL DEFAULT true,
      archived BOOLEAN NOT NULL DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS reward_redemptions_v2 (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      item_id INTEGER NOT NULL REFERENCES reward_store_items(id),
      stars_held INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      kid_note TEXT,
      parent_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS star_savings_goals (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      goal_name TEXT NOT NULL,
      target_stars INTEGER NOT NULL,
      linked_item_id INTEGER REFERENCES reward_store_items(id),
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

let tablesReady = false
async function init() {
  if (!tablesReady) { await ensureTables(); tablesReady = true }
}

// ─── GET ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || ''
  const kid = searchParams.get('kid_name') || ''

  try {
    // ── get_balance ──
    if (action === 'get_balance') {
      const pets = await db.query(`SELECT stars_balance, gem_balance, streak_days FROM digi_pets WHERE kid_name = $1`, [kid])
      const balance = pets[0]?.stars_balance ?? 0
      const gemBalance = pets[0]?.gem_balance ?? 0
      const streak = pets[0]?.streak_days ?? 0

      const heldRows = await db.query(
        `SELECT COALESCE(SUM(stars_held), 0) AS held FROM reward_redemptions_v2 WHERE kid_name = $1 AND status = 'pending'`,
        [kid]
      )
      const held = Number(heldRows[0]?.held ?? 0)

      const lifetimeRows = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM digi_pet_star_log WHERE kid_name = $1 AND amount > 0`,
        [kid]
      )
      const lifetime_earned = Number(lifetimeRows[0]?.total ?? 0)

      const chicagoToday = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const todayRows = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM digi_pet_star_log WHERE kid_name = $1 AND amount > 0 AND (created_at AT TIME ZONE 'America/Chicago')::date = $2::date`,
        [kid, chicagoToday]
      )
      const today_earned = Number(todayRows[0]?.total ?? 0)

      return NextResponse.json({
        balance,
        gem_balance: gemBalance,
        held,
        available: gemBalance - held, // "available" now = spendable gems
        streak_days: streak,
        lifetime_earned,
        today_earned,
      })
    }

    // ── get_store ──
    if (action === 'get_store') {
      // Get available gem balance (Rewards Store uses gems)
      const pets = await db.query(`SELECT gem_balance FROM digi_pets WHERE kid_name = $1`, [kid])
      const balance = pets[0]?.gem_balance ?? 0
      const heldRows = await db.query(
        `SELECT COALESCE(SUM(stars_held), 0) AS held FROM reward_redemptions_v2 WHERE kid_name = $1 AND status = 'pending'`,
        [kid]
      )
      const available = balance - Number(heldRows[0]?.held ?? 0)

      const items = await db.query(
        `SELECT * FROM reward_store_items WHERE visible = true AND archived = false ORDER BY category, star_cost`
      )
      const itemsWithAffordable = items.map((item: any) => ({
        ...item,
        affordable: available >= item.star_cost,
      }))

      const pending = await db.query(
        `SELECT r.*, i.name AS item_name, i.category AS item_category
         FROM reward_redemptions_v2 r
         JOIN reward_store_items i ON r.item_id = i.id
         WHERE r.kid_name = $1
         ORDER BY r.created_at DESC
         LIMIT 20`,
        [kid]
      )

      return NextResponse.json({ items: itemsWithAffordable, pending, available })
    }

    // ── get_pending_requests (parent view) ──
    if (action === 'get_pending_requests') {
      const rows = await db.query(
        `SELECT r.*, i.name AS item_name, i.description AS item_description, i.category AS item_category, i.star_cost
         FROM reward_redemptions_v2 r
         JOIN reward_store_items i ON r.item_id = i.id
         WHERE r.status = 'pending'
         ORDER BY r.created_at ASC`
      )
      return NextResponse.json({ requests: rows })
    }

    // ── get_kid_history ──
    if (action === 'get_kid_history') {
      const limit = parseInt(searchParams.get('limit') || '20')
      const rows = await db.query(
        `SELECT * FROM digi_pet_star_log WHERE kid_name = $1 ORDER BY created_at DESC LIMIT $2`,
        [kid, limit]
      )
      return NextResponse.json({ history: rows })
    }

    // ── get_savings_goals ──
    if (action === 'get_savings_goals') {
      const pets = await db.query(`SELECT stars_balance FROM digi_pets WHERE kid_name = $1`, [kid])
      const balance = pets[0]?.stars_balance ?? 0

      const goals = await db.query(
        `SELECT g.*, i.name AS item_name, i.star_cost AS item_cost
         FROM star_savings_goals g
         LEFT JOIN reward_store_items i ON g.linked_item_id = i.id
         WHERE g.kid_name = $1
         ORDER BY g.created_at DESC`,
        [kid]
      )
      const goalsWithProgress = goals.map((g: any) => ({
        ...g,
        current_balance: balance,
        progress_pct: g.target_stars > 0 ? Math.min(100, Math.round((balance / g.target_stars) * 100)) : 0,
      }))

      return NextResponse.json({ goals: goalsWithProgress })
    }

    // ── get_all_store_items (parent management) ──
    if (action === 'get_all_store_items') {
      const items = await db.query(`SELECT * FROM reward_store_items ORDER BY category, star_cost`)
      return NextResponse.json({ items })
    }

    // ── get_kid_balance_summary (parent per-kid view) ──
    if (action === 'get_kid_balance_summary') {
      const pets = await db.query(`SELECT stars_balance, streak_days FROM digi_pets WHERE kid_name = $1`, [kid])
      const balance = pets[0]?.stars_balance ?? 0
      const streak = pets[0]?.streak_days ?? 0
      const history = await db.query(
        `SELECT * FROM digi_pet_star_log WHERE kid_name = $1 ORDER BY created_at DESC LIMIT 30`,
        [kid]
      )
      const goals = await db.query(
        `SELECT * FROM star_savings_goals WHERE kid_name = $1 AND active = true`,
        [kid]
      )
      return NextResponse.json({ balance, streak, history, goals })
    }

    if (action === 'get_bonus_history') {
      const kid = searchParams.get('kid_name')?.toLowerCase()
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const todayEvents = await db.query(
        `SELECT bonus_amount as stars, trigger_type as trigger, message, created_at FROM bonus_star_events WHERE kid_name = $1 AND created_at::date = $2 ORDER BY created_at DESC`,
        [kid, today]
      ).catch(() => [])
      const totalRow = await db.query(
        `SELECT COALESCE(SUM(bonus_amount), 0)::int as total FROM bonus_star_events WHERE kid_name = $1`,
        [kid]
      ).catch(() => [])
      return NextResponse.json({
        today: todayEvents,
        total_bonus_earned: totalRow[0]?.total || 0,
        events_today: todayEvents.length,
        max_per_day: 3,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Stars API GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  await init()
  const body = await req.json()
  const { action } = body

  try {
    // ── submit_redemption ──
    if (action === 'submit_redemption') {
      const { kid_name, item_id, kid_note } = body

      // Get item cost
      const items = await db.query(`SELECT * FROM reward_store_items WHERE id = $1`, [item_id])
      if (!items[0]) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      const item = items[0]

      // Check available gem balance (Rewards Store spends gems)
      const pets = await db.query(`SELECT gem_balance FROM digi_pets WHERE kid_name = $1`, [kid_name])
      const balance = pets[0]?.gem_balance ?? 0
      const heldRows = await db.query(
        `SELECT COALESCE(SUM(stars_held), 0) AS held FROM reward_redemptions_v2 WHERE kid_name = $1 AND status = 'pending'`,
        [kid_name]
      )
      const available = balance - Number(heldRows[0]?.held ?? 0)

      if (available < item.star_cost) {
        return NextResponse.json({ error: 'Not enough gems', available, cost: item.star_cost }, { status: 400 })
      }

      // Insert redemption (held, not deducted)
      const rows = await db.query(
        `INSERT INTO reward_redemptions_v2 (kid_name, item_id, stars_held, kid_note)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [kid_name, item_id, item.star_cost, kid_note || null]
      )

      // Create notification for parent
      try {
        await db.query(
          `INSERT INTO parent_notifications (type, kid_name, message, metadata) VALUES ($1, $2, $3, $4)`,
          ['reward_request', kid_name, `${kid_name} wants to redeem "${item.name}" for ${item.star_cost} stars`, JSON.stringify({ redemption_id: rows[0].id, item_id })]
        )
      } catch { /* notifications table may not exist yet */ }

      return NextResponse.json({ success: true, redemption: rows[0] })
    }

    // ── approve_redemption ──
    if (action === 'approve_redemption') {
      const { redemption_id } = body

      const rows = await db.query(`SELECT * FROM reward_redemptions_v2 WHERE id = $1`, [redemption_id])
      if (!rows[0]) return NextResponse.json({ error: 'Redemption not found' }, { status: 404 })
      const redemption = rows[0]

      if (redemption.status !== 'pending') {
        return NextResponse.json({ error: 'Redemption already resolved' }, { status: 400 })
      }

      // Deduct gems from balance
      await db.query(
        `UPDATE digi_pets SET gem_balance = GREATEST(0, gem_balance - $1) WHERE kid_name = $2`,
        [redemption.stars_held, redemption.kid_name]
      )

      // Insert gem transaction log
      const itemRows = await db.query(`SELECT name FROM reward_store_items WHERE id = $1`, [redemption.item_id])
      const itemName = itemRows[0]?.name || 'Reward'
      await db.query(
        `INSERT INTO gem_transactions (kid_name, amount, source_type, description) VALUES ($1, $2, $3, $4)`,
        [redemption.kid_name, -redemption.stars_held, 'reward_store', `Redeemed: ${itemName}`]
      ).catch(() => {
        // Fallback to star log if gem_transactions doesn't exist yet
        db.query(
          `INSERT INTO digi_pet_star_log (kid_name, amount, source, note) VALUES ($1, $2, $3, $4)`,
          [redemption.kid_name, -redemption.stars_held, 'reward_store', `Redeemed: ${itemName}`]
        ).catch(() => {})
      })

      // Update status
      await db.query(
        `UPDATE reward_redemptions_v2 SET status = 'approved', resolved_at = NOW() WHERE id = $1`,
        [redemption_id]
      )

      // Notify kid
      try {
        await db.query(
          `INSERT INTO parent_notifications (type, kid_name, message) VALUES ($1, $2, $3)`,
          ['reward_approved', redemption.kid_name, `Your reward "${itemName}" has been approved!`]
        )
      } catch { /* ignore */ }

      return NextResponse.json({ success: true })
    }

    // ── decline_redemption ──
    if (action === 'decline_redemption') {
      const { redemption_id, parent_note } = body

      const rows = await db.query(`SELECT * FROM reward_redemptions_v2 WHERE id = $1`, [redemption_id])
      if (!rows[0]) return NextResponse.json({ error: 'Redemption not found' }, { status: 404 })
      const redemption = rows[0]

      if (redemption.status !== 'pending') {
        return NextResponse.json({ error: 'Redemption already resolved' }, { status: 400 })
      }

      // No balance change needed — held stars are just released
      await db.query(
        `UPDATE reward_redemptions_v2 SET status = 'declined', parent_note = $2, resolved_at = NOW() WHERE id = $1`,
        [redemption_id, parent_note || null]
      )

      // Notify kid
      try {
        const itemRows = await db.query(`SELECT name FROM reward_store_items WHERE id = $1`, [redemption.item_id])
        const itemName = itemRows[0]?.name || 'Reward'
        await db.query(
          `INSERT INTO parent_notifications (type, kid_name, message) VALUES ($1, $2, $3)`,
          ['reward_declined', redemption.kid_name, `Your request for "${itemName}" was declined.${parent_note ? ' Note: ' + parent_note : ''}`]
        )
      } catch { /* ignore */ }

      return NextResponse.json({ success: true })
    }

    // ── create_store_item ──
    if (action === 'create_store_item') {
      const { name, description, category, star_cost, requires_approval, notes } = body
      const rows = await db.query(
        `INSERT INTO reward_store_items (name, description, category, star_cost, requires_approval, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, description || null, category || 'Activities', star_cost || 10, requires_approval !== false, notes || null]
      )
      return NextResponse.json({ success: true, item: rows[0] })
    }

    // ── update_store_item ──
    if (action === 'update_store_item') {
      const { item_id, name, description, category, star_cost, requires_approval, notes, visible, archived } = body
      const fields: string[] = []
      const values: any[] = []
      let idx = 1

      if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name) }
      if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description) }
      if (category !== undefined) { fields.push(`category = $${idx++}`); values.push(category) }
      if (star_cost !== undefined) { fields.push(`star_cost = $${idx++}`); values.push(star_cost) }
      if (requires_approval !== undefined) { fields.push(`requires_approval = $${idx++}`); values.push(requires_approval) }
      if (notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(notes) }
      if (visible !== undefined) { fields.push(`visible = $${idx++}`); values.push(visible) }
      if (archived !== undefined) { fields.push(`archived = $${idx++}`); values.push(archived) }

      if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

      values.push(item_id)
      const rows = await db.query(
        `UPDATE reward_store_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      )
      return NextResponse.json({ success: true, item: rows[0] })
    }

    // ── create_savings_goal ──
    if (action === 'create_savings_goal') {
      const { kid_name, goal_name, target_stars, linked_item_id } = body
      const rows = await db.query(
        `INSERT INTO star_savings_goals (kid_name, goal_name, target_stars, linked_item_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [kid_name, goal_name, target_stars, linked_item_id || null]
      )
      return NextResponse.json({ success: true, goal: rows[0] })
    }

    // ── reverse_deduction ──
    if (action === 'reverse_deduction') {
      const { log_id, note } = body

      const logRows = await db.query(`SELECT * FROM digi_pet_star_log WHERE id = $1`, [log_id])
      if (!logRows[0]) return NextResponse.json({ error: 'Log entry not found' }, { status: 404 })
      const entry = logRows[0]

      if (entry.amount >= 0) {
        return NextResponse.json({ error: 'Can only reverse deductions (negative entries)' }, { status: 400 })
      }

      const reverseAmount = Math.abs(entry.amount)

      // Add back to balance
      await db.query(
        `UPDATE digi_pets SET stars_balance = stars_balance + $1 WHERE kid_name = $2`,
        [reverseAmount, entry.kid_name]
      )

      // Insert correction entry
      await db.query(
        `INSERT INTO digi_pet_star_log (kid_name, amount, source, note) VALUES ($1, $2, $3, $4)`,
        [entry.kid_name, reverseAmount, 'reversal', `Reversed: ${entry.source}${note ? ' — ' + note : ''}`]
      )

      return NextResponse.json({ success: true, reversed_amount: reverseAmount })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Stars API POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
