import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

interface BadgeDef {
  key: string
  title: string
  emoji: string
  category: string
  threshold: number
}

// 6 categories × 3 tiers = 18 badges
const TIERED_BADGES: BadgeDef[] = [
  // Consistency (zone streaks)
  { key: 'consistency_bronze', title: 'Consistent Starter', emoji: '🥉', category: 'consistency', threshold: 3 },
  { key: 'consistency_silver', title: 'Steady Keeper', emoji: '🥈', category: 'consistency', threshold: 7 },
  { key: 'consistency_gold', title: 'Zone Champion', emoji: '🥇', category: 'consistency', threshold: 14 },

  // Kindness (positive reports given/received)
  { key: 'kindness_bronze', title: 'Kind Spark', emoji: '💛', category: 'kindness', threshold: 3 },
  { key: 'kindness_silver', title: 'Kind Heart', emoji: '💛', category: 'kindness', threshold: 10 },
  { key: 'kindness_gold', title: 'Kind Legend', emoji: '💛', category: 'kindness', threshold: 25 },

  // Self-Awareness (mood check-ins)
  { key: 'awareness_bronze', title: 'Self-Checker', emoji: '💜', category: 'self_awareness', threshold: 7 },
  { key: 'awareness_silver', title: 'Mood Master', emoji: '💜', category: 'self_awareness', threshold: 14 },
  { key: 'awareness_gold', title: 'Inner Guide', emoji: '💜', category: 'self_awareness', threshold: 30 },

  // Responsibility (Belle care)
  { key: 'responsibility_bronze', title: 'Pet Helper', emoji: '🐕', category: 'responsibility', threshold: 5 },
  { key: 'responsibility_silver', title: 'Reliable Carer', emoji: '🐕', category: 'responsibility', threshold: 15 },
  { key: 'responsibility_gold', title: 'Belle\'s Best Friend', emoji: '🐕', category: 'responsibility', threshold: 30 },

  // Growth (tasks completed)
  { key: 'growth_bronze', title: 'Getting Started', emoji: '🌱', category: 'growth', threshold: 25 },
  { key: 'growth_silver', title: 'Growing Strong', emoji: '🌿', category: 'growth', threshold: 100 },
  { key: 'growth_gold', title: 'Unstoppable', emoji: '🌳', category: 'growth', threshold: 250 },

  // Community (helping others — sibling positive reports)
  { key: 'community_bronze', title: 'Good Spotter', emoji: '👀', category: 'community', threshold: 3 },
  { key: 'community_silver', title: 'Family Builder', emoji: '🏠', category: 'community', threshold: 10 },
  { key: 'community_gold', title: 'Community Hero', emoji: '🌟', category: 'community', threshold: 25 },
]

/**
 * Check and award achievements for a kid. Called on key data writes.
 * Idempotent — safe to call multiple times.
 */
export async function checkAchievements(kidName: string) {
  const kid = kidName.toLowerCase()
  const kidDisplay = kid.charAt(0).toUpperCase() + kid.slice(1)

  try {
    // Get already-earned badges
    const earned = await db.query(
      `SELECT achievement_key FROM kid_achievements WHERE kid_name = $1`,
      [kid]
    ).catch(() => [])
    const earnedSet = new Set((earned as any[]).map(e => e.achievement_key))

    // Gather counts
    const [zoneStreak, kindness, moodCheckins, belleCare, tasksCompleted, siblingReports] = await Promise.all([
      // Consistency: current zone streak
      db.query(`SELECT COALESCE(MAX(current_count), 0)::int as val FROM kid_chore_streaks WHERE kid_name = $1`, [kid]).catch(() => [{ val: 0 }]),
      // Kindness: approved positive reports (received)
      db.query(`SELECT COALESCE(SUM(points), 0)::int as val FROM kid_positive_reports WHERE kid_name = $1 AND approved = TRUE`, [kid]).catch(() => [{ val: 0 }]),
      // Self-awareness: mood check-in count
      db.query(`SELECT COUNT(*)::int as val FROM kid_mood_log WHERE child_name = $1`, [kid]).catch(() => [{ val: 0 }]),
      // Responsibility: Belle care completions
      db.query(`SELECT COUNT(*)::int as val FROM kid_daily_checklist WHERE child_name = $1 AND completed = TRUE AND event_id LIKE '%belle%'`, [kid]).catch(() => [{ val: 0 }]),
      // Growth: total tasks completed
      db.query(`SELECT COUNT(*)::int as val FROM kid_daily_checklist WHERE child_name = $1 AND completed = TRUE`, [kid]).catch(() => [{ val: 0 }]),
      // Community: positive reports GIVEN (as sibling reporter)
      db.query(`SELECT COUNT(*)::int as val FROM kid_positive_reports WHERE submitted_by = $1 AND source = 'sibling' AND approved = TRUE`, [kid]).catch(() => [{ val: 0 }]),
    ])

    const counts: Record<string, number> = {
      consistency: (zoneStreak as any[])[0]?.val || 0,
      kindness: (kindness as any[])[0]?.val || 0,
      self_awareness: (moodCheckins as any[])[0]?.val || 0,
      responsibility: (belleCare as any[])[0]?.val || 0,
      growth: (tasksCompleted as any[])[0]?.val || 0,
      community: (siblingReports as any[])[0]?.val || 0,
    }

    // Check each badge
    for (const badge of TIERED_BADGES) {
      if (earnedSet.has(badge.key)) continue
      const count = counts[badge.category] || 0
      if (count >= badge.threshold) {
        // D97: Check if already earned — prevent notification spam
        const alreadyEarned = await db.query(
          `SELECT 1 FROM notifications WHERE source_type = 'achievement_earned' AND source_ref = $1 LIMIT 1`,
          [`achievement-${kid}-${badge.key}`]
        ).catch(() => [])
        if (alreadyEarned.length > 0) continue

        // Ensure definition exists
        await db.query(
          `INSERT INTO achievement_definitions (key, title, description, emoji, category, trigger_type, trigger_value)
           VALUES ($1, $2, $3, $4, $5, 'auto', $6)
           ON CONFLICT (key) DO NOTHING`,
          [badge.key, badge.title, `Earned by reaching ${badge.threshold} in ${badge.category.replace('_', ' ')}`, badge.emoji, badge.category, badge.threshold]
        ).catch(() => {})

        // Notify kid (once only — deduped by source_ref check above)
        await createNotification({
          title: `${badge.emoji} New badge: ${badge.title}!`,
          message: `You earned the ${badge.title} badge!`,
          source_type: 'achievement_earned', source_ref: `achievement-${kid}-${badge.key}`,
          link_tab: 'achievements', icon: badge.emoji,
          target_role: 'kid', kid_name: kid,
        }).catch(() => {})

        // Notify parent (once only)
        await createNotification({
          title: `${kidDisplay} earned: ${badge.title}`,
          message: `${badge.emoji} ${badge.category.replace('_', ' ')} badge`,
          source_type: 'achievement_parent', source_ref: `achievement-parent-${kid}-${badge.key}`,
          link_tab: 'kids-checklist', icon: badge.emoji,
        }).catch(() => {})
      }
    }
  } catch (e: any) {
    console.error('Achievement check failed:', kid, e.message)
  }
}
