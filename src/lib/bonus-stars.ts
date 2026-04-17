import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

const BONUS_MESSAGES = [
  'Surprise! You earned a bonus star!',
  'Hidden star unlocked! Keep going!',
  'Whoa — bonus stars appeared!',
  'The star fairy visited!',
  'Lucky break — extra stars!',
  'You found a hidden treasure!',
]

const TRIGGER_PROBABILITY = 0.08 // 8% chance per trigger
const MAX_PER_DAY = 3

// Weighted distribution: 1 star (60%), 3 stars (25%), 5 stars (10%), 10 stars (5%)
function pickBonusAmount(): number {
  const roll = Math.random()
  if (roll < 0.60) return 1
  if (roll < 0.85) return 3
  if (roll < 0.95) return 5
  return 10
}

export async function checkBonusStar(kidName: string, triggerType: string): Promise<boolean> {
  try {
    // Check daily count
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const countRows = await db.query(
      `SELECT COUNT(*)::int as c FROM bonus_star_events WHERE kid_name = $1 AND created_at::date = $2`,
      [kidName.toLowerCase(), today]
    ).catch(() => [])
    if ((countRows[0]?.c || 0) >= MAX_PER_DAY) return false

    // Roll probability
    if (Math.random() >= TRIGGER_PROBABILITY) return false

    // Award bonus
    const amount = pickBonusAmount()
    const message = BONUS_MESSAGES[Math.floor(Math.random() * BONUS_MESSAGES.length)]

    // Insert event
    await db.query(
      `INSERT INTO bonus_star_events (kid_name, trigger_type, bonus_amount, message) VALUES ($1, $2, $3, $4)`,
      [kidName.toLowerCase(), triggerType, amount, message]
    )

    // Add stars to balance
    await db.query(
      `UPDATE digi_pets SET stars_balance = stars_balance + $1 WHERE kid_name = $2`,
      [amount, kidName.toLowerCase()]
    ).catch(() => {})

    // Also update kid_points_balance if it exists
    await db.query(
      `UPDATE kid_points_balance SET balance = balance + $1 WHERE kid_name = $2`,
      [amount, kidName.toLowerCase()]
    ).catch(() => {})

    // Send notification
    await createNotification({
      title: `${'\u2728'} Bonus Stars!`,
      message: `${message} (+${amount} star${amount > 1 ? 's' : ''})`,
      source_type: 'bonus_stars',
      source_ref: `bonus-${kidName.toLowerCase()}-${Date.now()}`,
      icon: '\u2728',
      link_tab: 'my-day',
      target_role: 'kid',
      kid_name: kidName.toLowerCase(),
    }).catch(() => {})

    return true
  } catch {
    return false
  }
}
