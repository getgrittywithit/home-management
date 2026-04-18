import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const SHOP_CATALOG: Record<string, { name: string; type: string; cost: number; emoji: string; happiness: number; health: number }> = {
  basic_kibble: { name: 'Basic Kibble', type: 'food', cost: 10, emoji: '🍖', happiness: 0, health: 10 },
  yummy_snack: { name: 'Yummy Snack', type: 'food', cost: 20, emoji: '🍗', happiness: 0, health: 25 },
  gourmet_meal: { name: 'Gourmet Meal', type: 'food', cost: 40, emoji: '🍱', happiness: 0, health: 50 },
  mega_feast: { name: 'Mega Feast', type: 'food', cost: 75, emoji: '🎂', happiness: 0, health: 80 },
  simple_toy: { name: 'Simple Toy', type: 'toy', cost: 10, emoji: '🧸', happiness: 10, health: 0 },
  fun_playset: { name: 'Fun Playset', type: 'toy', cost: 20, emoji: '🎮', happiness: 25, health: 0 },
  adventure_kit: { name: 'Adventure Kit', type: 'toy', cost: 40, emoji: '🎒', happiness: 50, health: 0 },
  party_pack: { name: 'Party Pack', type: 'toy', cost: 75, emoji: '🎉', happiness: 80, health: 0 },
  tiny_hat: { name: 'Tiny Hat', type: 'accessory', cost: 30, emoji: '🎩', happiness: 0, health: 0 },
  cool_glasses: { name: 'Cool Glasses', type: 'accessory', cost: 30, emoji: '🕶️', happiness: 0, health: 0 },
  bow_bandana: { name: 'Bow / Bandana', type: 'accessory', cost: 25, emoji: '🎀', happiness: 0, health: 0 },
  party_crown: { name: 'Party Crown', type: 'accessory', cost: 50, emoji: '👑', happiness: 0, health: 0 },
  rainbow_cape: { name: 'Rainbow Cape', type: 'accessory', cost: 60, emoji: '🌈', happiness: 0, health: 0 },
  garden_meadow: { name: 'Garden Meadow', type: 'habitat', cost: 100, emoji: '🌿', happiness: 0, health: 0 },
  mountain_lodge: { name: 'Mountain Lodge', type: 'habitat', cost: 200, emoji: '⛰️', happiness: 0, health: 0 },
  jungle_hideout: { name: 'Jungle Hideout', type: 'habitat', cost: 350, emoji: '🌴', happiness: 0, health: 0 },
  space_station: { name: 'Space Station', type: 'habitat', cost: 500, emoji: '🚀', happiness: 0, health: 0 },
  enchanted_castle: { name: 'Enchanted Castle', type: 'habitat', cost: 750, emoji: '🏰', happiness: 0, health: 0 },
}

const STAR_AMOUNTS: Record<string, number> = {
  med_am: 2, med_pm: 2, zone_chore: 5, daily_chore: 3, lesson: 5,
  belle_care: 3, pet_care: 2, tidy: 2, hygiene: 1, parent_task: 2,
  opp_applying: 15, opp_submitted: 25, reading_log: 8,
  streak_3: 10, streak_7: 25, parent_bonus: 0,
  enrichment_complete: 1, typing_session: 2, typing_pb: 5,
  typing_race_win: 3, typing_accuracy: 3, financial_level_up: 10,
}

const PET_TYPES: Record<string, string> = {
  dog: '🐶', cat: '🐱', bunny: '🐰', hamster: '🐹',
  fox: '🦊', panda: '🐼', penguin: '🐧', dragon: '🐉',
}

function getStateName(happiness: number, health: number): { state_name: string; state_emoji: string } {
  const avg = (happiness + health) / 2
  if (avg >= 85) return { state_name: 'thriving', state_emoji: '🌟' }
  if (avg >= 70) return { state_name: 'happy', state_emoji: '😊' }
  if (avg >= 55) return { state_name: 'content', state_emoji: '🙂' }
  if (avg >= 40) return { state_name: 'sad', state_emoji: '😢' }
  if (avg >= 25) return { state_name: 'hungry', state_emoji: '😫' }
  if (avg >= 15) return { state_name: 'neglected', state_emoji: '😞' }
  return { state_name: 'critical', state_emoji: '🆘' }
}

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS digi_pets (
      id SERIAL PRIMARY KEY,
      kid_name TEXT UNIQUE NOT NULL,
      pet_type TEXT NOT NULL DEFAULT 'dog',
      pet_name TEXT NOT NULL DEFAULT 'My Pet',
      happiness INTEGER NOT NULL DEFAULT 50,
      health INTEGER NOT NULL DEFAULT 50,
      stars_balance INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0,
      enabled BOOLEAN NOT NULL DEFAULT true,
      active_habitat TEXT DEFAULT NULL,
      last_activity_at TIMESTAMPTZ DEFAULT NOW(),
      last_decay_at DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS digi_pet_accessories (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      item_id TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      purchased_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(kid_name, item_id)
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS digi_pet_star_log (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      source TEXT NOT NULL,
      source_ref TEXT DEFAULT NULL,
      note TEXT DEFAULT NULL,
      balance_after INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  // Migration: make balance_after nullable/defaulted if it exists as NOT NULL
  await db.query(`ALTER TABLE digi_pet_star_log ALTER COLUMN balance_after SET DEFAULT 0`).catch(() => {})
  await db.query(`ALTER TABLE digi_pet_star_log ALTER COLUMN balance_after DROP NOT NULL`).catch(() => {})
  await db.query(`
    CREATE TABLE IF NOT EXISTS digi_pet_shop_purchases (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      cost INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

async function ensurePet(kid_name: string) {
  const rows = await db.query(`SELECT * FROM digi_pets WHERE kid_name = $1`, [kid_name])
  if (rows.length === 0) {
    await db.query(`INSERT INTO digi_pets (kid_name) VALUES ($1)`, [kid_name])
    return (await db.query(`SELECT * FROM digi_pets WHERE kid_name = $1`, [kid_name]))[0]
  }
  return rows[0]
}

// Recalculate stars_balance and weekly_stars from the log (single source of truth)
// This makes the system self-correcting — no desync possible
async function recalcBalanceFromLog(kid_name: string) {
  const totalResult = await db.query(
    `SELECT COALESCE(SUM(amount), 0)::int as total FROM digi_pet_star_log WHERE kid_name = $1`,
    [kid_name]
  ).catch(() => [{ total: 0 }])

  // Subtract shop purchases from total to get balance
  const spentResult = await db.query(
    `SELECT COALESCE(SUM(cost), 0)::int as spent FROM digi_pet_shop_purchases WHERE kid_name = $1`,
    [kid_name]
  ).catch(() => [{ spent: 0 }])

  const balance = Math.max(0, (totalResult[0]?.total || 0) - (spentResult[0]?.spent || 0))

  // Weekly stars: sum log entries from this week's Monday
  const d = new Date()
  const dayOfWeek = d.getDay()
  d.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const monday = d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  const weeklyResult = await db.query(
    `SELECT COALESCE(SUM(amount), 0)::int as weekly FROM digi_pet_star_log WHERE kid_name = $1 AND created_at >= $2::date`,
    [kid_name, monday]
  ).catch(() => [{ weekly: 0 }])

  const weekly = Math.max(0, weeklyResult[0]?.weekly || 0)

  await db.query(
    `UPDATE digi_pets SET stars_balance = $1, weekly_stars = $2 WHERE kid_name = $3`,
    [balance, weekly, kid_name]
  )

  // Also sync weekly_star_goals
  await db.query(
    `INSERT INTO weekly_star_goals (kid_name, week_start, earned_stars) VALUES ($1, $2, $3)
     ON CONFLICT (kid_name, week_start) DO UPDATE SET earned_stars = $3`,
    [kid_name, monday, weekly]
  ).catch(() => {})

  return { balance, weekly }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTables()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || ''

    // Recalculate balance from star log — use to fix desync or audit
    if (action === 'recalc_balance') {
      const kid_name = searchParams.get('kid_name') || ''
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      await ensurePet(kid_name)
      const before = (await db.query(`SELECT stars_balance, weekly_stars FROM digi_pets WHERE kid_name = $1`, [kid_name]))[0]
      const { balance, weekly } = await recalcBalanceFromLog(kid_name)
      return NextResponse.json({
        success: true,
        kid_name,
        before: { stars_balance: before?.stars_balance, weekly_stars: before?.weekly_stars },
        after: { stars_balance: balance, weekly_stars: weekly },
        corrected: before?.stars_balance !== balance,
      })
    }

    // Recalculate ALL kids at once
    if (action === 'recalc_all') {
      const kids = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
      const results: any[] = []
      for (const kid of kids) {
        await ensurePet(kid)
        const before = (await db.query(`SELECT stars_balance, weekly_stars FROM digi_pets WHERE kid_name = $1`, [kid]))[0]
        const { balance, weekly } = await recalcBalanceFromLog(kid)
        results.push({ kid, before: before?.stars_balance, after: balance, corrected: before?.stars_balance !== balance })
      }
      return NextResponse.json({ success: true, results })
    }

    if (action === 'get_pet') {
      const kid_name = searchParams.get('kid_name') || ''
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      const pet = await ensurePet(kid_name)

      // Apply decay
      const today = new Date().toISOString().slice(0, 10)
      const lastDecay = pet.last_decay_at ? new Date(pet.last_decay_at).toISOString().slice(0, 10) : today
      if (lastDecay < today) {
        const daysSince = Math.floor((new Date(today).getTime() - new Date(lastDecay).getTime()) / (86400000))
        if (daysSince > 0) {
          const decayAmount = 2 * daysSince
          const newHappiness = Math.max(5, pet.happiness - decayAmount)
          const newHealth = Math.max(5, pet.health - decayAmount)
          await db.query(
            `UPDATE digi_pets SET happiness = $1, health = $2, last_decay_at = CURRENT_DATE WHERE kid_name = $3`,
            [newHappiness, newHealth, kid_name]
          )
          pet.happiness = newHappiness
          pet.health = newHealth
          pet.last_decay_at = today
        }
      }

      const accessories = await db.query(
        `SELECT * FROM digi_pet_accessories WHERE kid_name = $1 AND is_active = true`,
        [kid_name]
      )

      const { state_name, state_emoji } = getStateName(pet.happiness, pet.health)

      return NextResponse.json({
        pet,
        accessories,
        state_name,
        state_emoji,
        pet_emoji: PET_TYPES[pet.pet_type] || '🐶',
      })
    }

    if (action === 'get_shop') {
      const kid_name = searchParams.get('kid_name') || ''
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      const pet = await ensurePet(kid_name)
      const ownedAccessories = await db.query(
        `SELECT item_id FROM digi_pet_accessories WHERE kid_name = $1`,
        [kid_name]
      )
      const ownedSet = new Set(ownedAccessories.map((r: any) => r.item_id))

      const grouped: Record<string, any[]> = { food: [], toy: [], accessory: [], habitat: [] }
      for (const [id, item] of Object.entries(SHOP_CATALOG)) {
        const entry = {
          id,
          ...item,
          affordable: pet.stars_balance >= item.cost,
          owned: item.type === 'accessory' ? ownedSet.has(id) : false,
        }
        if (grouped[item.type]) grouped[item.type].push(entry)
      }

      return NextResponse.json({ shop: grouped, balance: pet.stars_balance })
    }

    if (action === 'parent_overview') {
      const kids = ['zoey', 'kaylee', 'wyatt', 'amos', 'ellie', 'hannah']
      const overview = []
      for (const kid of kids) {
        const pet = await ensurePet(kid)
        const { state_name } = getStateName(pet.happiness, pet.health)
        overview.push({
          kid_name: kid,
          enabled: pet.enabled,
          pet_type: pet.pet_type,
          pet_name: pet.pet_name,
          happiness: pet.happiness,
          health: pet.health,
          stars_balance: pet.stars_balance,
          streak_days: pet.streak_days,
          last_activity_at: pet.last_activity_at,
          state_name,
          pet_emoji: PET_TYPES[pet.pet_type] || '🐶',
        })
      }
      return NextResponse.json({ kids: overview })
    }

    if (action === 'star_history') {
      const kid_name = searchParams.get('kid_name') || ''
      const limit = parseInt(searchParams.get('limit') || '10')
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM digi_pet_star_log WHERE kid_name = $1 ORDER BY created_at DESC LIMIT $2`,
        [kid_name, limit]
      )
      return NextResponse.json({ history: rows })
    }

    if (action === 'purchase_history') {
      const kid_name = searchParams.get('kid_name') || ''
      const limit = parseInt(searchParams.get('limit') || '10')
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM digi_pet_shop_purchases WHERE kid_name = $1 ORDER BY created_at DESC LIMIT $2`,
        [kid_name, limit]
      )
      return NextResponse.json({ history: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('DigiPet GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables()
    const body = await request.json()
    const { action } = body

    if (action === 'buy_item') {
      const { kid_name, item_id } = body
      const item = SHOP_CATALOG[item_id]
      if (!item) return NextResponse.json({ error: 'Unknown item' }, { status: 400 })

      const pet = await ensurePet(kid_name)
      if (pet.stars_balance < item.cost) {
        return NextResponse.json({ error: 'Insufficient stars', balance: pet.stars_balance, cost: item.cost }, { status: 400 })
      }

      // Deduct stars
      const newBalance = pet.stars_balance - item.cost
      const newHappiness = Math.min(100, pet.happiness + item.happiness)
      const newHealth = Math.min(100, pet.health + item.health)

      await db.query(
        `UPDATE digi_pets SET stars_balance = $1, happiness = $2, health = $3, last_activity_at = NOW() WHERE kid_name = $4`,
        [newBalance, newHappiness, newHealth, kid_name]
      )

      // Record purchase
      await db.query(
        `INSERT INTO digi_pet_shop_purchases (kid_name, item_id, item_type, cost) VALUES ($1, $2, $3, $4)`,
        [kid_name, item_id, item.type, item.cost]
      )

      // Record star log (negative) with actual balance
      const { balance: purchaseBalance } = await recalcBalanceFromLog(kid_name)
      await db.query(
        `INSERT INTO digi_pet_star_log (kid_name, amount, source, note, balance_after) VALUES ($1, $2, $3, $4, $5)`,
        [kid_name, -item.cost, 'purchase', `Bought ${item.name}`, purchaseBalance]
      )

      // For accessories, insert into accessories table
      if (item.type === 'accessory') {
        await db.query(
          `INSERT INTO digi_pet_accessories (kid_name, item_id) VALUES ($1, $2) ON CONFLICT (kid_name, item_id) DO NOTHING`,
          [kid_name, item_id]
        )
      }

      // For habitats, update active_habitat
      if (item.type === 'habitat') {
        await db.query(
          `UPDATE digi_pets SET active_habitat = $1 WHERE kid_name = $2`,
          [item_id, kid_name]
        )
      }

      const { state_name, state_emoji } = getStateName(newHappiness, newHealth)
      return NextResponse.json({
        success: true,
        balance: newBalance,
        happiness: newHappiness,
        health: newHealth,
        state_name,
        state_emoji,
      })
    }

    if (action === 'toggle_accessory') {
      const { kid_name, item_id, active } = body
      await db.query(
        `UPDATE digi_pet_accessories SET is_active = $1 WHERE kid_name = $2 AND item_id = $3`,
        [active, kid_name, item_id]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'set_habitat') {
      const { kid_name, habitat_id } = body
      // Verify ownership
      const owned = await db.query(
        `SELECT id FROM digi_pet_shop_purchases WHERE kid_name = $1 AND item_id = $2`,
        [kid_name, habitat_id]
      )
      if (owned.length === 0) return NextResponse.json({ error: 'Habitat not owned' }, { status: 400 })
      await db.query(`UPDATE digi_pets SET active_habitat = $1 WHERE kid_name = $2`, [habitat_id, kid_name])
      return NextResponse.json({ success: true })
    }

    if (action === 'award_stars') {
      const { kid_name, amount, source, note } = body
      if (!kid_name || !amount) return NextResponse.json({ error: 'kid_name and amount required' }, { status: 400 })
      await db.query(
        `UPDATE digi_pets SET stars_balance = stars_balance + $1, last_activity_at = NOW() WHERE kid_name = $2`,
        [amount, kid_name]
      )
      const bonusPet = await ensurePet(kid_name)
      await db.query(
        `INSERT INTO digi_pet_star_log (kid_name, amount, source, note, balance_after) VALUES ($1, $2, $3, $4, $5)`,
        [kid_name, amount, source || 'parent_bonus', note || 'Parent bonus', bonusPet.stars_balance]
      )
      return NextResponse.json({ success: true, balance: bonusPet.stars_balance })
    }

    if (action === 'toggle_enabled') {
      const { kid_name, enabled } = body
      await db.query(`UPDATE digi_pets SET enabled = $1 WHERE kid_name = $2`, [enabled, kid_name])
      return NextResponse.json({ success: true })
    }

    if (action === 'reset_pet') {
      const { kid_name } = body
      await db.query(
        `UPDATE digi_pets SET happiness = 50, health = 50, last_decay_at = CURRENT_DATE WHERE kid_name = $1`,
        [kid_name]
      )
      await db.query(`DELETE FROM digi_pet_accessories WHERE kid_name = $1`, [kid_name])
      await db.query(
        `INSERT INTO digi_pet_star_log (kid_name, amount, source, note, balance_after) VALUES ($1, 0, 'system', 'Pet reset — stats restored, accessories removed, stars kept', 0)`,
        [kid_name]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'choose_pet') {
      const { kid_name, pet_type, pet_name } = body
      if (!kid_name || !pet_type || !pet_name) return NextResponse.json({ error: 'kid_name, pet_type, pet_name required' }, { status: 400 })
      await ensurePet(kid_name)
      await db.query(
        `UPDATE digi_pets SET pet_type = $1, pet_name = $2 WHERE kid_name = $3`,
        [pet_type, pet_name.slice(0, 20), kid_name]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'award_task_stars') {
      const { kid_name, task_type, source_ref } = body
      if (!kid_name || !task_type) return NextResponse.json({ error: 'kid_name and task_type required' }, { status: 400 })

      // Idempotency check — prevent double-award for same task on same day
      if (source_ref) {
        const existing = await db.query(
          `SELECT id FROM digi_pet_star_log WHERE kid_name = $1 AND source_ref = $2`,
          [kid_name, source_ref]
        )
        if (existing.length > 0) {
          return NextResponse.json({ already_awarded: true })
        }
      }

      const amount = STAR_AMOUNTS[task_type] || 0
      if (amount === 0 && task_type !== 'parent_bonus') {
        return NextResponse.json({ error: 'Unknown task_type' }, { status: 400 })
      }

      // Insert log entry FIRST (this is the source of truth)
      await db.query(
        `INSERT INTO digi_pet_star_log (kid_name, amount, source, source_ref, note, balance_after) VALUES ($1, $2, $3, $4, $5, 0)`,
        [kid_name, amount, task_type, source_ref || null, `Earned from ${task_type}`]
      )

      // Update streak
      const pet = await ensurePet(kid_name)
      const lastActivity = pet.last_activity_at ? new Date(pet.last_activity_at).toISOString().slice(0, 10) : null
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const todayISO = new Date().toISOString().slice(0, 10)

      let newStreak = pet.streak_days
      if (lastActivity === yesterday) {
        newStreak = pet.streak_days + 1
      } else if (lastActivity !== todayISO) {
        newStreak = 1
      }

      await db.query(`UPDATE digi_pets SET streak_days = $1, last_activity_at = NOW() WHERE kid_name = $2`, [newStreak, kid_name])

      // Streak milestones
      let bonusStars = 0
      if (newStreak === 3 && pet.streak_days < 3) {
        bonusStars = STAR_AMOUNTS.streak_3
        await db.query(
          `INSERT INTO digi_pet_star_log (kid_name, amount, source, note, balance_after) VALUES ($1, $2, 'streak_3', '3-day streak bonus!', 0)`,
          [kid_name, bonusStars]
        )
      }
      if (newStreak === 7 && pet.streak_days < 7) {
        bonusStars += STAR_AMOUNTS.streak_7
        await db.query(
          `INSERT INTO digi_pet_star_log (kid_name, amount, source, note, balance_after) VALUES ($1, $2, 'streak_7', '7-day streak bonus!', 0)`,
          [kid_name, STAR_AMOUNTS.streak_7]
        )
      }

      // Belle care bonus
      if (task_type === 'belle_care') {
        const newHappiness = Math.min(100, pet.happiness + 5)
        const newHealth = Math.min(100, pet.health + 5)
        await db.query(
          `UPDATE digi_pets SET happiness = $1, health = $2 WHERE kid_name = $3`,
          [newHappiness, newHealth, kid_name]
        )
      }

      // RECALCULATE balance from log — single source of truth, no desync possible
      const { balance, weekly } = await recalcBalanceFromLog(kid_name)

      return NextResponse.json({
        success: true,
        amount,
        bonus_stars: bonusStars,
        balance,
        weekly_stars: weekly,
        streak_days: newStreak,
      })
    }

    // Reverse stars when a task is unchecked
    if (action === 'reverse_task_stars') {
      const { kid_name, source_ref } = body
      if (!kid_name || !source_ref) return NextResponse.json({ error: 'kid_name and source_ref required' }, { status: 400 })

      // Find the log entries to reverse
      const existing = await db.query(
        `SELECT id, amount FROM digi_pet_star_log WHERE kid_name = $1 AND source_ref = $2`,
        [kid_name, source_ref]
      )
      if (existing.length === 0) return NextResponse.json({ already_reversed: true, reversed: 0, balance: 0 })

      const totalReversed = existing.reduce((sum: number, r: any) => sum + r.amount, 0)

      // Delete the log entries
      await db.query(
        `DELETE FROM digi_pet_star_log WHERE kid_name = $1 AND source_ref = $2`,
        [kid_name, source_ref]
      )

      // RECALCULATE balance from log — single source of truth, no desync possible
      const { balance, weekly } = await recalcBalanceFromLog(kid_name)

      return NextResponse.json({
        success: true,
        reversed: totalReversed,
        balance,
        weekly_stars: weekly,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('DigiPet POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
