import { db } from './database'

export async function checkAndAwardAchievement(kidName: string, metric: string, currentValue: number) {
  try {
    const defs = await db.query(
      `SELECT key FROM achievement_definitions WHERE trigger_metric = $1 AND trigger_value <= $2`,
      [metric, currentValue]
    )
    for (const def of defs as any[]) {
      await db.query(
        `INSERT INTO kid_achievements (kid_name, achievement_key, seen_by_kid) VALUES ($1, $2, FALSE) ON CONFLICT (kid_name, achievement_key) DO NOTHING`,
        [kidName, def.key]
      )
    }
  } catch { /* silent */ }
}
